// docs4 기획문서(V1+V2) ↔ src 화면/다이얼로그 동기화 레지스트리
//
// 목적:
//   1) docs4 SCR(화면)/DLG(다이얼로그) 코드 → 도메인 → 라우트(또는 호스트 화면) → 현재 구현 상태를
//      단일 진실원(SoT)으로 관리한다. docs4-sync 작업의 진행/검증 기준.
//   2) design-doc API(`src/app/api/design-doc/route.ts`)가 라우트로 도메인/SCR을 역조회해
//      docs4 도메인 파일의 해당 SCR 섹션을 Cmd+/ 패널에 노출하도록 한다.
//
// 규칙: docs4/** 는 읽기 전용. 이 파일은 docs4를 가리키기만 하며 docs4 내용을 수정하지 않는다.

export type Docs4Kind = "SCR" | "DLG";
export type Docs4Version = "V1" | "V2" | "both";
/** done: docs4 명세 충족 / stub: 화면은 있으나 미완(준비중·뼈대) / missing: 라우트 자체 없음 / dialog-pending: 호스트 화면에 다이얼로그 미연결 */
export type Docs4Status = "done" | "stub" | "missing" | "dialog-pending";
export type Docs4Domain =
  | "D01"
  | "D02"
  | "D03"
  | "D04"
  | "D05"
  | "D06"
  | "D07"
  | "D08"
  | "D09"
  | "D10"
  | "D11";

export interface Docs4Entry {
  /** docs4 화면/다이얼로그 코드 (예: SCR-M001, DLG-M021, SCR-050) */
  code: string;
  kind: Docs4Kind;
  domain: Docs4Domain;
  title: string;
  version: Docs4Version;
  /** SCR: 해당 화면 라우트. DLG: 비움 */
  route?: string;
  /** DLG: 이 다이얼로그가 연결되는 호스트 화면 라우트 */
  hostRoute?: string;
  status: Docs4Status;
}

/** 도메인 → docs4 폴더/본문 파일명 (V1/V2 공통 구조: `<버전>/<folder>/<body>.md`) */
export const DOCS4_DOMAIN_FILES: Record<Docs4Domain, { folder: string; body: string }> = {
  D01: { folder: "D01-공통", body: "공통.md" },
  D02: { folder: "D02-회원관리", body: "회원관리.md" },
  D03: { folder: "D03-매출관리", body: "매출관리.md" },
  D04: { folder: "D04-수업관리", body: "수업관리.md" },
  D05: { folder: "D05-상품관리", body: "상품관리.md" },
  D06: { folder: "D06-시설관리", body: "시설관리.md" },
  D07: { folder: "D07-직원관리", body: "직원관리.md" },
  D08: { folder: "D08-마케팅", body: "마케팅.md" },
  D09: { folder: "D09-설정관리", body: "설정관리.md" },
  D10: { folder: "D10-본사관리", body: "본사관리.md" },
  D11: { folder: "D11-통합운영", body: "통합운영.md" },
};

export const DOCS4_DOMAIN_LABELS: Record<Docs4Domain, string> = {
  D01: "공통",
  D02: "회원관리",
  D03: "매출관리",
  D04: "수업관리",
  D05: "상품관리",
  D06: "시설관리",
  D07: "직원관리",
  D08: "마케팅",
  D09: "설정관리",
  D10: "본사관리",
  D11: "통합운영",
};

