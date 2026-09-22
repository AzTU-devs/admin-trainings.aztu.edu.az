import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const vars = (text: string, re: RegExp) => [...new Set([...text.matchAll(re)].map((m) => m[1]))].sort();

/**
 * .env.example is the settings reference for whoever deploys the dashboard.
 * It kept VITE_REFRESH_BEFORE_EXPIRY_S and VITE_ENABLE_DARK_MODE after the code
 * stopped reading them: settings that do nothing, documented as if they did.
 */
describe(".env.example", () => {
  const example = vars(readFileSync(resolve(root, ".env.example"), "utf8"), /^(VITE_[A-Z0-9_]+)=/gm);
  const read = vars(readFileSync(resolve(__dirname, "env.ts"), "utf8"), /(?:str|num|bool)\("(VITE_[A-Z0-9_]+)"/g);

  it("lists only variables the code reads", () => {
    expect(example.filter((v) => !read.includes(v))).toEqual([]);
  });

  it("lists every variable the code reads", () => {
    expect(read.filter((v) => !example.includes(v))).toEqual([]);
  });
});
