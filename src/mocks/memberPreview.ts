import type { Branch } from "@/api/endpoints/auth";
import type { Member, MemberListParams, MemberStats } from "@/api/endpoints/members";
import type { TransferCheckResult } from "@/api/endpoints/memberTransfer";

export interface PreviewSaleRecord {
  id: number;
  saleDate: string;
  itemName: string;
  amount: number;
  salePrice: number;
  originalPrice: number;
  discountPrice: number;
  cash: number;
  card: number;
  mileageUsed: number;
  unpaid: number;
  paymentMethod: string;
  status: string;
}

export interface PreviewAttendanceRecord {
  id: number;
  checkInAt: string;
  checkOutAt: string | null;
  branchId: number;
}

export interface PreviewBodyRecord {
  id: number;
  date: string;
  weight: number;
  muscle: number;
  fat: number;
  bmi: number;
  pbf: number;
}

export interface PreviewLockerRecord {
  id: number;
  lockerNumber: string | null;
  status: string | null;
}

export interface PreviewContractRecord {
  id: number;
  createdAt: string;
  productName: string;
  status: string;
}

export interface PreviewMemberDetailBundle {
  member: Record<string, unknown>;
  sales: PreviewSaleRecord[];
  attendances: PreviewAttendanceRecord[];
  bodyRecords: PreviewBodyRecord[];
  locker: PreviewLockerRecord | null;
  contracts: PreviewContractRecord[];
}

export interface PreviewBodyMeasurement {
  id: number;
  date: string;
  weight: number;
  muscle: number;
  fat: number;
  pbf: number;
  bmi: number;
  bmr: number;
  bodyWater?: number | null;
}

export const previewBranches: Branch[] = [
  { id: 1, name: "강남점", address: "서울 강남구 테헤란로 100", phone: "02-1111-1111", status: "ACTIVE" },
  { id: 2, name: "잠실점", address: "서울 송파구 올림픽로 200", phone: "02-2222-2222", status: "ACTIVE" },
  { id: 3, name: "분당점", address: "경기 성남시 분당구 판교로 300", phone: "031-333-3333", status: "ACTIVE" },
];

export const previewMembers: Member[] = [
  {
    id: 1001,
    name: "김민지",
    phone: "010-1111-2222",
    email: "minji@example.com",
    gender: "F",
    birthDate: "1995-04-12",
    registeredAt: "2026-03-18T09:00:00.000Z",
    membershipType: "MEMBERSHIP",
    membershipStart: "2026-04-01",
    membershipExpiry: "2026-05-18",
    status: "ACTIVE",
    mileage: 12500,
    memo: "재등록 가능성 높음",
    height: 165,
    branchId: 1,
    isFavorite: true,
    lastVisitAt: "2026-04-24T08:30:00.000Z",
    memberType: "일반",
    referralSource: "네이버검색",
    companyName: "",
  },
  {
    id: 1002,
    name: "박준호",
    phone: "010-3333-4444",
    email: "junho@example.com",
    gender: "M",
    birthDate: "1989-11-03",
    registeredAt: "2025-12-10T10:00:00.000Z",
    membershipType: "PT",
    membershipStart: "2026-01-03",
    membershipExpiry: "2026-04-10",
    status: "EXPIRED",
    mileage: 3400,
    memo: "환불 문의 이력 있음",
    height: 178,
    branchId: 1,
    isFavorite: false,
    lastVisitAt: "2026-03-11T19:20:00.000Z",
    memberType: "일반",
    referralSource: "인스타그램",
    companyName: "",
  },
  {
    id: 1003,
    name: "이서연",
    phone: "010-5555-6666",
    email: "seoyeon@example.com",
    gender: "F",
    birthDate: "1992-08-21",
    registeredAt: "2025-09-15T09:20:00.000Z",
    membershipType: "GX",
    membershipStart: "2026-04-05",
    membershipExpiry: "2026-06-05",
    status: "HOLDING",
    mileage: 5200,
    memo: "장기 출장으로 홀딩 중",
    height: 162,
    branchId: 1,
    isFavorite: true,
    lastVisitAt: "2026-04-02T07:50:00.000Z",
    memberType: "일반",
    referralSource: "지인추천",
    companyName: "",
  },
  {
    id: 1004,
    name: "최현우",
    phone: "010-7777-8888",
    email: "hyunwoo@example.com",
    gender: "M",
    birthDate: "1986-01-15",
    registeredAt: "2024-11-08T13:00:00.000Z",
    membershipType: "MEMBERSHIP",
    membershipStart: "2026-02-01",
    membershipExpiry: "2026-06-30",
    status: "SUSPENDED",
    mileage: 0,
    memo: "장기 미수금으로 정지",
    height: 181,
    branchId: 1,
    isFavorite: false,
    lastVisitAt: "2026-01-11T18:00:00.000Z",
    memberType: "법인",
    referralSource: "법인제휴",
    companyName: "팬도주식회사",
  },
];

