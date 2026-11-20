import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { openStoredDocument } from "./openDocument";
import { httpClient } from "@lib/axios/httpClient";
import { appStorage, STORAGE_KEYS } from "@lib/storage";

/*
 * Opening a stored PDF. The request runs through the real API client (its
 * interceptors add the bearer token) down to a fake adapter, so what is sent
 * is under test; the browser's new tab is a stand-in that records what is
 * done to it.
 */

const MEDIA_ID = "d0000000-0000-4000-8000-000000000001";
const BLOB_URL = "blob:http://localhost/pdf-1";

/** A Storage of the tab's own, as the browser copies it from the opener. */
function storage(entries: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

interface FakeTab {
  opener: unknown;
  sessionStorage: Storage;
  document: { title: string; body: { textContent: string } };
  location: { href: string };
  close: ReturnType<typeof vi.fn>;
}

function fakeTab(): FakeTab {
  return {
    opener: window,
    // What a tab opened without "noopener" starts with: this tab's session.
    sessionStorage: storage({
      [STORAGE_KEYS.accessToken]: "token-1",
      [STORAGE_KEYS.user]: '{"id":1}',
    }),
    document: { title: "", body: { textContent: "" } },
    location: { href: "" },
    close: vi.fn(),
  };
}

/** The API's answer: the stored bytes, typed as the upload was (not necessarily as a PDF). */
const stored = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => ({
  data: new Blob(["%PDF-1.7"], { type: "application/octet-stream" }),
  status: 200,
  statusText: "OK",
  headers: {},
  config,
});

let sent: InternalAxiosRequestConfig[] = [];
let respond = stored;
const originalAdapter = httpClient.defaults.adapter;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

beforeEach(() => {
  sent = [];
  respond = stored;
  httpClient.defaults.adapter = (async (config: InternalAxiosRequestConfig) => {
    sent.push(config);
    return respond(config);
  }) as AxiosAdapter;
  URL.createObjectURL = vi.fn(() => BLOB_URL);
  URL.revokeObjectURL = vi.fn();
  appStorage.set(STORAGE_KEYS.accessToken, "token-1");
});

afterEach(() => {
  httpClient.defaults.adapter = originalAdapter;
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  appStorage.remove(STORAGE_KEYS.accessToken);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("openStoredDocument", () => {
  it("reads the PDF with the bearer token and shows it in the tab opened by the click", async () => {
    const tab = fakeTab();
    const open = vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);

    await openStoredDocument(MEDIA_ID, "cv.pdf");

    // Opened at once, inside the click, so a popup blocker lets it through.
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe(`/media/${MEDIA_ID}/content`);
    expect(sent[0].headers.get("Authorization")).toBe("Bearer token-1");
    expect(sent[0].responseType).toBe("blob");
    expect(sent[0].timeout).toBe(0);
    // A PDF whatever the response said, so the tab can only ever render a document.
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(blob.type).toBe("application/pdf");
    expect(tab.location.href).toBe(BLOB_URL);
    expect(tab.close).not.toHaveBeenCalled();
  });

  it("leaves the new tab no way back to the dashboard and no copy of its session", async () => {
    const tab = fakeTab();
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    let copyWhileLoading: string | null = "unread";
    respond = async (config) => {
      copyWhileLoading = tab.sessionStorage.getItem(STORAGE_KEYS.accessToken);
      return stored(config);
    };

    await openStoredDocument(MEDIA_ID);

    expect(tab.opener).toBeNull();
    // Gone before the PDF was even asked for, and still gone.
    expect(copyWhileLoading).toBeNull();
    expect(tab.sessionStorage.length).toBe(0);
    // This tab stays signed in.
    expect(appStorage.get(STORAGE_KEYS.accessToken)).toBe("token-1");
  });

  it("revokes the object URL a minute later, once the tab has the document", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.spyOn(window, "open").mockReturnValue(fakeTab() as unknown as Window);

    await openStoredDocument(MEDIA_ID);

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(59_999);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(BLOB_URL);
  });

  it("downloads the file when a popup blocker stopped the tab", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.href).toBe(BLOB_URL);
      expect(this.download).toBe("certificate.pdf");
    });

    await openStoredDocument(MEDIA_ID, "certificate.pdf");

    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("closes the tab and downloads instead when its copy of the session can't be cleared", async () => {
    const tab = fakeTab();
    Object.defineProperty(tab, "sessionStorage", {
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    await openStoredDocument(MEDIA_ID, "cv.pdf");

    expect(tab.close).toHaveBeenCalled();
    expect(tab.location.href).toBe("");
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("closes the tab and rejects when the PDF can't be read", async () => {
    const tab = fakeTab();
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    respond = async (config) => {
      throw new AxiosError("Not found", "ERR_BAD_REQUEST", config, null, {
        data: { code: "MEDIA_NOT_FOUND", message: "No such file" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config,
      });
    };

    await expect(openStoredDocument(MEDIA_ID)).rejects.toMatchObject({ status: 404 });
    expect(tab.close).toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
