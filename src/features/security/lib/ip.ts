/**
 * Client-side check for a single IP address before it is blocked.
 *
 * The API matches blocked addresses by exact string, so anything else it is
 * given — a hostname, a CIDR range, a typo — is stored and then never matches
 * a request: the super admin believes an address is blocked while it is not.
 * Only a plain IPv4 or IPv6 address is accepted here.
 */
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export function isValidIp(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (IPV4.test(v)) return true;
  if (!v.includes(":") || /[^0-9a-fA-F:.]/.test(v)) return false;
  // The URL parser is a complete IPv6 grammar (compressed forms, embedded IPv4)
  // and is already in every browser.
  try {
    return new URL(`http://[${v}]/`).hostname.length > 2;
  } catch {
    return false;
  }
}
