import { describe, expect, it } from "vitest";
import { MENU_GROUPS, filterMenuForRoles } from "./menu";
import { ROLES } from "@shared/constants/roles";

const groupIds = (roles: Parameters<typeof filterMenuForRoles>[1]) =>
  filterMenuForRoles(MENU_GROUPS, roles).map((g) => g.id);

describe("filterMenuForRoles", () => {
  it("hides the Administration and System groups from a tutor", () => {
    const ids = groupIds([ROLES.TUTOR]);
    expect(ids).toContain("teaching");
    expect(ids).not.toContain("admin");
    expect(ids).not.toContain("system");
  });

  it("shows Administration to an admin but never the System group", () => {
    const ids = groupIds([ROLES.ADMIN]);
    expect(ids).toContain("admin");
    expect(ids).not.toContain("system");
    // an admin is not a tutor, so the Teaching group is hidden
    expect(ids).not.toContain("teaching");
  });

  it("shows every group to a super admin", () => {
    const ids = groupIds([ROLES.SUPER_ADMIN]);
    expect(ids).toEqual(expect.arrayContaining(["admin", "system"]));
  });

  it("always shows role-less items (the General group) to everyone", () => {
    expect(groupIds([ROLES.TUTOR])).toContain("general");
    expect(groupIds([ROLES.ADMIN])).toContain("general");
  });
});