// ─── 화면(SCR) 레지스트리 ──────────────────────────────────────────────────
export const DOCS4_SCREENS: Docs4Entry[] = [
  // ── D01 공통 ──
  { code: "SCR-100", kind: "SCR", domain: "D01", title: "로그인", version: "both", route: "/login", status: "done" },
  { code: "SCR-101", kind: "SCR", domain: "D01", title: "대시보드 통합", version: "V2", route: "/super-dashboard", status: "done" },
  { code: "SCR-102", kind: "SCR", domain: "D01", title: "사이드바 네비게이션", version: "V2", route: "(공통)", status: "stub" },
  { code: "SCR-103", kind: "SCR", domain: "D01", title: "글로벌 검색", version: "V2", route: "(공통)", status: "missing" },
  { code: "SCR-104", kind: "SCR", domain: "D01", title: "알림 센터", version: "both", route: "(공통)", status: "stub" },
  { code: "SCR-105", kind: "SCR", domain: "D01", title: "프로필 / 계정 설정", version: "V2", route: "/profile", status: "done" },
  { code: "SCR-106", kind: "SCR", domain: "D01", title: "비밀번호 재설정", version: "V2", route: "/reset-password", status: "done" },
  { code: "SCR-107", kind: "SCR", domain: "D01", title: "화면설계서 오버레이 (Cmd+/)", version: "V2", route: "(공통)", status: "done" },
  { code: "SCR-108", kind: "SCR", domain: "D01", title: "에러 페이지", version: "V2", route: "/not-found", status: "done" },
  { code: "SCR-109", kind: "SCR", domain: "D01", title: "로그아웃", version: "V2", route: "(공통)", status: "done" },

  // ── D02 회원관리 ──
  { code: "SCR-M001", kind: "SCR", domain: "D02", title: "회원 목록", version: "both", route: "/members", status: "done" },
  { code: "SCR-M002", kind: "SCR", domain: "D02", title: "회원 등록", version: "both", route: "/members/new", status: "done" },
  { code: "SCR-M003", kind: "SCR", domain: "D02", title: "회원 수정", version: "both", route: "/members/edit", status: "done" },
  { code: "SCR-M004", kind: "SCR", domain: "D02", title: "회원 상세", version: "both", route: "/members/detail", status: "done" },
  { code: "SCR-M005", kind: "SCR", domain: "D02", title: "회원 이관", version: "both", route: "/members/transfer", status: "done" },
  { code: "SCR-M006", kind: "SCR", domain: "D02", title: "체성분 관리", version: "both", route: "/body-composition", status: "done" },
  { code: "SCR-M007", kind: "SCR", domain: "D02", title: "회원 병합", version: "V1", route: "/members/merge", status: "done" },
  { code: "SCR-M008", kind: "SCR", domain: "D02", title: "가족 회원", version: "V1", route: "/members/family", status: "done" },
  { code: "SCR-M009", kind: "SCR", domain: "D02", title: "등급 관리", version: "both", route: "/members/grade", status: "done" },
  { code: "SCR-M010", kind: "SCR", domain: "D02", title: "세그먼트 관리", version: "V1", route: "/members/segment", status: "done" },

  // ── D03 매출관리 ──
  { code: "SCR-S001", kind: "SCR", domain: "D03", title: "매출 현황", version: "both", route: "/sales", status: "done" },
  { code: "SCR-S002", kind: "SCR", domain: "D03", title: "POS 판매", version: "both", route: "/pos", status: "done" },
  { code: "SCR-S003", kind: "SCR", domain: "D03", title: "결제 처리", version: "both", route: "/pos/payment", status: "done" },
  { code: "SCR-S004", kind: "SCR", domain: "D03", title: "매출 통계", version: "both", route: "/sales/stats", status: "done" },
  { code: "SCR-S005", kind: "SCR", domain: "D03", title: "통계 관리", version: "both", route: "/sales/statistics-management", status: "done" },
  { code: "SCR-S006", kind: "SCR", domain: "D03", title: "선수익금 조회", version: "both", route: "/deferred-revenue", status: "done" },
  { code: "SCR-S007", kind: "SCR", domain: "D03", title: "환불 관리", version: "both", route: "/refunds", status: "done" },
  { code: "SCR-S008", kind: "SCR", domain: "D03", title: "미수금 관리", version: "both", route: "/unpaid", status: "done" },
  { code: "SCR-S009", kind: "SCR", domain: "D03", title: "할부결제 관리", version: "both", route: "/sales/installment", status: "done" },
  { code: "SCR-S010", kind: "SCR", domain: "D03", title: "세금계산서 발행", version: "both", route: "/sales/invoice", status: "done" },
  { code: "SCR-S011", kind: "SCR", domain: "D03", title: "매출 예측", version: "both", route: "/sales/forecast", status: "done" },
  { code: "SCR-S012", kind: "SCR", domain: "D03", title: "결제 취소 / 부분 환불", version: "both", route: "/sales/cancel-refund", status: "done" },

  // ── D04 수업관리 ──
  { code: "SCR-C001", kind: "SCR", domain: "D04", title: "수업 캘린더", version: "both", route: "/calendar", status: "done" },
  { code: "SCR-C002", kind: "SCR", domain: "D04", title: "수업 관리", version: "both", route: "/lessons", status: "done" },
  { code: "SCR-C003", kind: "SCR", domain: "D04", title: "시간표 일괄 등록", version: "V1", route: "/class-schedule", status: "done" },
  { code: "SCR-C004", kind: "SCR", domain: "D04", title: "그룹 수업 템플릿", version: "both", route: "/class-templates", status: "done" },
  { code: "SCR-C005", kind: "SCR", domain: "D04", title: "그룹 수업 현황", version: "both", route: "/class-stats", status: "done" },
  { code: "SCR-C006", kind: "SCR", domain: "D04", title: "강사 근무 현황", version: "both", route: "/instructor-status", status: "done" },
  { code: "SCR-C007", kind: "SCR", domain: "D04", title: "횟수 관리", version: "V1", route: "/lesson-counts", status: "done" },
  { code: "SCR-C008", kind: "SCR", domain: "D04", title: "페널티 관리", version: "V1", route: "/penalties", status: "done" },
  { code: "SCR-C009", kind: "SCR", domain: "D04", title: "일정 요청 처리", version: "V1", route: "/schedule-requests", status: "done" },
  { code: "SCR-C010", kind: "SCR", domain: "D04", title: "운동 프로그램 관리", version: "V2", route: "/exercise-programs", status: "done" },
  { code: "SCR-C011", kind: "SCR", domain: "D04", title: "유효 수업 목록", version: "both", route: "/valid-lessons", status: "done" },
  { code: "SCR-C012", kind: "SCR", domain: "D04", title: "대기열 관리", version: "both", route: "/class-waitlist", status: "done" },
  { code: "SCR-C013", kind: "SCR", domain: "D04", title: "수업 평가 피드백", version: "both", route: "/class-feedback", status: "done" },
  { code: "SCR-C015", kind: "SCR", domain: "D04", title: "수업 녹화 관리", version: "V2", route: "/class-recording", status: "done" },
  { code: "SCR-C016", kind: "SCR", domain: "D04", title: "예약 목록", version: "both", route: "/class-reservations", status: "done" },

  // ── D05 상품관리 ──
  { code: "SCR-P001", kind: "SCR", domain: "D05", title: "상품 관리", version: "both", route: "/products", status: "done" },
  { code: "SCR-P002", kind: "SCR", domain: "D05", title: "상품 등록", version: "both", route: "/products/new", status: "done" },
  { code: "SCR-P003", kind: "SCR", domain: "D05", title: "상품 상세/수정", version: "V1", route: "/products/detail", status: "done" },
  { code: "SCR-P004", kind: "SCR", domain: "D05", title: "할인 설정", version: "both", route: "/discount-settings", status: "done" },
  { code: "SCR-P005", kind: "SCR", domain: "D05", title: "상품 카탈로그", version: "V2", route: "/products/catalog", status: "done" },
  { code: "SCR-P006", kind: "SCR", domain: "D05", title: "상품 비교", version: "V2", route: "/products/compare", status: "done" },
  { code: "SCR-P007", kind: "SCR", domain: "D05", title: "재고 관리", version: "V2", route: "/products/inventory", status: "done" },
  { code: "SCR-P008", kind: "SCR", domain: "D05", title: "시즌 가격 관리", version: "both", route: "/products/seasonal-price", status: "done" },

  // ── D06 시설관리 ──
  { code: "SCR-050", kind: "SCR", domain: "D06", title: "락커 관리", version: "both", route: "/locker", status: "done" },
  { code: "SCR-051", kind: "SCR", domain: "D06", title: "사물함 배정 관리", version: "both", route: "/locker/management", status: "done" },
  { code: "SCR-052", kind: "SCR", domain: "D06", title: "밴드/카드 관리", version: "V1", route: "/rfid", status: "done" },
  { code: "SCR-053", kind: "SCR", domain: "D06", title: "운동룸 관리", version: "both", route: "/rooms", status: "done" },
  { code: "SCR-054", kind: "SCR", domain: "D06", title: "골프 타석 관리", version: "both", route: "/golf-bays", status: "done" },
  { code: "SCR-055", kind: "SCR", domain: "D06", title: "상품 재고 관리(시설)", version: "V2", route: "/products/inventory", status: "done" },
  { code: "SCR-056", kind: "SCR", domain: "D06", title: "장비 점검 일정", version: "V2", route: "/equipment-check", status: "done" },
  { code: "SCR-057", kind: "SCR", domain: "D06", title: "소모품 재고 관리", version: "V2", route: "/consumables", status: "stub" },
  { code: "SCR-058", kind: "SCR", domain: "D06", title: "청소 스케줄", version: "V2", route: "/cleaning-schedule", status: "stub" },
  { code: "SCR-059", kind: "SCR", domain: "D06", title: "공간 자산 관리", version: "V2", route: "/asset-management", status: "missing" },

  // ── D07 직원관리 ──
  { code: "SCR-060", kind: "SCR", domain: "D07", title: "직원 목록", version: "both", route: "/staff", status: "done" },
  { code: "SCR-061", kind: "SCR", domain: "D07", title: "직원 등록/수정", version: "V1", route: "/staff/new", status: "done" },
  { code: "SCR-062", kind: "SCR", domain: "D07", title: "직원 퇴사 처리", version: "V1", route: "/staff/resignation", status: "done" },
  { code: "SCR-063", kind: "SCR", domain: "D07", title: "직원 근태 관리", version: "both", route: "/staff/attendance", status: "done" },
  { code: "SCR-064", kind: "SCR", domain: "D07", title: "급여 관리", version: "both", route: "/payroll", status: "done" },
  { code: "SCR-065", kind: "SCR", domain: "D07", title: "급여 명세서", version: "both", route: "/payroll/statements", status: "done" },

  // ── D08 마케팅 ──
  { code: "SCR-070", kind: "SCR", domain: "D08", title: "리드 관리", version: "both", route: "/leads", status: "stub" },
  { code: "SCR-071", kind: "SCR", domain: "D08", title: "메시지 발송", version: "both", route: "/message", status: "done" },
  { code: "SCR-072", kind: "SCR", domain: "D08", title: "자동 알림 설정", version: "both", route: "/message/auto-alarm", status: "done" },
  { code: "SCR-073", kind: "SCR", domain: "D08", title: "쿠폰 관리", version: "both", route: "/message/coupon", status: "done" },
  { code: "SCR-074", kind: "SCR", domain: "D08", title: "마일리지 관리", version: "both", route: "/mileage", status: "done" },
  { code: "SCR-075", kind: "SCR", domain: "D08", title: "전자 계약", version: "both", route: "/contracts/new", status: "done" },
  { code: "SCR-076", kind: "SCR", domain: "D08", title: "캠페인 관리", version: "both", route: "/marketing/campaign", status: "stub" },
  { code: "SCR-077", kind: "SCR", domain: "D08", title: "리퍼럴 프로그램", version: "both", route: "/marketing/referral", status: "stub" },
  { code: "SCR-078", kind: "SCR", domain: "D08", title: "SMS/카카오 대량 발송", version: "V1", route: "/marketing/sms", status: "stub" },
  { code: "SCR-079", kind: "SCR", domain: "D08", title: "A/B 테스트", version: "both", route: "/marketing/ab-test", status: "stub" },

  // ── D09 설정관리 ──
  { code: "SCR-080", kind: "SCR", domain: "D09", title: "센터 설정", version: "V1", route: "/settings", status: "done" },
  { code: "SCR-080A", kind: "SCR", domain: "D09", title: "지점 자동화 적용", version: "both", route: "/settings/automation", status: "stub" },
  { code: "SCR-081", kind: "SCR", domain: "D09", title: "권한 설정", version: "both", route: "/settings/permissions", status: "done" },
  { code: "SCR-082", kind: "SCR", domain: "D09", title: "키오스크 설정", version: "both", route: "/settings/kiosk", status: "done" },
  { code: "SCR-083", kind: "SCR", domain: "D09", title: "IoT 출입 관리", version: "both", route: "/settings/iot", status: "done" },
  { code: "SCR-084", kind: "SCR", domain: "D09", title: "구독 결제 관리", version: "both", route: "/subscription", status: "done" },
  { code: "SCR-085", kind: "SCR", domain: "D09", title: "공지사항 관리", version: "both", route: "/notices", status: "done" },
  { code: "SCR-086", kind: "SCR", domain: "D09", title: "출석 관리 설정", version: "V1", route: "/settings/attendance", status: "stub" },
  { code: "SCR-087", kind: "SCR", domain: "D09", title: "커스텀 역할 생성", version: "V1", route: "/settings/custom-role", status: "stub" },
  { code: "SCR-088", kind: "SCR", domain: "D09", title: "다국어 설정", version: "V2", route: "/settings/language", status: "stub" },
  { code: "SCR-089", kind: "SCR", domain: "D09", title: "데이터 백업·복원", version: "both", route: "/settings/backup", status: "stub" },

  // ── D10 본사관리 ──
  { code: "SCR-090", kind: "SCR", domain: "D10", title: "지점 대시보드", version: "V2", route: "/", status: "done" },
  { code: "SCR-092", kind: "SCR", domain: "D10", title: "지점 관리", version: "both", route: "/branches", status: "done" },
  { code: "SCR-093", kind: "SCR", domain: "D10", title: "지점 성과 리포트", version: "both", route: "/branch-report", status: "done" },
  { code: "SCR-094", kind: "SCR", domain: "D10", title: "KPI 대시보드", version: "both", route: "/kpi", status: "done" },
  { code: "SCR-095", kind: "SCR", domain: "D10", title: "KPI 센터", version: "both", route: "/kpi-preview", status: "done" },
  { code: "SCR-096", kind: "SCR", domain: "D10", title: "온보딩 대시보드", version: "V2", route: "/onboarding", status: "stub" },
  { code: "SCR-097", kind: "SCR", domain: "D10", title: "히스토리 로그", version: "both", route: "/audit-log", status: "done" },
  { code: "SCR-098", kind: "SCR", domain: "D10", title: "오늘의 할 일", version: "V1", route: "/today-tasks", status: "done" },
  { code: "SCR-099", kind: "SCR", domain: "D10", title: "리포트 생성", version: "both", route: "/reports", status: "done" },
  { code: "SCR-H1001", kind: "SCR", domain: "D10", title: "자동화 정책 라이브러리", version: "both", route: "/hq/automation-policies", status: "done" },
  { code: "SCR-H1002", kind: "SCR", domain: "D10", title: "커스텀 대시보드 빌더", version: "V2", route: "/dashboard/builder", status: "done" },
  { code: "SCR-H1003", kind: "SCR", domain: "D10", title: "벤치마크 비교", version: "V2", route: "/benchmark", status: "stub" },
  { code: "SCR-H1004", kind: "SCR", domain: "D10", title: "예측 분석", version: "both", route: "/analytics/forecast", status: "done" },
  { code: "SCR-H1005", kind: "SCR", domain: "D10", title: "NPS 설문", version: "V2", route: "/nps", status: "stub" },

  // ── D11 통합운영 ──
  { code: "SCR-I001", kind: "SCR", domain: "D11", title: "통합 출석 관리", version: "both", route: "/attendance", status: "done" },
  { code: "SCR-I003", kind: "SCR", domain: "D11", title: "IoT 연동 관리", version: "V1", route: "/settings/iot", status: "done" },
  { code: "SCR-I004", kind: "SCR", domain: "D11", title: "옷 락커 운영 관리", version: "both", route: "/clothing", status: "done" },
  { code: "SCR-I005", kind: "SCR", domain: "D11", title: "고정 물품 락커 관리", version: "both", route: "/clothing-locker", status: "stub" },
  { code: "SCR-I006", kind: "SCR", domain: "D11", title: "체성분 통합 관리", version: "V1", route: "/body-composition", status: "done" },
  { code: "SCR-I007", kind: "SCR", domain: "D11", title: "회원 건강 연동 요약", version: "both", route: "/members/health", status: "stub" },
  { code: "SCR-I008", kind: "SCR", domain: "D11", title: "키오스크 운영 현황", version: "V1", route: "/kiosk-ops", status: "missing" },
];

