// D08 마케팅 기능형 목업 데이터
// docs4 D08-마케팅 SCR-076(캠페인)/077(리퍼럴)/078(SMS 대량발송)/079(A/B 테스트) 정의를 따른다.
// 각 화면에서 공통으로 사용하는 mock 배열을 정의한다. (리드 SCR-070은 별도 api/endpoints/leads 사용)

// ─── SCR-076 캠페인 관리 ──────────────────────────────────────────────────────
/** 캠페인 상태: 준비 중 / 진행 중 / 종료 */
export type CampaignStatus = '준비' | '진행' | '종료';
export type CampaignGoal = '신규유치' | '재등록' | '인지도' | '온보딩' | '이벤트';

export interface MarketingCampaign {
  id: number;
  name: string;
  goal: CampaignGoal;
  segment: string;        // 대상 세그먼트
  segmentSize: number;    // 대상 회원 수 (0이면 발송 차단)
  startDate: string;      // yyyy-mm-dd
  endDate: string;        // yyyy-mm-dd
  status: CampaignStatus;
  channels: string[];     // 연결된 메시지/쿠폰 채널 (최소 1개 필요)
  budget: number;         // 예산(원)
  // 실적 추적 패널 (도달/클릭/전환/비용)
  reach: number;
  clicks: number;
  conversions: number;
  cost: number;
}

export const MOCK_CAMPAIGNS: MarketingCampaign[] = [
  { id: 1, name: '5월 가정의 달 이벤트', goal: '이벤트', segment: '전체 회원', segmentSize: 892, startDate: '2026-05-01', endDate: '2026-05-31', status: '진행', channels: ['SMS', '쿠폰'], budget: 500000, reach: 892, clicks: 127, conversions: 41, cost: 178400 },
  { id: 2, name: '만료 임박 재등록 캠페인', goal: '재등록', segment: '만료 D-30', segmentSize: 145, startDate: '2026-04-01', endDate: '2026-06-30', status: '진행', channels: ['카카오', '쿠폰'], budget: 300000, reach: 145, clicks: 43, conversions: 28, cost: 87000 },
  { id: 3, name: '신규 회원 환영 시리즈', goal: '온보딩', segment: '신규 등록 회원', segmentSize: 234, startDate: '2026-01-01', endDate: '2026-12-31', status: '진행', channels: ['SMS'], budget: 200000, reach: 234, clicks: 167, conversions: 89, cost: 46800 },
  { id: 4, name: '설 명절 인사', goal: '인지도', segment: '전체 회원', segmentSize: 1024, startDate: '2026-01-28', endDate: '2026-02-02', status: '종료', channels: ['카카오'], budget: 400000, reach: 1024, clicks: 89, conversions: 12, cost: 153600 },
  { id: 5, name: '여름 신규 유치 프로모션', goal: '신규유치', segment: '장기 미방문', segmentSize: 0, startDate: '2026-06-15', endDate: '2026-07-15', status: '준비', channels: ['SMS', '쿠폰'], budget: 600000, reach: 0, clicks: 0, conversions: 0, cost: 0 },
];

/** 캠페인 등록 시 선택 가능한 대상 세그먼트 (세그먼트 0명이면 저장 차단 시연용) */
export const CAMPAIGN_SEGMENTS: { value: string; label: string; size: number }[] = [
  { value: '전체 회원', label: '전체 회원', size: 892 },
  { value: '활성 회원', label: '활성 회원', size: 612 },
  { value: '만료 D-30', label: '만료 D-30', size: 145 },
  { value: '신규 등록 회원', label: '신규 등록 회원', size: 234 },
  { value: '장기 미방문', label: '장기 미방문 (0명)', size: 0 },
];

/** 캠페인에 연결 가능한 채널 (최소 1개 연결 필요) */
export const CAMPAIGN_CHANNELS = ['SMS', '카카오', '쿠폰', '마일리지'] as const;

// ─── SCR-077 리퍼럴 프로그램 ──────────────────────────────────────────────────
/** 리퍼럴 이벤트 상태: 준비 중 / 진행 중 / 종료 */
export type ReferralStatus = '준비' | '진행' | '종료';
/** 추천 매칭 상태: 전환 성공(지급완료) / 지급 대기 / 미전환 / 취소 */
export type ReferralMatchStatus = '지급완료' | '지급대기' | '미전환' | '취소';

