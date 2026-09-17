import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  validateImageFile,
  validateVideoFile,
  videoContentType,
} from "./uploadConstraints";

/** A File of a declared size without allocating the bytes — 512 MB in a test is not free. */
function fakeFile(name: string, type: string, sizeBytes: number): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

const MB = 1024 * 1024;

describe("validateVideoFile", () => {
  it("accepts the three types the API's AllowedMediaType allows for video", () => {
    for (const type of ["video/mp4", "video/webm", "video/quicktime"]) {
      expect(validateVideoFile(fakeFile("clip", type, 10 * MB), 512)).toBeNull();
    }
  });

  it("refuses a container the API does not store, naming the ones it does", () => {
    const problem = validateVideoFile(fakeFile("lecture.avi", "video/x-msvideo", 10 * MB), 512);
    expect(problem).toContain("MP4, WebM or MOV");
  });

  it("refuses a file over the ceiling before it is sent, with both sizes in the message", () => {
    const problem = validateVideoFile(fakeFile("lecture.mp4", "video/mp4", 600 * MB), 512);
    expect(problem).toContain("600.0 MB");
    expect(problem).toContain("512 MB");
  });

  it("falls back to the extension when the browser reports no type", () => {
    // Windows commonly reports "" for .mov; the API would accept the file, so
    // refusing it here would be the client inventing a limit.
    expect(validateVideoFile(fakeFile("lecture.mov", "", 10 * MB), 512)).toBeNull();
    expect(validateVideoFile(fakeFile("lecture.avi", "", 10 * MB), 512)).not.toBeNull();
  });

  it("refuses an empty file", () => {
    expect(validateVideoFile(fakeFile("empty.mp4", "video/mp4", 0), 512)).toContain("empty");
  });
});

describe("validateImageFile", () => {
  it("accepts the five image types the API stores", () => {
    for (const type of ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]) {
      expect(validateImageFile(fakeFile("cover", type, 1 * MB), 10)).toBeNull();
    }
  });

  it("refuses SVG, which the API rejects as an executable document", () => {
    expect(validateImageFile(fakeFile("logo.svg", "image/svg+xml", 1024), 10)).not.toBeNull();
    // Also by extension, for the browsers that report no type for .svg.
    expect(validateImageFile(fakeFile("logo.svg", "", 1024), 10)).not.toBeNull();
  });

  it("refuses a script renamed to look like an image", () => {
    expect(validateImageFile(fakeFile("payload.js", "text/javascript", 2048), 10)).not.toBeNull();
    expect(validateImageFile(fakeFile("payload.php", "", 2048), 10)).not.toBeNull();
  });
});

describe("videoContentType", () => {
  it("forwards a type the API accepts", () => {
    expect(videoContentType(fakeFile("clip.mp4", "video/mp4", MB))).toBe("video/mp4");
  });

  it("claims nothing when the browser's type is not on the allowlist", () => {
    // The API reads the leading bytes when no usable claim is made; a wrong claim
    // would instead come back as MEDIA_TYPE_MISMATCH.
    expect(videoContentType(fakeFile("clip.mov", "", MB))).toBe("application/octet-stream");
    expect(videoContentType(fakeFile("clip.avi", "video/x-msvideo", MB))).toBe(
      "application/octet-stream",
    );
  });
});

describe("formatFileSize", () => {
  it("switches unit so the number stays readable", () => {
    expect(formatFileSize(512 * MB)).toBe("512.0 MB");
    expect(formatFileSize(2048 * MB)).toBe("2.00 GB");
    expect(formatFileSize(40 * 1024)).toBe("40 KB");
  });
});
