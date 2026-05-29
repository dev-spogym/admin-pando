// D06 시설관리 기능형 목업 데이터
// docs4/V2/D06-시설관리/시설관리.md 의 SCR-056~059 / DLG-056~058 정의를 따른다.
// 화면(소모품 재고·청소 스케줄·공간 자산·장비 점검)에서 공통으로 사용하는 mock 배열을 정의한다.

// ─── SCR-056 장비 점검 일정 ──────────────────────────────────────────────────
/** 장비 상태: 정상 운영 / 점검 예정 / 수리중 / 고장 */
export type EquipmentStatus = '정상' | '점검예정' | '수리중' | '고장';
export type EquipmentType = '유산소기구' | '웨이트기구' | 'GX장비' | '기타';

export interface FacilityEquipment {
  id: number;
  name: string;
  type: EquipmentType;
  location: string;
  lastCheck: string;        // 마지막 점검일 yyyy-mm-dd
  nextCheck: string;        // 다음 점검 예정일 yyyy-mm-dd
  cycleDays: number;        // 점검 주기(일)
  status: EquipmentStatus;
  issue: string | null;     // 이상/고장 내용
  repairVendor?: string | null; // 수리 담당 업체/담당자
  repairOpenedAt?: string | null; // 수리 접수일
}

export const MOCK_EQUIPMENT: FacilityEquipment[] = [
  { id: 1, name: '트레드밀 #1', type: '유산소기구', location: 'A존', lastCheck: '2026-05-15', nextCheck: '2026-06-14', cycleDays: 30, status: '정상', issue: null },
  { id: 2, name: '레그프레스 #2', type: '웨이트기구', location: 'B존', lastCheck: '2026-04-10', nextCheck: '2026-06-02', cycleDays: 90, status: '점검예정', issue: '소음 발생' },
  { id: 3, name: '스미스머신 #1', type: '웨이트기구', location: 'C존', lastCheck: '2026-04-20', nextCheck: '2026-07-19', cycleDays: 90, status: '정상', issue: null },
  { id: 4, name: '러닝머신 #3', type: '유산소기구', location: 'A존', lastCheck: '2026-03-28', nextCheck: '2026-05-27', cycleDays: 30, status: '점검예정', issue: '벨트 마모' },
  { id: 5, name: '케이블머신 #2', type: '웨이트기구', location: 'B존', lastCheck: '2026-04-18', nextCheck: '2026-07-17', cycleDays: 90, status: '수리중', issue: '풀리 교체', repairVendor: '헬스장비AS', repairOpenedAt: '2026-05-22' },
  { id: 6, name: '스피닝바이크 #4', type: 'GX장비', location: 'D존', lastCheck: '2026-04-22', nextCheck: '2026-05-22', cycleDays: 30, status: '고장', issue: '페달 파손 — 사용 금지' },
  { id: 7, name: '덤벨 랙 #1', type: '기타', location: 'D존', lastCheck: '2026-05-01', nextCheck: '2026-08-29', cycleDays: 90, status: '정상', issue: null },
];

// ─── SCR-057 소모품 재고 관리 ────────────────────────────────────────────────
/** 재고 상태: 정상 재고 / 재고 부족 / 재고 없음 / 발주 대기 */
export type ConsumableStatus = '정상' | '부족' | '없음' | '발주대기';
export type ConsumableCategory = '욕실용품' | '청소용품' | '비품' | '기타';

export interface FacilityConsumable {
  id: number;
  name: string;
  category: ConsumableCategory;
  unit: string;          // 개, 박스, L 등
  stock: number;         // 현재 재고
  safetyStock: number;   // 안전 재고 기준
  lastIn: string | null;  // 최근 입고일
  lastOut: string | null; // 최근 출고일
  supplier?: string;
  status: ConsumableStatus;
}

