import { supabase } from "@/lib/supabase";

type UserRoleEnum = "ADMIN" | "OWNER" | "MANAGER" | "TRAINER" | "STAFF" | "RECEPTIONIST" | "READONLY";
export type StaffFormRole = "owner" | "manager" | "fc" | "trainer" | "staff";
export type StaffAccountStatus = "ACTIVE" | "LOCKED" | "RESIGNED";

export interface StaffLinkedUser {
  id: number;
  username: string;
  name: string;
  email: string | null;
  role: string;
  branchId: number | null;
  isActive: boolean;
  lockedUntil: string | null;
  forcePasswordChange?: boolean | null;
}

interface FindLinkedUserParams {
  username?: string;
  email?: string | null;
  name: string;
  branchId: number;
}

interface UpsertStaffUserParams {
  existingUserId?: number | null;
  username: string;
  password?: string;
  name: string;
  email: string;
  role: StaffFormRole;
  branchId: number;
  accountStatus: StaffAccountStatus;
  forcePasswordChange: boolean;
}

interface UpsertStaffUserResult {
  user: StaffLinkedUser;
  authSynced: boolean;
  authReason?: string;
}

export function mapStaffFormRoleToUserRole(role: StaffFormRole): UserRoleEnum {
  switch (role) {
    case "owner":
      return "OWNER";
    case "manager":
      return "MANAGER";
    case "fc":
      return "TRAINER";
    case "trainer":
      return "TRAINER";
    case "staff":
    default:
      return "STAFF";
  }
}

export async function findLinkedUser(params: FindLinkedUserParams): Promise<StaffLinkedUser | null> {
  if (params.username?.trim()) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("username", params.username.trim())
      .limit(1)
      .maybeSingle();
    const byUsername = data as StaffLinkedUser | null;
    if (byUsername) return byUsername;
  }

  if (params.email?.trim()) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("email", params.email.trim())
      .eq("branchId", params.branchId)
      .limit(1)
      .maybeSingle();
    const byEmail = data as StaffLinkedUser | null;
    if (byEmail) return byEmail;
  }

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("name", params.name)
    .eq("branchId", params.branchId)
    .limit(1)
    .maybeSingle();
  return data as StaffLinkedUser | null;
}

async function callStaffAccountApi(payload: Record<string, unknown>) {
  const response = await fetch("/api/staff/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof json.error === "string" ? json.error : "직원 계정 처리에 실패했습니다.";
    throw new Error(message);
  }
  return json;
}

export async function upsertStaffUserAccount(params: UpsertStaffUserParams): Promise<UpsertStaffUserResult> {
  const json = await callStaffAccountApi({
    action: "upsert",
    existingUserId: params.existingUserId ?? null,
    username: params.username.trim(),
    password: params.password?.trim() || undefined,
    name: params.name,
    email: params.email,
    role: params.role,
    branchId: params.branchId,
    accountStatus: params.accountStatus,
    forcePasswordChange: params.forcePasswordChange,
  });

  const user = json.user as StaffLinkedUser;
  const auth = (json.auth ?? {}) as { synced?: boolean; reason?: string };

  return {
    user,
    authSynced: Boolean(auth.synced),
    authReason: auth.reason,
  };
}

export async function deactivateUsersForStaffRows(
  staffRows: Array<{ name: string; email?: string | null; branchId: number }>
) {
  if (staffRows.length === 0) return;
  await callStaffAccountApi({ action: "deactivate", staffRows });
}

export function generateTemporaryPassword() {
  const seed = Math.random().toString(36).slice(-4);
  return `Fit!${new Date().getFullYear()}${seed}`;
}
