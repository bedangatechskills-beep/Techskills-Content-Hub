import { describe, expect, it } from "vitest";
import { can, isFinalApprover, parseAccess, type Access } from "@/lib/permissions/access";
import { visibleNav } from "@/lib/permissions/nav";
import type { ProfileRow } from "@/lib/supabase/database.types";

const baseProfile: ProfileRow = {
  id: "p1",
  auth_user_id: "u1",
  full_name: "Test",
  email: "test@example.com",
  photo_url: null,
  job_title: null,
  role_id: "r1",
  account_status: "active",
  work_status: "available",
  primary_team_id: null,
  is_final_approver: false,
  is_super_admin: false,
  can_verify_nepali: false,
  last_login_at: null,
  last_active_at: null,
  created_at: "2026-09-02T00:00:00Z",
  created_by: null,
  updated_at: "2026-09-02T00:00:00Z",
};

function access(overrides: Partial<ProfileRow> = {}, permissions: string[] = []): Access {
  return { profile: { ...baseProfile, ...overrides }, role: null, permissions, teams: [] };
}

describe("can()", () => {
  it("grants a permission held by the role", () => {
    expect(can(access({}, ["dm.review"]), "dm.review")).toBe(true);
  });
  it("denies a permission the role lacks", () => {
    expect(can(access({}, ["dm.review"]), "final.approve")).toBe(false);
  });
  it("super admin implies admin.* only", () => {
    const a = access({ is_super_admin: true });
    expect(can(a, "admin.users")).toBe(true);
    expect(can(a, "final.approve")).toBe(false);
  });
  it("disabled users have no permissions", () => {
    expect(can(access({ account_status: "disabled" }, ["admin.users"]), "admin.users")).toBe(false);
  });
});

describe("isFinalApprover()", () => {
  it("is the flag, not the admin permission", () => {
    expect(isFinalApprover(access({}, ["admin.users"]))).toBe(false);
    expect(isFinalApprover(access({ is_final_approver: true }))).toBe(true);
  });
});

describe("visibleNav()", () => {
  it("hides admin items without admin.users", () => {
    expect(visibleNav(access()).map((i) => i.href)).toEqual(["/"]);
  });
  it("shows admin items for admins", () => {
    expect(visibleNav(access({}, ["admin.users"])).map((i) => i.href)).toContain("/admin/users");
  });
});

describe("parseAccess()", () => {
  it("returns null for no profile", () => {
    expect(parseAccess(null)).toBeNull();
    expect(parseAccess({})).toBeNull();
  });
  it("fills missing arrays", () => {
    const a = parseAccess({ profile: baseProfile });
    expect(a?.permissions).toEqual([]);
    expect(a?.teams).toEqual([]);
  });
});
