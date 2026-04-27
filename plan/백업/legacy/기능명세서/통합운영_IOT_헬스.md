# FitGenie CRM — 통합운영(IoT · 키오스크 · 락커 · 체성분 · 헬스커넥터) 기능명세서

> **문서 버전**: v1.0
> **작성일**: 2026-04-17
> **문서 성격**: 기획 기준 신규 통합 도메인 기능명세서
> **대상 라우트**: `/attendance`, `/settings/kiosk`, `/settings/iot`, `/locker`, `/locker/management`, `/body-composition`, `/members/detail`
> **비고**: 현재 코드에 일부 화면과 API가 존재하며, 본 문서는 `기존 구현 + 통합 운영 확장 요구사항`을 함께 정의한다.

---

## 목차

1. [통합 출석 관리 (`/attendance`)](#1-통합-출석-관리-attendance)
2. [키오스크 설정 (`/settings/kiosk`)](#2-키오스크-설정-settingskiosk)
3. [IoT 연동 관리 (`/settings/iot`)](#3-iot-연동-관리-settingsiot)
4. [옷 락커 운영 관리 (`/locker`)](#4-옷-락커-운영-관리-locker)
5. [고정 물품 락커 관리 (`/locker/management`)](#5-고정-물품-락커-관리-lockermanagement)
6. [체성분 통합 관리 (`/body-composition`)](#6-체성분-통합-관리-body-composition)
7. [회원 상세 건강/연동 요약 (`/members/detail`)](#7-회원-상세-건강연동-요약-membersdetail)
8. [공통 정책 및 통합 이벤트](#8-공통-정책-및-통합-이벤트)

---

## 1. 통합 출석 관리 (`/attendance`)

> 소스: `src/app/attendance/page.tsx`
> 기존 API: `src/api/endpoints/attendance.ts`
> 관련 API: `src/api/endpoints/lockers.ts`, `src/api/endpoints/staffAttendance.ts`

### A. 화면 개요

회원과 직원의 출석을 하나의 운영 화면에서 관리한다. 출석 성공/실패 여부뿐 아니라, `출석 채널`, `회원 유형`, `옷 락커 배정 상태`, `고정 물품 락커 보유 여부`, `퇴실 상태`까지 함께 조회할 수 있어야 한다.

- 기본 운영값: `출석 후 직원 수동 배정`
- 지점 옵션: `출석만 처리`, `옷 락커 자동 배정`
- 직원도 회원과 동일하게 키오스크 출석 가능
- 실패 로그는 운영정책 실패와 인증 실패를 분리 표시

### B. 기능 범위

| 기능 | 설명 | 현재 구현 | 확장 필요 |
|------|------|:---:|:---:|
| 회원 출석 조회 | 회원 출석 목록/통계 조회 | ● | - |
| 수동 출석 등록 | 인포데스크에서 수동 출석 처리 | ● | - |
| 회원 퇴실 처리 | 출석 기록 종료 | ● | - |
| 직원 출석 통합 조회 | 회원/직원 스트림 통합 조회 | - | ● |
| 출석 후 락커 상태 표시 | 미배정/수동/자동 배정 여부 표기 | - | ● |
| 실패 사유 세분화 | 만료, 중복, 시간제한, 미등록 등 구분 | △ | ● |
| 실시간 키오스크 스트림 | 최근 출석 이벤트 즉시 반영 | - | ● |

### C. 데이터 모델

#### AttendanceChannel

```typescript
type AttendanceChannel =
  | "app_qr"
  | "kiosk_qr"
  | "face_recognition"
  | "manual";
```

#### AttendanceActorType

```typescript
type AttendanceActorType = "member" | "staff" | "guest";
```

#### LockerAssignmentStatus

```typescript
type LockerAssignmentStatus =
  | "not_applicable"
  | "unassigned"
  | "manual_assigned"
  | "auto_assigned";
```

#### AttendanceResult

```typescript
type AttendanceResult =
  | "success"
  | "failed"
  | "duplicate"
  | "checked_out";
```

#### AttendanceStreamRecord

```typescript
interface AttendanceStreamRecord {
  id: number;
  actorType: AttendanceActorType;
  actorId: number;
  actorName: string;
  channel: AttendanceChannel;
  result: AttendanceResult;
  failReason?: string | null;
  lockerAssignmentStatus: LockerAssignmentStatus;
  lockerNumber?: string | null;
  fixedLockerNumber?: string | null;
  checkedInAt: string;
  checkedOutAt?: string | null;
  branchId: number;
}
```

### D. 필드 및 필터 상세

| 필드/필터 | 타입 | 설명 |
|-----------|------|------|
| 기간 | 날짜 범위 | 일/주/월 또는 직접 선택 |
| 구분 | select | 전체, 회원, 직원, 게스트 |
| 결과 | select | 전체, 성공, 실패, 중복, 퇴실 |
| 채널 | select | 앱 QR, 키오스크 QR, 얼굴인식, 수동 |
| 락커 상태 | select | 전체, 미배정, 수동배정, 자동배정, 대상아님 |
| 검색 | text | 이름, 연락처, 회원번호, 사번 |

### E. 테이블 컬럼 상세

| key | header | 설명 |
|-----|--------|------|
| `checkedInAt` | 시간 | 입장 시각 |
| `actorType` | 구분 | 회원/직원/게스트 |
| `actorName` | 이름 | 이름 + 번호 |
| `channel` | 채널 | QR/얼굴인식/수동 |
| `result` | 결과 | 성공/실패/중복/퇴실 |
| `lockerAssignmentStatus` | 옷 락커 | 미배정/수동/자동 |
| `fixedLockerNumber` | 고정 락커 | 보유 시 번호 표시 |
| `failReason` | 비고 | 실패 사유 또는 운영 메모 |

### F. 버튼/액션

| 버튼 | 위치 | 동작 |
|------|------|------|
| 수동 출석 | 헤더 | 회원/직원 선택 후 출석 생성 |
| 실패 로그 | 헤더 | 실패건만 필터링 |
| 키오스크 모니터 | 헤더 | 최근 장비 이벤트 패널 오픈 |
| 퇴실 처리 | 행 액션 | `checkOutMember()` 또는 직원 퇴실 API 호출 |
| 락커 배정 | 행 액션 | 옷 락커 관리 화면 또는 인라인 패널 연동 |
| 회원 상세 | 행 클릭 | `/members/detail?id={id}` 이동 |

### G. 비즈니스 로직

1. 출석 이벤트 저장 시 `actorType`을 반드시 구분한다.
2. `회원 성공 출석` 후 지점 정책에 따라 다음 세 가지 중 하나를 수행한다.
   - 출석만 완료
   - 락커 자동 배정 시도
   - 미배정 상태로 저장 후 인포데스크 처리 대기
3. 자동 배정 실패 시에도 출석은 성공으로 저장하고 `lockerAssignmentStatus="unassigned"`로 처리한다.
4. 고정 물품 락커는 출석 허용 조건이 아니라 안내 정보이다.
5. 중복 출석 방지 시간(`duplicatePreventionMinutes`) 내 재시도는 `duplicate`로 저장한다.

### H. API 호출

| 동작 | 현재 API | 확장 필요 |
|------|----------|-----------|
| 출석 목록 조회 | `getAttendance()` | 회원/직원 통합 조회용 필드 확장 |
| 출석 생성 | `createAttendance()` | `actorType`, `channel`, `lockerAssignmentStatus` 추가 |
| 퇴실 처리 | `checkOut()`, `checkOutMember()` | 직원 퇴실 통합 처리 |
| 통계 조회 | `getAttendanceStats()` | 회원/직원/미배정 분리 통계 추가 |

### I. 토스트/오류 메시지

| 트리거 | 메시지 |
|--------|--------|
| 출석 성공 | `"출석이 등록되었습니다."` |
| 직원 출근 성공 | `"직원 출석이 등록되었습니다."` |
| 퇴실 성공 | `"퇴실 처리되었습니다."` |
| 자동 배정 실패 | `"출석은 완료되었지만 락커 자동 배정에 실패했습니다."` |
| 중복 출석 | `"설정된 시간 내 중복 출석은 제한됩니다."` |

---

## 2. 키오스크 설정 (`/settings/kiosk`)

> 소스: `src/app/settings/kiosk/page.tsx`
> 관련 API: `src/api/endpoints/settings.ts`

### A. 화면 개요

지점별 키오스크 운영정책을 설정한다. 체크인 수단, 대기 화면, 음성 안내, 입장 규칙, 락커 후처리 정책을 관리한다.

### B. 기능 범위

| 기능 | 설명 | 현재 구현 | 확장 필요 |
|------|------|:---:|:---:|
| 기본/화면/TTS/출입 규칙 탭 | 키오스크 로컬 설정 | ● | - |
| 직원 출석 허용 | 직원도 키오스크 출석 가능 | - | ● |
| 출석 후 처리 정책 | 출석만/수동배정/자동배정 | - | ● |
| 자동배정 대상 존 설정 | 락커 존 선택 | - | ● |
| 얼굴인식 사용 여부 | 지점별 활성/비활성 | △ | ● |
| 실패 메시지 세분화 | 정책별 안내 문구 관리 | △ | ● |

### C. 설정 모델

#### KioskCheckInMode

```typescript
type KioskCheckInMode = "qr" | "rfid" | "face";
```

#### PostCheckInPolicy

```typescript
type PostCheckInPolicy =
  | "attendance_only"
  | "manual_locker_assignment"
  | "auto_locker_assignment";
```

#### ExtendedKioskSettings

```typescript
interface ExtendedKioskSettings {
  isActive: boolean;
  checkInMethods: KioskCheckInMode[];
  allowStaffCheckIn: boolean;
  postCheckInPolicy: PostCheckInPolicy;
  autoAssignZones: string[];
  unassignedGuideMessage: string;
  enableFaceRecognition: boolean;
  duplicatePreventionMinutes: number;
  accessStartTime: string;
  accessEndTime: string;
}
```

### D. 탭 상세

| 탭 | 설명 |
|----|------|
| 기본 설정 | 기기 활성, 체크인 수단, 운영 타입 |
| 화면 설정 | 배경, 로고, 환영문구, 공지 |
| TTS 설정 | 대기/성공/실패/만료 임박 음성 |
| 출입 규칙 | 허용 시간, 만료 회원 허용 여부, 중복 방지 |
| 락커 후처리 | 출석 후 처리 정책, 자동배정 존, 미배정 안내 문구 |

### E. 버튼/액션

| 버튼 | 동작 |
|------|------|
| 저장 | `saveKioskSettings()` 호출 |
| 연결 테스트 | 현재 기기 상태 확인 |
| 미리보기 | 현재 설정값 기준 결과 화면 미리보기 |
| 배너 업로드 | 로컬/스토리지 이미지 등록 |
| TTS 재생 | 이벤트별 안내 문구 샘플 재생 |

### F. 비즈니스 로직

1. `직원 출석 허용`이 OFF이면 직원 QR/얼굴인식은 모두 실패 처리한다.
2. `postCheckInPolicy="attendance_only"`인 지점은 락커 관련 후속 처리를 발생시키지 않는다.
3. `postCheckInPolicy="manual_locker_assignment"`이면 키오스크 성공 메시지는 항상 인포데스크 안내 문구를 우선 노출한다.
4. `postCheckInPolicy="auto_locker_assignment"`이면 지정된 자동배정 존 기준으로만 빈 락커를 탐색한다.
5. 얼굴인식이 비활성화된 지점은 관련 UI와 메시지를 숨긴다.

### G. 저장 대상

| 항목 | 저장 위치 |
|------|-----------|
| 로컬 미리보기 설정 | localStorage |
| 지점 정책 확정값 | `settings` 테이블 또는 별도 `kiosk_settings` |
| 배너/이미지 | Storage |
| TTS 메시지 템플릿 | JSON 컬럼 또는 설정 테이블 |

---

## 3. IoT 연동 관리 (`/settings/iot`)

> 소스: `src/app/settings/iot/page.tsx`
> 관련 API: `src/api/endpoints/settings.ts`

### A. 화면 개요

출입문, 키오스크, 락커 컨트롤러, InBody 장비의 상태를 지점 단위로 관리한다. 기기 등록, 연결 테스트, 장애로그 조회, 원격 제어를 지원한다.

### B. 기능 범위

| 기능 | 설명 | 현재 구현 | 확장 필요 |
|------|------|:---:|:---:|
| 기기 목록/연결 테스트 | 로컬 저장형 기기 관리 | ● | - |
| 원격 게이트 개방 | 출입문 예외 개방 | ● | - |
| 출입 규칙 저장 | 시간/요일별 규칙 저장 | ● | - |
| 장비 상태 영속화 | DB 기반 장비 관리 | - | ● |
| 장애 로그 수집 | 장비 실패 이력 조회 | - | ● |
| InBody 채널 상태 구분 | 수기/업로드/API 상태 분리 | - | ● |

### C. 데이터 모델

#### DeviceType

```typescript
type DeviceType = "gate" | "kiosk" | "locker_controller" | "inbody";
```

#### DeviceStatus

```typescript
type DeviceStatus = "online" | "offline" | "error" | "maintenance";
```

#### IotDeviceRecord

```typescript
interface IotDeviceRecord {
  id: number;
  branchId: number;
  name: string;
  type: DeviceType;
  ip?: string | null;
  port?: number | null;
  serial?: string | null;
  firmware?: string | null;
  status: DeviceStatus;
  lastCommunicatedAt?: string | null;
}
```

### D. 탭 상세

| 탭 | 설명 |
|----|------|
| 게이트 관리 | 출입문 상태/원격 개방 |
| IoT 기기 | 전체 기기 목록과 상태 |
| 출입 로그 | 출입 이벤트 및 실패 로그 |
| 출입 규칙 | 시간/요일/게이트별 제한 |
| 자동 전원 | 키오스크/기기 전원 스케줄 |

### E. 버튼/액션

| 버튼 | 동작 |
|------|------|
| 기기 추가 | 신규 장비 등록 |
| 연결 테스트 | 상태 재확인 |
| 원격 게이트 개방 | 특정 게이트 강제 개방 |
| 삭제 | 장비 비활성 또는 제거 |
| 전체 동기화 | 기기 상태 일괄 새로고침 |

### F. 비즈니스 로직

1. `error`, `offline`, `maintenance` 장비는 자동 배정/자동 처리 대상에서 제외한다.
2. InBody 장비는 `수기`, `업로드`, `실시간 API` 세 채널 상태를 별도 배지로 관리한다.
3. 게이트 원격 개방은 감사 로그를 반드시 남긴다.
4. 락커 컨트롤러 장애 시 자동 락커 배정 정책은 강제로 수동 배정 모드로 폴백한다.

### G. API/로그 확장 항목

| 영역 | 필요 기능 |
|------|-----------|
| 기기 마스터 | 기기 CRUD |
| 상태 로그 | 최근 heartbeat, 장애 원인, 재시도 횟수 |
| 원격 제어 | 게이트 개방/전원 제어 명령 로그 |
| InBody 수신 로그 | 파일 업로드 성공/실패, API 수신 성공/실패 |

---

## 4. 옷 락커 운영 관리 (`/locker`)

> 소스: `src/app/(facilities)/locker/page.tsx`
> 기존 API: `src/api/endpoints/lockers.ts`

### A. 화면 개요

출석과 연동되는 `당일용 옷 락커`를 관리한다. 기본은 현장 직원 수동 배정이며, 지점 설정에 따라 자동 배정도 지원한다.

### B. 기존 락커 관리와의 차이

| 항목 | 옷 락커 | 고정 물품 락커 |
|------|---------|----------------|
| 목적 | 출석 당일 사용 | 상품 계약 기반 장기 사용 |
| 배정 시점 | 출석 후 | 판매/계약 시 |
| 기본 배정 방식 | 직원 수동 배정 | 관리자가 회원에게 고정 배정 |
| 만료 기준 | 당일 종료/퇴실 | 계약 만료일 |

### C. 데이터 모델

#### ClothesLockerStatus

```typescript
type ClothesLockerStatus =
  | "available"
  | "in_use"
  | "expiring"
  | "overdue"
  | "maintenance"
  | "cleaning";
```

#### UnassignedCheckInRecord

```typescript
interface UnassignedCheckInRecord {
  attendanceId: number;
  memberId: number;
  memberName: string;
  checkedInAt: string;
  membershipType?: string | null;
  priority?: "normal" | "vip" | "staff_assist";
}
```

### D. 필수 기능

| 기능 | 설명 | 현재 구현 | 확장 필요 |
|------|------|:---:|:---:|
| 락커 그리드 | 상태별 락커 조회 | ● | - |
| 개별 배정/회수/고장 처리 | 기본 운영 액션 | ● | - |
| 일괄 배정/해제 | 배정/만료 일괄 처리 | ● | - |
| 미배정 회원 패널 | 출석 완료 후 배정 대기 목록 | - | ● |
| 출석 연동 | 배정 시 출석 레코드와 연결 | - | ● |
| 자동 배정 결과 표시 | 자동/수동 구분 | - | ● |

### E. 버튼/액션

| 버튼 | 동작 |
|------|------|
| 미배정 회원 보기 | 오늘 출석 미배정 목록 열기 |
| 회원 배정 | 선택 회원 + 빈 락커 배정 |
| 회수 | 배정 정보 제거 |
| 고장/복구 | 배정 대상 제외/복원 |
| 일괄 해제 | 미반납/만료 락커 정리 |

### F. 비즈니스 로직

1. 기본 배정 방식은 `수동 배정`이다.
2. 자동 배정이 활성화된 지점이라도 배정 실패 시 `미배정 목록`으로 보내야 한다.
3. 퇴실 처리 또는 마감 배치 실행 시 해당 옷 락커는 회수 후보가 된다.
4. `maintenance`, `cleaning` 상태 락커는 배정 불가이다.
5. VIP 우선, 특정 존 우선 등 추가 정책은 `priority` 필드로 확장 가능하다.

### G. API 확장

| 동작 | 현재 API | 확장 필요 |
|------|----------|-----------|
| 락커 목록 조회 | `getLockers()` | 락커 타입 필터, 배정 방식 필드 추가 |
| 락커 배정 | `assignLocker()` | `attendanceId`, `assignmentMode` 추가 |
| 락커 반납 | `releaseLocker()` | 퇴실 이벤트 연동 |
| 상태 변경 | `updateLockerStatus()` | cleaning, overdue 상태 추가 |

---

## 5. 고정 물품 락커 관리 (`/locker/management`)

> 소스: `src/app/(facilities)/locker/management/page.tsx`
> 기존 API: `src/api/endpoints/lockers.ts`

### A. 화면 개요

상품 판매와 연결되는 `기본물품(소형) 고정 락커`를 회원 단위로 장기 배정하고, 만료/연장/회수까지 관리한다.

### B. 기능 범위

| 기능 | 설명 | 현재 구현 | 확장 필요 |
|------|------|:---:|:---:|
| 회원 검색 + 락커 선택 | 고정 락커 배정 | ● | - |
| 타입별 탭 | daily/personal/golf | △ | ● |
| 만료 락커 일괄 해제 | 장기 배정 회수 | ● | - |
| 상품/계약 연동 | 락커 상품 보유 여부 검증 | - | ● |
| 만료 예정 알림 | 자동 알림/리포트 | - | ● |

### C. 데이터 모델

#### FixedLockerType

```typescript
type FixedLockerType = "personal_item" | "golf" | "premium";
```

#### FixedLockerAssignment

```typescript
interface FixedLockerAssignment {
  lockerId: number;
  lockerNumber: string;
  memberId: number;
  memberName: string;
  productName: string;
  assignedAt: string;
  expiresAt: string;
  status: "active" | "expiring" | "expired" | "recovery_pending";
}
```

### D. 필수 규칙

1. 고정 물품 락커는 출석과 무관하게 유지된다.
2. 회원이 락커 상품을 보유하지 않으면 신규 배정할 수 없다.
3. 계약 만료 후 미연장 상태는 `recovery_pending`으로 전환한다.
4. 회수 시 이전 사용 이력은 보존한다.

### E. 버튼/액션

| 버튼 | 동작 |
|------|------|
| 배정하기 | 회원 + 락커 + 만료일 등록 |
| 연장 | 만료일 연장 |
| 회수 | 회원 연결 제거 |
| 상태 동기화 | 만료 상태 재계산 |
| 엑셀 | 현재 목록 다운로드 |

### F. 권장 API 확장

| 영역 | 필요 기능 |
|------|-----------|
| 상품 검증 | 회원의 락커 상품 보유 여부 체크 |
| 자동 만료 처리 | 배치 또는 화면 진입 시 만료 갱신 |
| 알림 발송 | 만료 7일/1일 전 알림 |

---

## 6. 체성분 통합 관리 (`/body-composition`)

> 소스: `src/app/body-composition/page.tsx`
> 기존 API: `src/api/endpoints/bodyInfo.ts`

### A. 화면 개요

체성분 데이터를 한 화면에서 통합 관리한다. 데이터 수집 경로는 `수기 입력 보조`, `파일 업로드`, `실시간 API` 3종이며, 운영자는 원본과 확정값을 구분해서 관리한다.

### B. 기능 범위

| 기능 | 설명 | 현재 구현 | 확장 필요 |
|------|------|:---:|:---:|
| 체성분 이력 조회 | 회원별 체성분 리스트/차트 | ● | - |
| 수기 입력 보조 | 직접 입력/수정 | △ | ● |
| 파일 업로드 | 장비 파일 업로드 후 파싱 | - | ● |
| 실시간 API 연동 | 장비/중계서버 수신 | - | ● |
| 검수 대기함 | 회원 매칭 실패/중복 검수 | - | ● |

### C. 데이터 모델

#### BodyCompositionSource

```typescript
type BodyCompositionSource = "manual" | "file_upload" | "inbody_api";
```

#### BodyCompositionRecord

```typescript
interface BodyCompositionRecord {
  id: number;
  memberId: number;
  measuredAt: string;
  weight: number;
  skeletalMuscleMass?: number | null;
  bodyFatMass?: number | null;
  bodyFatPercentage?: number | null;
  bmi?: number | null;
  bmr?: number | null;
  bodyWater?: number | null;
  source: BodyCompositionSource;
  sourceFileName?: string | null;
  isVerified: boolean;
}
```

### D. 탭 구성

| 탭 | 설명 |
|----|------|
| 측정 결과 | 확정된 체성분 결과 조회 |
| 업로드 센터 | 파일 업로드 및 파싱 결과 확인 |
| 실시간 연동 | API 수신 로그 확인 |
| 오류/검수 | 중복, 회원 매칭 실패, 값 이상치 검수 |

### E. 버튼/액션

| 버튼 | 동작 |
|------|------|
| 수기 등록 | 측정값 수기 입력 |
| 파일 업로드 | CSV/XLSX 등 장비 파일 업로드 |
| 연동 로그 | API 수신/실패 내역 확인 |
| 확정 처리 | 검수 완료 후 결과 확정 |
| 회원 상세 이동 | 결과 행 클릭 시 상세 이동 |

### F. 비즈니스 로직

1. 입력 소스는 반드시 저장해야 한다.
2. 같은 회원, 같은 측정시각의 중복 데이터는 자동 확정하지 않고 검수 대기로 보낸다.
3. 회원앱과 회원 상세에는 `isVerified=true`인 최신 데이터만 노출한다.
4. 수기 수정이 발생하면 원본 소스는 유지하되 수정 이력을 별도 로그로 남긴다.

### G. API 확장

| 영역 | 필요 기능 |
|------|-----------|
| 업로드 파서 | 파일 형식별 파싱기 |
| API 수신 엔드포인트 | InBody 실시간 수신 |
| 검수 큐 | 중복/매칭 실패 데이터 처리 |
| 이력 로그 | 원본/수정 이력 보관 |

---

## 7. 회원 상세 건강/연동 요약 (`/members/detail`)

> 소스: `src/app/members/detail/page.tsx`
> 기존 API: `src/api/endpoints/members.ts`, `src/api/endpoints/bodyInfo.ts`, `src/api/endpoints/exerciseLogs.ts`, `src/api/endpoints/exercisePrograms.ts`

### A. 화면 개요

회원 상세 화면 상단과 건강 관련 탭에 `최근 출석`, `오늘 옷 락커`, `고정 물품 락커`, `최근 InBody`, `최근 7일 활동량`, `Health Connect 연결 상태`를 요약한다.

### B. 기능 범위

| 기능 | 설명 | 현재 구현 | 확장 필요 |
|------|------|:---:|:---:|
| 회원 기본 정보/탭 구조 | 회원 상세 관리 | ● | - |
| 신체정보/운동이력 조회 | 건강 관련 하위 탭 | ● | - |
| 오늘 옷 락커 표시 | 당일 출석 기반 락커 정보 | - | ● |
| 고정 물품 락커 표시 | 장기 락커 보유 정보 | - | ● |
| 최근 InBody 요약 | 핵심 수치 카드화 | △ | ● |
| Health Connect 연동 상태 | 연결/미연결, 최근 동기화 | - | ● |

### C. 요약 카드 항목

| 카드 | 설명 |
|------|------|
| 최근 출석 | 마지막 체크인 시각 |
| 오늘 옷 락커 | 배정 번호 또는 미배정 |
| 고정 락커 | 보유 번호 또는 없음 |
| 최근 InBody | 체중, 골격근량, 체지방률 |
| 최근 7일 활동량 | 걸음수/운동일 수 |

### D. 추가 위젯

| 위젯 | 설명 |
|------|------|
| Health Connect 상태 배지 | 연결됨, 동기화 대기, 미연결 |
| 최근 동기화 시각 | 마지막 데이터 동기화 시각 |
| 활동량 비교 | 센터 출석 vs 외부 활동량 |
| 상담 메모 바로가기 | 건강/운동 상담 연결 |

### E. 비즈니스 로직

1. Health Connect는 `Android 하이브리드 앱 경유 데이터`임을 상태 문구에 표시한다.
2. 최근 InBody는 검수 완료된 최신 데이터만 사용한다.
3. 오늘 옷 락커는 퇴실 처리 후 숨기거나 회수 상태로 표기한다.
4. 고정 물품 락커는 만료되어도 최근 상태를 확인할 수 있어야 한다.

### F. API 확장

| 영역 | 필요 기능 |
|------|-----------|
| 회원 상세 요약 API | 출석, 락커, InBody, 활동량 통합 요약 |
| Health Connect 동기화 상태 API | 연결 여부, 최근 동기화 시각 |
| 활동량 조회 API | 최근 7일/30일 집계 |

---

## 8. 공통 정책 및 통합 이벤트

### A. 정책 요약

| 주제 | 정책 |
|------|------|
| 기본 출석 후 처리 | 직원 수동 배정 |
| 자동 락커 배정 | 지점 설정 기반 옵션 |
| 락커 구분 | 옷 락커와 고정 물품 락커는 분리 운영 |
| InBody 수집 경로 | 수기, 업로드, 실시간 API |
| Health Connect 범위 | Android 하이브리드 앱 경유, 순수 웹 직접 연동 아님 |

### B. 핵심 도메인 이벤트

#### 1. `attendance.checked_in`

```typescript
interface AttendanceCheckedInEvent {
  attendanceId: number;
  actorType: "member" | "staff";
  actorId: number;
  branchId: number;
  channel: "app_qr" | "kiosk_qr" | "face_recognition" | "manual";
  occurredAt: string;
}
```

후속 처리:
- 출석 로그 적재
- 지점 정책 조회
- 옷 락커 자동 배정 시도 또는 수동 배정 대기
- 키오스크 결과 메시지 생성

#### 2. `locker.assigned`

```typescript
interface LockerAssignedEvent {
  lockerId: number;
  lockerType: "clothes" | "fixed";
  memberId: number;
  assignmentMode: "manual" | "automatic" | "contract";
  assignedAt: string;
}
```

후속 처리:
- 회원 상세 요약 갱신
- 출석 레코드와 연결
- 감사 로그 저장

#### 3. `body-composition.received`

```typescript
interface BodyCompositionReceivedEvent {
  memberId?: number | null;
  source: "manual" | "file_upload" | "inbody_api";
  measuredAt: string;
  isVerified: boolean;
}
```

후속 처리:
- 회원 매칭
- 중복 검수
- 회원 상세/회원앱 요약 갱신

#### 4. `health-connect.synced`

```typescript
interface HealthConnectSyncedEvent {
  memberId: number;
  syncedAt: string;
  stepCount: number;
  activeEnergyBurned?: number | null;
  workoutCount?: number | null;
}
```

후속 처리:
- 활동량 집계 갱신
- 회원 상세 건강 요약 갱신
- 리워드/자동화 시나리오 확장 가능

### C. 권장 구현 순서

1. 출석 통합 필드 확장
2. 키오스크 정책 저장 구조 확장
3. 옷 락커 미배정 큐와 출석 연동
4. 고정 물품 락커 상품 연동
5. 체성분 업로드/API 수신 채널 추가
6. 회원 상세 건강/연동 요약 추가
7. Android 하이브리드 앱 기반 Health Connect 연동

