// D09 설정관리 도메인 목업 데이터
// docs4 SCR-080A / 086 / 087 / 088 / 089 화면용 인라인 목업.
// 데이터 미연동 단계 — 화면 동작 검증용 더미값입니다.

// ─── SCR-080A 지점 자동화 적용 ─────────────────────────────────────────────
export type AutomationPolicyType =
  | "membership_expiry" // 회원 이용권 만료
  | "payment_due_expiry" // 결제기한 만료
  | "locker_expiry"; // 락커 만료

export interface AutomationStep {
  id: string;
  policyType: AutomationPolicyType;
  scope: "hq" | "branch"; // 본사 step / 지점 추가 step
  baseDay: string; // D-30, D-Day, D+1
  sendTime: string; // 발송 시각
  repeat: string; // 반복 주기
  channel: string; // 채널
  template: string; // 템플릿명
  enabled: boolean; // 지점 ON/OFF
  forcedOn: boolean; // 본사 강제 ON (잠금)
  updatedBy: string;
  updatedAt: string;
  conflict?: boolean; // 정책 충돌 행
}

export const AUTOMATION_POLICY_LABELS: Record<AutomationPolicyType, string> = {
  membership_expiry: "회원 이용권 만료",
  payment_due_expiry: "결제기한 만료",
  locker_expiry: "락커 만료",
};

export const AUTOMATION_STEPS: AutomationStep[] = [
  { id: "ms1", policyType: "membership_expiry", scope: "hq", baseDay: "D-30", sendTime: "10:00", repeat: "1회", channel: "회원앱 Push", template: "만료 예정 1차 안내", enabled: true, forcedOn: true, updatedBy: "본사", updatedAt: "2026-05-20 09:00" },
  { id: "ms2", policyType: "membership_expiry", scope: "hq", baseDay: "D-14", sendTime: "10:00", repeat: "1회", channel: "KakaoTalk fallback", template: "재등록 혜택 안내", enabled: true, forcedOn: false, updatedBy: "김지점", updatedAt: "2026-05-22 14:10" },
  { id: "ms3", policyType: "membership_expiry", scope: "branch", baseDay: "D-3", sendTime: "18:00", repeat: "1회", channel: "SMS", template: "지점 추가 안내", enabled: true, forcedOn: false, updatedBy: "김지점", updatedAt: "2026-05-25 11:30" },
  { id: "pd1", policyType: "payment_due_expiry", scope: "hq", baseDay: "D-7", sendTime: "09:00", repeat: "1회", channel: "회원앱 Push", template: "결제기한 안내", enabled: true, forcedOn: false, updatedBy: "본사", updatedAt: "2026-05-18 09:00" },
  { id: "pd2", policyType: "payment_due_expiry", scope: "hq", baseDay: "D-Day", sendTime: "09:00", repeat: "1회", channel: "회원앱 Push", template: "결제기한 당일 안내", enabled: false, forcedOn: false, updatedBy: "본사", updatedAt: "2026-05-18 09:00" },
  { id: "lk1", policyType: "locker_expiry", scope: "hq", baseDay: "D-5", sendTime: "11:00", repeat: "1회", channel: "회원앱 Push", template: "락커 만료 예정 안내", enabled: true, forcedOn: false, updatedBy: "본사", updatedAt: "2026-05-15 09:00", conflict: true },
  { id: "lk2", policyType: "locker_expiry", scope: "branch", baseDay: "D+1", sendTime: "11:00", repeat: "1회", channel: "SMS", template: "락커 회수 예정 안내", enabled: false, forcedOn: false, updatedBy: "김지점", updatedAt: "2026-05-24 16:20" },
];

export interface AssetRecoveryPolicy {
  id: string;
  name: string;
  defaultValue: "ON" | "OFF";
  enabled: boolean;
  fixed: boolean; // 고정 정책 (Owner도 변경 불가)
  control: string; // 제어 권한
  basis: string; // 동작 기준
  updatedBy: string;
  appliedScreen: string; // 적용 화면(D06)
}

export const ASSET_RECOVERY_POLICIES: AssetRecoveryPolicy[] = [
  { id: "ar1", name: "만료 경과 자동 회수", defaultValue: "OFF", enabled: false, fixed: false, control: "Owner(지점장)", basis: "매일 02:00 만료 락커 자동 해제 + 회원 알림", updatedBy: "김지점", appliedScreen: "락커 관리" },
  { id: "ar2", name: "이용권 만료 이벤트 자동 회수", defaultValue: "OFF", enabled: true, fixed: false, control: "Owner(지점장)", basis: "이용권 종료 이벤트 수신 시 연결 락커 회수", updatedBy: "김지점", appliedScreen: "락커 관리" },
  { id: "ar3", name: "일일 사물함 22:00 상태 갱신", defaultValue: "ON", enabled: true, fixed: true, control: "고정", basis: "매일 22:00 만료 사물함 overtime 표시", updatedBy: "본사", appliedScreen: "사물함 관리" },
  { id: "ar4", name: "일일 사물함 22:00 실제 일괄 회수", defaultValue: "OFF", enabled: false, fixed: false, control: "Owner(지점장)", basis: "22:00 overtime 사물함 일괄 회수 + 알림", updatedBy: "김지점", appliedScreen: "사물함 관리" },
  { id: "ar5", name: "운동복 일일 자동 만료/강제 회수", defaultValue: "OFF", enabled: false, fixed: false, control: "Owner(지점장)", basis: "매일 22:00 미반납 운동복 회수 처리 + 알림", updatedBy: "김지점", appliedScreen: "운동복 관리" },
];