export const previewMemberStats: MemberStats = {
  total: previewMembers.length,
  active: previewMembers.filter((member) => member.status === "ACTIVE").length,
  inactive: previewMembers.filter((member) => member.status === "INACTIVE").length,
  expired: previewMembers.filter((member) => member.status === "EXPIRED").length,
  holding: previewMembers.filter((member) => member.status === "HOLDING").length,
  suspended: previewMembers.filter((member) => member.status === "SUSPENDED").length,
  expiredThisMonth: 1,
  newThisMonth: 2,
  expiringCount: 1,
};

export const previewMemberDetailMap: Record<number, PreviewMemberDetailBundle> = {
  1001: {
    member: {
      id: 1001,
      name: "김민지",
      phone: "010-1111-2222",
      email: "minji@example.com",
      gender: "F",
      birthDate: "1995-04-12",
      profileImage: null,
      registeredAt: "2026-03-18T09:00:00.000Z",
      membershipType: "MEMBERSHIP",
      membershipStart: "2026-04-01",
      membershipExpiry: "2026-05-18",
      status: "ACTIVE",
      mileage: 12500,
      memo: "재등록 가능성 높음",
      height: 165,
      branchId: 1,
      counselorName: "홍FC",
      specialNote: "운동 빈도 높음",
      visitSource: "네이버검색",
      exercisePurpose: "체지방 감량",
      adConsent: true,
      lastVisitAt: "2026-04-24T08:30:00.000Z",
    },
    sales: [
      { id: 1, saleDate: "2026-04-01", itemName: "헬스 3개월", amount: 390000, salePrice: 390000, originalPrice: 420000, discountPrice: 30000, cash: 0, card: 390000, mileageUsed: 0, unpaid: 0, paymentMethod: "CARD", status: "APPROVED" },
      { id: 2, saleDate: "2026-04-15", itemName: "PT 10회", amount: 550000, salePrice: 550000, originalPrice: 600000, discountPrice: 50000, cash: 0, card: 550000, mileageUsed: 0, unpaid: 0, paymentMethod: "CARD", status: "APPROVED" },
    ],
    attendances: [
      { id: 1, checkInAt: "2026-04-24T08:30:00.000Z", checkOutAt: "2026-04-24T10:02:00.000Z", branchId: 1 },
      { id: 2, checkInAt: "2026-04-22T18:10:00.000Z", checkOutAt: "2026-04-22T19:22:00.000Z", branchId: 1 },
      { id: 3, checkInAt: "2026-04-19T07:55:00.000Z", checkOutAt: "2026-04-19T09:12:00.000Z", branchId: 1 },
    ],
    bodyRecords: [
      { id: 1, date: "2026-03-18", weight: 63.4, muscle: 24.1, fat: 17.6, bmi: 23.3, pbf: 27.7 },
      { id: 2, date: "2026-04-01", weight: 62.5, muscle: 24.5, fat: 16.9, bmi: 22.9, pbf: 27.0 },
      { id: 3, date: "2026-04-15", weight: 61.8, muscle: 24.9, fat: 16.1, bmi: 22.7, pbf: 26.1 },
      { id: 4, date: "2026-04-24", weight: 61.2, muscle: 25.2, fat: 15.4, bmi: 22.5, pbf: 25.1 },
    ],
    locker: { id: 1, lockerNumber: "A-12", status: "IN_USE" },
    contracts: [
      { id: 1, createdAt: "2026-04-01T09:00:00.000Z", productName: "헬스 3개월", status: "ACTIVE" },
      { id: 2, createdAt: "2026-04-15T12:30:00.000Z", productName: "PT 10회", status: "ACTIVE" },
    ],
  },
  1002: {
    member: {
      id: 1002,
      name: "박준호",
      phone: "010-3333-4444",
      email: "junho@example.com",
      gender: "M",
      birthDate: "1989-11-03",
      profileImage: null,
      registeredAt: "2025-12-10T10:00:00.000Z",
      membershipType: "PT",
      membershipStart: "2026-01-03",
      membershipExpiry: "2026-04-10",
      status: "EXPIRED",
      mileage: 3400,
      memo: "환불 문의 이력 있음",
      height: 178,
      branchId: 1,
      counselorName: "정FC",
      specialNote: "재등록 보류",
      visitSource: "인스타그램",
      exercisePurpose: "근력 증가",
      adConsent: false,
      lastVisitAt: "2026-03-11T19:20:00.000Z",
    },
    sales: [
      { id: 3, saleDate: "2026-01-03", itemName: "PT 20회", amount: 1100000, salePrice: 1100000, originalPrice: 1200000, discountPrice: 100000, cash: 200000, card: 800000, mileageUsed: 0, unpaid: 100000, paymentMethod: "MIXED", status: "APPROVED" },
      { id: 4, saleDate: "2026-04-12", itemName: "환불 요청", amount: -250000, salePrice: -250000, originalPrice: 0, discountPrice: 0, cash: 0, card: -250000, mileageUsed: 0, unpaid: 0, paymentMethod: "CARD", status: "REFUNDED" },
    ],
    attendances: [
      { id: 4, checkInAt: "2026-03-11T19:20:00.000Z", checkOutAt: "2026-03-11T20:24:00.000Z", branchId: 1 },
      { id: 5, checkInAt: "2026-03-04T19:10:00.000Z", checkOutAt: "2026-03-04T20:05:00.000Z", branchId: 1 },
    ],
    bodyRecords: [
      { id: 5, date: "2026-01-10", weight: 81.2, muscle: 34.1, fat: 18.4, bmi: 25.6, pbf: 22.7 },
      { id: 6, date: "2026-02-20", weight: 80.5, muscle: 34.5, fat: 17.9, bmi: 25.4, pbf: 22.2 },
      { id: 7, date: "2026-03-12", weight: 80.7, muscle: 34.4, fat: 18.1, bmi: 25.5, pbf: 22.4 },
    ],
    locker: null,
    contracts: [
      { id: 3, createdAt: "2026-01-03T09:00:00.000Z", productName: "PT 20회", status: "EXPIRED" },
    ],
  },
};