export const MOCK_CONSUMABLES: FacilityConsumable[] = [
  { id: 1, name: '샴푸 500ml', category: '욕실용품', unit: '개', stock: 42, safetyStock: 20, lastIn: '2026-05-10', lastOut: '2026-05-27', supplier: '생활용품도매', status: '정상' },
  { id: 2, name: '바디워시 1L', category: '욕실용품', unit: '개', stock: 8, safetyStock: 15, lastIn: '2026-04-28', lastOut: '2026-05-28', supplier: '생활용품도매', status: '부족' },
  { id: 3, name: '면 타월', category: '비품', unit: '장', stock: 0, safetyStock: 30, lastIn: '2026-04-15', lastOut: '2026-05-28', supplier: '타월공장', status: '없음' },
  { id: 4, name: '청소용 락스 4L', category: '청소용품', unit: '통', stock: 12, safetyStock: 6, lastIn: '2026-05-20', lastOut: '2026-05-26', supplier: '클린마트', status: '정상' },
  { id: 5, name: '손소독제 1L', category: '청소용품', unit: '통', stock: 5, safetyStock: 8, lastIn: '2026-04-30', lastOut: '2026-05-27', supplier: '클린마트', status: '발주대기' },
  { id: 6, name: '일회용 컵', category: '비품', unit: '박스', stock: 30, safetyStock: 10, lastIn: '2026-05-18', lastOut: '2026-05-25', supplier: '생활용품도매', status: '정상' },
];

/** 소모품 입출고 이력 */
export interface ConsumableHistoryRow {
  date: string;
  itemName: string;
  type: '입고' | '출고';
  qty: number;
  balance: number;
  reason?: string;        // 출고 사유
  supplier?: string;      // 입고 공급업체
  handler?: string;
}

export const MOCK_CONSUMABLE_HISTORY: ConsumableHistoryRow[] = [
  { date: '2026-05-28', itemName: '바디워시 1L', type: '출고', qty: 4, balance: 8, reason: '비품 보충', handler: '김매니저' },
  { date: '2026-05-28', itemName: '면 타월', type: '출고', qty: 20, balance: 0, reason: '세탁 교체', handler: '이스태프' },
  { date: '2026-05-27', itemName: '샴푸 500ml', type: '출고', qty: 6, balance: 42, reason: '비품 보충', handler: '김매니저' },
  { date: '2026-05-20', itemName: '청소용 락스 4L', type: '입고', qty: 12, balance: 12, supplier: '클린마트', handler: '박오너' },
  { date: '2026-05-18', itemName: '일회용 컵', type: '입고', qty: 30, balance: 30, supplier: '생활용품도매', handler: '박오너' },
  { date: '2026-05-10', itemName: '샴푸 500ml', type: '입고', qty: 48, balance: 48, supplier: '생활용품도매', handler: '박오너' },
];

// ─── SCR-058 청소 스케줄 ─────────────────────────────────────────────────────
/** 청소 유형: 일일 / 주간 / 월간 */
export type CleaningCycle = '일일' | '주간' | '월간';

/** 오늘 청소 체크리스트 항목 */
export interface CleaningTask {
  id: number;
  area: string;
  cycle: CleaningCycle;
  assignee: string | null;   // 담당자 (미지정 가능)
  scheduledTime: string;     // 예정 시간 HH:mm
  done: boolean;
  doneTime: string | null;   // 완료 시간 HH:mm
  overdue: boolean;          // 예정 시간 경과 + 미완료
}

export const MOCK_CLEANING_TASKS: CleaningTask[] = [
  { id: 1, area: '남자 탈의실', cycle: '일일', assignee: '김청소', scheduledTime: '08:00', done: true, doneTime: '08:12', overdue: false },
  { id: 2, area: '여자 탈의실', cycle: '일일', assignee: '이청소', scheduledTime: '08:00', done: true, doneTime: '08:20', overdue: false },
  { id: 3, area: '샤워실', cycle: '일일', assignee: '김청소', scheduledTime: '09:30', done: false, doneTime: null, overdue: true },
  { id: 4, area: 'GX룸', cycle: '일일', assignee: null, scheduledTime: '13:00', done: false, doneTime: null, overdue: false },
  { id: 5, area: '로비', cycle: '일일', assignee: '박청소', scheduledTime: '14:00', done: false, doneTime: null, overdue: false },
  { id: 6, area: '수영장 데크', cycle: '주간', assignee: '이청소', scheduledTime: '17:00', done: false, doneTime: null, overdue: false },
];

