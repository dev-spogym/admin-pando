# FitGenie 회원앱 설계 가이드

> **작성일**: 2026-04-17 | **버전**: 2.0
> **범위**: 디자인 토큰, 딥링크 스키마, 오프라인 전략, 접근성, 애니메이션

---

## 목차

1. [디자인 토큰](#1-디자인-토큰)
2. [딥링크 스키마](#2-딥링크-스키마)
3. [오프라인 전략](#3-오프라인-전략)
4. [접근성 (Accessibility)](#4-접근성-accessibility)
5. [애니메이션/트랜지션](#5-애니메이션트랜지션)
6. [변경 이력](#6-변경-이력)

---

## 1. 디자인 토큰

### 1.1 색상 팔레트

| 토큰명 | HEX | 용도 |
|--------|-----|------|
| primary-50 | #EFF6FF | 배경 (밝은 파랑) |
| primary-100 | #DBEAFE | 카드 배경 |
| primary-500 | #3B82F6 | 주요 버튼, 링크 |
| primary-600 | #2563EB | 버튼 hover/pressed |
| primary-700 | #1D4ED8 | 활성 탭 |
| secondary-500 | #8B5CF6 | 보조 액션 |
| success-500 | #22C55E | 완료, 출석 |
| warning-500 | #F59E0B | 주의, 만료임박 |
| error-500 | #EF4444 | 에러, 노쇼 |
| gray-50 | #F9FAFB | 배경 |
| gray-100 | #F3F4F6 | 구분선 배경 |
| gray-300 | #D1D5DB | 비활성 |
| gray-500 | #6B7280 | 보조 텍스트 |
| gray-700 | #374151 | 본문 텍스트 |
| gray-900 | #111827 | 제목 텍스트 |
| white | #FFFFFF | 카드, 입력 필드 배경 |

---

### 1.2 상태 색상 매핑

| 상태 | 배경 | 텍스트 | 용도 |
|------|------|--------|------|
| 활성 (active) | #DCFCE7 | #166534 | 회원 상태, 이용권 |
| 만료 (expired) | #FEE2E2 | #991B1B | |
| 홀딩 (holding) | #FEF3C7 | #92400E | |
| 휴면 (dormant) | #F3F4F6 | #6B7280 | |
| 예정 (scheduled) | #DBEAFE | #1E40AF | 수업 상태 |
| 진행중 (in_progress) | #D1FAE5 | #065F46 | |
| 완료 (completed) | #F3F4F6 | #374151 | |
| 노쇼 (no_show) | #FEE2E2 | #991B1B | |
| 취소 (cancelled) | #F3F4F6 | #9CA3AF | (취소선) |
| 서명대기 (pending_member) | #FEF3C7 | #92400E | 골프 서명 |

---

### 1.3 타이포그래피

| 토큰 | 크기 | 무게 | 줄높이 | 용도 |
|------|------|------|--------|------|
| heading-xl | 24px | Bold(700) | 32px | 화면 제목 |
| heading-lg | 20px | SemiBold(600) | 28px | 섹션 제목 |
| heading-md | 18px | SemiBold(600) | 24px | 카드 제목 |
| body-lg | 16px | Regular(400) | 24px | 본문 |
| body-md | 14px | Regular(400) | 20px | 보조 텍스트 |
| body-sm | 12px | Regular(400) | 16px | 캡션, 레이블 |
| body-xs | 10px | Medium(500) | 14px | 배지 텍스트 |

---

### 1.4 간격 체계 (8px 기반)

| 토큰 | 값 | 용도 |
|------|-----|------|
| space-1 | 4px | 인라인 간격 |
| space-2 | 8px | 요소 내부 간격 |
| space-3 | 12px | 카드 내부 패딩 |
| space-4 | 16px | 섹션 간 간격, 화면 좌우 패딩 |
| space-5 | 20px | 카드 간 간격 |
| space-6 | 24px | 섹션 간 큰 간격 |
| space-8 | 32px | 영역 분리 |
| space-10 | 40px | 화면 상하 여백 |

---

### 1.5 컴포넌트 크기

| 컴포넌트 | 높이 | 최소너비 | 반경 | 비고 |
|----------|------|---------|------|------|
| 버튼 (Large) | 52px | 전체너비 | 12px | 주요 CTA |
| 버튼 (Medium) | 44px | 120px | 10px | 보조 |
| 버튼 (Small) | 36px | 80px | 8px | 인라인 |
| 입력 필드 | 48px | 전체너비 | 10px | |
| 카드 | auto | 전체너비 | 16px | 그림자: 0 1px 3px rgba(0,0,0,0.1) |
| 하단 탭 바 | 56px | - | 0 | 상단 border |
| 네비게이션 바 | 56px | - | 0 | |
| 배지 | 24px | 40px | 12px | 상태 배지 |
| 서명 패드 | 200px | 전체너비-32px | 12px | border: 2px dashed gray-300 |
| 터치 타겟 | 최소 44x44px | - | - | 접근성 기준 |

---

### 1.6 아이콘

- 아이콘 세트: Lucide Icons (React Native)
- 기본 크기: 24px (탭바), 20px (리스트), 16px (인라인)
- 색상: 현재 텍스트 색상 따름

---

## 2. 딥링크 스키마

### 2.1 URL 스키마

- Scheme: `fitgenie://`
- Universal Link: `https://app.fitgenie.kr/`

---

### 2.2 전체 딥링크 테이블

| 딥링크 URL | 화면 ID | 파라미터 | 트리거 |
|-----------|---------|---------|--------|
| fitgenie://home | MA-100/200/400/500 | - | 홈 |
| fitgenie://checkin | MA-110 | - | QR 체크인 바로가기 |
| fitgenie://reservations | MA-122 | - | 내 예약 |
| fitgenie://class/{classId} | MA-121/212 | classId: uuid | 수업 상세 |
| fitgenie://ticket/{ticketId} | MA-131 | ticketId: uuid | 이용권 상세 |
| fitgenie://signature/{requestId} | MA-312 (회원모드) | requestId: uuid | 골프 쌍방서명 (회원에게 푸시) |
| fitgenie://notification/{id} | MA-150/251/451/551 | id: uuid | 알림 탭 후 상세 |
| fitgenie://announcement/{id} | MA-152 | id: uuid | 공지사항 상세 |
| fitgenie://consultation/{id} | MA-412 | id: uuid | 상담 상세 (FC) |
| fitgenie://member/{memberId} | MA-221/421/511 | memberId: uuid | 회원 상세 |
| fitgenie://payment/{paymentId} | MA-133 | paymentId: uuid | 결제 상세 |
| fitgenie://product/{productId} | MA-141 | productId: uuid | 상품 상세 |
| fitgenie://certificate/{certId} | MA-313 | certId: uuid | 레슨 확인서 |
| fitgenie://inquiry/{inquiryId} | MA-153 | inquiryId: uuid | 문의 상세 |
| fitgenie://settings | MA-155/252/452/552 | - | 설정 |

---

### 2.3 알림 유형별 딥링크 매핑

| 알림 유형 | 대상 역할 | 딥링크 | 설명 |
|----------|---------|--------|------|
| reservation_reminder | member | fitgenie://class/{classId} | 수업 1시간 전 리마인더 |
| reservation_confirmed | member | fitgenie://reservations | 예약 확정 |
| reservation_cancelled | member | fitgenie://reservations | 예약 취소됨 |
| ticket_expiring | member | fitgenie://ticket/{ticketId} | 이용권 만료 D-7 |
| class_changed | member, trainer | fitgenie://class/{classId} | 수업 변경 |
| signature_request | member | fitgenie://signature/{requestId} | 골프 서명 요청 |
| signature_completed | golf_trainer | fitgenie://certificate/{certId} | 서명 완료 알림 |
| signature_expired | golf_trainer | fitgenie://class/{classId} | 서명 만료 |
| consultation_reminder | fc | fitgenie://consultation/{id} | 상담 D-1 리마인더 |
| member_expiring | fc | fitgenie://member/{memberId} | 담당회원 만료임박 |
| new_inquiry_reply | member | fitgenie://inquiry/{inquiryId} | 문의 답변 |
| announcement | all | fitgenie://announcement/{id} | 공지사항 |
| system | all | fitgenie://home | 시스템 알림 |

---

### 2.4 접근 불가 시 리다이렉트

| 상황 | 동작 |
|------|------|
| 비로그인 상태 딥링크 | 로그인 화면 → 로그인 후 원래 딥링크 화면으로 이동 |
| 권한 없는 화면 (예: 회원이 강사 화면) | 홈 화면 + 토스트 "접근 권한이 없습니다" |
| 삭제/만료된 리소스 | 해당 목록 화면 + 토스트 "항목을 찾을 수 없습니다" |

---

## 3. 오프라인 전략

### 3.1 화면별 오프라인 동작 매트릭스

| 화면 | 오프라인 가능 | 캐시 전략 | 비고 |
|------|:---:|----------|------|
| 로그인 | ❌ | - | 네트워크 필수 |
| 홈 | ⚠️ | cache-first | 마지막 캐시 데이터 표시 + "오프라인" 배너 |
| QR 체크인 | ❌ | - | 네트워크 필수 |
| 출석 이력 | ⚠️ | cache-first | 캐시 데이터 표시 |
| 수업 목록/예약 | ❌ | stale-while-revalidate | 실시간 정원 확인 필요 |
| 내 프로필 | ✅ | cache-first | 오프라인 조회 가능 |
| 이용권 | ⚠️ | cache-first | 캐시 표시 |
| 체성분 | ⚠️ | cache-first | 조회만 가능 |
| 상품/결제 | ❌ | - | 결제 네트워크 필수 |
| 알림 | ⚠️ | cache-first | 캐시 표시 |
| 수업 캘린더(강사) | ⚠️ | cache-first | 캐시 표시 |
| 수업 시작/완료 | ❌ | - | 서버 상태 변경 필요 |
| 서명 | ⚠️ | queue | 서명 로컬 저장 → 온라인 시 동기화 |
| 체성분 기록(강사) | ⚠️ | queue | 로컬 저장 → 동기화 |
| 상담 등록(FC) | ⚠️ | queue | 로컬 저장 → 동기화 |
| 수동 출석(스태프) | ❌ | - | 서버 기록 필수 |

> ✅ 완전 가능 | ⚠️ 제한적 (캐시/큐) | ❌ 불가

---

### 3.2 캐시 전략

| 전략 | 설명 | 적용 |
|------|------|------|
| cache-first | 캐시 먼저 → 백그라운드 갱신 | 변경 빈도 낮은 데이터 (프로필, 이용권) |
| stale-while-revalidate | 캐시 표시 + 동시 서버 요청 → 갱신 | 목록 데이터 |
| network-first | 서버 우선 → 실패 시 캐시 | 실시간 데이터 (예약 정원) |
| queue | 로컬 저장 → 온라인 시 서버 전송 | 쓰기 작업 (서명, 기록) |

---

### 3.3 오프라인 UI 패턴

- 상단에 "오프라인 모드 — 일부 기능이 제한됩니다" 배너 (warning-500 배경)
- 불가능한 버튼은 disabled + 툴팁
- 캐시 데이터 표시 시 마지막 갱신 시간 표시 ("5분 전 업데이트")
- 큐에 대기 중인 작업 카운트 배지

---

### 3.4 충돌 해결

| 충돌 유형 | 해결 전략 |
|----------|----------|
| 같은 수업에 중복 예약 | 서버 우선 (last-write-wins) + 사용자 알림 |
| 오프라인 서명 + 서버에서 만료 처리 | 서버 상태 우선 → 사용자에게 "서명이 만료되었습니다" 안내 |
| 오프라인 체성분 기록 + 서버에 이미 같은 날짜 기록 | 서버 기록 유지 + 오프라인 기록을 새 항목으로 추가 |

---

## 4. 접근성 (Accessibility)

### 4.1 필수 요구사항

| 항목 | 기준 | 적용 |
|------|------|------|
| 터치 타겟 | 최소 44x44px | 모든 터치 가능 요소 |
| 색상 대비 | 4.5:1 이상 (AA) | 텍스트/배경 |
| 스크린 리더 | VoiceOver(iOS), TalkBack(Android) | 모든 화면 |
| 동적 글꼴 | 시스템 글꼴 크기 반영 | 100%~200% 범위 |
| 서명 패드 대체 | 서명 불가 시 텍스트 확인 | 골프 쌍방서명 |

---

### 4.2 컴포넌트별 접근성 속성

| 컴포넌트 | accessibilityLabel | accessibilityRole | accessibilityHint |
|----------|-------------------|--------------------|-------------------|
| 하단 탭 | "홈 탭" | tab | "홈 화면으로 이동합니다" |
| QR 스캔 버튼 | "QR 체크인" | button | "카메라로 QR 코드를 스캔합니다" |
| 이용권 카드 | "{이용권명} D-{n}" | summary | "이용권 상세를 확인합니다" |
| 서명 패드 | "서명 영역" | none | "손가락으로 서명해주세요" |
| 상태 배지 | "{상태명}" | text | - |

---

## 5. 애니메이션/트랜지션

### 5.1 화면 전환

| 전환 | 유형 | 시간 | 이징 |
|------|------|------|------|
| 스택 push | slide-from-right | 300ms | ease-out |
| 스택 pop | slide-to-right | 250ms | ease-in |
| 모달 open | slide-from-bottom | 350ms | ease-out |
| 모달 close | slide-to-bottom | 250ms | ease-in |
| 탭 전환 | fade | 150ms | ease-in-out |

---

### 5.2 마이크로 인터랙션

| 요소 | 애니메이션 | 시간 | 설명 |
|------|----------|------|------|
| QR 체크인 성공 | checkmark scale-up + confetti | 600ms | Lottie 애니메이션 |
| 버튼 press | scale(0.97) | 100ms | 터치 피드백 |
| 카드 press | opacity(0.7) | 100ms | 터치 피드백 |
| Pull-to-refresh | spring(dampingRatio: 0.6) | 400ms | 당겨서 새로고침 |
| 스켈레톤 로딩 | shimmer (좌→우) | 1500ms loop | 콘텐츠 로딩 |
| 토스트 알림 | slide-down + fade-in, 3초 후 fade-out | 300ms in, 200ms out | 성공/에러 피드백 |
| 서명 완료 | scale(1.05) + opacity pulse | 400ms | 확인 피드백 |
| 배지 카운트 변경 | scale bounce | 300ms | 숫자 변경 시 |

---

### 5.3 로딩 상태

| 유형 | 구현 | 적용 화면 |
|------|------|----------|
| Skeleton UI | 회색 블록 shimmer | 목록, 카드, 프로필 |
| Spinner | ActivityIndicator (center) | 버튼 내부, 모달 |
| Progress Bar | 선형 진행 바 | 결제 처리, PDF 생성 |
| Pull-to-refresh | RefreshControl | 모든 스크롤 화면 |

---

## 6. 변경 이력

| 버전 | 작성일 | 변경사항 |
|------|--------|----------|
| 2.0 | 2026-04-17 | 최초 작성 — 역할 기반 통합 앱 설계 가이드 |