// ─── 다이얼로그(DLG) 레지스트리 ────────────────────────────────────────────
// 다이얼로그는 독립 페이지가 아니라 호스트 화면(hostRoute) 내부에 연결한다.
// 작업이 필요한 V2 신규 / 미연결 다이얼로그 위주로 추적한다.
export const DOCS4_DIALOGS: Docs4Entry[] = [
  // ── D02 회원관리 (V2 신규) ──
  { code: "DLG-M021", kind: "DLG", domain: "D02", title: "마일리지 조정", version: "V2", hostRoute: "/members/detail", status: "done" },
  { code: "DLG-M025", kind: "DLG", domain: "D02", title: "운동 프로그램 배정", version: "V2", hostRoute: "/members/detail", status: "done" },

  // ── D03 매출관리 (V2 신규) ──
  { code: "DLG-S016", kind: "DLG", domain: "D03", title: "결제링크 발송", version: "V2", hostRoute: "/unpaid", status: "done" },

  // ── D05 상품관리 (V2 신규) ──
  { code: "DLG-P016", kind: "DLG", domain: "D05", title: "카탈로그 미리보기", version: "V2", hostRoute: "/products/catalog", status: "done" },
  { code: "DLG-P017", kind: "DLG", domain: "D05", title: "카탈로그 표시 옵션 설정", version: "V2", hostRoute: "/products/catalog", status: "done" },
  { code: "DLG-P018", kind: "DLG", domain: "D05", title: "카탈로그 내용 편집", version: "V2", hostRoute: "/products/catalog", status: "done" },
  { code: "DLG-P019", kind: "DLG", domain: "D05", title: "입고 등록", version: "V2", hostRoute: "/products/inventory", status: "done" },
  { code: "DLG-P020", kind: "DLG", domain: "D05", title: "출고 등록", version: "V2", hostRoute: "/products/inventory", status: "done" },
  { code: "DLG-P021", kind: "DLG", domain: "D05", title: "재고 수동 조정", version: "V2", hostRoute: "/products/inventory", status: "done" },
  { code: "DLG-P022", kind: "DLG", domain: "D05", title: "입출고 이력 조회", version: "V2", hostRoute: "/products/inventory", status: "done" },

  // ── D06 시설관리 (V2 신규) ──
  { code: "DLG-056-001", kind: "DLG", domain: "D06", title: "장비 등록", version: "V2", hostRoute: "/equipment-check", status: "dialog-pending" },
  { code: "DLG-056-002", kind: "DLG", domain: "D06", title: "점검 등록", version: "V2", hostRoute: "/equipment-check", status: "dialog-pending" },
  { code: "DLG-056-003", kind: "DLG", domain: "D06", title: "수리 등록", version: "V2", hostRoute: "/equipment-check", status: "dialog-pending" },
  { code: "DLG-057-001", kind: "DLG", domain: "D06", title: "소모품 등록", version: "V2", hostRoute: "/consumables", status: "dialog-pending" },
  { code: "DLG-057-002", kind: "DLG", domain: "D06", title: "입출고 처리", version: "V2", hostRoute: "/consumables", status: "dialog-pending" },
  { code: "DLG-057-003", kind: "DLG", domain: "D06", title: "발주 생성", version: "V2", hostRoute: "/consumables", status: "dialog-pending" },
  { code: "DLG-058-001", kind: "DLG", domain: "D06", title: "청소 스케줄 등록", version: "V2", hostRoute: "/cleaning-schedule", status: "dialog-pending" },
];