/** 정기 청소 일정 */
export interface CleaningSchedule {
  id: number;
  area: string;
  cycle: CleaningCycle;
  assignee: string | null;
  scheduledTime: string;
  detail: string;          // 주간 요일 / 월간 일자 등
  startDate: string;
}

export const MOCK_CLEANING_SCHEDULES: CleaningSchedule[] = [
  { id: 1, area: '남자 탈의실', cycle: '일일', assignee: '김청소', scheduledTime: '08:00', detail: '매일', startDate: '2026-01-02' },
  { id: 2, area: '여자 탈의실', cycle: '일일', assignee: '이청소', scheduledTime: '08:00', detail: '매일', startDate: '2026-01-02' },
  { id: 3, area: '수영장 데크', cycle: '주간', assignee: '이청소', scheduledTime: '17:00', detail: '매주 월·목', startDate: '2026-01-06' },
  { id: 4, area: '전체 유리창', cycle: '월간', assignee: '박청소', scheduledTime: '10:00', detail: '매월 1일', startDate: '2026-01-01' },
  { id: 5, area: 'GX룸', cycle: '일일', assignee: null, scheduledTime: '13:00', detail: '매일', startDate: '2026-02-01' },
];

// ─── SCR-059 공간 자산 관리 ──────────────────────────────────────────────────
/** 자산 상태: 운영중 / 점검중 / 고장 / 미사용 */
export type AssetStatus = '운영중' | '점검중' | '고장' | '미사용';
/** 자산 분류 탭: 운동룸 / 골프 타석 / 기타 공간 */
export type AssetTab = '운동룸' | '골프타석' | '기타공간';

export interface FacilityAsset {
  id: number;
  name: string;
  tab: AssetTab;
  location: string;
  status: AssetStatus;
  capacity: number;          // 수용/슬롯 수
  todayReservations: number; // 오늘 예약 건수
  todaySlots: number;        // 오늘 전체 슬롯
  note?: string;
}

export const MOCK_ASSETS: FacilityAsset[] = [
  { id: 1, name: 'GX룸 A', tab: '운동룸', location: '2F', status: '운영중', capacity: 20, todayReservations: 6, todaySlots: 10 },
  { id: 2, name: '스피닝룸', tab: '운동룸', location: '2F', status: '점검중', capacity: 16, todayReservations: 0, todaySlots: 8, note: '음향 설비 점검' },
  { id: 3, name: '필라테스룸', tab: '운동룸', location: '3F', status: '운영중', capacity: 10, todayReservations: 8, todaySlots: 9 },
  { id: 4, name: '골프 타석 #1', tab: '골프타석', location: '1F', status: '운영중', capacity: 1, todayReservations: 5, todaySlots: 8 },
  { id: 5, name: '골프 타석 #2', tab: '골프타석', location: '1F', status: '고장', capacity: 1, todayReservations: 0, todaySlots: 8, note: '스크린 영상 끊김' },
  { id: 6, name: '세미나실', tab: '기타공간', location: '4F', status: '미사용', capacity: 30, todayReservations: 0, todaySlots: 0 },
  { id: 7, name: '실내 라운지', tab: '기타공간', location: '1F', status: '운영중', capacity: 40, todayReservations: 2, todaySlots: 12 },
];

/** 직원(담당자) 후보 — 담당자 검색 0건 예외 검증용 */
export interface FacilityStaff {
  id: number;
  name: string;
}

export const MOCK_FACILITY_STAFF: FacilityStaff[] = [
  { id: 1, name: '김청소' },
  { id: 2, name: '이청소' },
  { id: 3, name: '박청소' },
  { id: 4, name: '김매니저' },
];
