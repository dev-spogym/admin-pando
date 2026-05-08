import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StaffFormRole = "owner" | "manager" | "fc" | "trainer" | "staff";
type StaffAccountStatus = "ACTIVE" | "LOCKED" | "RESIGNED";
type UserRoleEnum = "ADMIN" | "OWNER" | "MANAGER" | "TRAINER" | "STAFF" | "RECEPTIONIST" | "READONLY";

interface UpsertBody {
  action: "upsert";
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

interface DeactivateBody {
  action: "deactivate";
  staffRows: Array<{ name: string; email?: string | null; branchId: number }>;
}

type RequestBody = UpsertBody | DeactivateBody;

function mapStaffFormRoleToUserRole(role: StaffFormRole): UserRoleEnum {
  switch (role) {
    case "owner":
      return "OWNER";
    case "manager":
      return "MANAGER";
    case "fc":
    case "trainer":
      return "TRAINER";
    case "staff":
    default:
      return "STAFF";
  }
}

function buildLockedUntil(accountStatus: StaffAccountStatus): string | null {
  if (accountStatus !== "LOCKED") return null;
  const lockedUntil = new Date();
  lockedUntil.setFullYear(lockedUntil.getFullYear() + 10);
  return lockedUntil.toISOString();
}

function authEmailFromUsername(username: string) {
  return `${username.trim()}@spogym.local`;
}

async function syncAuthUser(params: {
  username: string;
  password?: string;
  email: string;
  name: string;
  role: StaffFormRole;
  branchId: number;
  accountStatus: StaffAccountStatus;
  forcePasswordChange: boolean;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { synced: false, reason: "service_role_missing" as const };
  }

  const authEmail = authEmailFromUsername(params.username);
  const isBanned = params.accountStatus !== "ACTIVE";
  const banDuration = isBanned ? "876000h" : "none";
  const userMeta = {
    name: params.name,
    role: params.role,
    branchId: params.branchId,
    contactEmail: params.email,
    forcePasswordChange: params.forcePasswordChange,
  };

  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) {
    return { synced: false, reason: "list_failed" as const, message: listError.message };
  }

  const existing = list.users.find((u) => u.email?.toLowerCase() === authEmail.toLowerCase());

  if (existing) {
    const updatePayload: Parameters<typeof admin.auth.admin.updateUserById>[1] = {
      email: authEmail,
      user_metadata: userMeta,
      ban_duration: banDuration,
    };
    if (params.password?.trim()) {
      updatePayload.password = params.password.trim();
    }
    const { error } = await admin.auth.admin.updateUserById(existing.id, updatePayload);
    if (error) return { synced: false, reason: "update_failed" as const, message: error.message };
    return { synced: true, authUserId: existing.id, created: false } as const;
  }

  if (!params.password?.trim()) {
    return { synced: false, reason: "password_required" as const };
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: authEmail,
    password: params.password.trim(),
    email_confirm: true,
    user_metadata: userMeta,
    ban_duration: banDuration,
  });

  if (error || !created.user) {
    return {
      synced: false,
      reason: "create_failed" as const,
      message: error?.message ?? "unknown auth create error",
    };
  }
  return { synced: true, authUserId: created.user.id, created: true } as const;
}

async function deactivateAuthUser(username: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return { synced: false, reason: "service_role_missing" as const };

  const authEmail = authEmailFromUsername(username);
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) return { synced: false, reason: "list_failed" as const };

  const existing = list.users.find((u) => u.email?.toLowerCase() === authEmail.toLowerCase());
  if (!existing) return { synced: true, authUserId: null } as const;

  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    ban_duration: "876000h",
  });
  if (error) return { synced: false, reason: "ban_failed" as const, message: error.message };
  return { synced: true, authUserId: existing.id } as const;
}