export const previewStaffOptions = {
  fc: [
    { value: "", label: "선택 안함" },
    { value: "홍FC", label: "홍FC" },
    { value: "정FC", label: "정FC" },
  ],
  trainer: [
    { value: "", label: "선택 안함" },
    { value: "김트레이너", label: "김트레이너" },
    { value: "박트레이너", label: "박트레이너" },
  ],
};

export function getPreviewMembers(params?: MemberListParams, scenario = "default"): Member[] {
  let rows = [...previewMembers];

  if (scenario === "empty") return [];
  if (scenario === "favorites") rows = rows.filter((member) => member.isFavorite);
  if (scenario === "expired") rows = rows.filter((member) => member.status === "EXPIRED");
  if (scenario === "holding") rows = rows.filter((member) => member.status === "HOLDING");

  if (params?.status && params.status !== "all") {
    rows = rows.filter((member) => member.status === params.status);
  }

  if (params?.search) {
    const q = params.search.toLowerCase();
    rows = rows.filter((member) => member.name.toLowerCase().includes(q) || member.phone.includes(q));
  }

  if (params?.gender && params.gender !== "all") {
    rows = rows.filter((member) => member.gender === (params.gender === "male" ? "M" : "F"));
  }

  if (params?.product && params.product !== "all") {
    const product = params.product.toLowerCase();
    rows = rows.filter((member) => member.membershipType.toLowerCase().includes(product));
  }

  if (params?.isFavorite) {
    rows = rows.filter((member) => member.isFavorite);
  }

  if (params?.memberType && params.memberType !== "all") {
    rows = rows.filter((member) => member.memberType === params.memberType);
  }

  if (params?.referralSource && params.referralSource !== "all") {
    rows = rows.filter((member) => member.referralSource === params.referralSource);
  }

  const page = params?.page ?? 1;
  const size = params?.size ?? 20;
  const from = (page - 1) * size;
  const to = from + size;
  return rows.slice(from, to);
}