export const DOCS4_REGISTRY: Docs4Entry[] = [...DOCS4_SCREENS, ...DOCS4_DIALOGS];

// ─── 조회 헬퍼 ─────────────────────────────────────────────────────────────

/** 라우트로 화면(SCR) 엔트리들을 역조회 (design-doc API에서 docs4 섹션 추출에 사용) */
export function getScreensByRoute(route: string): Docs4Entry[] {
  return DOCS4_SCREENS.filter((e) => e.route === route);
}

/** 라우트에 연결된 다이얼로그(DLG) 엔트리들 */
export function getDialogsByHostRoute(route: string): Docs4Entry[] {
  return DOCS4_DIALOGS.filter((e) => e.hostRoute === route);
}

/** 라우트의 도메인과 SCR 코드 목록 (design-doc API용) */
export function resolveDocs4ForRoute(
  route: string
): { domain: Docs4Domain; codes: string[] } | null {
  const screens = getScreensByRoute(route);
  if (screens.length === 0) return null;
  return { domain: screens[0].domain, codes: screens.map((s) => s.code) };
}

/** 도메인별 진행 현황 집계 */
export function getDomainProgress(domain: Docs4Domain): {
  total: number;
  done: number;
  pending: number;
} {
  const entries = DOCS4_REGISTRY.filter((e) => e.domain === domain);
  const done = entries.filter((e) => e.status === "done").length;
  return { total: entries.length, done, pending: entries.length - done };
}