export interface ReferralEvent {
  id: number;
  name: string;
  referrerReward: string;   // 추천인 혜택
  refereeReward: string;    // 피추천인 혜택
  startDate: string;
  endDate: string;
  status: ReferralStatus;
  participants: number;     // 참여 수
  active: boolean;          // 활성/비활성
}

export interface ReferralRecord {
  id: number;
  eventName: string;
  referrer: string;         // 추천인
  referee: string;          // 피추천인
  date: string;
  reward: string;
  status: ReferralMatchStatus;
}

export const MOCK_REFERRAL_EVENTS: ReferralEvent[] = [
  { id: 1, name: '친구 초대 기본', referrerReward: '10,000P', refereeReward: '10,000P', startDate: '2026-01-01', endDate: '2026-12-31', status: '진행', participants: 42, active: true },
  { id: 2, name: '5인 초대 보너스', referrerReward: '50,000P', refereeReward: '-', startDate: '2026-03-01', endDate: '2026-08-31', status: '진행', participants: 8, active: true },
  { id: 3, name: '봄맞이 추천 이벤트', referrerReward: 'PT 1회권', refereeReward: '1주 무료', startDate: '2026-03-01', endDate: '2026-04-30', status: '종료', participants: 23, active: false },
];

export const MOCK_REFERRAL_RECORDS: ReferralRecord[] = [
  { id: 1, eventName: '친구 초대 기본', referrer: '김민준', referee: '이서연', date: '2026-04-20', reward: '10,000P', status: '지급완료' },
  { id: 2, eventName: '친구 초대 기본', referrer: '박지훈', referee: '최유리', date: '2026-04-18', reward: '10,000P', status: '지급완료' },
  { id: 3, eventName: '친구 초대 기본', referrer: '김민준', referee: '정현우', date: '2026-04-15', reward: '10,000P', status: '지급대기' },
  { id: 4, eventName: '5인 초대 보너스', referrer: '이서연', referee: '강서준', date: '2026-04-10', reward: '50,000P', status: '지급완료' },
  { id: 5, eventName: '친구 초대 기본', referrer: '최유리', referee: '윤지민', date: '2026-04-05', reward: '10,000P', status: '취소' },
  { id: 6, eventName: '친구 초대 기본', referrer: '정현우', referee: '한지우', date: '2026-04-02', reward: '10,000P', status: '미전환' },
];

// ─── SCR-078 SMS/카카오 대량 발송 ─────────────────────────────────────────────
/** 발송 채널: SMS 계열 / 카카오 알림톡 */
export type SendChannel = 'SMS' | 'LMS' | 'MMS' | '카카오';
export type SendHistoryStatus = '완료' | '예약' | '발송중' | '부분실패';

export interface BulkSendHistory {
  id: number;
  channel: SendChannel;
  title: string;
  target: string;
  sentAt: string;           // 발송 일시
  recipients: number;       // 수신자 수
  success: number;          // 처리 건수 - 성공
  failed: number;           // 처리 건수 - 실패
  excluded: number;         // 처리 건수 - 제외
  cost: number;             // 비용(원)
  status: SendHistoryStatus;
  failReason?: string | null; // 실패 사유 (행 상세)
}

export interface SmsTemplate {
  id: number;
  name: string;
  channel: 'SMS' | '카카오';
  content: string;
  approved: boolean;        // 카카오 알림톡 승인 여부 (미승인 시 발송 차단)
}

/** 발송 대상 사전 정의 그룹 (DLG-078-001 발송 대상 선택) */
export const SEND_TARGET_GROUPS: { value: string; label: string; size: number }[] = [
  { value: '전체 회원', label: '전체 회원', size: 892 },
  { value: '활성 회원', label: '활성 회원', size: 612 },
  { value: '만료 회원', label: '만료 회원', size: 145 },
  { value: 'VIP 등급', label: 'VIP 등급 회원', size: 58 },
  { value: '장기 미방문', label: '장기 미방문 회원', size: 0 },
];

/** 채널별 건당 예상 단가(원) — 플랫폼 기준 비용 (목업) */
export const CHANNEL_UNIT_COST: Record<SendChannel, number> = {
  SMS: 20,
  LMS: 50,
  MMS: 200,
  카카오: 15,
};