// ─── SCR-087 커스텀 역할 생성 ──────────────────────────────────────────────
export interface CustomRole {
  id: string;
  name: string;
  description: string;
  baseRole: string; // 복사 베이스
  members: number; // 배정 직원 수
  createdAt: string;
  isSystem: boolean; // 기본 제공 역할
  permissions: string[]; // 허용 권한 요약
}

// 기본 제공 8종 역할명 (중복 검증용)
export const SYSTEM_ROLE_NAMES = [
  "superAdmin",
  "primary",
  "Owner(지점장)",
  "manager",
  "fc",
  "trainer",
  "staff",
  "readonly",
];

export const CUSTOM_ROLES: CustomRole[] = [
  { id: "r1", name: "시니어 트레이너", description: "체성분·목표 관리 권한이 추가된 트레이너", baseRole: "trainer", members: 3, createdAt: "2026-03-12", isSystem: false, permissions: ["수업관리", "회원조회", "출석처리", "체성분조회", "목표설정"] },
  { id: "r2", name: "FC (영업)", description: "리드·상담 중심 영업 담당", baseRole: "manager", members: 5, createdAt: "2026-02-28", isSystem: false, permissions: ["회원관리", "상담관리", "리드관리", "매출조회", "메시지발송"] },
  { id: "r3", name: "주말 데스크", description: "주말 한정 프론트 데스크 권한", baseRole: "staff", members: 0, createdAt: "2026-04-30", isSystem: false, permissions: ["회원조회", "출석처리", "POS결제"] },
];

// 권한 매트릭스 메뉴 그룹 (SCR-081 동일 구조)
export const ROLE_PERMISSION_MENUS: { group: string; menus: string[] }[] = [
  { group: "회원", menus: ["회원 목록", "회원 상세", "회원 등록/수정"] },
  { group: "수업", menus: ["수업/캘린더", "출석 처리"] },
  { group: "매출", menus: ["매출 현황", "POS 결제"] },
  { group: "시설", menus: ["락커 관리"] },
  { group: "메시지", menus: ["메시지 발송", "쿠폰 관리"] },
];

// ─── SCR-088 다국어 설정 ───────────────────────────────────────────────────
export interface SupportedLanguage {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "中文 (简体)", flag: "🇨🇳" },
];

export interface TranslationKeyStat {
  language: string;
  total: number;
  translated: number;
}

export const TRANSLATION_STATS: TranslationKeyStat[] = [
  { language: "한국어", total: 482, translated: 482 },
  { language: "English", total: 482, translated: 470 },
  { language: "日本語", total: 482, translated: 451 },
  { language: "中文 (简体)", total: 482, translated: 388 },
];

// ─── SCR-089 데이터 백업·복원 ─────────────────────────────────────────────
export type BackupStatus = "completed" | "running" | "failed" | "corrupted";

export interface BackupRecord {
  id: string;
  name: string;
  type: "auto" | "manual";
  size: string;
  status: BackupStatus;
  createdAt: string;
}

export const BACKUP_RECORDS: BackupRecord[] = [
  { id: "b1", name: "자동 백업", type: "auto", size: "2.8GB", status: "completed", createdAt: "2026-05-29 03:30" },
  { id: "b2", name: "수동 백업 — 배포 전", type: "manual", size: "2.7GB", status: "completed", createdAt: "2026-05-28 14:30" },
  { id: "b3", name: "자동 백업", type: "auto", size: "2.7GB", status: "completed", createdAt: "2026-05-28 03:30" },
  { id: "b4", name: "자동 백업", type: "auto", size: "2.6GB", status: "corrupted", createdAt: "2026-05-27 03:30" },
  { id: "b5", name: "자동 백업", type: "auto", size: "2.6GB", status: "failed", createdAt: "2026-05-26 03:30" },
];

export interface RestoreRecord {
  id: string;
  restoredAt: string;
  backupPoint: string;
  executor: string;
}

export const RESTORE_RECORDS: RestoreRecord[] = [
  { id: "rs1", restoredAt: "2026-05-10 02:14", backupPoint: "2026-05-09 03:30", executor: "슈퍼관리자" },
  { id: "rs2", restoredAt: "2026-04-22 11:48", backupPoint: "2026-04-21 03:30", executor: "슈퍼관리자" },
];
