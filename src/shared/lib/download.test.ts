import { afterEach, describe, expect, it, vi } from "vitest";
import { attachmentFileName, saveBlob } from "@shared/lib/download";

describe("attachmentFileName", () => {
  it("reads the name the server gives", () => {
    expect(attachmentFileName('attachment; filename="attendance-python-2026-11-13.xlsx"')).toBe(
      "attendance-python-2026-11-13.xlsx",
    );
    expect(attachmentFileName("attachment; filename=report.xlsx")).toBe("report.xlsx");
  });

  it("prefers the UTF-8 name, which carries what plain ASCII cannot", () => {
    expect(
      attachmentFileName(`attachment; filename="davamiyyet.xlsx"; filename*=UTF-8''davamiyy%C9%99t-%C5%9F%C9%99b%C9%99k%C9%99.xlsx`),
    ).toBe("davamiyyət-şəbəkə.xlsx");
  });

  it("never lets a name point outside the downloads folder", () => {
    expect(attachmentFileName('attachment; filename="../../etc/passwd"')).toBe("_.._etc_passwd");
    expect(attachmentFileName('attachment; filename="a\\\\b.xlsx"')).toBe("a_b.xlsx");
  });

  it("has no name when the header says none or is not there", () => {
    expect(attachmentFileName(undefined)).toBeNull();
    expect(attachmentFileName("attachment")).toBeNull();
    expect(attachmentFileName('attachment; filename=""')).toBeNull();
  });
});

describe("saveBlob", () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("saves the bytes under the name through a link, and lets the URL go afterwards", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    URL.createObjectURL = vi.fn(() => "blob:http://localhost/file");
    URL.revokeObjectURL = vi.fn();
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(`${this.download} ${this.href}`);
    });

    saveBlob(new Blob(["PK"]), "register.xlsx");

    expect(clicked).toEqual(["register.xlsx blob:http://localhost/file"]);
    expect(document.querySelector("a[download]")).toBeNull();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/file");
  });
});