async function handleUpsert(admin: ReturnType<typeof getSupabaseAdmin>, body: UpsertBody) {
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 503 }
    );
  }

  const normalizedUsername = body.username.trim();
  if (!normalizedUsername) {
    return NextResponse.json({ ok: false, error: "username is required" }, { status: 400 });
  }

  const { data: duplicateRows, error: duplicateError } = await admin
    .from("users")
    .select("id")
    .eq("username", normalizedUsername)
    .limit(1);

  if (duplicateError) {
    return NextResponse.json({ ok: false, error: duplicateError.message }, { status: 500 });
  }

  const duplicate = duplicateRows?.[0] ?? null;
  if (duplicate && duplicate.id !== body.existingUserId) {
    return NextResponse.json(
      { ok: false, error: "이미 사용 중인 로그인 ID입니다." },
      { status: 409 }
    );
  }

  const isActive = body.accountStatus !== "RESIGNED" && body.accountStatus !== "LOCKED";
  const payload = {
    username: normalizedUsername,
    name: body.name,
    email: body.email,
    role: mapStaffFormRoleToUserRole(body.role),
    branchId: body.branchId,
    isActive,
    lockedUntil: buildLockedUntil(body.accountStatus),
    forcePasswordChange: body.forcePasswordChange,
    passwordChangedAt: body.forcePasswordChange ? null : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let savedUser: Record<string, unknown> | null = null;

  if (body.existingUserId) {
    const updatePayload: Record<string, unknown> = { ...payload };
    if (body.password?.trim()) {
      updatePayload.password = body.password.trim();
    }
    const { data, error } = await admin
      .from("users")
      .update(updatePayload)
      .eq("id", body.existingUserId)
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    savedUser = data as Record<string, unknown>;
  } else {
    if (!body.password?.trim()) {
      return NextResponse.json(
        { ok: false, error: "신규 직원 계정의 임시 비밀번호가 필요합니다." },
        { status: 400 }
      );
    }
    const { data, error } = await admin
      .from("users")
      .insert({
        ...payload,
        password: body.password.trim(),
        tenantId: 1,
        isSuperAdmin: false,
        currentBranchId: body.branchId,
        loginFailCount: 0,
        createdAt: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    savedUser = data as Record<string, unknown>;
  }

  const authResult = await syncAuthUser({
    username: normalizedUsername,
    password: body.password,
    email: body.email,
    name: body.name,
    role: body.role,
    branchId: body.branchId,
    accountStatus: body.accountStatus,
    forcePasswordChange: body.forcePasswordChange,
  });

  return NextResponse.json({
    ok: true,
    user: savedUser,
    auth: authResult,
  });
}

async function handleDeactivate(admin: ReturnType<typeof getSupabaseAdmin>, body: DeactivateBody) {
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 503 }
    );
  }

  const lockedUntil = buildLockedUntil("LOCKED");
  const results: Array<{ name: string; userId?: number; auth?: unknown; deactivated: boolean }> = [];

  for (const row of body.staffRows) {
    let query = admin
      .from("users")
      .select("id, username")
      .eq("name", row.name)
      .eq("branchId", row.branchId);

    if (row.email?.trim()) {
      query = query.eq("email", row.email.trim());
    }

    const { data: candidates, error } = await query.limit(1);
    if (error) {
      results.push({ name: row.name, deactivated: false });
      continue;
    }
    const linked = candidates?.[0];
    if (!linked) {
      results.push({ name: row.name, deactivated: false });
      continue;
    }

    const { error: updateError } = await admin
      .from("users")
      .update({
        isActive: false,
        lockedUntil,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", linked.id);

    if (updateError) {
      results.push({ name: row.name, userId: linked.id, deactivated: false });
      continue;
    }

    const authResult = await deactivateAuthUser(linked.username as string);
    results.push({ name: row.name, userId: linked.id, deactivated: true, auth: authResult });
  }

  return NextResponse.json({ ok: true, results });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;
    const admin = getSupabaseAdmin();

    if (body.action === "upsert") {
      return await handleUpsert(admin, body);
    }
    if (body.action === "deactivate") {
      return await handleDeactivate(admin, body);
    }
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[api/staff/account] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
