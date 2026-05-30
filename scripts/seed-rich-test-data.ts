/**
 * Rich QA seed data for FitGenie CRM.
 *
 * 실행:
 *   pnpm exec tsx scripts/seed-rich-test-data.ts
 *
 * 원칙:
 * - 기존 데이터 삭제 없음
 * - QA 고정 ID 대역(910001~) 사용
 * - 재실행 가능하도록 id/unique key 기준 upsert
 * - 테이블/컬럼이 없는 환경은 해당 row를 skip
 */
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

type Row = Record<string, unknown>;

type ColumnMeta = {
  dataType: string;
  udtName: string;
};

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL 또는 DATABASE_URL이 필요합니다.");
}

const pool = new Pool({ connectionString });

const BASE = 910000;
const BRANCH_ID = 1;
const TENANT_ID = 1;
const PASSWORD = "qwer1234!!";
const NOW = new Date("2026-05-30T09:00:00+09:00");

const tableColumns = new Map<string, Map<string, ColumnMeta>>();
const summary = new Map<string, { upserted: number; skipped: number }>();

function addDays(days: number, hour = 9, minute = 0) {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function dateOnly(days: number) {
  return addDays(days).toISOString().slice(0, 10);
}

function iso(days: number, hour = 9, minute = 0) {
  return addDays(days, hour, minute).toISOString();
}

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function mark(table: string, key: "upserted" | "skipped") {
  const current = summary.get(table) ?? { upserted: 0, skipped: 0 };
  current[key] += 1;
  summary.set(table, current);
}

async function getColumns(table: string) {
  const cached = tableColumns.get(table);
  if (cached) return cached;

  const { rows } = await pool.query<{
    column_name: string;
    data_type: string;
    udt_name: string;
  }>(
    `
      select column_name, data_type, udt_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
    `,
    [table],
  );

  const map = new Map<string, ColumnMeta>();
  for (const row of rows) {
    map.set(row.column_name, { dataType: row.data_type, udtName: row.udt_name });
  }
  tableColumns.set(table, map);
  return map;
}

function normalizeValue(meta: ColumnMeta | undefined, value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!meta) return value;
  if (meta.dataType === "json" || meta.dataType === "jsonb") return JSON.stringify(value);
  return value;
}

async function upsert(table: string, row: Row, conflictColumns = ["id"], update = true) {
  const columns = await getColumns(table);
  if (columns.size === 0) {
    mark(table, "skipped");
    return;
  }

  const entries = Object.entries(row)
    .filter(([key, value]) => columns.has(key) && value !== undefined)
    .map(([key, value]) => [key, normalizeValue(columns.get(key), value)] as const);

  if (entries.length === 0) {
    mark(table, "skipped");
    return;
  }

  const usableConflict = conflictColumns.filter((key) => columns.has(key) && row[key] !== undefined);
  const names = entries.map(([key]) => quoteIdent(key)).join(", ");
  const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
  const values = entries.map(([, value]) => value);

  let sql = `insert into ${quoteIdent(table)} (${names}) values (${placeholders})`;
  if (usableConflict.length > 0) {
    const target = usableConflict.map(quoteIdent).join(", ");
    const updates = entries
      .map(([key]) => key)
      .filter((key) => !usableConflict.includes(key))
      .map((key) => `${quoteIdent(key)} = excluded.${quoteIdent(key)}`);
    sql += ` on conflict (${target}) do ${update && updates.length ? `update set ${updates.join(", ")}` : "nothing"}`;
  } else {
    sql += " on conflict do nothing";
  }

  await pool.query(sql, values);
  mark(table, "upserted");
}

async function insertOnly(table: string, row: Row, conflictColumns = ["id"]) {
  await upsert(table, row, conflictColumns, false);
}

async function seedFoundation() {
  await insertOnly("tenants", {
    id: TENANT_ID,
    name: "FitGenie CRM",
    plan: "PREMIUM",
    maxBranches: 20,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  });

  await insertOnly("branches", {
    id: BRANCH_ID,
    name: "광화문",
    address: "서울시 종로구 QA 기준 지점",
    phone: "02-1234-5678",
    status: "운영중",
    isActive: true,
    tenantId: TENANT_ID,
    isHq: false,
    branchCode: "BR001",
    districtCode: "A-1",
    districtName: "1지부",
    branchStatus: "ACTIVE",
    maxMembers: 3000,
    maxStaff: 80,
    maxLockers: 500,
    createdAt: NOW,
    updatedAt: NOW,
  });

  const users = [
    { id: BASE + 1, username: "qa_primary", name: "QA 슈퍼관리자", role: "ADMIN", branchId: null, isSuperAdmin: true, currentBranchId: BRANCH_ID },
    { id: BASE + 2, username: "qa_owner", name: "QA 지점장", role: "OWNER", branchId: BRANCH_ID, isSuperAdmin: false, currentBranchId: BRANCH_ID },
    { id: BASE + 3, username: "qa_manager", name: "QA 매니저", role: "MANAGER", branchId: BRANCH_ID, isSuperAdmin: false, currentBranchId: BRANCH_ID },
    { id: BASE + 4, username: "qa_trainer", name: "QA 트레이너", role: "TRAINER", branchId: BRANCH_ID, isSuperAdmin: false, currentBranchId: BRANCH_ID },
    { id: BASE + 5, username: "qa_staff", name: "QA 프론트", role: "STAFF", branchId: BRANCH_ID, isSuperAdmin: false, currentBranchId: BRANCH_ID },
    { id: BASE + 6, username: "qa_readonly", name: "QA 조회전용", role: "READONLY", branchId: BRANCH_ID, isSuperAdmin: false, currentBranchId: BRANCH_ID },
    { id: BASE + 7, username: "qa_locked", name: "QA 잠금계정", role: "STAFF", branchId: BRANCH_ID, isSuperAdmin: false, currentBranchId: BRANCH_ID, loginFailCount: 5, lockedUntil: iso(1, 10) },
  ];

  for (const user of users) {
    await upsert("users", {
      ...user,
      password: PASSWORD,
      email: `${user.username}@qa.fitgenie.local`,
      tenantId: TENANT_ID,
      isActive: user.username !== "qa_locked",
      forcePasswordChange: false,
      passwordChangedAt: iso(-10),
      lastLoginAt: user.username === "qa_locked" ? iso(-7) : iso(-1),
      createdAt: NOW,
      updatedAt: NOW,
    }, ["username"]);
  }
}

