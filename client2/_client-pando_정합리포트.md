# client-pando 구현 정합 리포트

작성일: 2026-05-31

## 기준

- 정본: `docs4` (읽기 전용, 수정하지 않음)
- 동기화 대상: `/Users/simjaehyeong/Desktop/pando/client-pando`, `client2`
- 검증: `client-pando`의 route/screen 구현, 공통 enum, 표시 용어, 빌드 결과

## 반영 완료

- `/` 첫 화면을 탐색 홈에서 회원 홈 대시보드(MA-100)로 수정하고, 탐색 홈(MA-300)은 `/explore`로 분리.
- 회원앱 role을 `member / trainer / golf_trainer / fc / staff` 5종으로 정리하고 CRM `admin` 우회 권한을 제거.
- 회원 상태값을 docs4 정본 7종(`ACTIVE / EXPIRED / SCHEDULED / EXPIRING / HOLDING / UNREGISTERED / WITHDRAWN`)으로 정리.
- 회원 등급을 `브론즈 / 실버 / 골드 / 플래티넘 / 다이아몬드` 5단계로 정리하고 이전 등급 표시를 제거.
- 탐색 플랫폼 카테고리를 C04 정본 14종 기준으로 정리.
- 수업 유형을 `PT / GX / 골프 / 기타`, GX 세부종목을 `요가 / 필라테스 / 스피닝 / 줌바 / GX 기타` 기준으로 정리.
- 레거시 브랜드 표시/로컬 키/임시 도메인을 FitGenie 기준으로 정리.
- 건강 데이터 연동 화면이 참조하던 mock API 누락을 보완해 `/settings/health-data` 빌드 오류를 해소.
- C07 커뮤니티 누락 화면을 추가: `/community`, `/community/reports`, `/community/activity`.
- C08 시스템공통 누락 화면을 추가: `/app-update`, `/permissions`, `/device-info`.
- 결제 실패 화면(MA-812)을 `/checkout/failure`로 추가.
- 마일리지 전용 화면(MA-136/MA-720)을 `/mileage`로 추가.
- 1:1 문의 화면(MA-153)을 `/support`로 추가.
- 구독 / 자동결제 화면(MA-154/MA-860)을 `/subscription`으로 추가.
- Q&A 카테고리를 C07 정본 5종(`운동 / 식단 / 이용권 / 시설 / 기타`)으로 정리.

## 화면 보강 매핑

| MA | 화면 | client-pando route |
|---|---|---|
| MA-100 | 회원 홈 대시보드 | `/` |
| MA-300 | 탐색 홈 | `/explore` |
| MA-600 | 커뮤니티 홈 | `/community` |
| MA-640 | 신고 / 차단 관리 | `/community/reports` |
| MA-650 | 내 활동 | `/community/activity` |
| MA-812 | 결제 실패 | `/checkout/failure` |
| MA-136 / MA-720 | 마일리지 조회 / 사용 / 이력 | `/mileage` |
| MA-153 | 1:1 문의 | `/support` |
| MA-154 / MA-860 | 구독 / 자동결제 | `/subscription` |
| MA-930 | 앱 업데이트 안내 | `/app-update` |
| MA-940 | 권한 요청 | `/permissions` |
| MA-970 | 디바이스 / 앱 정보 | `/device-info` |

## 검증 결과

- `npx tsc --noEmit`: 통과
- `npm run build`: 통과 (`99`개 app route 생성)
- `docs4` git diff: 없음

## 남은 주의사항

- `client-pando/docs` 하위 레거시 문서는 이번 정합 대상에서 제외했다.
- 실제 Supabase 데이터의 `classes.type`, 상품 카테고리 값이 정본 enum과 다르면 DB seed/API 응답 쪽도 동일 기준으로 정리해야 한다.
- `docs4 채널 정합` 기능은 회원앱 UX만 구현하며 원천 데이터·운영 판정·감사 로그·알림은 `_docs4_기획연계.md`의 docs4 귀속 기준을 따른다.
