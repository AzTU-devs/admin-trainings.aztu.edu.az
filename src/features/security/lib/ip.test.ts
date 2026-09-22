import { describe, expect, it } from "vitest";
import { isValidIp } from "./ip";

describe("isValidIp", () => {
  it.each(["203.0.113.42", "10.0.0.1", "0.0.0.0", "255.255.255.255", "::1", "2001:db8::1", "::ffff:192.0.2.1"])(
    "accepts %s",
    (ip) => expect(isValidIp(ip)).toBe(true),
  );

  it.each(["", "  ", "256.1.1.1", "10.0.0", "10.0.0.0/8", "example.com", "1.2.3.4.5", "01.2.3.4", "2001:db8::g", "not an ip"])(
    "rejects %s",
    (ip) => expect(isValidIp(ip)).toBe(false),
  );
});
