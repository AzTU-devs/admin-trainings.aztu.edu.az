import { useEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";

const LANGS = [
  { value: "az", label: "Azərbaycanca" },
  { value: "en", label: "English" },
];

/**
 * The Settings page's shape: the state starts empty and is filled from the API
 * after the first render, inside a <form> (which makes Radix add its hidden
 * native <select>).
 */
function LoadedLater({ saved, onChange }: { saved: string; onChange?: (v: string) => void }) {
  const [value, setValue] = useState("");
  useEffect(() => setValue(saved), [saved]);
  return (
    <form>
      <Select
        value={value}
        onValueChange={(v) => {
          onChange?.(v);
          setValue(v);
        }}
      >
        <SelectTrigger aria-label="Language">
          <SelectValue placeholder="Choose a language" />
        </SelectTrigger>
        <SelectContent>
          {LANGS.map((l) => (
            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}

let warn: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;
const controlWarnings = () =>
  [...warn.mock.calls, ...error.mock.calls].map((a) => a.map(String).join(" ")).filter((m) => /controlled/.test(m));

afterEach(() => {
  warn?.mockRestore();
  error?.mockRestore();
});

describe("Select", () => {
  // Regression: /settings always showed "Choose a language". The saved value
  // arrived after mount, Radix's hidden native <select> had no <option> for it
  // yet, reported "" as a change, and the page stored "" over the saved locale.
  it("keeps a value that arrives after mount inside a form", async () => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
    const onChange = vi.fn();
    render(<LoadedLater saved="en" onChange={onChange} />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Language" })).toHaveTextContent("English"));
    // Give any late native change event a chance to land.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole("combobox", { name: "Language" })).toHaveTextContent("English");
    expect(onChange).not.toHaveBeenCalledWith("");
    expect(controlWarnings()).toEqual([]);
  });

  it("shows the placeholder for an empty value and stays controlled", async () => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(<LoadedLater saved="" />);
    expect(screen.getByRole("combobox", { name: "Language" })).toHaveTextContent("Choose a language");
    rerender(<LoadedLater saved="az" />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Language" })).toHaveTextContent("Azərbaycanca"));
    expect(controlWarnings()).toEqual([]);
  });

  // `value={x || undefined}` was the pattern that flipped a select between
  // uncontrolled and controlled (React warns both ways). A select given a
  // `value` prop at all is controlled for its whole life; null/undefined is
  // "nothing chosen".
  it("treats an undefined value as an empty controlled value", async () => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
    function Flipping() {
      const [v, setV] = useState("");
      return (
        <>
          <Select value={v || undefined} onValueChange={setV}>
            <SelectTrigger aria-label="Room"><SelectValue placeholder="Choose a room" /></SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button type="button" onClick={() => setV("")}>Reset</button>
        </>
      );
    }
    render(<Flipping />);
    await userEvent.click(screen.getByRole("combobox", { name: "Room" }));
    await userEvent.click(await screen.findByRole("option", { name: "English" }));
    expect(screen.getByRole("combobox", { name: "Room" })).toHaveTextContent("English");
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("combobox", { name: "Room" })).toHaveTextContent("Choose a room");
    expect(controlWarnings()).toEqual([]);
  });

  it("still reports a real choice", async () => {
    const onChange = vi.fn();
    render(<LoadedLater saved="az" onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Language" }));
    await userEvent.click(await screen.findByRole("option", { name: "English" }));
    expect(onChange).toHaveBeenLastCalledWith("en");
    expect(screen.getByRole("combobox", { name: "Language" })).toHaveTextContent("English");
  });
});
