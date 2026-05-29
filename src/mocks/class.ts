// 수업관리(D04) 화면용 목업 시드
//
// docs4/V1+V2/D04-수업관리 명세 기반의 기능형 목업 데이터.
// 수업 전용 시드가 mockData.ts에 없으므로 D04 화면(valid-lessons / class-waitlist /
// class-feedback / class-recording)이 공통으로 import 해서 사용한다.
// 모든 날짜 기준일은 2026-05-29.

export const CLASS_TODAY = '2026-05-29';

export type SessionType = 'PT' | 'GX' | '골프' | '기타';
export type AttendanceStatus = '미처리' | '출석' | '결석' | '노쇼';

// ─── 강사 ────────────────────────────────────────────────────────────────────
export interface ClassInstructor {
  id: string;
  name: string;
}

export const MOCK_INSTRUCTORS: ClassInstructor[] = [
  { id: 'INS-01', name: '이효리' },
  { id: 'INS-02', name: '김태희' },
  { id: 'INS-03', name: '정지훈' },
  { id: 'INS-04', name: '박재범' },
];

// ─── SCR-C011 유효 수업 목록 ──────────────────────────────────────────────────
export interface ValidLesson {
  id: string;
  className: string;
  sessionType: SessionType;
  instructor: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;
  room: string;
  memberName: string;
  memberPhone: string;
  remainingCount: number; // 이용권 잔여 횟수
  attendance: AttendanceStatus;
  signatureRequired: boolean; // PT 완료 후 서명 필요
  signatureReceived: boolean;
}

export const MOCK_VALID_LESSONS: ValidLesson[] = [
  { id: 'VL-001', className: '1:1 PT', sessionType: 'PT', instructor: '박재범', date: CLASS_TODAY, startTime: '09:00', endTime: '10:00', room: 'PT룸 1', memberName: '김민준', memberPhone: '010-1234-5678', remainingCount: 12, attendance: '미처리', signatureRequired: true, signatureReceived: false },
  { id: 'VL-002', className: '필라테스 A반', sessionType: 'GX', instructor: '이효리', date: CLASS_TODAY, startTime: '10:00', endTime: '10:50', room: 'GX스튜디오', memberName: '이서연', memberPhone: '010-2345-6789', remainingCount: 5, attendance: '출석', signatureRequired: false, signatureReceived: false },
  { id: 'VL-003', className: '골프 레슨', sessionType: '골프', instructor: '정지훈', date: CLASS_TODAY, startTime: '11:00', endTime: '12:00', room: '골프 타석 3', memberName: '박지호', memberPhone: '010-3456-7890', remainingCount: 0, attendance: '미처리', signatureRequired: false, signatureReceived: false },
  { id: 'VL-004', className: '1:1 PT', sessionType: 'PT', instructor: '박재범', date: CLASS_TODAY, startTime: '14:00', endTime: '15:00', room: 'PT룸 2', memberName: '최유나', memberPhone: '010-4567-8901', remainingCount: 8, attendance: '출석', signatureRequired: true, signatureReceived: true },
  { id: 'VL-005', className: '요가 기초반', sessionType: 'GX', instructor: '김태희', date: CLASS_TODAY, startTime: '15:00', endTime: '15:50', room: 'GX스튜디오', memberName: '정재원', memberPhone: '010-5678-9012', remainingCount: 3, attendance: '노쇼', signatureRequired: false, signatureReceived: false },
  { id: 'VL-006', className: '1:1 PT', sessionType: 'PT', instructor: '박재범', date: CLASS_TODAY, startTime: '16:00', endTime: '17:00', room: 'PT룸 1', memberName: '한지민', memberPhone: '010-6789-0123', remainingCount: 20, attendance: '미처리', signatureRequired: true, signatureReceived: false },
  { id: 'VL-007', className: '스피닝 B반', sessionType: 'GX', instructor: '정지훈', date: '2026-05-30', startTime: '18:00', endTime: '18:50', room: 'GX스튜디오', memberName: '오지훈', memberPhone: '010-7890-1234', remainingCount: 6, attendance: '미처리', signatureRequired: false, signatureReceived: false },
];

// ─── SCR-C012 대기열 관리 ─────────────────────────────────────────────────────
export type WaitlistMemberStatus = '대기중' | '배정가능' | '취소';

export interface WaitlistClass {
  id: string;
  name: string;
  schedule: string; // 요일·시간 라벨
  sessionType: SessionType;
  capacity: number;
  reserved: number; // 현재 예약 수
}

