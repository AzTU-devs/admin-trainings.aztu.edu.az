import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VideoUploader } from "./VideoUploader";

const clip = () => new File([new Uint8Array(1024)], "clip.mp4", { type: "video/mp4" });

describe("VideoUploader remove button", () => {
  // Regression: the X that removes the video was announced as "Cancel".
  it("is named for what it removes", async () => {
    const onChange = vi.fn();
    render(<VideoUploader value={clip()} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove video" }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("names the trailer on the course form", () => {
    render(<VideoUploader value={clip()} noun="trailer" />);
    expect(screen.getByRole("button", { name: "Remove trailer" })).toBeInTheDocument();
  });

  it("says Cancel upload while the file is being sent", async () => {
    const uploader = vi.fn(() => new Promise<string>(() => {}));
    render(<VideoUploader value={clip()} uploader={uploader} />);
    await userEvent.click(screen.getByRole("button", { name: "Start upload" }));
    expect(await screen.findByRole("button", { name: "Cancel upload" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove video" })).toBeNull();
  });
});