/** 채널 현황 카드 4종 (MKT-08-01) + 플랫폼 잔여 캐시 */
export const BULK_SEND_SUMMARY = {
  smsCount: 948,        // 이번 달 SMS/LMS/MMS 합산
  kakaoCount: 57,       // 이번 달 카카오 알림톡
  monthlyCost: 14655,   // 이번 달 총 비용(원)
  remainingCash: 38200, // 플랫폼 잔여 캐시(원)
  senderProfile: '광화문점 대표번호 02-1234-5678',
  approvedTemplates: 3,
  lastSync: '2026-05-29 08:00',
};

export const MOCK_SEND_HISTORY: BulkSendHistory[] = [
  { id: 1, channel: 'LMS', title: '5월 이벤트 안내', target: '전체 회원', sentAt: '2026-05-26 14:00', recipients: 892, success: 880, failed: 4, excluded: 8, cost: 44000, status: '완료' },
  { id: 2, channel: '카카오', title: '만료 임박 알림', target: '만료 회원', sentAt: '2026-05-25 10:00', recipients: 145, success: 138, failed: 0, excluded: 7, cost: 2070, status: '완료', failReason: '비친구 7명 제외' },
  { id: 3, channel: 'SMS', title: '오늘 수업 알림', target: '오늘 예약자', sentAt: '2026-05-26 08:00', recipients: 28, success: 28, failed: 0, excluded: 0, cost: 560, status: '완료' },
  { id: 4, channel: '카카오', title: '생일 축하 메시지', target: '이번 달 생일', sentAt: '2026-06-01 09:00', recipients: 12, success: 0, failed: 0, excluded: 0, cost: 0, status: '예약' },
  { id: 5, channel: 'SMS', title: '재등록 혜택 안내', target: '만료 D-30', sentAt: '2026-05-20 15:30', recipients: 145, success: 140, failed: 5, excluded: 0, cost: 2900, status: '부분실패', failReason: '수신 거부 5명 실패' },
];

export const MOCK_SMS_TEMPLATES: SmsTemplate[] = [
  { id: 1, name: '만료 안내', channel: 'SMS', content: '[FitGenie] 회원님의 이용권이 {D}일 후 만료됩니다. 재등록 시 특별 혜택을 드립니다.', approved: true },
  { id: 2, name: '수업 예약 확인', channel: '카카오', content: '안녕하세요 {이름}님! {날짜} {수업명} 수업이 예약되었습니다.', approved: true },
  { id: 3, name: '생일 축하', channel: '카카오', content: '{이름}님, 생일을 진심으로 축하드립니다! 특별한 날을 기념해 {혜택}을 드립니다.', approved: true },
  { id: 4, name: '여름 프로모션', channel: '카카오', content: '{이름}님, 여름맞이 한정 프로모션 안내드립니다. 지금 등록 시 추가 혜택!', approved: false },
];

// ─── SCR-079 A/B 테스트 (V1 제외 / V2 이관 — 등록·자동실행은 고객사 확인 후 개발) ──
export type AbTestStatus = '진행' | '완료';

export interface AbTestVariant {
  name: string;
  sent: number;
  open: number;
  click: number;
}

export interface AbTest {
  id: number;
  name: string;
  status: AbTestStatus;
  variantA: AbTestVariant;
  variantB: AbTestVariant;
  winner: 'A' | 'B' | null;
  startDate: string;
  endDate: string;
}

export const MOCK_AB_TESTS: AbTest[] = [
  {
    id: 1, name: '재등록 유도 메시지 최적화', status: '진행',
    variantA: { name: 'A안: 할인 강조', sent: 250, open: 163, click: 45 },
    variantB: { name: 'B안: 혜택 강조', sent: 250, open: 188, click: 62 },
    winner: null, startDate: '2026-04-20', endDate: '2026-05-04',
  },
  {
    id: 2, name: '신규 환영 메시지 제목 테스트', status: '완료',
    variantA: { name: 'A안: 이름 호칭', sent: 120, open: 84, click: 32 },
    variantB: { name: 'B안: 혜택 중심', sent: 120, open: 96, click: 48 },
    winner: 'B', startDate: '2026-04-01', endDate: '2026-04-15',
  },
];