export interface WaitlistEntry {
  id: string;
  classId: string;
  rank: number; // 대기 순번
  memberName: string;
  memberPhone: string;
  requestedAt: string; // YYYY-MM-DD HH:mm
  passValid: boolean; // 이용권 유효 여부
  autoAssignAgreed: boolean; // 자동 배정 동의 / 알림만
  hasPenalty: boolean; // 페널티 보유 여부
  status: WaitlistMemberStatus;
}

export const MOCK_WAITLIST_CLASSES: WaitlistClass[] = [
  { id: 'WC-01', name: '필라테스 A반', schedule: '화 10:00', sessionType: 'GX', capacity: 8, reserved: 8 },
  { id: 'WC-02', name: '요가 기초반', schedule: '월 11:00', sessionType: 'GX', capacity: 10, reserved: 10 },
  { id: 'WC-03', name: '스피닝 B반', schedule: '수 18:00', sessionType: 'GX', capacity: 12, reserved: 11 },
];

export const MOCK_WAITLIST_ENTRIES: WaitlistEntry[] = [
  { id: 'WL-01', classId: 'WC-01', rank: 1, memberName: '김민준', memberPhone: '010-1234-5678', requestedAt: '2026-05-25 09:12', passValid: true, autoAssignAgreed: true, hasPenalty: false, status: '배정가능' },
  { id: 'WL-02', classId: 'WC-01', rank: 2, memberName: '정현우', memberPhone: '010-2222-3333', requestedAt: '2026-05-26 08:00', passValid: true, autoAssignAgreed: false, hasPenalty: false, status: '대기중' },
  { id: 'WL-03', classId: 'WC-01', rank: 3, memberName: '최유리', memberPhone: '010-3333-4444', requestedAt: '2026-05-26 11:22', passValid: false, autoAssignAgreed: true, hasPenalty: false, status: '대기중' },
  { id: 'WL-04', classId: 'WC-02', rank: 1, memberName: '이서연', memberPhone: '010-4444-5555', requestedAt: '2026-05-24 10:03', passValid: true, autoAssignAgreed: true, hasPenalty: true, status: '배정가능' },
  { id: 'WL-05', classId: 'WC-02', rank: 2, memberName: '박지훈', memberPhone: '010-5555-6666', requestedAt: '2026-05-24 15:44', passValid: true, autoAssignAgreed: false, hasPenalty: false, status: '대기중' },
];

// DLG-C016 대안 일정 제시 후보 (같은 유형, 잔여 자리 있는 수업)
export interface AlternativeSlot {
  id: string;
  className: string;
  sessionType: SessionType;
  date: string;
  time: string;
  instructor: string;
  room: string;
  remainingSeats: number;
}

export const MOCK_ALTERNATIVE_SLOTS: AlternativeSlot[] = [
  { id: 'AS-01', className: '필라테스 A반', sessionType: 'GX', date: '2026-05-30', time: '10:00~10:50', instructor: '이효리', room: 'GX스튜디오', remainingSeats: 2 },
  { id: 'AS-02', className: '필라테스 B반', sessionType: 'GX', date: '2026-05-31', time: '14:00~14:50', instructor: '이효리', room: 'GX스튜디오', remainingSeats: 4 },
  { id: 'AS-03', className: '요가 기초반', sessionType: 'GX', date: '2026-06-01', time: '11:00~11:50', instructor: '김태희', room: 'GX스튜디오', remainingSeats: 1 },
];

// ─── SCR-C013 수업 평가 피드백 ────────────────────────────────────────────────
export interface ClassFeedback {
  id: string;
  memberName: string;
  anonymous: boolean; // 익명 후기 → 회원명 마스킹
  className: string;
  sessionType: SessionType;
  instructor: string;
  classDate: string;
  rating: number; // 1~5
  comment: string;
  createdAt: string;
  hidden: boolean; // 신고 N건 자동 숨김 → "검토 대기"
}

