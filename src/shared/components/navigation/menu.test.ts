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

  it("shows the training calendar to a super admin only, right after Courses", () => {
    const adminItems = (roles: Parameters<typeof filterMenuForRoles>[1]) =>
      filterMenuForRoles(MENU_GROUPS, roles)
        .find((g) => g.id === "admin")
        ?.items.map((i) => i.id) ?? [];
    const superItems = adminItems([ROLES.SUPER_ADMIN]);
    expect(superItems.indexOf("training-calendar")).toBe(superItems.indexOf("admin-courses") + 1);
    expect(adminItems([ROLES.ADMIN])).not.toContain("training-calendar");
  });

  it("shows the approval queues to a super admin only, each with its live count", () => {
    const items = (roles: Parameters<typeof filterMenuForRoles>[1]) =>
      filterMenuForRoles(MENU_GROUPS, roles).flatMap((g) => g.items);
    const superItems = items([ROLES.SUPER_ADMIN]);
    const ids = superItems.map((i) => i.id);
    expect(ids.indexOf("account-approvals")).toBe(ids.indexOf("users") - 1);
    expect(superItems.find((i) => i.id === "account-approvals")?.counter).toBe("accountApprovals");
    expect(superItems.find((i) => i.id === "enrollment-requests")?.counter).toBe("enrollmentRequests");
    for (const id of ["account-approvals", "enrollment-requests"]) {
      expect(items([ROLES.ADMIN]).map((i) => i.id)).not.toContain(id);
      expect(items([ROLES.TUTOR]).map((i) => i.id)).not.toContain(id);
    }
    // An expert's requests are counted on their Enrollments item.
    expect(items([ROLES.TUTOR]).find((i) => i.id === "enrollments")?.counter).toBe("enrollmentRequests");
  });

  it("always shows role-less items (the General group) to everyone", () => {
    expect(groupIds([ROLES.TUTOR])).toContain("general");
    expect(groupIds([ROLES.ADMIN])).toContain("general");
  });
});
