# lessonbook 골프 비교 보강 메모

## 목적

`/Users/simjaehyeong/Desktop/pando/share/lessonbook`의 HOPOS 기반 골프/레슨 운영 화면을 검토해 `admin-pando`의 골프 관련 기획 문서에 없는 운영 요소를 보강한 내역을 정리한다.

## 핵심 해석

- Lessonbook/HOPOS는 `타석 운영`을 단순 현황판이 아니라 `예약 캘린더 + 실시간 사용 + 처리 모달`로 묶어 관리한다.
- 특히 골프 연습장 특성상 `개인레슨 / 정규 / 시설예약`이 같은 시간표 안에서 섞여 보이는 구조가 중요하다.
- 회원 채널과 키오스크는 관리자 운영 데이터의 축약 뷰이며, `대기`, `승격`, `프로 배정`, `이용권 차감` 정보를 명확히 보여줘야 한다.

## 이번 반영 범위

### 1. 관리자 골프 운영

- 참조 이미지:
  - `시설예약/image 52.png`
  - `시설예약/image 53.png`
  - `시설예약/image 57.png`
  - `예약현황/image 79.png`
  - `예약현황/image 83.png`
- 반영 문서:
  - [SCR-054 골프 타석 관리](/Users/simjaehyeong/Desktop/pando/admin-pando/docs/admin/화면설계서/D06-시설관리/SCR-054-골프타석관리/00-기본화면.md:1)
- 보강 내용:
  - 일간/월간 보기 전환
  - 날짜 스트립과 일자별 가용량 뱃지
  - 5분 단위 타임테이블과 현재 시각선
  - 개인레슨/정규/시설예약 구분 필터
  - 예약 블록 클릭 시 처리 모달
  - 삭제/취소/결석/완료 처리 개념

### 2. 회원앱 골프 예약 상세

- 참조 이미지:
  - `예약현황/image 83.png`의 처리 상태 구조
  - HOPOS 기획서의 시설예약/개인레슨 혼합 예약 개념
- 반영 문서:
  - [SCR-MA-123 골프 예약 상세](/Users/simjaehyeong/Desktop/pando/admin-pando/docs/client/화면설계서/D12-회원앱/SCR-MA-123-골프예약상세/00-기본화면.md:1)
- 보강 내용:
  - 담당 프로
  - 예약 유형(시설/개인레슨/정규)
  - 예약 변경 이력
  - 대기 예약 상태 / 예상 대기 시간 / 자동 승격 안내

### 3. 키오스크 골프 예약

- 반영 문서:
  - [KIO-501](/Users/simjaehyeong/Desktop/pando/admin-pando/docs/kiosk/화면설계서/A4-골프예약/KIO-501-골프예약진입/00-기본화면.md:1)
  - [KIO-502](/Users/simjaehyeong/Desktop/pando/admin-pando/docs/kiosk/화면설계서/A4-골프예약/KIO-502-날짜시간선택/00-기본화면.md:1)
  - [KIO-503](/Users/simjaehyeong/Desktop/pando/admin-pando/docs/kiosk/화면설계서/A4-골프예약/KIO-503-타석선택/00-기본화면.md:1)
  - [KIO-504](/Users/simjaehyeong/Desktop/pando/admin-pando/docs/kiosk/화면설계서/A4-골프예약/KIO-504-예약완료/00-기본화면.md:1)
- 보강 내용:
  - 만석이지만 대기열 허용인 상태 분리
  - 날짜별 남은 타석 수 뱃지
  - 시간 슬롯의 일부 마감 / 대기 가능 구분
  - 개인레슨 선점 타석 구분
  - 예약 완료 vs 대기 등록 완료 메시지 차별화

## 추가로 남은 과제

- 예약현황 계열을 별도 admin 화면으로 세분화할지 결정
  - 시설예약현황 / 레슨예약현황 / 취소현황 / 노쇼현황
- 골프 사물함과 타석 예약의 결합 흐름 보강
- 강사별 예약률 / 타석 점유율 / 시간대 히트맵 등 골프 전용 통계 화면 정의
- 레슨북의 하단 탭형 작업 전환 UX를 우리 멀티패널 구조에 어떻게 번역할지 결정