export const MOCK_FEEDBACKS: ClassFeedback[] = [
  { id: 'FB-01', memberName: '김민준', anonymous: false, className: '필라테스 A반', sessionType: 'GX', instructor: '이효리', classDate: '2026-05-28', rating: 5, comment: '강사님이 정말 친절하게 가르쳐 주셔서 좋았어요. 다음에도 수강할 예정입니다.', createdAt: '2026-05-28 11:20', hidden: false },
  { id: 'FB-02', memberName: '이서연', anonymous: false, className: '요가 기초반', sessionType: 'GX', instructor: '김태희', classDate: '2026-05-27', rating: 4, comment: '수업 분위기가 편안하고 동작 설명이 자세해서 좋았습니다.', createdAt: '2026-05-27 12:05', hidden: false },
  { id: 'FB-03', memberName: '박지훈', anonymous: true, className: '스피닝 B반', sessionType: 'GX', instructor: '정지훈', classDate: '2026-05-27', rating: 2, comment: '음악이 너무 커서 집중하기 어려웠어요. 개선되면 좋겠습니다.', createdAt: '2026-05-27 19:30', hidden: false },
  { id: 'FB-04', memberName: '최유리', anonymous: false, className: '1:1 PT', sessionType: 'PT', instructor: '박재범', classDate: '2026-05-26', rating: 5, comment: '1:1 관리가 꼼꼼해서 운동 자세가 많이 교정된 것 같습니다.', createdAt: '2026-05-26 15:10', hidden: false },
  { id: 'FB-05', memberName: '정현우', anonymous: false, className: '필라테스 A반', sessionType: 'GX', instructor: '이효리', classDate: '2026-05-26', rating: 4, comment: '수업 난이도가 적절하고 진도가 잘 맞습니다.', createdAt: '2026-05-26 11:00', hidden: false },
  { id: 'FB-06', memberName: '한지민', anonymous: false, className: '골프 레슨', sessionType: '골프', instructor: '정지훈', classDate: '2026-05-25', rating: 3, comment: '레슨 시간이 짧게 느껴졌습니다. 보강 시간이 있으면 좋겠어요.', createdAt: '2026-05-25 13:40', hidden: false },
  { id: 'FB-07', memberName: '오지훈', anonymous: false, className: '1:1 PT', sessionType: 'PT', instructor: '박재범', classDate: '2026-05-24', rating: 1, comment: '예약 시간보다 늦게 시작했고 안내가 부족했습니다.', createdAt: '2026-05-24 17:20', hidden: true },
];

// ─── SCR-C015 수업 녹화 관리 (V2) ─────────────────────────────────────────────
export type RecordingStatus = '업로드중' | '비공개' | '공유중' | '기간만료';

export interface ClassRecording {
  id: string;
  className: string;
  sessionType: SessionType;
  instructor: string;
  classDate: string;
  fileName: string;
  fileSizeGb: number;
  uploadedAt: string;
  status: RecordingStatus;
  uploadProgress?: number; // 업로드중일 때 진행률 %
  sharedMemberCount: number; // 공유 대상 회원 수
  expiresAt: string | null; // 공개 기간 (null = 무기한)
  views: number;
}

export const MOCK_RECORDINGS: ClassRecording[] = [
  { id: 'RC-01', className: '필라테스 A반', sessionType: 'GX', instructor: '이효리', classDate: '2026-05-28', fileName: 'pilates-a-0528.mp4', fileSizeGb: 2.1, uploadedAt: '2026-05-28 11:30', status: '공유중', sharedMemberCount: 8, expiresAt: '2026-06-28', views: 12 },
  { id: 'RC-02', className: '요가 기초반', sessionType: 'GX', instructor: '김태희', classDate: '2026-05-27', fileName: 'yoga-basic-0527.mp4', fileSizeGb: 1.8, uploadedAt: '2026-05-27 12:10', status: '공유중', sharedMemberCount: 10, expiresAt: null, views: 8 },
  { id: 'RC-03', className: '스피닝 B반', sessionType: 'GX', instructor: '정지훈', classDate: '2026-05-27', fileName: 'spinning-b-0527.mp4', fileSizeGb: 1.6, uploadedAt: '2026-05-27 19:40', status: '업로드중', uploadProgress: 64, sharedMemberCount: 0, expiresAt: null, views: 0 },
  { id: 'RC-04', className: '1:1 PT', sessionType: 'PT', instructor: '박재범', classDate: '2026-05-26', fileName: 'pt-kim-0526.mp4', fileSizeGb: 2.4, uploadedAt: '2026-05-26 15:20', status: '비공개', sharedMemberCount: 0, expiresAt: null, views: 0 },
  { id: 'RC-05', className: '필라테스 B반', sessionType: 'GX', instructor: '이효리', classDate: '2026-05-20', fileName: 'pilates-b-0520.mp4', fileSizeGb: 2.0, uploadedAt: '2026-05-20 16:00', status: '기간만료', sharedMemberCount: 9, expiresAt: '2026-05-27', views: 21 },
];