async function seedStaff() {
  const staff = [
    { id: BASE + 101, name: "QA 김지점", role: "지점장", position: "Branch Owner", staffStatus: "ACTIVE", salary: 4800000, color: "#0F766E" },
    { id: BASE + 102, name: "QA 박PT", role: "트레이너", position: "PT 리드", staffStatus: "ACTIVE", salary: 3600000, color: "#2563EB" },
    { id: BASE + 103, name: "QA 이GX", role: "트레이너", position: "GX 강사", staffStatus: "ACTIVE", salary: 3200000, color: "#7C3AED" },
    { id: BASE + 104, name: "QA 최프론트", role: "프론트", position: "데스크", staffStatus: "ACTIVE", salary: 2800000, color: "#EA580C" },
    { id: BASE + 105, name: "QA 휴직직원", role: "트레이너", position: "재활 PT", staffStatus: "ON_LEAVE", salary: 3100000, color: "#64748B", leaveStartAt: iso(-15), leaveEndAt: iso(30), leaveReason: "육아휴직" },
    { id: BASE + 106, name: "QA 잠금직원", role: "프론트", position: "야간 데스크", staffStatus: "LOCKED", salary: 2600000, color: "#DC2626", loginFailCount: 5, lockedUntil: iso(1, 8) },
    { id: BASE + 107, name: "QA 퇴사예정", role: "트레이너", position: "PT", staffStatus: "RESIGNED", salary: 3300000, color: "#475569", resignedAt: iso(-2), resignScheduledAt: iso(0), resignReason: "개인 사유" },
    { id: BASE + 108, name: "QA 이관직원", role: "매니저", position: "운영 매니저", staffStatus: "TRANSFERRED", salary: 3900000, color: "#0891B2", transferredFromBranchId: 2, transferredAt: iso(-20) },
  ];

  for (const s of staff) {
    await upsert("staff", {
      ...s,
      phone: `010-91${String(s.id).slice(-2)}-${String(s.id).slice(-4)}`,
      email: `staff${s.id}@qa.fitgenie.local`,
      hireDate: iso(-420),
      isActive: s.staffStatus !== "RESIGNED",
      branchId: BRANCH_ID,
      lastLoginAt: s.staffStatus === "LOCKED" ? iso(-5) : iso(-1),
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  const documents = [
    { id: BASE + 301, staffId: BASE + 102, docType: "employment_contract", fileName: "QA_박PT_근로계약서.pdf", status: "uploaded", memo: "근로계약서 원본 스캔" },
    { id: BASE + 302, staffId: BASE + 102, docType: "certificate", fileName: "QA_박PT_경력증명.pdf", status: "uploaded", memo: "이전 센터 경력 4년" },
    { id: BASE + 303, staffId: BASE + 105, docType: "other", fileName: "QA_휴직직원_휴직신청서.jpg", status: "uploaded", memo: "휴직 승인 검토 중" },
    { id: BASE + 304, staffId: BASE + 107, docType: "other", fileName: "QA_퇴사예정_퇴사신청서.pdf", status: "uploaded", memo: "퇴사 정산 필요" },
  ];
  for (const d of documents) {
    await upsert("staff_documents", {
      ...d,
      branchId: BRANCH_ID,
      filePath: `qa/staff/${d.staffId}/${d.fileName}`,
      fileUrl: `https://example.com/qa/staff/${d.staffId}/${encodeURIComponent(d.fileName)}`,
      mimeType: d.fileName.endsWith(".jpg") ? "image/jpeg" : "application/pdf",
      fileSize: 256000 + d.id,
      uploadedBy: "QA 매니저",
      uploadedAt: iso(-3),
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
}

async function seedProducts() {
  const groups = [
    { id: BASE + 401, name: "QA 이용권", sortOrder: 1 },
    { id: BASE + 402, name: "QA PT", sortOrder: 2 },
    { id: BASE + 403, name: "QA GX", sortOrder: 3 },
    { id: BASE + 404, name: "QA 부가서비스", sortOrder: 4 },
    { id: BASE + 405, name: "QA 상품", sortOrder: 5 },
  ];
  for (const g of groups) {
    await upsert("product_groups", {
      ...g,
      branchId: BRANCH_ID,
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  const products = [
    { id: BASE + 501, name: "QA 1개월 이용권", category: "MEMBERSHIP", price: 99000, duration: 30, productGroupId: BASE + 401, classType: "자유이용", deductionType: "기간", suspendLimit: 7, dailyUseLimit: 1 },
    { id: BASE + 502, name: "QA 3개월 이용권", category: "MEMBERSHIP", price: 270000, duration: 90, productGroupId: BASE + 401, classType: "자유이용", deductionType: "기간", suspendLimit: 14, dailyUseLimit: 1 },
    { id: BASE + 503, name: "QA 12개월 이용권", category: "MEMBERSHIP", price: 840000, duration: 365, productGroupId: BASE + 401, classType: "자유이용", deductionType: "기간", suspendLimit: 30, dailyUseLimit: 1 },
    { id: BASE + 504, name: "QA PT 10회", category: "PT", price: 700000, duration: 90, sessions: 10, productGroupId: BASE + 402, classType: "1:1", deductionType: "횟수", suspendLimit: 14, dailyUseLimit: 2 },
    { id: BASE + 505, name: "QA PT 30회", category: "PT", price: 1650000, duration: 180, sessions: 30, productGroupId: BASE + 402, classType: "1:1", deductionType: "횟수", suspendLimit: 30, dailyUseLimit: 2 },
    { id: BASE + 506, name: "QA GX 필라테스 월권", category: "GX", price: 180000, duration: 30, sessions: 12, productGroupId: BASE + 403, classType: "그룹", deductionType: "횟수", suspendLimit: 7, dailyUseLimit: 1 },
    { id: BASE + 507, name: "QA 운동복 세트", category: "PRODUCT", price: 45000, productGroupId: BASE + 405, classType: "판매상품", deductionType: "없음" },
    { id: BASE + 508, name: "QA 개인 락커 1개월", category: "SERVICE", price: 30000, duration: 30, productGroupId: BASE + 404, classType: "부가서비스", deductionType: "기간" },
    { id: BASE + 509, name: "QA 법인 임직원 이용권", category: "MEMBERSHIP", price: 650000, duration: 180, productGroupId: BASE + 401, classType: "법인권", deductionType: "기간", suspendLimit: 15 },
    { id: BASE + 510, name: "QA 체험 PT 2회", category: "PT", price: 90000, duration: 14, sessions: 2, productGroupId: BASE + 402, classType: "1:1", deductionType: "횟수" },
  ];

  for (const p of products) {
    await upsert("products", {
      ...p,
      description: `${p.name} 테스트 상품. 환불/미수/할부/수업 차감 검증용.`,
      isActive: true,
      branchId: BRANCH_ID,
      imageUrl: `https://example.com/qa/products/${p.id}.jpg`,
      imageMimeType: "image/jpeg",
      imageUpdatedAt: iso(-4),
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  await upsert("product_seasonal_prices", {
    id: BASE + 520,
    branchId: BRANCH_ID,
    name: "QA 여름 전환 특가",
    productIds: [BASE + 502, BASE + 504],
    productNames: ["QA 3개월 이용권", "QA PT 10회"],
    primaryProductId: BASE + 504,
    primaryProductName: "QA PT 10회",
    originalPrice: 970000,
    discountedPrice: 850000,
    discountRate: 12.37,
    discountType: "fixed_price",
    discountValue: 850000,
    startDate: dateOnly(-5),
    endDate: dateOnly(25),
    isActive: true,
    createdBy: "QA 매니저",
    createdAt: NOW,
    updatedAt: NOW,
  });

  const discountPolicies = [
    { id: BASE + 531, name: "QA 신규 10% 할인", type: "percentage", value: 10, minPeriod: 30, maxDiscount: 100000, conditions: { memberSegment: "신규", exclude: ["법인권"] } },
    { id: BASE + 532, name: "QA 재등록 5만원 할인", type: "fixed", value: 50000, minPeriod: 90, maxDiscount: 50000, conditions: { round: "재등록" } },
    { id: BASE + 533, name: "QA 가족 15% 할인", type: "percentage", value: 15, minPeriod: 30, maxDiscount: 150000, conditions: { familyGroupRequired: true } },
  ];
  for (const policy of discountPolicies) {
    await upsert("discount_policies", {
      ...policy,
      isActive: true,
      branchId: BRANCH_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
}

async function seedMembers() {
  const memberRows = [
    { id: BASE + 1001, name: "QA 정상 PT회원", status: "ACTIVE", membershipType: "PT", staffId: BASE + 102, mileage: 18000, referralSource: "온라인", isFavorite: true, membershipExpiry: iso(120), memo: "정상 PT/수업 차감/체성분 기준 회원" },
    { id: BASE + 1002, name: "QA 분할결제회원", status: "ACTIVE", membershipType: "PT", staffId: BASE + 102, mileage: 22000, referralSource: "지인소개", membershipExpiry: iso(180), memo: "POS 상품별 수납 정보 검증" },
    { id: BASE + 1003, name: "QA 미수금회원", status: "ACTIVE", membershipType: "MEMBERSHIP", staffId: BASE + 104, mileage: 4500, referralSource: "방문문의", membershipExpiry: iso(240), memo: "원 결제 내부 승인번호 기반 미수 납부 검증" },
    { id: BASE + 1004, name: "QA 부분환불회원", status: "ACTIVE", membershipType: "PT", staffId: BASE + 102, mileage: 9300, referralSource: "인스타", membershipExpiry: iso(150), memo: "상품별 부분환불 검증" },
    { id: BASE + 1005, name: "QA 환불상태회원", status: "EXPIRED", membershipType: "MEMBERSHIP", staffId: BASE + 104, mileage: 0, referralSource: "네이버", membershipExpiry: iso(-20), memo: "환불 요청/승인/반려 상태 검증" },
    { id: BASE + 1006, name: "QA 할부회원", status: "ACTIVE", membershipType: "PT", staffId: BASE + 102, mileage: 12500, referralSource: "전화문의", membershipExpiry: iso(365), memo: "할부 회차 납입/연체 검증" },
    { id: BASE + 1007, name: "QA 만료임박회원", status: "ACTIVE", membershipType: "MEMBERSHIP", staffId: BASE + 104, mileage: 3600, referralSource: "간판", membershipExpiry: iso(3), memo: "만료 D-3 알림/재등록 검증" },
    { id: BASE + 1008, name: "QA 만료회원", status: "EXPIRED", membershipType: "MEMBERSHIP", staffId: BASE + 104, mileage: 1200, referralSource: "기타", membershipExpiry: iso(-60), memo: "만료 회원 필터 검증" },
    { id: BASE + 1009, name: "QA 홀딩회원", status: "HOLDING", membershipType: "GX", staffId: BASE + 103, mileage: 8000, referralSource: "소개", membershipExpiry: iso(90), memo: "홀딩 상태/정지 해제 검증" },
    { id: BASE + 1010, name: "QA 정지회원", status: "SUSPENDED", membershipType: "MEMBERSHIP", staffId: BASE + 104, mileage: 200, referralSource: "온라인", membershipExpiry: iso(40), memo: "정지 플래그 검증" },
    { id: BASE + 1011, name: "QA 휴면회원", status: "DORMANT", membershipType: "MEMBERSHIP", staffId: BASE + 104, mileage: 0, referralSource: "일일입장", membershipExpiry: iso(-120), lastVisitAt: iso(-130), memo: "장기 미방문/휴면 전환 검증" },
    { id: BASE + 1012, name: "QA 탈퇴회원", status: "WITHDRAWN", membershipType: "PT", staffId: BASE + 102, mileage: 0, referralSource: "온라인", membershipExpiry: iso(-10), withdrawnAt: iso(-7), withdrawReason: "이사", privacyMaskedAt: iso(-7), memo: "탈퇴/개인정보 마스킹 검증" },
    { id: BASE + 1013, name: "QA 가족대표", status: "ACTIVE", membershipType: "MEMBERSHIP", staffId: BASE + 104, mileage: 11000, referralSource: "가족소개", membershipExpiry: iso(200), memo: "가족 회원 대표" },
    { id: BASE + 1014, name: "QA 가족구성원A", status: "ACTIVE", membershipType: "GX", staffId: BASE + 103, mileage: 5000, referralSource: "가족소개", membershipExpiry: iso(150), memo: "가족 회원 구성원" },
    { id: BASE + 1015, name: "QA 가족구성원B", status: "ACTIVE", membershipType: "PT", staffId: BASE + 102, mileage: 7000, referralSource: "가족소개", membershipExpiry: iso(150), memo: "가족 회원 구성원" },
    { id: BASE + 1016, name: "QA 법인기명회원", status: "ACTIVE", membershipType: "MEMBERSHIP", staffId: BASE + 104, mileage: 2500, memberType: "named_corporate", companyName: "QA테크", referralSource: "법인제휴", membershipExpiry: iso(180), memo: "법인 기명권/세금계산서 검증" },
    { id: BASE + 1017, name: "QA 법인무기명회원", status: "ACTIVE", membershipType: "MEMBERSHIP", staffId: BASE + 104, mileage: 0, memberType: "unnamed_corporate", companyName: "QA홀딩스", referralSource: "법인제휴", membershipExpiry: iso(180), memo: "법인 무기명권 검증" },
    { id: BASE + 1018, name: "QA 이관회원", status: "TRANSFERRED", membershipType: "MEMBERSHIP", staffId: BASE + 104, mileage: 3200, referralSource: "타지점", membershipExpiry: iso(90), homeBranchId: 2, memo: "지점 이관 이력 검증" },
    { id: BASE + 1019, name: "QA 체성분회원", status: "ACTIVE", membershipType: "PT", staffId: BASE + 102, mileage: 14000, referralSource: "체험", membershipExpiry: iso(240), memo: "체성분 추이/건강 요약 검증" },
    { id: BASE + 1020, name: "QA 노쇼회원", status: "ACTIVE", membershipType: "GX", staffId: BASE + 103, mileage: 1600, referralSource: "앱예약", membershipExpiry: iso(80), memo: "노쇼 누적/예약 제한 검증" },
  ];

  for (const member of memberRows) {
    await upsert("members", {
      ...member,
      phone: `010-91${String(member.id).slice(-2)}-${String(member.id).slice(-4)}`,
      email: `member${member.id}@qa.fitgenie.local`,
      gender: member.id % 2 === 0 ? "F" : "M",
      birthDate: iso(-12000 + (member.id % 2000)),
      registeredAt: iso(-90 + (member.id % 20)),
      membershipStart: iso(-30),
      profileImage: `https://example.com/qa/members/${member.id}.jpg`,
      height: 165 + (member.id % 18),
      branchId: BRANCH_ID,
      homeBranchId: member.homeBranchId ?? BRANCH_ID,
      memberType: member.memberType ?? "individual",
      isFavorite: member.isFavorite ?? false,
      lastVisitAt: member.lastVisitAt ?? iso(-(member.id % 25)),
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  await upsert("member_family_groups", {
    id: BASE + 1201,
    branchId: BRANCH_ID,
    name: "QA 김가족 그룹",
    representativeMemberId: BASE + 1013,
    representativeName: "QA 가족대표",
    memo: "가족 할인/대표 변경/구성원 결제 이력 검증",
    createdAt: NOW,
    updatedAt: NOW,
  });
  for (const row of [
    { id: BASE + 1202, memberId: BASE + 1013, memberName: "QA 가족대표", relationship: "본인", isRepresentative: true },
    { id: BASE + 1203, memberId: BASE + 1014, memberName: "QA 가족구성원A", relationship: "배우자", isRepresentative: false },
    { id: BASE + 1204, memberId: BASE + 1015, memberName: "QA 가족구성원B", relationship: "자녀", isRepresentative: false },
  ]) {
    await upsert("member_family_members", {
      ...row,
      groupId: BASE + 1201,
      joinedAt: iso(-20),
      createdAt: NOW,
    });
  }

  await upsert("member_merge_logs", {
    id: BASE + 1210,
    primaryMemberId: BASE + 1001,
    secondaryMemberId: BASE + 1008,
    branchId: BRANCH_ID,
    mergedBy: "QA 매니저",
    mergedAt: iso(-3),
    detail: { reason: "중복 휴대폰 병합 테스트", keptFields: ["phone", "sales"], removedFields: ["memo"] },
  });

  for (const row of [
    { memberId: BASE + 1001, goalWeight: 74.5, goalPbf: 18.0 },
    { memberId: BASE + 1019, goalWeight: 62.0, goalPbf: 21.5 },
    { memberId: BASE + 1020, goalWeight: 70.0, goalPbf: 19.0 },
  ]) {
    await upsert("member_goals", {
      id: BASE + 1220 + (row.memberId - BASE - 1000),
      ...row,
      createdAt: NOW,
      updatedAt: NOW,
    }, ["memberId"]);
  }

  const memoRows = [
    [BASE + 1001, "무릎 통증 이력. 하체 운동 시 RPE 7 이하 권장.", "건강", "QA 박PT"],
    [BASE + 1002, "분할결제 테스트 회원. 카드/현금/계좌이체 조합 확인.", "결제", "QA 최프론트"],
    [BASE + 1003, "미수금 잔액 회수 예정. 내부 승인번호 기준으로 납부 처리.", "미수", "QA 매니저"],
    [BASE + 1004, "PT 일부 회차 환불 요청. 원수납 행별 환불 가능액 확인.", "환불", "QA 매니저"],
    [BASE + 1019, "체지방률이 최근 3회 연속 개선. 월말 리포트 공유 예정.", "운동", "QA 박PT"],
  ];
  let memoId = BASE + 1230;
  for (const [memberId, content, category, author] of memoRows) {
    await upsert("member_memos", {
      id: memoId++,
      memberId,
      content,
      category,
      author,
      createdAt: iso(-2),
      updatedAt: NOW,
    });
  }

  let bodyId = BASE + 1300;
  for (const memberId of [BASE + 1001, BASE + 1019]) {
    for (let i = 0; i < 6; i++) {
      await upsert("body_compositions", {
        id: bodyId++,
        memberId,
        date: iso(-150 + i * 30),
        weight: memberId === BASE + 1019 ? 68.4 - i * 0.9 : 81.2 - i * 0.5,
        muscle: memberId === BASE + 1019 ? 26.5 + i * 0.3 : 33.1 + i * 0.2,
        fat: memberId === BASE + 1019 ? 19.8 - i * 0.6 : 21.2 - i * 0.3,
        fatRate: memberId === BASE + 1019 ? 29.0 - i * 0.8 : 26.1 - i * 0.4,
        bmi: memberId === BASE + 1019 ? 24.2 - i * 0.2 : 25.8 - i * 0.1,
        memo: `QA 체성분 ${i + 1}회차`,
        createdAt: NOW,
      });
    }
  }

  let bodyInfoId = BASE + 1350;
  for (const row of [
    { memberId: BASE + 1001, height: 176.2, weight: 78.4, bloodPressure: "122/78", heartRate: 68, notes: "무릎 보호대 착용 권장" },
    { memberId: BASE + 1019, height: 164.1, weight: 63.9, bloodPressure: "116/74", heartRate: 64, notes: "체지방 감량 목표 진행 중" },
    { memberId: BASE + 1020, height: 171.0, weight: 72.3, bloodPressure: "130/84", heartRate: 76, notes: "노쇼 후 재상담 필요" },
  ]) {
    await upsert("member_body_info", {
      id: bodyInfoId++,
      ...row,
      measuredAt: iso(-1),
      branchId: BRANCH_ID,
      createdAt: NOW,
    });
  }

  let evalId = BASE + 1360;
  for (const row of [
    { memberId: BASE + 1001, staffId: BASE + 102, staffName: "QA 박PT", category: "체력", score: 8, content: "하체 안정성 보완 필요. PT 10회차부터 중량 점진 증가." },
    { memberId: BASE + 1019, staffId: BASE + 102, staffName: "QA 박PT", category: "목표달성", score: 9, content: "체지방률 개선 속도 양호. 식단 기록 유지." },
    { memberId: BASE + 1020, staffId: BASE + 103, staffName: "QA 이GX", category: "수업참여", score: 4, content: "최근 예약 후 미출석 2회. 노쇼 정책 안내 필요." },
  ]) {
    await upsert("member_evaluations", {
      id: evalId++,
      ...row,
      branchId: BRANCH_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
}

async function seedSales() {
  const sales = [
    {
      id: BASE + 2001,
      memberId: BASE + 1002,
      memberName: "QA 분할결제회원",
      productId: null,
      productName: "QA 3개월 이용권 + QA PT 10회 + QA 개인 락커 1개월 + QA 운동복 세트",
      type: "POS",
      round: "신규",
      quantity: 4,
      originalPrice: 1045000,
      salePrice: 1045000,
      discountPrice: 0,
      amount: 1045000,
      paymentMethod: "MIXED",
      paymentType: "POS 상품별 결제",
      cash: 775000,
      card: 270000,
      mileageUsed: 0,
      approvalNo: "CRM-QA-SPLIT-001",
      status: "COMPLETED",
      unpaid: 0,
      staffId: BASE + 104,
      staffName: "QA 최프론트",
      durationMonths: 3,
      saleCategory: "일반",
      receiptIssued: true,
      memo: "CRM 내부 승인번호: CRM-QA-SPLIT-001\n상품 행별 고정금액 + 카드/계좌이체/현금 결제수단 검증",
      saleDate: iso(-1, 11),
    },
    {
      id: BASE + 2002,
      memberId: BASE + 1003,
      memberName: "QA 미수금회원",
      productId: BASE + 503,
      productName: "QA 12개월 이용권",
      type: "이용권",
      round: "신규",
      quantity: 1,
      originalPrice: 840000,
      salePrice: 840000,
      amount: 840000,
      paymentMethod: "MIXED",
      paymentType: "부분 수납",
      cash: 200000,
      card: 300000,
      approvalNo: "CRM-QA-UNPAID-001",
      status: "UNPAID",
      unpaid: 340000,
      staffId: BASE + 104,
      staffName: "QA 최프론트",
      durationMonths: 12,
      saleCategory: "일반",
      receiptIssued: true,
      memo: "CRM 내부 승인번호: CRM-QA-UNPAID-001\n최초 미수 540,000원 중 200,000원 회수",
      saleDate: iso(-12, 15),
    },
    {
      id: BASE + 2003,
      memberId: BASE + 1004,
      memberName: "QA 부분환불회원",
      productId: BASE + 505,
      productName: "QA PT 30회",
      type: "PT",
      round: "신규",
      quantity: 1,
      originalPrice: 1650000,
      salePrice: 1650000,
      amount: 1650000,
      paymentMethod: "MIXED",
      paymentType: "POS 분할 수납",
      cash: 750000,
      card: 900000,
      approvalNo: "CRM-QA-REFUND-001",
      status: "COMPLETED",
      unpaid: 0,
      staffId: BASE + 102,
      staffName: "QA 박PT",
      durationMonths: 6,
      saleCategory: "일반",
      penaltyAmount: 30000,
      memo: "CRM 내부 승인번호: CRM-QA-REFUND-001\n부분환불 300,000원 발생",
      saleDate: iso(-25, 12),
    },
    {
      id: BASE + 2004,
      memberId: BASE + 1004,
      memberName: "QA 부분환불회원",
      productId: BASE + 505,
      productName: "QA PT 30회 부분환불",
      type: "환불",
      round: "부분환불",
      quantity: 1,
      originalPrice: 0,
      salePrice: 0,
      amount: -300000,
      paymentMethod: "CARD",
      paymentType: "부분환불",
      cash: 0,
      card: -300000,
      approvalNo: "RF-QA-REFUND-001",
      status: "REFUNDED",
      unpaid: 0,
      originalSaleId: BASE + 2003,
      refundReason: "잔여 PT 회차 일부 환불",
      refundProcessedBy: "QA 매니저",
      refundProcessedAt: iso(-5, 14),
      staffId: BASE + 104,
      staffName: "QA 최프론트",
      memo: "원 결제 CRM-QA-REFUND-001의 카드 수납 행에서 부분환불",
      saleDate: iso(-5, 14),
    },
    {
      id: BASE + 2005,
      memberId: BASE + 1005,
      memberName: "QA 환불상태회원",
      productId: BASE + 502,
      productName: "QA 3개월 이용권",
      type: "이용권",
      round: "신규",
      originalPrice: 270000,
      salePrice: 270000,
      amount: 270000,
      paymentMethod: "CARD",
      paymentType: "일시불",
      card: 270000,
      approvalNo: "CRM-QA-REQ-001",
      status: "REFUND_REQUESTED",
      refundReason: "이용 전 환불 요청",
      unpaid: 0,
      staffId: BASE + 104,
      staffName: "QA 최프론트",
      saleDate: iso(-2, 10),
    },
    {
      id: BASE + 2006,
      memberId: BASE + 1005,
      memberName: "QA 환불상태회원",
      productId: BASE + 501,
      productName: "QA 1개월 이용권",
      type: "이용권",
      round: "신규",
      originalPrice: 99000,
      salePrice: 99000,
      amount: 99000,
      paymentMethod: "TRANSFER",
      paymentType: "계좌이체",
      cash: 99000,
      approvalNo: "CRM-QA-PENDING-001",
      status: "REFUND_PENDING",
      refundReason: "계좌 환불 승인 대기",
      unpaid: 0,
      staffId: BASE + 104,
      staffName: "QA 최프론트",
      saleDate: iso(-4, 10),
    },
    {
      id: BASE + 2007,
      memberId: BASE + 1005,
      memberName: "QA 환불상태회원",
      productId: BASE + 506,
      productName: "QA GX 필라테스 월권",
      type: "GX",
      round: "신규",
      originalPrice: 180000,
      salePrice: 180000,
      amount: 180000,
      paymentMethod: "CASH",
      paymentType: "현금",
      cash: 180000,
      approvalNo: "CRM-QA-REJECT-001",
      status: "REFUND_REJECTED",
      refundReason: "사용 기간 경과",
      unpaid: 0,
      staffId: BASE + 104,
      staffName: "QA 최프론트",
      memo: "환불 반려 사유 표시 검증",
      saleDate: iso(-15, 18),
    },
    {
      id: BASE + 2008,
      memberId: BASE + 1006,
      memberName: "QA 할부회원",
      productId: BASE + 505,
      productName: "QA PT 30회",
      type: "PT",
      round: "신규",
      originalPrice: 1650000,
      salePrice: 1650000,
      amount: 1650000,
      paymentMethod: "MIXED",
      paymentType: "할부 계약",
      card: 300000,
      approvalNo: "CRM-QA-INST-001",
      status: "UNPAID",
      unpaid: 1350000,
      staffId: BASE + 102,
      staffName: "QA 박PT",
      durationMonths: 6,
      memo: "선납 300,000원 + 6회 할부 계약",
      saleDate: iso(-20, 13),
    },
    {
      id: BASE + 2009,
      memberId: BASE + 1016,
      memberName: "QA 법인기명회원",
      productId: BASE + 509,
      productName: "QA 법인 임직원 이용권",
      type: "법인권",
      round: "신규",
      originalPrice: 650000,
      salePrice: 650000,
      amount: 650000,
      paymentMethod: "TRANSFER",
      paymentType: "계좌이체",
      cash: 650000,
      approvalNo: "CRM-QA-TAX-001",
      status: "COMPLETED",
      unpaid: 0,
      saleCategory: "법인권",
      receiptIssued: true,
      staffId: BASE + 104,
      staffName: "QA 최프론트",
      memo: "세금계산서 발행 대상",
      saleDate: iso(-8, 16),
    },
    {
      id: BASE + 2010,
      memberId: BASE + 1007,
      memberName: "QA 만료임박회원",
      productId: BASE + 503,
      productName: "QA 12개월 이용권",
      type: "이용권",
      round: "재등록",
      originalPrice: 840000,
      salePrice: 790000,
      discountPrice: 50000,
      amount: 790000,
      paymentMethod: "CARD",
      paymentType: "일시불",
      card: 790000,
      approvalNo: "CRM-QA-DEFER-001",
      status: "COMPLETED",
      unpaid: 0,
      durationMonths: 12,
      saleCategory: "재등록",
      staffId: BASE + 104,
      staffName: "QA 최프론트",
      memo: "선수익금 인식 테스트",
      saleDate: iso(-1, 18),
    },
    {
      id: BASE + 2011,
      memberId: BASE + 1013,
      memberName: "QA 가족대표",
      productId: BASE + 502,
      productName: "QA 3개월 이용권",
      type: "이용권",
      round: "재등록",
      originalPrice: 270000,
      salePrice: 229500,
      discountPrice: 40500,
      amount: 229500,
      paymentMethod: "CASH",
      paymentType: "현금",
      cash: 229500,
      approvalNo: "CRM-QA-CASH-001",
      status: "COMPLETED",
      receiptIssued: false,
      unpaid: 0,
      saleCategory: "가족할인",
      staffId: BASE + 104,
      staffName: "QA 최프론트",
      memo: "현금영수증 미발행 상태 검증",
      saleDate: iso(-6, 12),
    },
    {
      id: BASE + 2012,
      memberId: BASE + 1017,
      memberName: "QA 법인무기명회원",
      productId: BASE + 509,
      productName: "QA 법인 임직원 이용권",
      type: "법인권",
      round: "신규",
      originalPrice: 650000,
      salePrice: 650000,
      amount: 650000,
      paymentMethod: "CARD",
      paymentType: "결제링크",
      card: 0,
      approvalNo: "CRM-QA-LINK-001",
      status: "PENDING",
      unpaid: 650000,
      saleCategory: "법인권",
      staffId: BASE + 104,
      staffName: "QA 최프론트",
      memo: "결제링크 발송 후 미결제 상태",
      saleDate: iso(1, 10),
    },
  ];

  for (const sale of sales) {
    await upsert("sales", {
      quantity: 1,
      originalPrice: 0,
      salePrice: 0,
      discountPrice: 0,
      cash: 0,
      card: 0,
      mileageUsed: 0,
      penaltyAmount: 0,
      branchId: BRANCH_ID,
      assignedFcId: BASE + 102,
      receiptIssued: true,
      createdAt: NOW,
      updatedAt: NOW,
      ...sale,
    });
  }

  const paymentLines = [
    { id: BASE + 2101, saleId: BASE + 2001, memberId: BASE + 1002, productId: BASE + 502, productName: "QA 3개월 이용권", itemKey: "qa-membership-card", method: "CARD", amount: 270000, approvalNo: "CARD-QA-270", terminalId: "TERM-QA-01", refundedAmount: 0 },
    { id: BASE + 2102, saleId: BASE + 2001, memberId: BASE + 1002, productId: BASE + 504, productName: "QA PT 10회", itemKey: "qa-pt-transfer", method: "TRANSFER", amount: 700000, bankPayerName: "QA분할", transferConfirmNo: "TR-QA-700", refundedAmount: 0 },
    { id: BASE + 2103, saleId: BASE + 2001, memberId: BASE + 1002, productId: BASE + 508, productName: "QA 개인 락커 1개월", itemKey: "qa-locker-cash", method: "CASH", amount: 30000, cashReceiptIssued: true, cashReceiptType: "income", cashReceiptIdentifier: "01091021002", refundedAmount: 0 },
    { id: BASE + 2104, saleId: BASE + 2001, memberId: BASE + 1002, productId: BASE + 507, productName: "QA 운동복 세트", itemKey: "qa-apparel-cash", method: "CASH", amount: 45000, refundedAmount: 0 },
    { id: BASE + 2105, saleId: BASE + 2002, memberId: BASE + 1003, productId: BASE + 503, productName: "QA 12개월 이용권", itemKey: "qa-unpaid-card", method: "CARD", amount: 300000, approvalNo: "CARD-QA-UNPAID", refundedAmount: 0 },
    { id: BASE + 2106, saleId: BASE + 2002, memberId: BASE + 1003, productId: BASE + 503, productName: "QA 12개월 이용권 미수납부", itemKey: "qa-unpaid-transfer", method: "TRANSFER", amount: 200000, bankPayerName: "QA미수", transferConfirmNo: "TR-QA-UNPAID-1", refundedAmount: 0 },
    { id: BASE + 2107, saleId: BASE + 2003, memberId: BASE + 1004, productId: BASE + 505, productName: "QA PT 30회", itemKey: "qa-refund-card", method: "CARD", amount: 900000, approvalNo: "CARD-QA-REFUND", refundedAmount: 300000 },
    { id: BASE + 2108, saleId: BASE + 2003, memberId: BASE + 1004, productId: BASE + 505, productName: "QA PT 30회", itemKey: "qa-refund-transfer", method: "TRANSFER", amount: 750000, bankPayerName: "QA부분", transferConfirmNo: "TR-QA-750", refundedAmount: 0 },
    { id: BASE + 2109, saleId: BASE + 2004, memberId: BASE + 1004, productId: BASE + 505, productName: "QA PT 30회 부분환불", itemKey: "qa-refund-card-rf", lineType: "REFUND", method: "CARD", amount: 300000, originalLineId: BASE + 2107, approvalNo: "RF-CARD-QA-300", refundedAmount: 0 },
    { id: BASE + 2110, saleId: BASE + 2008, memberId: BASE + 1006, productId: BASE + 505, productName: "QA PT 30회 선납", itemKey: "qa-installment-prepaid", method: "CARD", amount: 300000, approvalNo: "CARD-QA-INST", refundedAmount: 0 },
    { id: BASE + 2111, saleId: BASE + 2009, memberId: BASE + 1016, productId: BASE + 509, productName: "QA 법인 임직원 이용권", itemKey: "qa-tax-transfer", method: "TRANSFER", amount: 650000, bankPayerName: "QA테크", transferConfirmNo: "TR-QA-TAX", refundedAmount: 0 },
    { id: BASE + 2112, saleId: BASE + 2011, memberId: BASE + 1013, productId: BASE + 502, productName: "QA 3개월 이용권", itemKey: "qa-family-cash", method: "CASH", amount: 229500, cashReceiptIssued: false, refundedAmount: 0 },
  ];

  for (const line of paymentLines) {
    await upsert("sale_payment_lines", {
      lineType: "PAYMENT",
      branchId: BRANCH_ID,
      cashReceiptIssued: false,
      createdAt: NOW,
      updatedAt: NOW,
      memo: "QA 상품별 수납/환불 배분 검증",
      ...line,
    });
  }

  await upsert("unpaid_collections", {
    id: BASE + 2201,
    saleId: BASE + 2002,
    branchId: BRANCH_ID,
    memberId: BASE + 1003,
    internalApprovalNo: "CRM-QA-UNPAID-001",
    method: "TRANSFER",
    amount: 200000,
    previousUnpaid: 540000,
    remainingUnpaid: 340000,
    paidAt: iso(-2, 17),
    bankPayerName: "QA미수",
    transferConfirmNo: "TR-QA-UNPAID-1",
    cashReceiptIssued: true,
    cashReceiptType: "income",
    cashReceiptIdentifier: "01091021003",
    memo: "원 결제 내부 승인번호 유지, 미수 일부 납부",
    processedBy: "QA 최프론트",
    createdAt: NOW,
  });

  await upsert("installment_contracts", {
    id: BASE + 2301,
    contractNo: "QA-INST-001",
    branchId: BRANCH_ID,
    memberId: BASE + 1006,
    memberName: "QA 할부회원",
    productId: BASE + 505,
    productName: "QA PT 30회",
    source: "현장 결제 연계",
    sourceSaleId: BASE + 2008,
    internalApprovalNo: "CRM-QA-INST-001",
    prepaidAmount: 300000,
    totalAmount: 1650000,
    roundCount: 6,
    status: "진행중",
    startDueDate: dateOnly(-10),
    refundInProgress: false,
    memo: "1회 납부, 2회 연체, 3~6회 예정",
    createdAt: NOW,
    updatedAt: NOW,
  }, ["contractNo"]);

  const roundStatus = [
    ["완료", -10, 225000, "CARD", "CARD-QA-INST-01"],
    ["미납", -1, 0, null, null],
    ["예정", 30, 0, null, null],
    ["예정", 60, 0, null, null],
    ["예정", 90, 0, null, null],
    ["예정", 120, 0, null, null],
  ] as const;
  for (let i = 0; i < roundStatus.length; i++) {
    const [status, dueOffset, paidAmount, method, approvalNo] = roundStatus[i];
    await upsert("installment_rounds", {
      id: BASE + 2310 + i,
      contractId: BASE + 2301,
      roundNo: i + 1,
      dueDate: dateOnly(dueOffset),
      amount: 225000,
      paidAmount,
      status,
      paidAt: paidAmount > 0 ? iso(dueOffset, 11) : null,
      method,
      approvalNo,
      terminalId: method ? "TERM-QA-INST" : null,
      cashReceiptIssued: false,
      memo: `QA 할부 ${i + 1}회차`,
      processedBy: paidAmount > 0 ? "QA 최프론트" : null,
      createdAt: NOW,
      updatedAt: NOW,
    }, ["contractId", "roundNo"]);
  }

  await upsert("tax_invoices", {
    id: BASE + 2401,
    invoiceNo: "QA-TAX-20260530-001",
    branchId: BRANCH_ID,
    saleId: BASE + 2009,
    memberId: BASE + 1016,
    memberName: "QA 법인기명회원",
    recipient: "QA테크",
    bizNo: "123-45-67890",
    email: "tax@qa-tech.local",
    issueDate: dateOnly(-7),
    supplyAmount: 590909,
    vatAmount: 59091,
    totalAmount: 650000,
    status: "발행 완료",
    emailSentAt: iso(-7, 13),
    memo: "법인권 세금계산서 발행 테스트",
    createdAt: NOW,
    updatedAt: NOW,
  }, ["invoiceNo"]);
  await upsert("tax_invoice_items", {
    id: BASE + 2402,
    invoiceId: BASE + 2401,
    productName: "QA 법인 임직원 이용권",
    qty: 1,
    unitPrice: 590909,
    supplyAmount: 590909,
    vatAmount: 59091,
    taxFree: false,
    createdAt: NOW,
  });

  await upsert("deferred_revenue", {
    id: BASE + 2501,
    saleId: BASE + 2010,
    memberId: BASE + 1007,
    memberName: "QA 만료임박회원",
    productName: "QA 12개월 이용권",
    totalAmount: 790000,
    recognizedAmount: 65833,
    remainingAmount: 724167,
    startDate: dateOnly(-1),
    endDate: dateOnly(364),
    branchId: BRANCH_ID,
    createdAt: NOW,
    updatedAt: NOW,
  });

  for (const target of [
    { id: BASE + 2601, period: "다음 달", targetMonth: "2026-06", targetAmount: 42000000, approvalStatus: "APPROVED", requestedBy: "QA 매니저" },
    { id: BASE + 2602, period: "다음 분기", targetMonth: "2026-Q3", targetAmount: 125000000, approvalStatus: "PENDING", requestedBy: "QA 지점장" },
    { id: BASE + 2603, period: "연간", targetMonth: "2026", targetAmount: 480000000, approvalStatus: "APPROVED", requestedBy: "QA 슈퍼관리자" },
  ]) {
    await upsert("sales_forecast_targets", {
      ...target,
      branchId: BRANCH_ID,
      createdAt: NOW,
      updatedAt: NOW,
    }, ["branchId", "period", "targetMonth"]);
  }
}

async function seedClassesAndAttendance() {
  const rooms = [
    { id: BASE + 3001, name: "QA PT룸 A", type: "PT", capacity: 1, status: "운영중", gate: "GATE-PT-A", description: "1:1 PT 전용", slots: [{ start: "07:00", end: "22:00" }] },
    { id: BASE + 3002, name: "QA GX룸", type: "GX", capacity: 18, status: "운영중", gate: "GATE-GX", description: "필라테스/요가", slots: [{ start: "09:00", end: "21:00" }] },
    { id: BASE + 3003, name: "QA 점검룸", type: "GX", capacity: 10, status: "점검중", gate: "GATE-MAINT", description: "장비 점검 중", slots: [] },
  ];
  for (const r of rooms) {
    await upsert("facility_rooms", {
      ...r,
      branchId: BRANCH_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  const classes = [
    { id: BASE + 3101, title: "QA PT 1:1 하체", type: "PT", staffId: BASE + 102, staffName: "QA 박PT", room: "QA PT룸 A", startTime: iso(0, 10), endTime: iso(0, 11), capacity: 1, booked: 1, targetType: "member", scheduleCategory: "수업", approvalStatus: "approved", lesson_status: "scheduled", member_id: BASE + 1001, member_name: "QA 정상 PT회원" },
    { id: BASE + 3102, title: "QA 필라테스 그룹", type: "GX", staffId: BASE + 103, staffName: "QA 이GX", room: "QA GX룸", startTime: iso(1, 19), endTime: iso(1, 20), capacity: 12, booked: 12, targetType: "member", scheduleCategory: "수업", approvalStatus: "approved", lesson_status: "scheduled" },
    { id: BASE + 3103, title: "QA 완료 서명 수업", type: "PT", staffId: BASE + 102, staffName: "QA 박PT", room: "QA PT룸 A", startTime: iso(-1, 14), endTime: iso(-1, 15), capacity: 1, booked: 1, approvalStatus: "approved", lesson_status: "completed", signature_url: "https://example.com/qa/signature.png", signature_at: iso(-1, 15), completed_at: iso(-1, 15), member_id: BASE + 1001, member_name: "QA 정상 PT회원" },
    { id: BASE + 3104, title: "QA 승인대기 상담", type: "PT", staffId: BASE + 102, staffName: "QA 박PT", room: "상담실", startTime: iso(2, 15), endTime: iso(2, 16), capacity: 1, booked: 0, targetType: "non_member", scheduleCategory: "상담", approvalStatus: "pending", lesson_status: "scheduled", memo: "회원앱 일정 변경 요청 승인 필요" },
    { id: BASE + 3105, title: "QA 반려된 예약", type: "GX", staffId: BASE + 103, staffName: "QA 이GX", room: "QA GX룸", startTime: iso(3, 20), endTime: iso(3, 21), capacity: 12, booked: 0, approvalStatus: "rejected", lesson_status: "cancelled", memo: "정원 초과 반려" },
  ];
  for (const c of classes) {
    await upsert("classes", {
      ...c,
      isRecurring: false,
      branchId: BRANCH_ID,
      cancel_deadline_hours: 3,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  const bookings = [
    { id: BASE + 3201, scheduleId: BASE + 3101, memberId: BASE + 1001, memberName: "QA 정상 PT회원", status: "BOOKED", lessonCountId: BASE + 3301, lessonCountDelta: 0 },
    { id: BASE + 3202, scheduleId: BASE + 3102, memberId: BASE + 1020, memberName: "QA 노쇼회원", status: "NO_SHOW", noShowAt: iso(-2, 20), lessonCountId: BASE + 3302, lessonCountDelta: 1, attendanceNote: "자동 노쇼 차감" },
    { id: BASE + 3203, scheduleId: BASE + 3102, memberId: BASE + 1014, memberName: "QA 가족구성원A", status: "WAITLIST", pushSentAt: iso(-1, 12), lessonCountId: BASE + 3303 },
    { id: BASE + 3204, scheduleId: BASE + 3103, memberId: BASE + 1001, memberName: "QA 정상 PT회원", status: "COMPLETED", attendedAt: iso(-1, 14), completedAt: iso(-1, 15), lessonCountId: BASE + 3301, lessonCountDelta: 1 },
    { id: BASE + 3205, scheduleId: BASE + 3105, memberId: BASE + 1015, memberName: "QA 가족구성원B", status: "CANCELLED", cancelReason: "회원 요청", lessonCountDelta: 0 },
  ];
  for (const b of bookings) {
    await upsert("lesson_bookings", {
      ...b,
      branchId: BRANCH_ID,
      createdAt: iso(-3),
      updatedAt: NOW,
      processedBy: "QA 시스템",
    });
  }

  const lessonCounts = [
    { id: BASE + 3301, memberId: BASE + 1001, productId: BASE + 504, productName: "QA PT 10회", totalCount: 10, usedCount: 4, startDate: dateOnly(-30), endDate: dateOnly(60) },
    { id: BASE + 3302, memberId: BASE + 1020, productId: BASE + 506, productName: "QA GX 필라테스 월권", totalCount: 12, usedCount: 5, startDate: dateOnly(-10), endDate: dateOnly(20) },
    { id: BASE + 3303, memberId: BASE + 1014, productId: BASE + 506, productName: "QA GX 필라테스 월권", totalCount: 12, usedCount: 0, startDate: dateOnly(-1), endDate: dateOnly(29) },
  ];
  for (const count of lessonCounts) {
    await upsert("lesson_counts", {
      ...count,
      branchId: BRANCH_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  for (const log of [
    { id: BASE + 3311, lessonCountId: BASE + 3301, memberId: BASE + 1001, scheduleId: BASE + 3103, bookingId: BASE + 3204, deductedAt: iso(-1, 15), lessonName: "QA 완료 서명 수업", delta: 1, reason: "completion_signature", note: "서명 완료 후 1회 차감" },
    { id: BASE + 3312, lessonCountId: BASE + 3302, memberId: BASE + 1020, scheduleId: BASE + 3102, bookingId: BASE + 3202, deductedAt: iso(-2, 20), lessonName: "QA 필라테스 그룹", delta: 1, reason: "no_show", note: "노쇼 자동 차감" },
  ]) {
    await upsert("lesson_count_logs", {
      ...log,
      branchId: BRANCH_ID,
      processedBy: "QA 시스템",
      createdAt: NOW,
    });
  }

  const attendance = [
    { id: BASE + 3401, memberId: BASE + 1001, memberName: "QA 정상 PT회원", checkInAt: iso(0, 9), checkOutAt: iso(0, 11), type: "PT", checkInMethod: "KIOSK", isOtherBranch: false },
    { id: BASE + 3402, memberId: BASE + 1002, memberName: "QA 분할결제회원", checkInAt: iso(-1, 18), checkOutAt: iso(-1, 20), type: "REGULAR", checkInMethod: "APP", isOtherBranch: false },
    { id: BASE + 3403, memberId: BASE + 1018, memberName: "QA 이관회원", checkInAt: iso(-2, 7), checkOutAt: iso(-2, 8), type: "REGULAR", checkInMethod: "MANUAL", isOtherBranch: true },
    { id: BASE + 3404, memberId: BASE + 1020, memberName: "QA 노쇼회원", checkInAt: iso(-10, 19), checkOutAt: null, type: "GX", checkInMethod: "APP", isOtherBranch: false },
  ];
  for (const a of attendance) {
    await upsert("attendance", {
      ...a,
      phone: `010-${String(a.memberId).slice(-4)}-${String(a.memberId).slice(-4)}`,
      branchId: BRANCH_ID,
      createdAt: NOW,
    });
  }

  for (const request of [
    { id: BASE + 3501, requestType: "change", memberId: BASE + 1001, memberName: "QA 정상 PT회원", memberPhone: "010-9101-1001", scheduleId: BASE + 3101, className: "QA PT 1:1 하체", classTime: "2026-05-30 10:00", instructor: "QA 박PT", desiredTime: "2026-05-31 11:00", status: "pending", alternativeDate: dateOnly(1), alternativeMemo: "오전 시간 선호" },
    { id: BASE + 3502, requestType: "cancel", memberId: BASE + 1020, memberName: "QA 노쇼회원", memberPhone: "010-9120-1020", scheduleId: BASE + 3102, className: "QA 필라테스 그룹", classTime: "2026-05-31 19:00", instructor: "QA 이GX", cancelReason: "개인 일정", status: "accepted", processedBy: "QA 매니저", processedAt: iso(-1, 17) },
    { id: BASE + 3503, requestType: "change", memberId: BASE + 1014, memberName: "QA 가족구성원A", memberPhone: "010-9114-1014", scheduleId: BASE + 3102, className: "QA 필라테스 그룹", classTime: "2026-05-31 19:00", instructor: "QA 이GX", desiredTime: "2026-06-01 19:00", status: "rejected", rejectReason: "대체 시간 정원 마감", processedBy: "QA 매니저", processedAt: iso(-1, 18) },
  ]) {
    await upsert("schedule_requests", {
      ...request,
      branchId: BRANCH_ID,
      requestedAt: iso(-2, 14),
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  for (const feedback of [
    { id: BASE + 3601, scheduleId: BASE + 3103, memberId: BASE + 1001, memberName: "QA 정상 PT회원", anonymous: false, className: "QA 완료 서명 수업", sessionType: "PT", instructor: "QA 박PT", rating: 5, comment: "서명 후 수업 완료 처리까지 정상 확인.", hidden: false },
    { id: BASE + 3602, scheduleId: BASE + 3102, memberId: BASE + 1020, memberName: "익명", anonymous: true, className: "QA 필라테스 그룹", sessionType: "GX", instructor: "QA 이GX", rating: 2, comment: "정원 초과 안내가 더 명확했으면 합니다.", hidden: false },
    { id: BASE + 3603, scheduleId: BASE + 3105, memberId: BASE + 1015, memberName: "QA 가족구성원B", anonymous: false, className: "QA 반려된 예약", sessionType: "GX", instructor: "QA 이GX", rating: 1, comment: "운영자 숨김 처리 테스트.", hidden: true },
  ]) {
    await upsert("class_feedbacks", {
      ...feedback,
      branchId: BRANCH_ID,
      classDate: dateOnly(-1),
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
}

async function seedFacilities() {
  for (const locker of [
    { id: BASE + 4001, number: "QA-A001", status: "AVAILABLE", memberId: null, memberName: null, zone: "A", password: "1234", memo: "즉시 배정 가능" },
    { id: BASE + 4002, number: "QA-A002", status: "IN_USE", memberId: BASE + 1001, memberName: "QA 정상 PT회원", assignedAt: iso(-30), expiresAt: iso(5), zone: "A", password: "2580", memo: "만료 임박 락커" },
    { id: BASE + 4003, number: "QA-B001", status: "MAINTENANCE", memberId: null, memberName: null, zone: "B", password: null, memo: "도어 센서 점검 중" },
    { id: BASE + 4004, number: "QA-C001", status: "IN_USE", memberId: BASE + 1007, memberName: "QA 만료임박회원", assignedAt: iso(-90), expiresAt: iso(-1), zone: "C", password: "0000", memo: "만료 초과 자동 회수 대상" },
  ]) {
    await upsert("lockers", {
      ...locker,
      branchId: BRANCH_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  for (const card of [
    { id: BASE + 4101, cardNo: "QA-RFID-0001", memberId: BASE + 1001, memberName: "QA 정상 PT회원", memberPhone: "010-9101-1001", userType: "회원", status: "활성", lockerNo: "QA-A002" },
    { id: BASE + 4102, cardNo: "QA-RFID-0002", memberId: BASE + 1010, memberName: "QA 정지회원", memberPhone: "010-9110-1010", userType: "회원", status: "해제", lockerNo: null },
    { id: BASE + 4103, cardNo: "QA-RFID-0003", memberId: null, memberName: "QA 직원 예비카드", memberPhone: null, userType: "직원", status: "분실", lockerNo: null },
  ]) {
    await upsert("rfid_cards", {
      ...card,
      branchId: BRANCH_ID,
      registeredAt: iso(-20),
      issuedAt: iso(-20),
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
}

async function seedStaffOps() {
  const statuses = [
    { staffId: BASE + 101, staffName: "QA 김지점", status: "normal", clockIn: iso(0, 8, 50), clockOut: iso(0, 18, 10), workHours: 9.3, workMinutes: 560 },
    { staffId: BASE + 102, staffName: "QA 박PT", status: "late", clockIn: iso(0, 10, 12), clockOut: iso(0, 19, 0), workHours: 8.8, workMinutes: 528, memo: "지각 12분" },
    { staffId: BASE + 103, staffName: "QA 이GX", status: "early_leave", clockIn: iso(0, 9, 0), clockOut: iso(0, 16, 30), workHours: 7.5, workMinutes: 450, memo: "조퇴 승인" },
    { staffId: BASE + 104, staffName: "QA 최프론트", status: "absent", clockIn: null, clockOut: null, workHours: 0, workMinutes: 0, memo: "무단 결근 확인 필요" },
  ];
  let attendanceId = BASE + 5001;
  for (const row of statuses) {
    await upsert("staff_attendance", {
      id: attendanceId++,
      ...row,
      date: dateOnly(0),
      source: "키오스크",
      corrections: row.status === "late" ? [{ by: "QA 매니저", reason: "교통 지연 증빙 확인", before: "late", after: "normal" }] : [],
      notes: row.memo,
      branchId: BRANCH_ID,
      createdAt: NOW,
    });
  }

  for (const policy of [
    { id: BASE + 5101, category: "lesson", job: "PT", payMethod: "혼합제", rank: "리드", baseSalary: 3200000, lessonUnitPrice: 25000, lessonRate: 0, salesCommission: 5, reRegCommission: 7, refundRule: "환불 시 지급 수당 차감", scope: "PT" },
    { id: BASE + 5102, category: "sales", job: "FC", payMethod: "고정급제", rank: "스태프", baseSalary: 2700000, lessonUnitPrice: 0, lessonRate: 0, salesCommission: 1, reRegCommission: 1, refundRule: "해당 없음", scope: "POS" },
    { id: BASE + 5103, category: "lesson", job: "GX", payMethod: "시급제", rank: "강사", baseSalary: 0, lessonUnitPrice: 60000, lessonRate: 60, salesCommission: 0, reRegCommission: 0, refundRule: "수업 완료 기준 지급", scope: "GX" },
  ]) {
    await upsert("salary_policies", {
      ...policy,
      branchId: BRANCH_ID,
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  for (const payroll of [
    { id: BASE + 5201, staffId: BASE + 102, staffName: "QA 박PT", year: 2026, month: 5, baseSalary: 3600000, bonus: 420000, deduction: 310000, netSalary: 3710000, status: "PENDING", paidAt: null },
    { id: BASE + 5202, staffId: BASE + 103, staffName: "QA 이GX", year: 2026, month: 5, baseSalary: 3200000, bonus: 180000, deduction: 270000, netSalary: 3110000, status: "PAID", paidAt: iso(-1, 13) },
    { id: BASE + 5203, staffId: BASE + 107, staffName: "QA 퇴사예정", year: 2026, month: 5, baseSalary: 3300000, bonus: 0, deduction: 250000, netSalary: 3050000, status: "PENDING", paidAt: null },
  ]) {
    await upsert("payroll", {
      ...payroll,
      details: [
        { label: "기본급", amount: payroll.baseSalary, type: "earning" },
        { label: "성과수당", amount: payroll.bonus, type: "earning" },
        { label: "4대보험/세금", amount: payroll.deduction, type: "deduction" },
      ],
      createdAt: NOW,
      updatedAt: NOW,
    }, ["staffId", "year", "month"]);
  }

  for (const delivery of [
    { id: BASE + 5301, payrollId: BASE + 5201, staffId: BASE + 102, sendStatus: "NOT_SENT", receiptStatus: "NONE", sentAt: null },
    { id: BASE + 5302, payrollId: BASE + 5202, staffId: BASE + 103, sendStatus: "SENT", receiptStatus: "READ", sentAt: iso(-1, 14) },
    { id: BASE + 5303, payrollId: BASE + 5203, staffId: BASE + 107, sendStatus: "VOID", receiptStatus: "UNAVAILABLE", sentAt: iso(-1, 14), voidedAt: iso(-1, 15) },
  ]) {
    await upsert("payroll_statement_deliveries", {
      ...delivery,
      branchId: BRANCH_ID,
      history: [
        { at: iso(-1, 14), action: delivery.sendStatus, by: "QA 매니저" },
      ],
      createdAt: NOW,
      updatedAt: NOW,
    }, ["payrollId"]);
  }

  await upsert("staff_transfer_log", {
    id: BASE + 5401,
    tenantId: TENANT_ID,
    staffId: BASE + 108,
    fromBranchId: 2,
    toBranchId: BRANCH_ID,
    fromRole: "매니저",
    toRole: "운영 매니저",
    approvedBy: BASE + 1,
    effectiveDate: iso(-20),
    createdAt: NOW,
  });

  await upsert("staff_settlements", {
    id: BASE + 5501,
    tenantId: TENANT_ID,
    staffId: BASE + 107,
    branchId: BRANCH_ID,
    unpaidSalary: 1200000,
    unpaidCommission: 350000,
    severancePay: 2800000,
    unusedLeavePay: 420000,
    advanceDeduction: 100000,
    totalAmount: 4670000,
    status: "PENDING",
    approvedBy: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

async function seedMarketingAndNotices() {
  for (const message of [
    { id: BASE + 6001, type: "SMS", title: "QA 만료 D-3 알림", content: "[FitGenie] 이용권이 3일 후 만료됩니다.", recipients: { count: 12, segment: "만료임박" }, sentAt: iso(-1, 10), status: "SENT" },
    { id: BASE + 6002, type: "KAKAO", title: "QA 노쇼 안내", content: "[FitGenie] 예약 후 미출석으로 1회 차감되었습니다.", recipients: { count: 3, segment: "노쇼" }, sentAt: iso(-2, 20), status: "SENT" },
    { id: BASE + 6003, type: "PUSH", title: "QA 예약 리마인더", content: "오늘 19:00 GX 수업이 있습니다.", recipients: { count: 24, segment: "오늘예약" }, scheduledAt: iso(0, 17), status: "SCHEDULED" },
    { id: BASE + 6004, type: "SMS", title: "QA 실패 메시지", content: "수신거부/번호오류 케이스", recipients: { count: 5, failed: 2 }, sentAt: iso(-3, 11), status: "FAILED" },
  ]) {
    await upsert("messages", {
      ...message,
      branchId: BRANCH_ID,
      createdAt: NOW,
    });
  }

  const coupons = [
    { id: BASE + 6101, name: "QA 신규 10% 쿠폰", code: "QA-WELCOME10", type: "할인율", value: 10, totalIssued: 100, totalUsed: 24, maxUsage: 1, conditions: "신규 회원, PT 제외", validityType: "period", validFrom: iso(-10), validUntil: iso(30) },
    { id: BASE + 6102, name: "QA 생일 3만원 쿠폰", code: "QA-BIRTH30", type: "정액할인", value: 30000, totalIssued: 20, totalUsed: 5, maxUsage: 1, conditions: "생일월 1회", validityType: "days", validDays: 30 },
    { id: BASE + 6103, name: "QA 만료 쿠폰", code: "QA-EXPIRED", type: "정액할인", value: 50000, totalIssued: 10, totalUsed: 0, maxUsage: 1, conditions: "만료 회원 재등록", validityType: "period", validFrom: iso(-60), validUntil: iso(-1), isActive: false },
  ];
  for (const coupon of coupons) {
    await upsert("coupons", {
      isActive: true,
      branchId: BRANCH_ID,
      memo: "QA 쿠폰 발급/사용/만료 검증",
      createdAt: NOW,
      updatedAt: NOW,
      ...coupon,
    });
  }

  for (const log of [
    { id: BASE + 6111, couponId: BASE + 6101, couponName: "QA 신규 10% 쿠폰", memberId: BASE + 1001, memberName: "QA 정상 PT회원", status: "unused", code: "QA-WELCOME10-1001" },
    { id: BASE + 6112, couponId: BASE + 6101, couponName: "QA 신규 10% 쿠폰", memberId: BASE + 1002, memberName: "QA 분할결제회원", status: "used", usedDate: dateOnly(-1), usedProduct: "QA PT 10회", code: "QA-WELCOME10-1002" },
    { id: BASE + 6113, couponId: BASE + 6103, couponName: "QA 만료 쿠폰", memberId: BASE + 1008, memberName: "QA 만료회원", status: "expired", code: "QA-EXPIRED-1008" },
  ]) {
    await upsert("coupon_issuance_logs", {
      ...log,
      branchId: BRANCH_ID,
      memberNo: String(log.memberId),
      issuedDate: dateOnly(-7),
      expiryDate: dateOnly(30),
      createdAt: NOW,
    });
  }

  for (const campaign of [
    { id: BASE + 6201, name: "QA 여름 재등록 캠페인", goal: "재등록", segment: "만료 D-30", segmentSize: 146, startDate: dateOnly(-3), endDate: dateOnly(20), status: "진행", channels: ["SMS", "KAKAO"], budget: 600000, reach: 3200, clicks: 240, conversions: 33, cost: 210000 },
    { id: BASE + 6202, name: "QA 휴면 복귀 캠페인", goal: "온보딩", segment: "90일 미방문", segmentSize: 58, startDate: dateOnly(3), endDate: dateOnly(25), status: "준비", channels: ["PUSH"], budget: 120000, reach: 0, clicks: 0, conversions: 0, cost: 0 },
    { id: BASE + 6203, name: "QA 법인권 안내", goal: "신규유치", segment: "법인회원", segmentSize: 20, startDate: dateOnly(-30), endDate: dateOnly(-2), status: "종료", channels: ["SMS", "EMAIL"], budget: 300000, reach: 480, clicks: 52, conversions: 6, cost: 180000 },
  ]) {
    await upsert("marketing_campaigns", {
      ...campaign,
      branchId: BRANCH_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  await upsert("referral_events", {
    id: BASE + 6301,
    branchId: BRANCH_ID,
    name: "QA 친구추천 6월",
    referrerReward: "마일리지 30,000P",
    refereeReward: "신규 10% 할인",
    startDate: dateOnly(-5),
    endDate: dateOnly(35),
    status: "진행",
    participants: 3,
    active: true,
    createdAt: NOW,
    updatedAt: NOW,
  });
  for (const record of [
    { id: BASE + 6311, referrer: "QA 가족대표", referee: "QA 가족구성원A", reward: "지급완료", status: "지급완료" },
    { id: BASE + 6312, referrer: "QA 정상 PT회원", referee: "QA 체성분회원", reward: "마일리지 30,000P", status: "지급대기" },
  ]) {
    await upsert("referral_records", {
      ...record,
      branchId: BRANCH_ID,
      eventId: BASE + 6301,
      eventName: "QA 친구추천 6월",
      date: dateOnly(-2),
      createdAt: NOW,
    });
  }

  for (const template of [
    { id: BASE + 6401, name: "QA 만료알림", channel: "카카오", content: "#{회원명}님 이용권 만료가 #{D_DAY}일 남았습니다.", approved: true },
    { id: BASE + 6402, name: "QA 미수안내", channel: "SMS", content: "#{회원명}님 미수금 #{금액}원이 남아 있습니다.", approved: true },
    { id: BASE + 6403, name: "QA 홍보초안", channel: "카카오", content: "여름 특가 이벤트 안내 초안", approved: false },
  ]) {
    await upsert("sms_templates", {
      ...template,
      branchId: BRANCH_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  for (const history of [
    { id: BASE + 6501, channel: "카카오", title: "QA 만료알림 대량발송", target: "만료 D-7", recipients: 42, success: 40, failed: 2, excluded: 3, cost: 6300, status: "완료", content: "만료 안내 발송" },
    { id: BASE + 6502, channel: "SMS", title: "QA 미수안내 발송", target: "미수금 보유", recipients: 8, success: 7, failed: 1, excluded: 0, cost: 1200, status: "부분실패", failReason: "번호 오류 1건", content: "미수금 안내" },
  ]) {
    await upsert("bulk_send_histories", {
      ...history,
      branchId: BRANCH_ID,
      sentAt: iso(-1, 12),
      createdAt: NOW,
    });
  }

  await upsert("ab_tests", {
    id: BASE + 6601,
    branchId: BRANCH_ID,
    name: "QA 재등록 문구 A/B",
    status: "진행",
    variantA: { name: "혜택 강조", sent: 120, open: 82, click: 18 },
    variantB: { name: "만료 임박 강조", sent: 120, open: 76, click: 24 },
    winner: null,
    startDate: dateOnly(-3),
    endDate: dateOnly(4),
    createdAt: NOW,
    updatedAt: NOW,
  });

  for (const contract of [
    { id: BASE + 6701, contractNo: "QA-EC-001", contractCategory: "member", contractType: "이용권 계약", targetId: BASE + 1001, targetName: "QA 정상 PT회원", targetPhone: "010-9101-1001", targetSub: "QA PT 10회", amount: 700000, signMode: "onsite", status: "서명 완료", signedAt: iso(-1, 11), remoteLinkSentAt: null },
    { id: BASE + 6702, contractNo: "QA-EC-002", contractCategory: "member", contractType: "원격 계약", targetId: BASE + 1007, targetName: "QA 만료임박회원", targetPhone: "010-9107-1007", targetSub: "QA 12개월 이용권", amount: 790000, signMode: "remote", status: "원격 서명 대기", signedAt: null, remoteLinkSentAt: iso(-1, 10) },
    { id: BASE + 6703, contractNo: "QA-EC-003", contractCategory: "staff", contractType: "근로 계약", targetId: BASE + 102, targetName: "QA 박PT", targetPhone: "010-9102-0102", targetSub: "트레이너", amount: 3600000, signMode: "onsite", status: "임시 저장", signedAt: null, remoteLinkSentAt: null },
  ]) {
    await upsert("electronic_contracts", {
      ...contract,
      branchId: BRANCH_ID,
      startDate: dateOnly(0),
      endDate: dateOnly(365),
      terms: "QA 전자계약 약관 본문",
      history: [{ at: iso(-1), action: contract.status, by: "QA 매니저" }],
      createdAt: NOW,
      updatedAt: NOW,
    }, ["contractNo"]);
  }

  for (const notice of [
    { id: BASE + 6801, title: "QA 운영 공지 고정", content: "테스트 데이터 기준 운영 공지입니다.", isPinned: true, targetRoles: ["all"], publishStart: iso(-1), publishEnd: iso(30) },
    { id: BASE + 6802, title: "QA 직원 전용 공지", content: "직원 권한별 노출 검증용 공지입니다.", isPinned: false, targetRoles: ["manager", "staff"], publishStart: iso(-1), publishEnd: iso(7) },
    { id: BASE + 6803, title: "QA 예약 공지 비공개", content: "비공개 공지 필터 검증입니다.", isPinned: false, isPublished: false, targetRoles: ["all"], publishStart: iso(1), publishEnd: iso(10) },
  ]) {
    await upsert("notices", {
      isPublished: true,
      authorId: BASE + 101,
      authorName: "QA 김지점",
      branchId: BRANCH_ID,
      publishedAt: iso(-1),
      createdAt: NOW,
      updatedAt: NOW,
      ...notice,
    });
  }
  for (const receipt of [
    { id: BASE + 6811, noticeId: BASE + 6801, userId: BASE + 2, userName: "QA 지점장" },
    { id: BASE + 6812, noticeId: BASE + 6801, userId: BASE + 5, userName: "QA 프론트" },
  ]) {
    await upsert("notice_read_receipts", {
      ...receipt,
      branchId: BRANCH_ID,
      readAt: iso(-1, 16),
    }, ["noticeId", "userId"]);
  }
}

async function seedSettingsAndLogs() {
  await upsert("settings", {
    id: BASE + 7001,
    branchId: BRANCH_ID,
    centerName: "FitGenie CRM QA 광화문",
    businessHoursOpen: "06:00",
    businessHoursClose: "23:00",
    holidays: ["SUNDAY"],
    smsEnabled: true,
    kakaoEnabled: true,
    pushEnabled: true,
    autoExpireNotify: true,
    expireNoticeDays: 7,
    theme: "light",
    createdAt: NOW,
    updatedAt: NOW,
  }, ["branchId"]);

  for (const setting of [
    { id: BASE + 7011, key: "payment.policy", value: { splitPayment: true, internalApprovalNo: "one-per-sale", cashReceiptRequired: "manual-confirm" }, updatedBy: "QA 매니저" },
    { id: BASE + 7012, key: "refund.policy", value: { partialRefund: true, penaltyDefaultRate: 10, requireManagerApproval: true }, updatedBy: "QA 매니저" },
    { id: BASE + 7013, key: "facility.iot", value: { lockerAutoCollectAt: "02:00", doorStatus: ["OK", "불안정", "오류", "점검 중"] }, updatedBy: "QA 매니저" },
  ]) {
    await upsert("branch_settings", {
      ...setting,
      branchId: BRANCH_ID,
      createdAt: NOW,
      updatedAt: NOW,
    }, ["branchId", "key"]);
  }

  await upsert("lesson_policy_settings", {
    branchId: BRANCH_ID,
    cancelDeadlineHours: 3,
    noShowDeductsSession: true,
    autoCompleteHours: 24,
    lateCancelPenalty: true,
    maxNoShowCount: 3,
    reservationAutoOpenHours: 48,
    waitlistEnabled: true,
    waitlistAutoPromote: true,
    noshowAutoDeduct: true,
    noshowDeductCount: 1,
    updatedAt: NOW,
  }, ["branchId"]);

  await upsert("auto_alarm_settings", {
    branchId: BRANCH_ID,
    steps: [
      { event: "expiry_d7", channel: "KAKAO", enabled: true },
      { event: "unpaid_d1", channel: "SMS", enabled: true },
      { event: "noshow", channel: "PUSH", enabled: true },
    ],
    events: [
      { code: "MBR_EXPIRING", label: "만료임박" },
      { code: "PAY_UNPAID", label: "미수금" },
    ],
    masterEnabled: true,
    senderNumber: "02-1234-5678",
    createdAt: NOW,
    updatedAt: NOW,
  }, ["branchId"]);

  await upsert("mileage_policy_settings", {
    branchId: BRANCH_ID,
    earnRate: 3,
    expiryMonths: 12,
    minUsage: 1000,
    maxUsagePerTx: 50000,
    productScopes: ["MEMBERSHIP", "PT", "GX"],
    excludedProductScopes: ["PRODUCT"],
    createdAt: NOW,
    updatedAt: NOW,
  }, ["branchId"]);

  await upsert("member_grade_settings", {
    branchId: BRANCH_ID,
    refreshCycle: "월간",
    downgradeProtection: true,
    createdAt: NOW,
    updatedAt: NOW,
  }, ["branchId"]);

  for (const rule of [
    { id: BASE + 7101, gradeCode: "VIP", gradeName: "VIP", sortOrder: 1, colorClass: "bg-purple-100 text-purple-700", minPaymentAmount: 3000000, minUsageMonths: 12, minVisitCount: 80, criteriaOperator: "AND", mileageRate: 5, discountRate: 10, currentMemberCount: 4 },
    { id: BASE + 7102, gradeCode: "GOLD", gradeName: "Gold", sortOrder: 2, colorClass: "bg-amber-100 text-amber-700", minPaymentAmount: 1500000, minUsageMonths: 6, minVisitCount: 40, criteriaOperator: "OR", mileageRate: 4, discountRate: 7, currentMemberCount: 18 },
    { id: BASE + 7103, gradeCode: "SILVER", gradeName: "Silver", sortOrder: 3, colorClass: "bg-slate-100 text-slate-700", minPaymentAmount: 500000, minUsageMonths: 3, minVisitCount: 15, criteriaOperator: "OR", mileageRate: 3, discountRate: 3, currentMemberCount: 56 },
  ]) {
    await upsert("member_grade_rules", {
      ...rule,
      branchId: BRANCH_ID,
      usePaymentAmount: true,
      useUsageMonths: true,
      useVisitCount: true,
      benefits: { coupon: `${rule.gradeName} 전용 쿠폰`, lockerPriority: rule.gradeCode === "VIP" },
      createdAt: NOW,
      updatedAt: NOW,
    }, ["branchId", "gradeCode"]);
  }

  await upsert("member_transfer_log", {
    id: BASE + 7201,
    tenantId: TENANT_ID,
    memberId: BASE + 1018,
    fromBranchId: 2,
    toBranchId: BRANCH_ID,
    transferType: "KEEP_TICKET",
    approvedBy: BASE + 1,
    reason: "근무지 변경에 따른 주 이용 지점 변경",
    createdAt: NOW,
  });

  await upsert("branch_closure_log", {
    id: BASE + 7301,
    tenantId: TENANT_ID,
    branchId: BRANCH_ID,
    announcedAt: iso(-20),
    closingDate: iso(45),
    totalMembers: 120,
    transferredMembers: 36,
    refundedMembers: 4,
    totalStaff: 12,
    status: "IN_PROGRESS",
    createdBy: BASE + 1,
    createdAt: NOW,
  });

  let auditId = BASE + 7401;
  for (const log of [
    { action: "LOGIN", targetType: "user", targetId: BASE + 1, detail: { result: "success", role: "primary" } },
    { action: "BRANCH_SWITCH", targetType: "branch", targetId: BRANCH_ID, fromBranchId: 2, toBranchId: BRANCH_ID, detail: { from: "을지로", to: "광화문" } },
    { action: "CREATE", targetType: "sale", targetId: BASE + 2001, detail: { internalApprovalNo: "CRM-QA-SPLIT-001" } },
    { action: "UPDATE", targetType: "refund", targetId: BASE + 2004, beforeValue: { status: "REFUND_PENDING" }, afterValue: { status: "REFUNDED" } },
    { action: "LOCK", targetType: "staff", targetId: BASE + 106, detail: { failCount: 5 } },
  ]) {
    await upsert("audit_log", {
      id: auditId++,
      tenantId: TENANT_ID,
      userId: BASE + 1,
      ipAddress: "127.0.0.1",
      userAgent: "QA Rich Seed",
      createdAt: iso(-1, 10 + (auditId % 5)),
      ...log,
    });
  }
}

async function seedConsultationsAndExercise() {
  const programs = [
    { id: BASE + 8001, name: "QA 체지방 감량 8주", category: "유산소+근력", difficulty: "중급", description: "체성분회원 감량 프로그램", exercises: [{ name: "러닝", duration: 30 }, { name: "스쿼트", sets: 4, reps: 12 }] },
    { id: BASE + 8002, name: "QA 재활 PT", category: "재활", difficulty: "초급", description: "무릎 통증 회원용", exercises: [{ name: "레그익스텐션", sets: 3, reps: 15 }, { name: "힙브릿지", sets: 3, reps: 15 }] },
  ];
  for (const p of programs) {
    await upsert("exercise_programs", {
      ...p,
      isActive: true,
      branchId: BRANCH_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  for (const assign of [
    { id: BASE + 8011, memberId: BASE + 1019, programId: BASE + 8001, assignedBy: BASE + 102, status: "active", expiresAt: iso(60) },
    { id: BASE + 8012, memberId: BASE + 1001, programId: BASE + 8002, assignedBy: BASE + 102, status: "completed", expiresAt: iso(-1) },
  ]) {
    await upsert("member_exercise_programs", {
      ...assign,
      assignedAt: iso(-30),
      branchId: BRANCH_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  let exerciseLogId = BASE + 8021;
  for (const log of [
    { memberId: BASE + 1019, programId: BASE + 8001, exerciseName: "트레드밀 인터벌", sets: null, reps: null, weight: null, duration: 35, distance: 4.2, notes: "심박 145 이하 유지" },
    { memberId: BASE + 1019, programId: BASE + 8001, exerciseName: "스쿼트", sets: 4, reps: 12, weight: 45.5, duration: null, distance: null, notes: "자세 안정" },
    { memberId: BASE + 1001, programId: BASE + 8002, exerciseName: "힙브릿지", sets: 3, reps: 15, weight: 0, duration: null, distance: null, notes: "무릎 통증 없음" },
  ]) {
    await upsert("exercise_logs", {
      id: exerciseLogId++,
      ...log,
      loggedAt: iso(-1, 10),
      branchId: BRANCH_ID,
      createdAt: NOW,
    });
  }

  let consultationId = BASE + 8101;
  for (const c of [
    { memberId: BASE + 1007, staffId: BASE + 104, staffName: "QA 최프론트", type: "재등록상담", content: "만료 D-3 재등록 상담. 12개월권 제안.", result: "보류", nextAction: "2026-06-01 재연락", status: "completed", inquiryType: null, source: "재등록", linkedSaleId: BASE + 2010, completedAt: iso(-1, 16) },
    { memberId: BASE + 1011, staffId: BASE + 104, staffName: "QA 최프론트", type: "상담", content: "휴면 회원 복귀 상담. GX 체험권 안내.", result: "미등록", nextAction: "쿠폰 발송", status: "completed", inquiryType: "TI", source: "전화문의", completedAt: iso(-2, 11) },
    { memberId: BASE + 1019, staffId: BASE + 102, staffName: "QA 박PT", type: "OT", content: "체성분 측정 후 감량 프로그램 배정.", result: "등록", nextAction: "주 2회 PT 진행", status: "completed", inquiryType: "WI", source: "체험", linkedSaleId: BASE + 2001, completedAt: iso(-5, 13) },
    { memberId: BASE + 1020, staffId: BASE + 103, staffName: "QA 이GX", type: "상담", content: "노쇼 2회 누적 안내 및 예약 정책 설명 예정.", result: "보류", nextAction: "방문 시 안내", status: "scheduled", inquiryType: "APP", source: "앱예약", scheduledAt: iso(1, 18) },
  ]) {
    await upsert("consultations", {
      id: consultationId++,
      ...c,
      scheduledAt: c.scheduledAt ?? iso(-1, 10),
      branchId: BRANCH_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  for (const template of [
    { id: BASE + 8201, name: "QA PT 1:1 기본", type: "PT", defaultCapacity: 1, defaultDuration: 60, description: "기본 PT 템플릿", color: "#2563EB" },
    { id: BASE + 8202, name: "QA GX 필라테스", type: "GX", defaultCapacity: 12, defaultDuration: 50, description: "그룹 필라테스 템플릿", color: "#7C3AED" },
    { id: BASE + 8203, name: "QA 상담/OT", type: "OT", defaultCapacity: 1, defaultDuration: 30, description: "상담/OT 템플릿", color: "#EA580C" },
  ]) {
    await upsert("class_templates", {
      ...template,
      isActive: true,
      branchId: BRANCH_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
}

async function main() {
  console.log("🌱 Rich QA seed 시작");
  await seedFoundation();
  await seedStaff();
  await seedProducts();
  await seedMembers();
  await seedSales();
  await seedClassesAndAttendance();
  await seedFacilities();
  await seedStaffOps();
  await seedMarketingAndNotices();
  await seedSettingsAndLogs();
  await seedConsultationsAndExercise();

  console.log("\n✅ Rich QA seed 완료");
  for (const [table, result] of [...summary.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  - ${table}: upsert ${result.upserted}, skip ${result.skipped}`);
  }
  console.log("\n테스트 로그인 계정:");
  console.log("  - qa_primary / qwer1234!!");
  console.log("  - qa_manager / qwer1234!!");
  console.log("  - qa_trainer / qwer1234!!");
  console.log("  - qa_staff / qwer1234!!");
}

main()
  .catch((error) => {
    console.error("❌ Rich QA seed 실패:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
