# Client Docs TC Set

## 목적

- 기준 문서: `/Users/simjaehyeong/Desktop/pando/admin-pando/docs/client`
- 목적: 문서 기준의 화면, 플로우, 상태, 권한, 예외를 E2E 이전 단계에서 검증 가능한 TC로 분해한다.
- 사용 순서:
  1. 이 폴더의 TC로 기획 구멍 확인
  2. 구현 누락/분기 누락 보완
  3. 안정된 핵심 플로우만 E2E 자동화

## 작성 기준

- 화면 단위보다 더 잘게 쪼갠다.
- `정상 흐름`, `빈 상태`, `오류 상태`, `상태 전이`, `권한`, `연결`, `데이터 반영`을 모두 본다.
- 문서에 명시된 admin 연동 영향, 정책, 상태 변화는 TC로 드러나야 한다.

## TC ID 규칙

- `MEM`: 회원 핵심
- `TRN`: 트레이너 / 골프강사
- `OPS`: FC / 스태프
- `MKT`: 탐색 플랫폼
- `ORD`: 결제 / 주문
- `RWD`: 리워드 / 활동
- `COM`: 커뮤니티 / 신뢰
- `SYS`: 시스템 / 공통 / 횡단

형식:

```text
<도메인>-<화면ID>-<시퀀스>
예) MEM-MA121-03
```

## 파일 구성

- [01_tc_guide.md](/Users/simjaehyeong/Desktop/pando/client-pando/docs/testcases/client-docs-tc/01_tc_guide.md)
- [10_member_core_tc.md](/Users/simjaehyeong/Desktop/pando/client-pando/docs/testcases/client-docs-tc/10_member_core_tc.md)
- [20_trainer_golf_tc.md](/Users/simjaehyeong/Desktop/pando/client-pando/docs/testcases/client-docs-tc/20_trainer_golf_tc.md)
- [30_fc_staff_tc.md](/Users/simjaehyeong/Desktop/pando/client-pando/docs/testcases/client-docs-tc/30_fc_staff_tc.md)
- [40_marketplace_tc.md](/Users/simjaehyeong/Desktop/pando/client-pando/docs/testcases/client-docs-tc/40_marketplace_tc.md)
- [50_order_payment_tc.md](/Users/simjaehyeong/Desktop/pando/client-pando/docs/testcases/client-docs-tc/50_order_payment_tc.md)
- [60_reward_activity_tc.md](/Users/simjaehyeong/Desktop/pando/client-pando/docs/testcases/client-docs-tc/60_reward_activity_tc.md)
- [70_community_trust_tc.md](/Users/simjaehyeong/Desktop/pando/client-pando/docs/testcases/client-docs-tc/70_community_trust_tc.md)
- [80_system_cross_tc.md](/Users/simjaehyeong/Desktop/pando/client-pando/docs/testcases/client-docs-tc/80_system_cross_tc.md)
- [99_gap_notes.md](/Users/simjaehyeong/Desktop/pando/client-pando/docs/testcases/client-docs-tc/99_gap_notes.md)

## 권장 실행 순서

1. `01_tc_guide.md`로 판정 기준 정렬
2. `10_member_core_tc.md`부터 화면/플로우 확인
3. `80_system_cross_tc.md`로 상태/예외/권한 누락 점검
4. `99_gap_notes.md`에서 기획 보완 이슈 별도 처리