export function getPreviewMemberStats(scenario = "default"): MemberStats {
  if (scenario === "empty") {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      expired: 0,
      holding: 0,
      suspended: 0,
      expiredThisMonth: 0,
      newThisMonth: 0,
      expiringCount: 0,
    };
  }

  return previewMemberStats;
}

export function getPreviewMemberById(id: number) {
  return previewMembers.find((member) => member.id === id) ?? previewMembers[0];
}

export function getPreviewMemberDetail(memberId: number, scenario = "active"): PreviewMemberDetailBundle {
  if (scenario === "expired") return previewMemberDetailMap[1002];
  return previewMemberDetailMap[memberId] ?? previewMemberDetailMap[1001];
}

export function getPreviewTransferCheck(scenario = "eligible"): TransferCheckResult {
  if (scenario === "blocked") {
    return {
      canTransfer: false,
      blockers: ["미납금 100,000원 정산이 필요합니다.", "락커 반납이 필요합니다."],
      warnings: ["환불 이력 확인 후 이관을 진행하세요."],
      hasUnpaidAmount: true,
      unpaidAmount: 100000,
      hasLocker: true,
      hasActiveHolding: false,
      hasActivePt: false,
      ptRemainingSessions: 0,
      activeCoupons: 1,
      mileageBalance: 3400,
    };
  }

  return {
    canTransfer: true,
    blockers: [],
    warnings: ["담당 FC는 이관 후 재배정됩니다."],
    hasUnpaidAmount: false,
    unpaidAmount: 0,
    hasLocker: false,
    hasActiveHolding: false,
    hasActivePt: true,
    ptRemainingSessions: 6,
    activeCoupons: 2,
    mileageBalance: 12500,
  };
}

export function getPreviewBodyComposition(memberId: number, scenario = "default") {
  const bundle = getPreviewMemberDetail(memberId, scenario === "expired" ? "expired" : "active");
  const member = bundle.member as { id: number; name: string; height: number; birthDate: string; gender: string };
  const age = Math.floor((Date.now() - new Date(member.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  const measurements: PreviewBodyMeasurement[] = bundle.bodyRecords.map((record) => ({
    id: record.id,
    date: record.date,
    weight: record.weight,
    muscle: record.muscle,
    fat: record.fat,
    pbf: record.pbf,
    bmi: record.bmi,
    bmr: Math.round(10 * record.weight + 6.25 * member.height - 5 * age - (member.gender === "M" ? 5 : 161)),
    bodyWater: null,
  }));

  return {
    memberInfo: {
      id: String(member.id),
      name: member.name,
      age,
      gender: member.gender === "M" ? "남" : "여",
      height: member.height,
    },
    measurements,
    goals: scenario === "expired"
      ? { weight: 78, pbf: 20 }
      : { weight: 58, pbf: 22 },
  };
}
