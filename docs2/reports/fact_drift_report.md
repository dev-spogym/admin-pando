# fact_drift_report

- generated_at: 2026-05-23T14:51:46
- facts: `registry/facts.yml`
- source_file_count: 33
- ERROR: 0
- WARN: 496

## ERROR

없음

## WARN

### 1. facts.yml에 없는 신규 자동화/배치 `카테고리 자동 분류`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:208`
- actual: ('상품 마스터 변경', '카테고리 탭 갱신')

### 2. facts.yml에 없는 신규 자동화/배치 `SAL-04 선수익금`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:326`
- actual: ('회원권/수강권(PT) 결제 등록 시', '총액 등록, 일별 인식 배치 (매일 03:00)')

### 3. facts.yml에 없는 신규 자동화/배치 `PRD-04 할인 설정`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:328`
- actual: ('회원·상품 선택 후 할인 영역 표시', '등급/세그먼트/수동 할인 후보 조회·표시. v1에서는 자동 적용 없음')

### 4. facts.yml에 없는 신규 자동화/배치 `MBR-EXT-03 등급 관리`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:329`
- actual: ('회원 선택 시', '회원 등급별 이용권 할인율을 할인 후보로 제공. v1에서는 자동 적용 없음')

### 5. facts.yml에 없는 신규 자동화/배치 `담당자 퇴사 이벤트`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:422`
- actual: ('담당자 상태 변경', '"퇴사" 라벨 자동')

### 6. facts.yml에 없는 신규 자동화/배치 `차트 드릴다운`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:424`
- actual: ('차트 클릭', '자동 필터 적용')

### 7. facts.yml에 없는 신규 자동화/배치 `합계 검증 배치`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:513`
- actual: ('매일 04:00', '합산 불일치 시 알림')

### 8. facts.yml에 없는 신규 자동화/배치 `CSV 인코딩 자동`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:514`
- actual: ('CSV 생성', 'UTF-8 with BOM')

### 9. facts.yml에 없는 신규 자동화/배치 `만기 자동 처리`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:594`
- actual: ('진행률 100%', '잔여 0원 + 만기')

### 10. facts.yml에 없는 신규 자동화/배치 `만기 임박 알림 (NFR-19)`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:595`
- actual: ('종료일 D-7', '운영자·회원 알림')

### 11. facts.yml에 없는 신규 자동화/배치 `익명화 배치`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:596`
- actual: ('5년 경과', 'PII 마스킹 (월 1회)')

### 12. facts.yml에 없는 신규 자동화/배치 `월별 선수익 보고서`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:598`
- actual: ('매월 1일 05:00', '자동 생성 + 운영자 다운로드')

### 13. facts.yml에 없는 신규 자동화/배치 `환불률 KPI 배치`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:682`
- actual: ('매일 04:00', '지점 일별 환불률 집계')

### 14. facts.yml에 없는 신규 자동화/배치 `환불 이력 익명화`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:683`
- actual: ('5년 경과', 'PII 마스킹 배치 (월 1회)')

### 15. facts.yml에 없는 신규 자동화/배치 `회수액 일별 집계`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:775`
- actual: ('매일 04:00 크론', '이번 달 회수액 카드 갱신')

### 16. facts.yml에 없는 신규 자동화/배치 `회원 연락처 변경 이벤트`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:778`
- actual: ('회원 카드 수정', 'PAY-06 고객사 확인 전까지 개발 대기. 확정 후 미발송 링크 연락처 자동 갱신')

### 17. facts.yml에 없는 신규 자동화/배치 `회차 납입일 당일 알림`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:865`
- actual: ('HQ-09 결제기한 만료 본사 step에 당일 step이 있고 지점 ON 상태일 때', '회원·운영자 알림. 지점 추가 step 없음')

### 18. facts.yml에 없는 신규 자동화/배치 `회차 일정 자동 산출`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:868`
- actual: ('등록 시', '매월 동일 일자 + 말일 보정')

### 19. facts.yml에 없는 신규 자동화/배치 `회원 탈퇴 이벤트`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:870`
- actual: ('회원 상태 변경', '할부 유지 + 회원 카드 차단')

### 20. facts.yml에 없는 신규 자동화/배치 `CFO 월별 보고서`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:955`
- actual: ('매월 1일 06:00', '자동 생성 + 다운로드')

### 21. facts.yml에 없는 신규 자동화/배치 `CFO 분기 보고서`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:1043`
- actual: ('분기 마지막 날 04:00', '자동 생성 + 다운로드')

### 22. facts.yml에 없는 신규 자동화/배치 `예측 캐시 갱신`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:1046`
- actual: ('5분마다', '캐시 무효화')

### 23. facts.yml에 없는 신규 자동화/배치 `SCR-101/SCR-090 대시보드`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:1048`
- actual: ('예측 카드', '권한별 대시보드 위젯 갱신')

### 24. facts.yml에 없는 신규 자동화/배치 `회원상세 결제내역`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:2583`
- actual: ('링크 발송/재발송/만료/무효화/결제완료', '링크 상태와 액션 버튼 동기화')

### 25. facts.yml에 없는 신규 자동화/배치 `결제 완료 webhook`

- category: `new_automation`
- source: `D03-매출관리/매출관리.md:2585`
- actual: ('회원 결제 완료', '고객사 확인 전까지 개발 대기. 확정 후 결제완료 상태 반영 + 이용권 즉시 활성화 + 회원/운영자 알림')

### 26. facts.yml에 없는 신규 자동화/배치 `Push / KakaoTalk 발송 큐`

- category: `new_automation`
- source: `D03-매출관리/운영정책.md:98`
- actual: ('[발송] 클릭', '고객사 확인 전까지 개발 대기. 확정 후 회원앱 Push 기본, KakaoTalk fallback 선택 발송')

### 27. facts.yml에 없는 신규 자동화/배치 `채널 fallback`

- category: `new_automation`
- source: `D03-매출관리/운영정책.md:99`
- actual: ('회원앱 Push 실패 또는 미설치', '고객사 확인 전까지 개발 대기. 확정 후 KakaoTalk fallback 선택 시 보조 발송, SMS 자동 전환 없음')

### 28. facts.yml에 없는 신규 자동화/배치 `현장 환불 증빙 누락`

- category: `new_automation`
- source: `D03-매출관리/운영정책.md:117`
- actual: ('"거절" 빨강 배지 + 알림', '증빙 보완')

### 29. facts.yml에 없는 신규 자동화/배치 `환불 자동 산식 미확정`

- category: `new_automation`
- source: `D03-매출관리/운영정책.md:119`
- actual: ('수기 입력값 표시', '자동 재계산 금지')

### 30. facts.yml에 없는 신규 자동화/배치 `활성 링크 있는데 새 링크 시도`

- category: `new_automation`
- source: `D03-매출관리/운영정책.md:124`
- actual: ('"이미 발송된 결제링크가 있습니다" 모달', '기존 링크 재발송 또는 결제링크 무효화 후 새 링크 생성')

### 31. facts.yml에 없는 신규 자동화/배치 `만료된 링크 재발송 시도`

- category: `new_automation`
- source: `D03-매출관리/운영정책.md:125`
- actual: ('"만료된 링크입니다" 안내', '새 링크 생성')

### 32. facts.yml에 없는 신규 자동화/배치 `둘 다 사용 불가`

- category: `new_automation`
- source: `D03-매출관리/운영정책.md:128`
- actual: ('"발송 가능한 채널이 없습니다"', '발송 차단')

### 33. facts.yml에 없는 신규 자동화/배치 `활성 링크 있음`

- category: `new_automation`
- source: `D03-매출관리/운영정책.md:129`
- actual: ('"이미 발송된 결제링크가 있습니다" 모달', '재발송 / 결제링크 무효화. 새 링크는 기존 링크 무효화 후 생성')

### 34. facts.yml에 없는 신규 자동화/배치 `엑셀 다운로드 30,000건+`

- category: `new_automation`
- source: `D03-매출관리/운영정책.md:135`
- actual: ('"백그라운드 다운로드" 토스트', '완료 알림')

### 35. facts.yml에 없는 신규 자동화/배치 `매핑 누락 (개월별/GX/법인권)`

- category: `new_automation`
- source: `D03-매출관리/운영정책.md:138`
- actual: ('"기타"로 분류', '운영자 알림')

### 36. facts.yml에 없는 신규 자동화/배치 `단기 쏠림 (1개월 50%+)`

- category: `new_automation`
- source: `D03-매출관리/운영정책.md:140`
- actual: ('카드 빨강 + 알림', '약정 강화 안내')

### 37. facts.yml에 없는 신규 자동화/배치 `강사 OT 카운트 (CLS-06)`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:97`
- actual: ('OT 수업 등록·완료', 'OT 배정/완료 카운트 갱신')

### 38. facts.yml에 없는 신규 자동화/배치 `일일 미승인 알림 배치`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:99`
- actual: ('매일 09:00', '미승인 건수 Owner(지점장)에게 알림')

### 39. facts.yml에 없는 신규 자동화/배치 `SCR-M004 회원 상세`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:174`
- actual: ('출석 처리', 'last_visit_at 갱신')

### 40. facts.yml에 없는 신규 자동화/배치 `자동 진행중 전이 잡`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:175`
- actual: ('매분', '시작 시간 도달 + 출석 1건 → "진행중"')

### 41. facts.yml에 없는 신규 자동화/배치 `노쇼 자동 처리 (A05)`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:177`
- actual: ('출석 인정 마감 + 지점 노쇼 유예 N분(기본 30분)', '미처리 → 자동 노쇼 + 페널티. N분 미설정 시 자동 노쇼 보류')

### 42. facts.yml에 없는 신규 자동화/배치 `회원앱 예약 시스템`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:178`
- actual: ('예약 생성·취소', '수업 관리 목록 자동 갱신')

### 43. facts.yml에 없는 신규 자동화/배치 `엑셀 다운로드 잡`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:179`
- actual: ('[다운로드] 클릭', '비동기 잡 + 다운로드 링크 알림')

### 44. facts.yml에 없는 신규 자동화/배치 `D10 SCR-H1001 미승인 일괄 등록 정책 ON`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:262`
- actual: ('일괄 등록', '미승인 상태로 시작 + Owner(지점장) 알림')

### 45. facts.yml에 없는 신규 자동화/배치 `본사 통합 동기화`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:335`
- actual: ('본사 템플릿 변경', 'D10 SCR-H1001 수업 템플릿 본사 동기화 정책 ON인 지점 자동 동기화')

### 46. facts.yml에 없는 신규 자동화/배치 `본사 통합 평균 잡`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:413`
- actual: ('매시간', '지점별 평균 출석률 갱신')

### 47. facts.yml에 없는 신규 자동화/배치 `1시간 캐시`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:493`
- actual: ('매시간', '본 화면 데이터 갱신')

### 48. facts.yml에 없는 신규 자동화/배치 `퇴사 처리 이벤트`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:495`
- actual: ('강사 상태 변경', '본 화면 "퇴사" 라벨 표시')

### 49. facts.yml에 없는 신규 자동화/배치 `NFR-05 회원 이용권 만료 알림 결과`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:565`
- actual: ('매일 새벽 03:00 이후', 'HQ-09 회원 이용권 만료 본사 step + 지점 추가 step + 지점 ON/OFF 상태 기준으로 계산된 만료 임박 결과를 CLS-07 배지와 통계에 반영')

### 50. facts.yml에 없는 신규 자동화/배치 `본사 통합 통계 잡`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:569`
- actual: ('매일 04:00', '잔여 부족·만료 임박 통계')

### 51. facts.yml에 없는 신규 자동화/배치 `페널티 만료 자동 해제 잡`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:645`
- actual: ('매분', '만료 도달 시 자동 해제')

### 52. facts.yml에 없는 신규 자동화/배치 `누적 카운트 갱신 잡`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:646`
- actual: ('노쇼 발생', '30/90일 윈도우 카운트')

### 53. facts.yml에 없는 신규 자동화/배치 `단계별 정책 임계 알림`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:647`
- actual: ('임계 도달', '운영자·회원 알림')

### 54. facts.yml에 없는 신규 자동화/배치 `신규 회원 첫 노쇼 면제 정책 동기화`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:648`
- actual: ('D10 SCR-H1001 정책 변경', '신규 회원 첫 노쇼 예외만 자동 반영')

### 55. facts.yml에 없는 신규 자동화/배치 `대안 응답 만료 잡`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:728`
- actual: ('매분', '24시간 초과 → 자동 취소')

### 56. facts.yml에 없는 신규 자동화/배치 `미처리 SLA 잡`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:729`
- actual: ('매시간', '24시간 초과 미처리 → Owner(지점장) 알림')

### 57. facts.yml에 없는 신규 자동화/배치 `충돌 자동 검증`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:730`
- actual: ('행 클릭', '강사·장소·회원 검증')

### 58. facts.yml에 없는 신규 자동화/배치 `대시보드 알림 (NFR-19)`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:732`
- actual: ('신규 요청', '미처리 배지')

### 59. facts.yml에 없는 신규 자동화/배치 `동작 라이브러리 동기화`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:819`
- actual: ('본사 표준 동작 변경', '지점 라이브러리 동기화')

### 60. facts.yml에 없는 신규 자동화/배치 `당일 요약 잡`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:900`
- actual: ('매분', '처리 완료율 갱신')

### 61. facts.yml에 없는 신규 자동화/배치 `NPS 일일 집계 잡`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:1056`
- actual: ('매일 04:00', 'STF-02 NPS 갱신')

### 62. facts.yml에 없는 신규 자동화/배치 `실시간 갱신 (WebSocket)`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:1134`
- actual: ('출석 처리', '실시간 패널·CLS-11 갱신')

### 63. facts.yml에 없는 신규 자동화/배치 `오프라인 큐잉`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:1135`
- actual: ('네트워크 단절', '복구 후 일괄 동기화')

### 64. facts.yml에 없는 신규 자동화/배치 `본사 통합 통계`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:1136`
- actual: ('매일 04:00', 'QR 사용률·자동 노쇼율 통계')

### 65. facts.yml에 없는 신규 자동화/배치 `만료 90일 영구 삭제 잡`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:1215`
- actual: ('매일 04:00', '만료 90일 경과 → 영구 삭제')

### 66. facts.yml에 없는 신규 자동화/배치 `무단 공유 패턴 감지 잡`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:1219`
- actual: ('매일', '다운로드 이력 분석 + 보안 알림')

### 67. facts.yml에 없는 신규 자동화/배치 `회원 last_visit_at 갱신`

- category: `new_automation`
- source: `D04-수업관리/수업관리.md:1315`
- actual: ('출석 처리', 'SCR-M004 자동 갱신')

### 68. facts.yml에 없는 신규 자동화/배치 `색상 미선택`

- category: `new_automation`
- source: `D04-수업관리/운영정책.md:124`
- actual: ('기본 색상 자동 지정', '저장 가능')

### 69. facts.yml에 없는 신규 자동화/배치 `정원 확대 후 대기열 연계 대상 있음`

- category: `new_automation`
- source: `D04-수업관리/운영정책.md:127`
- actual: ('CLS-12 대기 관리 상태 안내 + 토스트 "대기 {인원수}명 자동 배정 완료"', 'D10 SCR-H1001 대기열 자동 알림/배정 정책 ON일 때 후속 처리')

### 70. facts.yml에 없는 신규 자동화/배치 `OT 데이터 미동기화`

- category: `new_automation`
- source: `D04-수업관리/운영정책.md:133`
- actual: ('영역 안내 + 새로고침', '재동기화 시도')

### 71. facts.yml에 없는 신규 자동화/배치 `PRD-05 카탈로그`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:170`
- actual: ('비활성 토글 / 활성 전환', '카탈로그 자동 노출/제외')

### 72. facts.yml에 없는 신규 자동화/배치 `PRD-04 할인 / PRD-08 시즌가격`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:171`
- actual: ('적용 상품 변경', '할인·시즌 적용 대상 자동 갱신')

### 73. facts.yml에 없는 신규 자동화/배치 `패키지 합산 정가 자동 재계산`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:173`
- actual: ('구성 상품 가격 변경', '합산 정가 즉시 갱신, 할인가는 명시 갱신')

### 74. facts.yml에 없는 신규 자동화/배치 `Cron - 비활성 만료 회원 정리`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:174`
- actual: ('매일 04:00', '비활성 상품 보유 회원 만료 시 정리')

### 75. facts.yml에 없는 신규 자동화/배치 `분류 관리 정렬 순서 충돌 보정`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:175`
- actual: ('정렬 순서 저장', '동일 순서 → 등록일 ASC 자동 보조 정렬')

### 76. facts.yml에 없는 신규 자동화/배치 `SCR-P001 상품 목록`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:305`
- actual: ('등록 완료', '목록 갱신, 신규 상품 행 표시')

### 77. facts.yml에 없는 신규 자동화/배치 `회원앱 / 키오스크`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:307`
- actual: ('활성·키오스크 노출·가격 변경', '노출 대상 갱신')

### 78. facts.yml에 없는 신규 자동화/배치 `회원 등급 변경 이벤트`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:490`
- actual: ('등급 갱신', '후보 조건 표시값 갱신. 결제 자동 적용은 v1 제외')

### 79. facts.yml에 없는 신규 자동화/배치 `본사 정의 할인 전 지점 동기화`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:492`
- actual: ('본사 등록·수정', '모든 지점에 즉시 반영')

### 80. facts.yml에 없는 신규 자동화/배치 `할인 미리보기 시뮬레이션`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:493`
- actual: ('DLG에서 상품 선택', 'v1 제외. 결제 자동 적용정책 확정 후 정의')

### 81. facts.yml에 없는 신규 자동화/배치 `인쇄 레이아웃 자동 분할`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:590`
- actual: ('인쇄 모드', '카드 단위 페이지 분할')

### 82. facts.yml에 없는 신규 자동화/배치 `카드 순서 드래그 저장`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:591`
- actual: ('DLG-P018-카탈로그편집 저장', '수동 정렬 모드 자동 전환')

### 83. facts.yml에 없는 신규 자동화/배치 `카탈로그 노출 OFF 즉시 반영`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:592`
- actual: ('토글 변경', '카탈로그 즉시 숨김')

### 84. facts.yml에 없는 신규 자동화/배치 `회원앱 동기화 명시`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:593`
- actual: ('[지금 동기화]', '캐시 즉시 무효화')

### 85. facts.yml에 없는 신규 자동화/배치 `결제 할인 시뮬레이션`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:693`
- actual: ('회원 등급/세그먼트 입력', 'v1 제외. 결제 자동 적용정책 확정 후 정의')

### 86. facts.yml에 없는 신규 자동화/배치 `결제 점프 매핑`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:695`
- actual: ('[이 상품 결제하기]', '회원·상품 자동 매핑 → SCR-S003')

### 87. facts.yml에 없는 신규 자동화/배치 `비교 데이터 캐시 무효화`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:698`
- actual: ('가격 변경 이벤트', '5분 캐시 무효화')

### 88. facts.yml에 없는 신규 자동화/배치 `부족 / 품절 알림 (Cron)`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:806`
- actual: ('매일 09:00', '일일 부족·품절 리포트 발송')

### 89. facts.yml에 없는 신규 자동화/배치 `동시성 락`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:809`
- actual: ('입출고·자동 차감', '비관적 락으로 race condition 방지')

### 90. facts.yml에 없는 신규 자동화/배치 `회원앱 푸시 알림`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:918`
- actual: ('시즌 시작 / 종료', '회원에게 알림 (옵션)')

### 91. facts.yml에 없는 신규 자동화/배치 `종료 시즌 1년 보존`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:920`
- actual: ('매일 04:00', '1년 경과 SCR-097 이관')

### 92. facts.yml에 없는 신규 자동화/배치 `재등록 우대 자동 매칭`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:921`
- actual: ('만료 후 N일 이내 회원(기본 30일)', 'v1 제외. 후보 조건만 관리')

### 93. facts.yml에 없는 신규 자동화/배치 `본사 정의 시즌 동기화`

- category: `new_automation`
- source: `D05-상품관리/상품관리.md:922`
- actual: ('본사 등록·수정', '전 지점 자동 적용')

### 94. facts.yml에 없는 신규 자동화/배치 `시즌 특가 종료 직후 캐시`

- category: `new_automation`
- source: `D05-상품관리/운영정책.md:116`
- actual: ('잠시 노출 후 갱신', '[지금 동기화]')

### 95. facts.yml에 없는 신규 자동화/배치 `POS 자동 차감 + 재고 0`

- category: `new_automation`
- source: `D05-상품관리/운영정책.md:123`
- actual: ('결제 사전 검증 차단', '결제 차단')

### 96. facts.yml에 없는 신규 자동화/배치 `시작일 과거`

- category: `new_automation`
- source: `D05-상품관리/운영정책.md:128`
- actual: ('노랑 경고 "즉시 활성"', '저장 가능')

### 97. facts.yml에 없는 신규 자동화/배치 `카테고리 일괄 + 비활성 포함`

- category: `new_automation`
- source: `D05-상품관리/운영정책.md:130`
- actual: ('자동 제외 + 안내', '진행 가능')

### 98. facts.yml에 없는 신규 자동화/배치 `동일 상품 중복 시즌`

- category: `new_automation`
- source: `D05-상품관리/운영정책.md:131`
- actual: ('충돌 경고 + 저장 차단', '한 상품의 같은 기간에는 시즌 특가 1개만 활성. 중복 우선순위 자동 계산은 v1 제외')

### 99. facts.yml에 없는 신규 자동화/배치 `만료 임박 자동 감지 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:106`
- actual: ('매일 00:30', 'HQ-09 락커 만료 본사 step + 지점 추가 step 중 해당 지점 ON 상태인 락커 status=expiring 표시 + 알림 발송')

### 100. facts.yml에 없는 신규 자동화/배치 `만료 경과 자동 회수 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:107`
- actual: ('매일 02:00 (D09 만료 경과 자동 회수 ON일 때)', '만료일 < 오늘 락커 자동 해제 + 회원 알림. 기본값 OFF')

### 101. facts.yml에 없는 신규 자동화/배치 `회원 탈퇴 / 이관 / 삭제 이벤트`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:108`
- actual: ('회원 상태 변경', '보유 락커 자동 회수 + 알림')

### 102. facts.yml에 없는 신규 자동화/배치 `이용권 만료 이벤트`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:109`
- actual: ('이용권 종료', 'D09 이용권 만료 이벤트 자동 회수 ON일 때 락커 자동 회수. 기본값 OFF')

### 103. facts.yml에 없는 신규 자동화/배치 `락커 KPI 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:113`
- actual: ('매주 월요일 04:00', '사용률·만료율·평균 보유 기간 집계')

### 104. facts.yml에 없는 신규 자동화/배치 `FAC-EXT-02 수리 접수 연계`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:114`
- actual: ('고장 토글', '수리 접수 자동 등록. 사용자가 있으면 사용자 존재 경고 후 강행 가능')

### 105. facts.yml에 없는 신규 자동화/배치 `일일 사물함 22:00 자동 만료 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:193`
- actual: ('매일 22:00', 'overtime 상태 갱신은 고정 ON. 실제 일괄 회수/알림은 D09 일일 사물함 22:00 실제 일괄 회수 ON일 때만 실행. 실제 회수 기본값 OFF')

### 106. facts.yml에 없는 신규 자동화/배치 `시간 초과 자동 갱신 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:194`
- actual: ('1분 주기', '만료 시점 경과 사물함 overtime 표시')

### 107. facts.yml에 없는 신규 자동화/배치 `NFR-19 시간 초과 알림`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:195`
- actual: ('만료 시각 도달', '회원에게 회원앱 Push 발송. KakaoTalk fallback은 지점 선택 시 사용')

### 108. facts.yml에 없는 신규 자동화/배치 `사물함 KPI 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:198`
- actual: ('매주 월요일 04:00', '사용률·평균 보유 시간·시간 초과율 집계')

### 109. facts.yml에 없는 신규 자동화/배치 `추천 사물함 캐싱`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:199`
- actual: ('5초 주기 폴링 또는 이벤트', '추천 영역 갱신')

### 110. facts.yml에 없는 신규 자동화/배치 `FAC-EXT-02 점검 등록 연계`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:200`
- actual: ('상태 비정상 토글', '점검 접수 자동 등록 옵션')

### 111. facts.yml에 없는 신규 자동화/배치 `NFR-19 분실 알림`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:273`
- actual: ('분실 처리', '회원·직원에게 푸시 + SMS')

### 112. facts.yml에 없는 신규 자동화/배치 `분실 카드 외부 사용 시도 알림`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:274`
- actual: ('외부 출입 시도', '운영자 즉시 알림')

### 113. facts.yml에 없는 신규 자동화/배치 `직원 퇴직 이벤트`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:276`
- actual: ('직원 상태 변경', '직원 카드 자동 분실 처리')

### 114. facts.yml에 없는 신규 자동화/배치 `RFID 리더 상태 폴링`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:277`
- actual: ('30초 주기', '화면 상단 연결 상태 갱신')

### 115. facts.yml에 없는 신규 자동화/배치 `카드 사용 이력 보관 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:278`
- actual: ('매일 03:00', '90일 초과 이력 데이터 웨어하우스 이관')

### 116. facts.yml에 없는 신규 자동화/배치 `카드 KPI 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:279`
- actual: ('매주 월요일 04:00', '발급 수·분실률·평균 사용 기간 집계')

### 117. facts.yml에 없는 신규 자동화/배치 `사물함 매핑 동기화`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:280`
- actual: ('락커 배정/회수(FAC-01·02)', '카드 연결 사물함 자동 갱신')

### 118. facts.yml에 없는 신규 자동화/배치 `SCR-C001 캘린더 동기화`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:355`
- actual: ('상태 전환·정원 변경·삭제', '예약 시스템 즉시 반영')

### 119. facts.yml에 없는 신규 자동화/배치 `슬롯 바 폴링`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:356`
- actual: ('5초 주기', '카드 슬롯 바 갱신')

### 120. facts.yml에 없는 신규 자동화/배치 `NFR-19 강제 종료 알림`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:357`
- actual: ('점검·고장 전환 시 진행 중 수업 강제 종료', '회원에게 푸시 + SMS, 남은 시간만큼 보상 시간 추가')

### 121. facts.yml에 없는 신규 자동화/배치 `룸 KPI 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:359`
- actual: ('매주 월요일 04:00', '룸별 사용률·점유율·점검 빈도 집계')

### 122. facts.yml에 없는 신규 자동화/배치 `SCR-C006 강사 근무 연계`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:360`
- actual: ('룸 상태·정원 변경', '강사 배정 가능 룸 갱신')

### 123. facts.yml에 없는 신규 자동화/배치 `회원 예약 영향 평가 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:361`
- actual: ('정원 변경 시', '초과 예약 검출 + 운영자 알림')

### 124. facts.yml에 없는 신규 자동화/배치 `카운트다운 폴링`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:455`
- actual: ('1초 주기', '타석 카드 남은 시간 갱신')

### 125. facts.yml에 없는 신규 자동화/배치 `시간 종료 알림 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:456`
- actual: ('0초 도달', '화면 상단 경고 팝업 + 회원 알림')

### 126. facts.yml에 없는 신규 자동화/배치 `자동 종료 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:457`
- actual: ('시간 종료 + N분 경과 (정책 ON + N분 설정 시)', '자동 종료 + 대기열 자동 배정. 미설정 시 자동 종료하지 않음')

### 127. facts.yml에 없는 신규 자동화/배치 `대기열 자동 배정`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:458`
- actual: ('타석 종료', '1번 회원 자동 시작 + 알림')

### 128. facts.yml에 없는 신규 자동화/배치 `NFR-19 장기 대기 알림`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:459`
- actual: ('대기 30분 경과', '회원에게 안내 알림')

### 129. facts.yml에 없는 신규 자동화/배치 `NFR-19 자동 배정 알림`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:460`
- actual: ('대기열 자동 배정', '회원에게 즉시 알림')

### 130. facts.yml에 없는 신규 자동화/배치 `대기열 예상 시간 계산`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:462`
- actual: ('평균 사용 시간 기반', '대기 패널 갱신')

### 131. facts.yml에 없는 신규 자동화/배치 `골프 KPI 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:463`
- actual: ('매주 월요일 04:00', '타석 가동률·평균 사용 시간·대기 시간 집계')

### 132. facts.yml에 없는 신규 자동화/배치 `QR 자동 생성`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:544`
- actual: ('운동복 등록', '고유 QR 코드 생성, 인쇄 가능')

### 133. facts.yml에 없는 신규 자동화/배치 `반납 후 자동 세탁 전환`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:545`
- actual: ('반납 액션', '상태 자동 "세탁중"')

### 134. facts.yml에 없는 신규 자동화/배치 `NFR-19 반납 예정 초과 알림`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:546`
- actual: ('D+1 / D+3', '회원에게 알림 발송')

### 135. facts.yml에 없는 신규 자동화/배치 `NFR-19 파손 알림`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:547`
- actual: ('파손 처리', '회원·운영자에게 알림')

### 136. facts.yml에 없는 신규 자동화/배치 `QR 스캐너 상태 폴링`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:549`
- actual: ('30초 주기', '화면 상단 연결 상태 갱신')

### 137. facts.yml에 없는 신규 자동화/배치 `사이즈별 재고 부족 알림 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:550`
- actual: ('매일 08:00', '부족 사이즈 운영자에게 알림')

### 138. facts.yml에 없는 신규 자동화/배치 `운동복 대여 KPI 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:551`
- actual: ('매주 월요일 04:00', '사이즈별 가동률·평균 대여 시간·파손율 집계')

### 139. facts.yml에 없는 신규 자동화/배치 `운동복 일일 자동 만료/강제 회수`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:552`
- actual: ('매일 22:00 (D09 운동복 일일 자동 만료/강제 회수 ON일 때)', '당일 미반납 운동복을 회수 처리하고 회원·운영자 알림. 기본값 OFF')

### 140. facts.yml에 없는 신규 자동화/배치 `점검 임박 자동 감지 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:627`
- actual: ('매일 00:30', 'D-7 이내 장비 status=due + D-7/D-3/D-1 알림')

### 141. facts.yml에 없는 신규 자동화/배치 `점검 기한 초과 자동 강조`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:628`
- actual: ('매일 00:30', '예정일 < 오늘 장비 빨강 강조 + 추가 알림')

### 142. facts.yml에 없는 신규 자동화/배치 `다음 점검 예정일 자동 갱신`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:629`
- actual: ('점검 등록', '점검 주기에 따라 +30/90/180/365일 자동')

### 143. facts.yml에 없는 신규 자동화/배치 `NFR-19 운영자 알림`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:630`
- actual: ('점검 임박·기한 초과·수리 완료', '운영자에게 푸시·앱 알림')

### 144. facts.yml에 없는 신규 자동화/배치 `FAC-04·05 고장 토글 연계`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:631`
- actual: ('운동룸·골프 타석 고장', '수리 접수 자동 등록. 사용자가 있으면 사용자 존재 경고 후 강행 가능')

### 145. facts.yml에 없는 신규 자동화/배치 `장비 KPI 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:633`
- actual: ('매주 월요일 04:00', '점검 완료율·평균 수리 시간·고장률 집계')

### 146. facts.yml에 없는 신규 자동화/배치 `점검 이력 보관 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:634`
- actual: ('매일 03:00', '90일 초과 이력 데이터 웨어하우스 이관')

### 147. facts.yml에 없는 신규 자동화/배치 `부족 자동 감지 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:709`
- actual: ('매일 00:30 + 출고 이벤트', '안전 재고 미달 시 status=low + 알림')

### 148. facts.yml에 없는 신규 자동화/배치 `재고 0 자동 감지`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:710`
- actual: ('출고 이벤트', 'status=empty + "발주 필요" 강조')

### 149. facts.yml에 없는 신규 자동화/배치 `발주 대기 자동 해제`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:711`
- actual: ('입고 처리 (전체 입고)', 'status=normal/low로 전환')

### 150. facts.yml에 없는 신규 자동화/배치 `NFR-19 부족 알림`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:712`
- actual: ('부족 또는 없음 발생 + 매일 09:00', '운영자 푸시·앱 알림')

### 151. facts.yml에 없는 신규 자동화/배치 `출고 사유 통계 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:713`
- actual: ('매주 월요일 04:00', '사유별 통계 갱신')

### 152. facts.yml에 없는 신규 자동화/배치 `FAC-EXT-04 청소 연계`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:714`
- actual: ('청소 완료 시', '청소 연계 옵션 ON이면 자동 출고 기록, OFF이면 수동 출고만 허용')

### 153. facts.yml에 없는 신규 자동화/배치 `소모품 KPI 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:716`
- actual: ('매주 월요일 04:00', '카테고리별 사용량·재고 회전율 집계')

### 154. facts.yml에 없는 신규 자동화/배치 `입출고 이력 보관 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:717`
- actual: ('매일 03:00', '90일 초과 데이터 웨어하우스 이관')

### 155. facts.yml에 없는 신규 자동화/배치 `정기 일정 자동 반복 생성 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:790`
- actual: ('매일 00:00', '등록된 주기 기반 자동 일정 생성')

### 156. facts.yml에 없는 신규 자동화/배치 `시간 초과 미완료 자동 강조`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:791`
- actual: ('1분 주기', '예정 시간 경과 미완료 구역 빨강 강조 + 알림')

### 157. facts.yml에 없는 신규 자동화/배치 `NFR-19 담당자 미지정 알림`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:793`
- actual: ('매일 09:00', '미지정 일정 운영자 알림')

### 158. facts.yml에 없는 신규 자동화/배치 `FAC-EXT-03 소모품 자동 출고 연계`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:794`
- actual: ('청소 완료 시 (정책 활성)', '사용 소모품 자동 출고 기록')

### 159. facts.yml에 없는 신규 자동화/배치 `담당자별 통계 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:795`
- actual: ('매주 월요일 04:00', '직원별 완료율·지연율·구역 분포 집계')

### 160. facts.yml에 없는 신규 자동화/배치 `청소 KPI 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:796`
- actual: ('매주 월요일 04:00', '구역별 완료율·평균 소요 시간 집계')

### 161. facts.yml에 없는 신규 자동화/배치 `이력 보관 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:797`
- actual: ('매일 03:00', '90일 초과 이력 데이터 웨어하우스 이관')

### 162. facts.yml에 없는 신규 자동화/배치 `직원 변경 이벤트 연계`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:798`
- actual: ('직원 퇴직·이관', '담당 일정 자동 미지정 + 알림')

### 163. facts.yml에 없는 신규 자동화/배치 `FAC-04 운동룸 동기화`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:863`
- actual: ('룸 상태 변경', '원 도메인 상태 갱신')

### 164. facts.yml에 없는 신규 자동화/배치 `FAC-05 골프 타석 동기화`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:864`
- actual: ('타석 상태 변경', '원 도메인 상태 갱신')

### 165. facts.yml에 없는 신규 자동화/배치 `예약 패널 폴링`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:865`
- actual: ('5초 주기', '우측 패널 일정 갱신')

### 166. facts.yml에 없는 신규 자동화/배치 `가동률 카드 갱신`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:867`
- actual: ('30초 주기 또는 이벤트', '전체 가동률 표시 갱신')

### 167. facts.yml에 없는 신규 자동화/배치 `공간 자산 KPI 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:868`
- actual: ('매주 월요일 04:00', '자산별 가동률·점검 빈도·평균 사용 시간 집계')

### 168. facts.yml에 없는 신규 자동화/배치 `점검 자동 강조 배치`

- category: `new_automation`
- source: `D06-시설관리/시설관리.md:869`
- actual: ('1분 주기', '점검 주기 경과 자산 상단 강조')

### 169. facts.yml에 없는 신규 자동화/배치 `PAY-STF-02 급여 자동 연동`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:66`
- actual: ('월말 집계', '시급제·건별 급여 자동 계산')

### 170. facts.yml에 없는 신규 자동화/배치 `결근 자동 분류 배치`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:67`
- actual: ('매일 24:00', '영업일 + 미출근 + 휴가 미등록 → 결근')

### 171. facts.yml에 없는 신규 자동화/배치 `조퇴 자동 분류`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:68`
- actual: ('퇴근 시각 < 정규', '자동 조퇴')

### 172. facts.yml에 없는 신규 자동화/배치 `지각 자동 분류`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:69`
- actual: ('출근 시각 > 정규 출근 시각 + 지점별 직원 지각 허용 시간. 기본값 10분', '자동 지각')

### 173. facts.yml에 없는 신규 자동화/배치 `결근 알림`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:70`
- actual: ('결근 분류', '매니저 알림 (NFR-19)')

### 174. facts.yml에 없는 신규 자동화/배치 `IoT 통신 오류 알림`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:71`
- actual: ('출입 이벤트 미수신', '매니저 알림')

### 175. facts.yml에 없는 신규 자동화/배치 `키오스크 NTP 동기화`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:72`
- actual: ('매시간', '시각 자동 보정')

### 176. facts.yml에 없는 신규 자동화/배치 `PAY-STF-01 근태 자동 연동`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:73`
- actual: ('지급월 변경 + 근태 마감', '시급/건별 자동 계산')

### 177. facts.yml에 없는 신규 자동화/배치 `시급제 자동 계산`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:74`
- actual: ('근태 총 시간 × 시급', '기본급 자동 산출')

### 178. facts.yml에 없는 신규 자동화/배치 `건별 자동 계산`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:75`
- actual: ('진행 건수 × 단가', '수수료 자동 산출')

### 179. facts.yml에 없는 신규 자동화/배치 `지각·결근 공제 자동`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:76`
- actual: ('근태 페널티 정책', '공제 항목 자동 추가')

### 180. facts.yml에 없는 신규 자동화/배치 `PAY-STF-03 명세서 생성`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:77`
- actual: ('확정 완료', '명세서 자동 생성')

### 181. facts.yml에 없는 신규 자동화/배치 `명세서 자동 무효`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:78`
- actual: ('확정 취소', '발송된 명세서 무효 + 재발송 알림')

### 182. facts.yml에 없는 신규 자동화/배치 `PAY-STF-02 확정 → 명세서 자동 생성`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:80`
- actual: ('급여 확정', '명세서 자동 생성')

### 183. facts.yml에 없는 신규 자동화/배치 `PAY-STF-02 확정 취소 → 무효 자동 처리`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:81`
- actual: ('확정 취소', '"무효" 배지 + 직원 알림')

### 184. facts.yml에 없는 신규 자동화/배치 `이메일 자동 발송`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:82`
- actual: ('[발송] 클릭', '직원 이메일 + 첨부')

### 185. facts.yml에 없는 신규 자동화/배치 `앱 푸시 자동 발송`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:83`
- actual: ('[발송] 클릭', '직원 앱 푸시')

### 186. facts.yml에 없는 신규 자동화/배치 `이메일 반송 자동 재시도`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:84`
- actual: ('발송 실패', '3회 자동 재시도')

### 187. facts.yml에 없는 신규 자동화/배치 `매니저 알림`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:85`
- actual: ('재시도 실패', 'NFR-19 알림')

### 188. facts.yml에 없는 신규 자동화/배치 `수신 확인 트래킹`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:86`
- actual: ('직원 링크 열람', '자동 기록')

### 189. facts.yml에 없는 신규 자동화/배치 `SCR-081 권한 매핑`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:90`
- actual: ('직무 변경 이벤트', 'RBAC 자동 재평가')

### 190. facts.yml에 없는 신규 자동화/배치 `요약 카드 KPI 배치`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:91`
- actual: ('매일 04:00 + 실시간 업데이트', '4종 카운트 갱신')

### 191. facts.yml에 없는 신규 자동화/배치 `본사 통합 합산 캐시`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:92`
- actual: ('5분 TTL', '지점별 합산 통계 갱신')

### 192. facts.yml에 없는 신규 자동화/배치 `휴직 자동 복귀 알림`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:93`
- actual: ('휴직 종료일 D-3', '매니저 알림 (NFR-19)')

### 193. facts.yml에 없는 신규 자동화/배치 `실적 집계 배치`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:94`
- actual: ('매일 04:00', '수업·매출·OT·NPS 갱신')

### 194. facts.yml에 없는 신규 자동화/배치 `근태 합산 캐시`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:95`
- actual: ('5분 TTL', '출근일·지각·결근 갱신')

### 195. facts.yml에 없는 신규 자동화/배치 `자동 수집 + 수동 보정 충돌`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:108`
- actual: ('수동 우선 + "수동 보정됨" 배지', '')

### 196. facts.yml에 없는 신규 자동화/배치 `자동 계산 실패 (근태 부재)`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:111`
- actual: ('경고 + "근태 데이터 확인"', 'PAY-STF-01 점검 안내')

### 197. facts.yml에 없는 신규 자동화/배치 `미확정 월 조회`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:115`
- actual: ('"급여 미확정" + PAY-STF-02 안내', '발송 비활성')

### 198. facts.yml에 없는 신규 자동화/배치 `이미 발송된 명세서 [발송]`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:117`
- actual: ('재발송 모드 + 이력 추가', '')

### 199. facts.yml에 없는 신규 자동화/배치 `이메일 미등록 직원`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:118`
- actual: ('"이메일 미등록" + 발송 비활성', 'STF-EXT-01 안내')

### 200. facts.yml에 없는 신규 자동화/배치 `앱 미가입 직원`

- category: `new_automation`
- source: `D07-직원관리/운영정책.md:119`
- actual: ('이메일만 발송 + 안내', '')

### 201. facts.yml에 없는 신규 자동화/배치 `이미 퇴사된 직원 재선택`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:78`
- actual: ('체크박스 disabled + 툴팁', '자동 제외')

### 202. facts.yml에 없는 신규 자동화/배치 `본사 통합 메시지 발송 시 권한 없는 지점`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:80`
- actual: ('자동 제외 + 안내 토스트', '')

### 203. facts.yml에 없는 신규 자동화/배치 `대용량 다운로드 (1000명+)`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:81`
- actual: ('"다운로드 준비 중" + 백그라운드 잡', '알림 센터로 링크')

### 204. facts.yml에 없는 신규 자동화/배치 `페이지네이션 마지막 페이지 초과`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:83`
- actual: ('1페이지로 자동 이동', '')

### 205. facts.yml에 없는 신규 자동화/배치 `모바일 풀스크린 진입`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:85`
- actual: ('테이블 → 카드 리스트 자동 전환', '')

### 206. facts.yml에 없는 신규 자동화/배치 `퇴사 D-30 사전 알림`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:98`
- actual: ('퇴사 예정일 D-30', '인수인계 준비 알림')

### 207. facts.yml에 없는 신규 자동화/배치 `명단 다운로드`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:99`
- actual: ('1000명 초과 시', '백그라운드 잡 + 완료 알림')

### 208. facts.yml에 없는 신규 자동화/배치 `SCR-064 급여 연동`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:101`
- actual: ('직원 등록·퇴사', '급여 계산 대상 자동 갱신')

### 209. facts.yml에 없는 신규 자동화/배치 `SCR-C001 캘린더 색상`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:102`
- actual: ('직원 등록', '캘린더 색상 자동 매핑')

### 210. facts.yml에 없는 신규 자동화/배치 `캘린더 자동 정리`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:243`
- actual: ('퇴사 확정일 도래', '본인 일정 자동 이동·삭제')

### 211. facts.yml에 없는 신규 자동화/배치 `회원 인계`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:244`
- actual: ('퇴사 처리 완료', '담당 FC/트레이너 자동 변경')

### 212. facts.yml에 없는 신규 자동화/배치 `수업 인계`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:245`
- actual: ('퇴사 처리 완료', '트레이너 자동 변경')

### 213. facts.yml에 없는 신규 자동화/배치 `계약 인계`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:246`
- actual: ('퇴사 처리 완료', '매니저/Owner(지점장) 자동 변경')

### 214. facts.yml에 없는 신규 자동화/배치 `OT 잔여 자동 이전`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:247`
- actual: ('퇴사 처리 완료', '인계 트레이너에게 자동 부여')

### 215. facts.yml에 없는 신규 자동화/배치 `D-30 사전 알림`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:248`
- actual: ('퇴사 D-30', '매니저+ 알림 (NFR-19)')

### 216. facts.yml에 없는 신규 자동화/배치 `D-7 인수인계 미완료 알림`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:249`
- actual: ('인계자 미지정 + D-7', '매니저 재알림')

### 217. facts.yml에 없는 신규 자동화/배치 `본인 명세서 5년 보존`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:251`
- actual: ('퇴사 시점', '본인 이메일 링크 발송')

### 218. facts.yml에 없는 신규 자동화/배치 `본사 슈퍼관리자 통합 처리`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:252`
- actual: ('통합 모드', '인계자 풀 자동 필터')

### 219. facts.yml에 없는 신규 자동화/배치 `D09 직원 근태 기준 설정`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:336`
- actual: ('Owner(지점장)이 직원 지각 허용 시간 저장', '저장 이후 신규 출퇴근 자동 분류부터 적용, 과거 근태 소급 변경 없음')

### 220. facts.yml에 없는 신규 자동화/배치 `월말 집계 캐시`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:340`
- actual: ('매월 1일 04:00', '직원별 월 합산 갱신')

### 221. facts.yml에 없는 신규 자동화/배치 `본인 출근율 알림`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:341`
- actual: ('월 출근율 90% 미만', '직원 알림')

### 222. facts.yml에 없는 신규 자동화/배치 `노무사 양식 매핑`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:342`
- actual: ('엑셀 다운로드 옵션', '양식 자동 변환')

### 223. facts.yml에 없는 신규 자동화/배치 `휴가 자동 제외`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:343`
- actual: ('휴가 모듈 등록', '출근일 카운트 제외')

### 224. facts.yml에 없는 신규 자동화/배치 `신규 입사자 자동 인식`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:344`
- actual: ('입사일 도래', '첫 출근일 기준 카운트')

### 225. facts.yml에 없는 신규 자동화/배치 `전월 대비 증감 알림`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:439`
- actual: ('±50% 이상', '매니저 알림 (NFR-19)')

### 226. facts.yml에 없는 신규 자동화/배치 `퇴사 직원 일할 계산`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:440`
- actual: ('퇴사 확정 + 당월', '일할 자동 산출')

### 227. facts.yml에 없는 신규 자동화/배치 `휴직 직원 미산정`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:441`
- actual: ('휴직 상태', '기본급 0 자동')

### 228. facts.yml에 없는 신규 자동화/배치 `대용량 엑셀 잡`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:444`
- actual: ('전 지점 + 1년', '백그라운드 + 알림')

### 229. facts.yml에 없는 신규 자동화/배치 `미열람 30일+ 알림`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:531`
- actual: ('발송 후 30일 미열람', '매니저 대시보드')

### 230. facts.yml에 없는 신규 자동화/배치 `5년 보존 정책`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:533`
- actual: ('매월 1일', '5년 초과 자동 익명화')

### 231. facts.yml에 없는 신규 자동화/배치 `PDF 파일명 자동`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:534`
- actual: ('PDF 저장', 'yyyymm_직원명_급여명세서.pdf')

### 232. facts.yml에 없는 신규 자동화/배치 `본사 통합 발송 현황`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:535`
- actual: ('통합 모드', '지점별 미발송 집계')

### 233. facts.yml에 없는 신규 자동화/배치 `일괄 발송 큐`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:536`
- actual: ('[일괄 발송]', '비동기 큐 처리 + 진행 상태')

### 234. facts.yml에 없는 신규 자동화/배치 `무효 → 재확정 자동`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:537`
- actual: ('PAY-STF-02 재확정', '새 명세서 자동 생성 + 발송 안내')

### 235. facts.yml에 없는 신규 자동화/배치 `퇴사 직원 5년 이메일 링크`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:538`
- actual: ('퇴사 시점', '5년 유효 링크 발송')

### 236. facts.yml에 없는 신규 자동화/배치 `로그인 계정 잠금`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:780`
- actual: ('계정 상태 LOCKED', '즉시 로그인 차단')

### 237. facts.yml에 없는 신규 자동화/배치 `SCR-060 목록 갱신`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:783`
- actual: ('저장 완료', '즉시 반영')

### 238. facts.yml에 없는 신규 자동화/배치 `입사일 도래 자동 활성`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:784`
- actual: ('입사일 = 오늘', '재직 상태 자동 active')

### 239. facts.yml에 없는 신규 자동화/배치 `근로계약서 발송`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:785`
- actual: ('옵션 ON + 저장', '이메일·카카오 자동 발송')

### 240. facts.yml에 없는 신규 자동화/배치 `근로계약서 서명 완료`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:786`
- actual: ('직원 서명', '인사 파일 자동 저장')

### 241. facts.yml에 없는 신규 자동화/배치 `자동 임시 저장`

- category: `new_automation`
- source: `D07-직원관리/직원관리.md:787`
- actual: ('30초 주기', '로컬 스토리지 dirty 데이터 백업')

### 242. facts.yml에 없는 신규 자동화/배치 `후속 예정일 D-1 알림`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:94`
- actual: ('후속 예정일 24시간 전', '담당 FC에게 알림 발송 (NFR-19)')

### 243. facts.yml에 없는 신규 자동화/배치 `후속 예정일 미수행`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:95`
- actual: ('예정일 경과 후 미처리', '카드 빨강 표시 + 일일 알림')

### 244. facts.yml에 없는 신규 자동화/배치 `보류 30일 경과 알림`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:96`
- actual: ('매일 04:00 배치', '보류 리드 노랑 배지 + 후속 액션 권유')

### 245. facts.yml에 없는 신규 자동화/배치 `보류 60일 자동 미전환 (옵션)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:97`
- actual: ('매일 04:00 배치', '자동 미전환 전환 (정책 활성 시). 고객사 확인 전까지 개발 대기')

### 246. facts.yml에 없는 신규 자동화/배치 `전환율 통계 갱신`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:98`
- actual: ('단계 변경 / 첫 정상 결제 완료 / 삭제', '5분 캐시 무효화 + 재계산. 등록완료 전환율은 수동 상태 변경이 아니라 결제 완료 이벤트 기준')

### 247. facts.yml에 없는 신규 자동화/배치 `MKT-01 메시지 발송 (리드 수신자)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:99`
- actual: ('리드 그룹 발송 옵션', '활성 리드에게 일괄 발송')

### 248. facts.yml에 없는 신규 자동화/배치 `일일 BI 배치`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:101`
- actual: ('매일 06:00', '유입 경로별 전환율 집계 + 본사 대시보드')

### 249. facts.yml에 없는 신규 자동화/배치 `메시지 플랫폼 예상 비용 조회`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:181`
- actual: ('수신자/채널/내용 변경', '예상 비용·잔여 캐시·템플릿 상태 갱신')

### 250. facts.yml에 없는 신규 자동화/배치 `자동 재시도`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:182`
- actual: ('발송 실패 시', '1분/5분/30분 간격 3회 재시도')

### 251. facts.yml에 없는 신규 자동화/배치 `플랫폼 실제 비용 재조회`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:183`
- actual: ('최종 실패 시', '실제 과금 여부 재확인 + 운영자 알림')

### 252. facts.yml에 없는 신규 자동화/배치 `수신 거부 / 블랙리스트 동기화`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:185`
- actual: ('회원 수신 거부 등록', '다음 발송 시 자동 제외')

### 253. facts.yml에 없는 신규 자동화/배치 `휴면 회원 동기화`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:186`
- actual: ('휴면 처리 (D11)', '다음 발송 시 자동 제외')

### 254. facts.yml에 없는 신규 자동화/배치 `가족 그룹 묶음 발송 (MBR-EXT-02)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:187`
- actual: ('가족 묶음 옵션', '그룹당 1명에게만 발송')

### 255. facts.yml에 없는 신규 자동화/배치 `발신 번호 인증 만료`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:188`
- actual: ('인증 만료 알림', '운영자에게 사전 알림')

### 256. facts.yml에 없는 신규 자동화/배치 `자동 알림 (MKT-02) 발송 결과 통합`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:189`
- actual: ('자동 알림 발송 시', '본 화면 발송 이력에도 기록')

### 257. facts.yml에 없는 신규 자동화/배치 `캠페인 (MKT-06) 메시지 연동`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:190`
- actual: ('캠페인 활성', '캠페인 메시지 자동 발송')

### 258. facts.yml에 없는 신규 자동화/배치 `AB 테스트 (MKT-09) 메시지 분배`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:191`
- actual: ('AB 테스트 진행', '고객사 확인 후 개발 진행. 확정 전 무작위 분배 발송 없음')

### 259. facts.yml에 없는 신규 자동화/배치 `본사 step 신규 추가`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:261`
- actual: ('비활성 상태 노출 + 알림', 'Owner(지점장)이 해당 지점에서 활성화')

### 260. facts.yml에 없는 신규 자동화/배치 `결제기한 만료 step 일배치`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:272`
- actual: ('매일 04:00', 'HQ-09 결제기한 만료 본사 step + 지점 ON/OFF 상태 기준 미수금·잔액·할부 납입기한 대상 추출. 지점 추가 step 없음')

### 261. facts.yml에 없는 신규 자동화/배치 `락커 만료 step 일배치`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:273`
- actual: ('매일 04:00', 'HQ-09 락커 만료 본사 step + 지점 추가 step + 지점 ON/OFF 상태 기준 락커 만료 대상 추출 + 설정 시각 발송')

### 262. facts.yml에 없는 신규 자동화/배치 `생일 알림 일배치`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:274`
- actual: ('매일 04:00', '당일 생일 회원 추출 + 09:00 발송 (지점 설정)')

### 263. facts.yml에 없는 신규 자동화/배치 `장기 미방문 일배치`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:275`
- actual: ('매일 04:00', '30/60/90일 미방문 회원 추출')

### 264. facts.yml에 없는 신규 자동화/배치 `환불 처리 이벤트`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:277`
- actual: ('환불 트랜잭션', '즉시 발송')

### 265. facts.yml에 없는 신규 자동화/배치 `홀딩 종료 이벤트`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:278`
- actual: ('자동 재개 트랜잭션', '즉시 발송')

### 266. facts.yml에 없는 신규 자동화/배치 `이용권 만료 당일 이벤트`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:279`
- actual: ('만료일 00:00', '09:00 발송 (지점 설정)')

### 267. facts.yml에 없는 신규 자동화/배치 `SCR-072A 운영 현황 집계`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:280`
- actual: ('매시간 배치', '발송 건수·성공률·실패 사유·전환율 집계')

### 268. facts.yml에 없는 신규 자동화/배치 `MKT-01 메시지 발송 이력 통합`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:281`
- actual: ('자동 알림 발송 시', '동일 발송 이력 테이블에 기록')

### 269. facts.yml에 없는 신규 자동화/배치 `자동 재시도 큐`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:282`
- actual: ('발송 실패', '1분/5분/30분 3회 재시도')

### 270. facts.yml에 없는 신규 자동화/배치 `본사 step 정의 변경`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:283`
- actual: ('슈퍼관리자 변경', '전 지점 즉시 동기화 + 알림')

### 271. facts.yml에 없는 신규 자동화/배치 `메시지 플랫폼 메타데이터 조회`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:284`
- actual: ('규칙 편집/테스트 발송', '발신 프로필·템플릿 승인 상태·예상 비용 갱신')

### 272. facts.yml에 없는 신규 자동화/배치 `플랫폼 잔여 캐시 부족 알림`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:285`
- actual: ('발송 시점 부족', '운영자 알림 발송 (NFR-19)')

### 273. facts.yml에 없는 신규 자동화/배치 `만료 자동 처리 배치`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:448`
- actual: ('매일 04:00', '종료일 경과 쿠폰 "만료" 상태 전환 + 발급 차단')

### 274. facts.yml에 없는 신규 자동화/배치 `사용률 통계 갱신`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:451`
- actual: ('발급/사용/환불', '5분 캐시 무효화 + 재계산')

### 275. facts.yml에 없는 신규 자동화/배치 `캠페인 쿠폰 (MKT-06)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:454`
- actual: ('캠페인 활성', '세그먼트 회원에게 자동 발급')

### 276. facts.yml에 없는 신규 자동화/배치 `만료 90일 후 아카이브`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:455`
- actual: ('매일 04:00', '만료 90일 경과 쿠폰 아카이브 (사용 이력 보존)')

### 277. facts.yml에 없는 신규 자동화/배치 `본사 통합 쿠폰 동기화`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:456`
- actual: ('본사 등록 시', '전 지점 자동 노출')

### 278. facts.yml에 없는 신규 자동화/배치 `MBR-EXT-04 세그먼트 발급`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:457`
- actual: ('세그먼트 조건 충족', '자동 발급 (정기 캠페인)')

### 279. facts.yml에 없는 신규 자동화/배치 `발급 메시지 재시도`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:458`
- actual: ('발송 실패', '1분/5분/30분 3회')

### 280. facts.yml에 없는 신규 자동화/배치 `자동 소멸 배치`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:533`
- actual: ('매일 04:00', '적립일 + {개수}개월 경과 FIFO 소멸')

### 281. facts.yml에 없는 신규 자동화/배치 `소멸 30일 전 알림`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:534`
- actual: ('매일 04:00', '회원 알림 발송 (MKT-02 연계)')

### 282. facts.yml에 없는 신규 자동화/배치 `이벤트 적립 (재등록)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:536`
- actual: ('재등록 트랜잭션', '자동 적립')

### 283. facts.yml에 없는 신규 자동화/배치 `요약 카드 캐시 갱신`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:541`
- actual: ('적립/사용/소멸 이벤트', '5분 캐시 무효화')

### 284. facts.yml에 없는 신규 자동화/배치 `회원앱 잔액 동기화`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:542`
- actual: ('잔액 변경 시', '회원앱 즉시 반영')

### 285. facts.yml에 없는 신규 자동화/배치 `본사 통합 정책 동기화`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:543`
- actual: ('슈퍼관리자 변경', '전 지점 즉시 적용')

### 286. facts.yml에 없는 신규 자동화/배치 `엑셀 비동기 처리`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:544`
- actual: ('100만건 초과 다운로드', '백그라운드 잡 + 완료 알림')

### 287. facts.yml에 없는 신규 자동화/배치 `PDF 자동 변환`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:626`
- actual: ('서명 완료', 'S3 저장 + 다운로드 URL 발행')

### 288. facts.yml에 없는 신규 자동화/배치 `회원 마스터 연동 (SCR-M004)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:627`
- actual: ('첫 정상 결제 완료', '회원상세 이용권 자동 등록 + 활성화')

### 289. facts.yml에 없는 신규 자동화/배치 `직원 인사 연동 (STF-02 / D07)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:628`
- actual: ('직원 근로계약 완료', '직원 상세 + 인사 도메인 등록')

### 290. facts.yml에 없는 신규 자동화/배치 `원격 서명 링크 발송 (MKT-01)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:629`
- actual: ('원격 서명 선택', 'SMS / 카톡 발송 + 7일 유효')

### 291. facts.yml에 없는 신규 자동화/배치 `원격 서명 만료 배치`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:630`
- actual: ('매일 04:00', '7일 경과 링크 자동 무효 + 운영자 알림')

### 292. facts.yml에 없는 신규 자동화/배치 `임시 저장 자동 삭제`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:631`
- actual: ('매일 04:00', '24시간 경과 임시 데이터 삭제')

### 293. facts.yml에 없는 신규 자동화/배치 `본사 표준 템플릿 동기화`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:632`
- actual: ('슈퍼관리자 변경', '전 지점 즉시 동기화 (신규 계약만)')

### 294. facts.yml에 없는 신규 자동화/배치 `계약 해지 시 환불 연동`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:633`
- actual: ('해지 트랜잭션', 'D05 결제 환불 화면 자동 연동')

### 295. facts.yml에 없는 신규 자동화/배치 `SMS / 카톡 재시도`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:635`
- actual: ('발송 실패', '자동 재시도 3회 + 채널 폴백')

### 296. facts.yml에 없는 신규 자동화/배치 `계약서 5년 후 아카이브`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:636`
- actual: ('매일 04:00', '5년 경과 계약 아카이브 (법정 보관)')

### 297. facts.yml에 없는 신규 자동화/배치 `회원 / 직원 알림 (계약 완료)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:638`
- actual: ('서명 완료', '알림톡 / 이메일 발송')

### 298. facts.yml에 없는 신규 자동화/배치 `미성년 보호자 동의 알림`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:640`
- actual: ('미성년 회원 계약', '보호자 알림 발송')

### 299. facts.yml에 없는 신규 자동화/배치 `시작일 자동 활성 배치`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:714`
- actual: ('매일 04:00 + 시작일 00:00', '준비 → 진행 상태 전환 + 메시지·쿠폰 자동 발송')

### 300. facts.yml에 없는 신규 자동화/배치 `종료일 자동 종료 배치`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:715`
- actual: ('매일 04:00 + 종료일 24:00', '진행 → 종료 상태 전환 + 결과 집계')

### 301. facts.yml에 없는 신규 자동화/배치 `메시지 자동 발송 (MKT-01)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:716`
- actual: ('활성 시 또는 정기', '세그먼트에 발송')

### 302. facts.yml에 없는 신규 자동화/배치 `쿠폰 자동 발급 (MKT-03)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:717`
- actual: ('활성 시', '세그먼트에 일괄 발급')

### 303. facts.yml에 없는 신규 자동화/배치 `리퍼럴 이벤트 연동 (MKT-07)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:718`
- actual: ('캠페인 활성', '추천 코드 자동 발급')

### 304. facts.yml에 없는 신규 자동화/배치 `AB 테스트 연동 (MKT-09)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:719`
- actual: ('AB 활성 / 종료', '고객사 확인 후 무작위 분배 / 우수안 채택')

### 305. facts.yml에 없는 신규 자동화/배치 `예산 초과 알림`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:721`
- actual: ('비용 누적 시', '알림 + 발송 중단 옵션')

### 306. facts.yml에 없는 신규 자동화/배치 `세그먼트 동기화 (MBR-EXT-04)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:722`
- actual: ('세그먼트 멤버 변동', '발송 시작 시점 대상 스냅샷 고정. 신규 자동 추가 발송은 고객사 확인 후 개발')

### 307. facts.yml에 없는 신규 자동화/배치 `본사 통합 캠페인 동기화`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:724`
- actual: ('슈퍼관리자 등록', '전 지점 즉시 노출')

### 308. facts.yml에 없는 신규 자동화/배치 `가족 묶음 옵션 (MBR-EXT-02)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:725`
- actual: ('가족 묶음 활성', '그룹당 1명에게만 발송')

### 309. facts.yml에 없는 신규 자동화/배치 `법정 시간 차단`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:726`
- actual: ('발송 시점 21~08시', '자동 차단 (광고)')

### 310. facts.yml에 없는 신규 자동화/배치 `추천 코드 자동 발급`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:802`
- actual: ('이벤트 시작일 도래', '회원앱에 회원별 코드 발급')

### 311. facts.yml에 없는 신규 자동화/배치 `양방향 혜택 자동 지급`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:803`
- actual: ('첫 정상 결제 완료로 등록완료 확정', '마일리지(MKT-04) / 쿠폰(MKT-03) 자동 지급')

### 312. facts.yml에 없는 신규 자동화/배치 `알림 발송 (MKT-01)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:804`
- actual: ('매칭 / 지급 / 미지급', '추천인·피추천인에게 알림')

### 313. facts.yml에 없는 신규 자동화/배치 `시작일 자동 활성`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:805`
- actual: ('매일 04:00', '준비 → 진행 + 코드 발급')

### 314. facts.yml에 없는 신규 자동화/배치 `종료일 자동 종료`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:806`
- actual: ('매일 04:00', '진행 → 종료 + 그레이스 기간 시작')

### 315. facts.yml에 없는 신규 자동화/배치 `부정 사용 감지 배치`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:807`
- actual: ('매시간', '동일 IP / 비정상 패턴 감지 + 매칭 보류')

### 316. facts.yml에 없는 신규 자동화/배치 `법정 한도 모니터링`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:810`
- actual: ('매일 04:00', '회원별 누적 100만원 도달 알림')

### 317. facts.yml에 없는 신규 자동화/배치 `본사 통합 이벤트 동기화`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:811`
- actual: ('슈퍼관리자 등록', '전 지점 즉시 노출')

### 318. facts.yml에 없는 신규 자동화/배치 `MKT-06 캠페인 연동`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:812`
- actual: ('캠페인 활성', '리퍼럴 이벤트 통합 ROI')

### 319. facts.yml에 없는 신규 자동화/배치 `추천 이력 영구 보존`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:813`
- actual: ('이벤트 종료 + 90일', '아카이브 (분석·세무용)')

### 320. facts.yml에 없는 신규 자동화/배치 `그레이스 기간 매칭`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:814`
- actual: ('종료 후 기본 30일 (이벤트 등록 시 7~30일 선택 가능)', '기간 내 첫 정상 결제 완료 시 매칭 정상 처리')

### 321. facts.yml에 없는 신규 자동화/배치 `플랫폼 예상 비용 조회`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:895`
- actual: ('발송 대상/채널/메시지 변경', '예상 비용·잔여 캐시·템플릿 상태 갱신')

### 322. facts.yml에 없는 신규 자동화/배치 `플랫폼 실제 비용 재동기화`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:896`
- actual: ('발송 완료', '실제 비용·성공/실패 건수 보정')

### 323. facts.yml에 없는 신규 자동화/배치 `발송 이력 90일 보관`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:897`
- actual: ('발송 완료', '90일 후 아카이브')

### 324. facts.yml에 없는 신규 자동화/배치 `알림톡 실패/비친구 처리`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:898`
- actual: ('알림톡 실패 / 비친구', '실패·제외 집계, SMS 자동 전환 없음')

### 325. facts.yml에 없는 신규 자동화/배치 `플랫폼 메타데이터 갱신`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:899`
- actual: ('플랫폼 정책 변경', 'SCR-071 / SCR-078 / DLG-078-002 즉시 갱신')

### 326. facts.yml에 없는 신규 자동화/배치 `분할 처리 (1만건 단위)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:900`
- actual: ('대량 발송', '분할 + 진행률 표시')

### 327. facts.yml에 없는 신규 자동화/배치 `수신 거부 / 휴면 동기화`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:902`
- actual: ('회원 상태 변경', '다음 발송 시 자동 제외')

### 328. facts.yml에 없는 신규 자동화/배치 `발신 번호 인증 만료 알림`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:903`
- actual: ('인증 만료 사전', '운영자에게 알림')

### 329. facts.yml에 없는 신규 자동화/배치 `비용 그래프 집계 배치`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:904`
- actual: ('매일 04:00', '월별 채널별 비용 집계')

### 330. facts.yml에 없는 신규 자동화/배치 `금지어 차단 동기화`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:905`
- actual: ('본사 금지어 사전 변경', '즉시 반영')

### 331. facts.yml에 없는 신규 자동화/배치 `A/B 테스트 종료일 자동 완료 배치`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:984`
- actual: ('매일 04:00', '고객사 확인 후 진행 → 완료 + 통계 검증. 확인 전 개발 대기')

### 332. facts.yml에 없는 신규 자동화/배치 `메시지 발송 (MKT-01)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:985`
- actual: ('A/B 분배 후', '고객사 확인 후 각 버전 발송')

### 333. facts.yml에 없는 신규 자동화/배치 `통계적 유의성 검증`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:987`
- actual: ('종료일 자동 + 강제 종료', 'p-value 계산 + 승리 판정')

### 334. facts.yml에 없는 신규 자동화/배치 `캠페인 변환 (MKT-06)`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:988`
- actual: ('승리안 채택', '캠페인 등록 자동 입력 + 검토 화면')

### 335. facts.yml에 없는 신규 자동화/배치 `본사 통합 AB 동기화`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:993`
- actual: ('슈퍼관리자 등록', '고객사 확인 후 전 지점 즉시 노출')

### 336. facts.yml에 없는 신규 자동화/배치 `표본 부족 경고`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:994`
- actual: ('진행 중 모니터링', '1000명 이하 시 알림')

### 337. facts.yml에 없는 신규 자동화/배치 `잔여 포인트 부족 처리`

- category: `new_automation`
- source: `D08-마케팅/마케팅.md:995`
- actual: ('발송 시점', '발송 보류 + 운영자 알림')

### 338. facts.yml에 없는 신규 자동화/배치 `플랫폼 잔여 캐시 부족`

- category: `new_automation`
- source: `D08-마케팅/운영정책.md:112`
- actual: ('빨강 경고 + 발송 비활성', '외부 플랫폼 충전')

### 339. facts.yml에 없는 신규 자동화/배치 `메시지 미입력`

- category: `new_automation`
- source: `D08-마케팅/운영정책.md:114`
- actual: ('발송 비활성', '')

### 340. facts.yml에 없는 신규 자동화/배치 `알림톡 비친구 포함`

- category: `new_automation`
- source: `D08-마케팅/운영정책.md:116`
- actual: ('"비친구는 제외 카운트로 표시" 또는 "비친구 {인원수}명 제외"', '제외 안내')

### 341. facts.yml에 없는 신규 자동화/배치 `알림 활성 (토글 ON)`

- category: `new_automation`
- source: `D08-마케팅/운영정책.md:119`
- actual: ('초록 토글 + 활성 표시', '')

### 342. facts.yml에 없는 신규 자동화/배치 `알림 비활성 (토글 OFF)`

- category: `new_automation`
- source: `D08-마케팅/운영정책.md:120`
- actual: ('회색 토글', '')

### 343. facts.yml에 없는 신규 자동화/배치 `전체 비활성 (상단 OFF)`

- category: `new_automation`
- source: `D08-마케팅/운영정책.md:121`
- actual: ('모든 알림 회색 + 안내', 'Owner(지점장) OFF 시 해당 지점만 중단')

### 344. facts.yml에 없는 신규 자동화/배치 `유효 기간 만료`

- category: `new_automation`
- source: `D08-마케팅/운영정책.md:126`
- actual: ('"만료" 배지 + 발급 비활성', '자동 전환')

### 345. facts.yml에 없는 신규 자동화/배치 `회원앱 / 키오스크 push`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:116`
- actual: ('센터명·로고·운영시간 저장', '즉시 동기화')

### 346. facts.yml에 없는 신규 자동화/배치 `알림 정책 적용`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:117`
- actual: ('알림설정 저장', '다음 알림부터 신규 정책 적용')

### 347. facts.yml에 없는 신규 자동화/배치 `물품 잔여 자동 계산`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:119`
- actual: ('발급 트랜잭션', '잔여 = 재고 - 오늘 발급')

### 348. facts.yml에 없는 신규 자동화/배치 `테마 적용`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:121`
- actual: ('화면 모드 저장', '저장한 운영자 계정 화면에 즉시 반영. 센터 전체 브랜딩 컬러 변경은 센터 기본정보 저장 이벤트로 별도 반영')

### 349. facts.yml에 없는 신규 자동화/배치 `일별 물품 잔여 리셋 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:122`
- actual: ('매일 00:00', '1일 발급 카운터 리셋')

### 350. facts.yml에 없는 신규 자동화/배치 `MKT-02 자동 알림`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:218`
- actual: ('정책 저장 이벤트', '이후 회원 이용권 만료·결제기한 만료·락커 만료 이벤트 발생 시 본사 step + 허용된 지점 추가 step + 지점 ON/OFF 상태 기준으로 알림 발송')

### 351. facts.yml에 없는 신규 자동화/배치 `D06 락커/사물함/운동복 자동 회수`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:219`
- actual: ('실물 자산 자동 회수 정책 저장', '만료 경과 자동 회수, 이용권 만료 이벤트 자동 회수, 일일 사물함 실제 일괄 회수, 운동복 일일 자동 만료/강제 회수 실행 여부 갱신')

### 352. facts.yml에 없는 신규 자동화/배치 `D06 사물함 overtime 상태 갱신`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:220`
- actual: ('매일 22:00', '일일 사물함 22:00 상태 갱신은 고정 ON으로 overtime 상태만 자동 반영')

### 353. facts.yml에 없는 신규 자동화/배치 `발송 큐 (회원앱 Push/KakaoTalk fallback)`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:221`
- actual: ('HQ-09 스텝 또는 지점 추가 step 조건 충족 이벤트', '회원앱 Push 기본 발송 큐 생성, 지점이 KakaoTalk fallback을 켠 경우에만 보조 발송; 실패 시 30분 간격 최대 3회 재시도')

### 354. facts.yml에 없는 신규 자동화/배치 `채널 발송 실패 알림`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:222`
- actual: ('3회 재시도 후 최종 실패', '운영자에게 실패 건 목록 알림')

### 355. facts.yml에 없는 신규 자동화/배치 `superAdmin 강제 배포 이벤트`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:223`
- actual: ('superAdmin 배포 저장', '모든 대상 지점 정책 일괄 덮어쓰기, 각 지점 화면에 갱신 알림')

### 356. facts.yml에 없는 신규 자동화/배치 `롤백 만료 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:224`
- actual: ('정책 적용 후 24시간 경과', '롤백 버튼 비활성, 롤백 가능 상태 종료 기록')

### 357. facts.yml에 없는 신규 자동화/배치 `본사 정책 세트 업데이트 이벤트`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:225`
- actual: ('본사 정책 세트 수정 저장', '해당 세트 적용 중인 지점 화면에 "업데이트됨" 배너 발생')

### 358. facts.yml에 없는 신규 자동화/배치 `정책 적용 알림 (지점 담당자)`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:226`
- actual: ('superAdmin 강제 배포 이벤트', '해당 지점 Owner(지점장)·매니저에게 "본사 정책이 적용되었습니다" 앱 알림')

### 359. facts.yml에 없는 신규 자동화/배치 `SCR-087 커스텀 역할`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:329`
- actual: ('커스텀 역할 권한 편집', '양 화면 동기화 (단일 source-of-truth)')

### 360. facts.yml에 없는 신규 자동화/배치 `primary/superAdmin 권한 부여`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:332`
- actual: ('저장 시점', '운영팀 메일·슬랙 알림')

### 361. facts.yml에 없는 신규 자동화/배치 `일별 권한 점검 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:334`
- actual: ('매일 04:00', '비활성 직원의 잔여 권한 회수 후보 보고')

### 362. facts.yml에 없는 신규 자동화/배치 `미연결 기기 connect`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:422`
- actual: ('키오스크 부팅 / 재연결', '최신 설정 자동 fetch + 동기화')

### 363. facts.yml에 없는 신규 자동화/배치 `키오스크 헬스체크`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:429`
- actual: ('5분 간격', '미연결 기기 자동 재시도')

### 364. facts.yml에 없는 신규 자동화/배치 `키오스크/IoT 설정 동기화`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:517`
- actual: ('저장 시점', '연결 기기가 다음 동기화 시점에 최신 설정 수신')

### 365. facts.yml에 없는 신규 자동화/배치 `헬스체크 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:616`
- actual: ('5분 간격', '기기 통신 상태 갱신 + 오프라인 감지')

### 366. facts.yml에 없는 신규 자동화/배치 `회원앱 푸시`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:618`
- actual: ('입장·퇴장 시점', '회원 본인에게 푸시 발송')

### 367. facts.yml에 없는 신규 자동화/배치 `자동 삭제 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:619`
- actual: ('매일 02:00', '보관 기간 경과 출입 이력 삭제')

### 368. facts.yml에 없는 신규 자동화/배치 `기기 상태 수신`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:621`
- actual: ('헬스체크 또는 상태 이벤트', '연결 상태 배지와 마지막 통신 시각 갱신')

### 369. facts.yml에 없는 신규 자동화/배치 `회원 만료 이벤트`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:622`
- actual: ('회원 상태 변경', 'IoT 정책에 즉시 반영 (만료 회원 입장 차단)')

### 370. facts.yml에 없는 신규 자동화/배치 `결제 실패 알림`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:711`
- actual: ('자동 갱신 실패 이벤트', 'Owner(지점장)에게 이메일·SMS·앱 푸시 발송 (grace period D-day 포함)')

### 371. facts.yml에 없는 신규 자동화/배치 `grace period 만료 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:712`
- actual: ('결제 실패 후 7일 경과', '서비스 상태 → "일시 정지" 전환, 전역 배너 활성')

### 372. facts.yml에 없는 신규 자동화/배치 `미수 복구 이벤트`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:713`
- actual: ('결제 수단 교체 + 재결제 성공', '서비스 상태 → "정상" 복구, 배너 해제')

### 373. facts.yml에 없는 신규 자동화/배치 `데이터 삭제 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:714`
- actual: ('구독 해지 후 90일 경과', '센터 데이터 영구 삭제 (삭제 7일 전 경고 메일)')

### 374. facts.yml에 없는 신규 자동화/배치 `플랜 한도 임박 알림`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:715`
- actual: ('회원 수 플랜 한도 90% 도달', 'Owner(지점장)에게 업그레이드 권유 알림')

### 375. facts.yml에 없는 신규 자동화/배치 `체험 종료 알림 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:716`
- actual: ('무료 체험 만료 D-7, D-3, D-1', '플랜 선택 유도 이메일 + 앱 알림')

### 376. facts.yml에 없는 신규 자동화/배치 `다운그레이드 데이터 초과 정리 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:717`
- actual: ('다운그레이드 적용일 자정', '한도 초과 데이터(비활성 회원 우선) 자동 아카이빙 + 운영자 리포트')

### 377. facts.yml에 없는 신규 자동화/배치 `청구 이력 PDF 생성`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:718`
- actual: ('결제 성공 이벤트', '영수증 PDF 비동기 생성 → S3 저장 → 다운로드 링크 유효 기간 7일')

### 378. facts.yml에 없는 신규 자동화/배치 `예약 발행 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:796`
- actual: ('설정된 예약 발행 날짜·시각', '공지 상태 "예정" → "게시 중" 자동 전환')

### 379. facts.yml에 없는 신규 자동화/배치 `만료 자동 비공개 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:797`
- actual: ('공지 종료일 자정', '상태 "게시 중" → "종료" 전환, 회원앱·키오스크 숨김')

### 380. facts.yml에 없는 신규 자동화/배치 `푸시 발송 이벤트`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:798`
- actual: ('게시 즉시 또는 예약 시각', '수신 대상에게 앱 푸시 발송 (FCM/APNs)')

### 381. facts.yml에 없는 신규 자동화/배치 `키오스크 공지 동기화`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:800`
- actual: ('공지 상태 변경 이벤트', '연결된 키오스크 기기에 실시간 공지 푸시 (SCR-082)')

### 382. facts.yml에 없는 신규 자동화/배치 `필독 확인율 집계 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:801`
- actual: ('매시간', '필독 공지별 확인 완료 회원 수 집계')

### 383. facts.yml에 없는 신규 자동화/배치 `OFFLINE 동기화 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:904`
- actual: ('키오스크 네트워크 복구 이벤트', '로컬 출석 큐 → 서버 소급 반영')

### 384. facts.yml에 없는 신규 자동화/배치 `수업 지각 누적 알림`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:905`
- actual: ('지점 설정 기간 내 수업 지각 N회 초과 이벤트', '지점 설정 수신자에게 회원앱 Push 발송, KakaoTalk fallback은 지점 선택 시 사용')

### 385. facts.yml에 없는 신규 자동화/배치 `직원 지각 자동 분류`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:906`
- actual: ('직원 출근 기록 수신', 'D07 직원 근태 관리에서 정규 출근 시각 + 직원 지각 허용 시간 기준으로 정상/지각 분류. 기본값은 10분')

### 386. facts.yml에 없는 신규 자동화/배치 `직원 지각 누적 알림`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:907`
- actual: ('지점 설정 기간 내 직원 지각 N회 초과 이벤트', '지점 설정 수신자에게 운영 알림 발송')

### 387. facts.yml에 없는 신규 자동화/배치 `출석 기록 보관 기간 만료 삭제 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:908`
- actual: ('매월 1일 02:00', '보관 기간 초과 출석 레코드 삭제, 삭제 7일 전 운영자 사전 알림')

### 388. facts.yml에 없는 신규 자동화/배치 `회원 알림 센터`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:910`
- actual: ('지각·노쇼 이벤트', '회원앱 Push + 인앱 알림, KakaoTalk fallback 선택')

### 389. facts.yml에 없는 신규 자동화/배치 `주말·공휴일 캘린더 연동`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:911`
- actual: ('공휴일 갱신 배치 (연 1회)', '공휴일 토글 정책에 따라 자동 출석 처리 여부 결정')

### 390. facts.yml에 없는 신규 자동화/배치 `SCR-081 권한 설정`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:988`
- actual: ('커스텀 역할 매트릭스 변경', '양 화면 동기화 (단일 source-of-truth)')

### 391. facts.yml에 없는 신규 자동화/배치 `일별 미사용 역할 점검`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:993`
- actual: ('매일 04:00', '30일 이상 배정 0명 역할 보고')

### 392. facts.yml에 없는 신규 자동화/배치 `역할 사용 통계 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:994`
- actual: ('매주 월요일 04:00', '역할별 배정 추이 집계')

### 393. facts.yml에 없는 신규 자동화/배치 `키오스크 언어 동기화`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:1070`
- actual: ('언어 설정 저장 이벤트', '연결된 모든 키오스크 기기에 WebSocket 또는 polling으로 언어 설정 즉시 푸시')

### 394. facts.yml에 없는 신규 자동화/배치 `타임존 기반 UI 변환`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:1072`
- actual: ('타임존 설정 저장 이벤트', '이후 모든 날짜·시각 표시를 새 타임존 offset으로 계산')

### 395. facts.yml에 없는 신규 자동화/배치 `미번역 키 감사 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:1073`
- actual: ('매주 월요일 03:00', 'i18n 키 vs 번역 데이터 비교, 누락 키 목록 리포트 생성 + 운영자 알림')

### 396. facts.yml에 없는 신규 자동화/배치 `superAdmin 전 지점 언어 배포`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:1074`
- actual: ('superAdmin 저장 이벤트', '모든 테넌트 언어 설정 일괄 업데이트')

### 397. facts.yml에 없는 신규 자동화/배치 `키오스크 미리보기 렌더링`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:1075`
- actual: ('언어 선택 UI 이벤트', '클라이언트 i18n 즉시 적용 미리보기')

### 398. facts.yml에 없는 신규 자동화/배치 `복원 진행 중 재접속`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:1159`
- actual: ('"현재 복원이 진행 중입니다" 전체 화면 안내', '복원 완료 후 자동 리디렉션')

### 399. facts.yml에 없는 신규 자동화/배치 `자동 백업 실패 재시도`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:1165`
- actual: ('자동 백업 실패 이벤트', '30분 후 1회 재시도. 재실패 시 운영자 알림 발송')

### 400. facts.yml에 없는 신규 자동화/배치 `백업 파일 만료 삭제 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:1166`
- actual: ('매일 04:00', '보관 기간 초과 파일 삭제, 이력 메타데이터는 유지')

### 401. facts.yml에 없는 신규 자동화/배치 `무결성 검증 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:1167`
- actual: ('백업 완료 이벤트', 'checksum 계산 → 저장 → 이력 레코드에 checksum 업데이트')

### 402. facts.yml에 없는 신규 자동화/배치 `자동 백업 실패 알림`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:1168`
- actual: ('자동 백업 2회 연속 실패', '슈퍼관리자에게 이메일·앱 알림')

### 403. facts.yml에 없는 신규 자동화/배치 `스토리지 용량 모니터링 배치`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:1169`
- actual: ('매일 06:00', '누적 백업 크기 집계, 100GB 초과 시 경고 배너 활성')

### 404. facts.yml에 없는 신규 자동화/배치 `Owner(지점장) 복원 승인 요청 이벤트`

- category: `new_automation`
- source: `D09-설정관리/설정관리.md:1170`
- actual: ('Owner(지점장) [승인 요청] 클릭', '슈퍼관리자에게 승인 요청 알림, 승인 시 복원 자동 실행')

### 405. facts.yml에 없는 신규 자동화/배치 `키오스크 설정 동기화`

- category: `new_automation`
- source: `D09-설정관리/운영정책.md:100`
- actual: ('SCR-082/SCR-082A 저장', '출석 방식·화면 구성·출입 규칙 설정을 연결된 키오스크가 다음 동기화 시점에 수신')

### 406. facts.yml에 없는 신규 자동화/배치 `IoT 기기 설정 동기화`

- category: `new_automation`
- source: `D09-설정관리/운영정책.md:101`
- actual: ('SCR-083 저장', '출입 게이트 / 키오스크 / 락커 컨트롤러 / InBody 측정기 4종의 설정값과 상태 표시 기준 갱신')

### 407. facts.yml에 없는 신규 자동화/배치 `락커/사물함/운동복 자동 회수 정책 적용`

- category: `new_automation`
- source: `D09-설정관리/운영정책.md:102`
- actual: ('SCR-080A 저장', 'D06 락커/사물함/운동복 화면의 자동 회수 실행 여부 갱신. 만료 경과 자동 회수 OFF, 이용권 만료 이벤트 자동 회수 OFF, 일일 사물함 22:00 상태 갱신 ON 고정, 일일 사물함 실제 일괄 회수 OFF, 운동복 일일 자동 만료/강제 회수 OFF가 기본값')

### 408. facts.yml에 없는 신규 자동화/배치 `직원 근태 기준 적용`

- category: `new_automation`
- source: `D09-설정관리/운영정책.md:103`
- actual: ('SCR-086 직원 지각 허용 시간 저장. 기본값 10분', 'D07 직원 근태 관리의 신규 출퇴근 자동 분류 기준 갱신')

### 409. facts.yml에 없는 신규 자동화/배치 `DLG-081-006 영향 직원 0명`

- category: `new_automation`
- source: `D09-설정관리/운영정책.md:123`
- actual: ('"영향 없음" 안내', '[그대로 진행] 즉시 통과')

### 410. facts.yml에 없는 신규 자동화/배치 `grace period 만료 → 서비스 정지`

- category: `new_automation`
- source: `D09-설정관리/운영정책.md:128`
- actual: ('전역 "서비스 일시 정지" 배너', '결제 수단 교체 후 즉시 복구')

### 411. facts.yml에 없는 신규 자동화/배치 `테스트 발송 채널 오류`

- category: `new_automation`
- source: `D09-설정관리/운영정책.md:145`
- actual: ('"테스트 발송 실패 — 플랫폼 연동 상태 확인" 토스트', '플랫폼 연동 링크 제공')

### 412. facts.yml에 없는 신규 자동화/배치 `시뮬레이션 발송 대상 0명`

- category: `new_automation`
- source: `D09-설정관리/운영정책.md:146`
- actual: ('"발송 대상 없음 — 정책 조건 확인" 안내', '조건 재검토 유도')

### 413. facts.yml에 없는 신규 자동화/배치 `위젯 5분 캐시`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:116`
- actual: ('5분 경과', '자동 무효화 + 다음 조회 시 재계산')

### 414. facts.yml에 없는 신규 자동화/배치 `KPI 일별 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:117`
- actual: ('매일 03:00', '회원·매출·출석 집계')

### 415. facts.yml에 없는 신규 자동화/배치 `매시간 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:118`
- actual: ('매 정각', '활성 회원 수 갱신')

### 416. facts.yml에 없는 신규 자동화/배치 `NFR-05 회원 이용권 만료 결과 동기화`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:119`
- actual: ('매일 새벽 03:00 이후', 'D02/NFR-05가 산출한 HQ-09 회원 이용권 만료 step 대상과 만료 회원 분류를 대시보드에 반영')

### 417. facts.yml에 없는 신규 자동화/배치 `미수금 갱신`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:120`
- actual: ('결제 트랜잭션', '실시간 미수금 카운트 갱신')

### 418. facts.yml에 없는 신규 자동화/배치 `출석 카운트`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:121`
- actual: ('출입 이벤트', '오늘 출석 수 실시간 갱신')

### 419. facts.yml에 없는 신규 자동화/배치 `위젯 클릭 이벤트`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:123`
- actual: ('회원명 클릭', '사용 빈도 수집(익명)')

### 420. facts.yml에 없는 신규 자동화/배치 `미수금 이상 감지`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:125`
- actual: ('전일 대비 30% 이상 급증', '알림 토스트 + 운영자 알림')

### 421. facts.yml에 없는 신규 자동화/배치 `HQ-09 정책 라이브러리`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:264`
- actual: ('신규 지점 등록', '본사 표준 정책 세트 자동 복제·적용')

### 422. facts.yml에 없는 신규 자동화/배치 `직원 권한 부여(STF)`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:265`
- actual: ('초기 Owner(지점장) 매핑', 'Owner(지점장) 권한 자동 부여 + 기존 Owner(지점장) 회수')

### 423. facts.yml에 없는 신규 자동화/배치 `운영 시작일 도래 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:268`
- actual: ('매일 00:00', '오픈 예정 → 운영 중 자동 전환')

### 424. facts.yml에 없는 신규 자동화/배치 `폐점 후 {개수}개월 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:269`
- actual: ('매일 03:00', '보관 기간 만료 시 자동 아카이브')

### 425. facts.yml에 없는 신규 자동화/배치 `통합 비교 KPI 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:270`
- actual: ('일별 03:00 / 주간 월요일 04:00', '지점별 매출·회원·출석 집계')

### 426. facts.yml에 없는 신규 자동화/배치 `SCR-101 대시보드 통합`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:271`
- actual: ('운영 상태 변경', '지점 카드 상태 자동 갱신')

### 427. facts.yml에 없는 신규 자동화/배치 `매출 일별 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:372`
- actual: ('매일 03:00', '지점별 매출 갱신')

### 428. facts.yml에 없는 신규 자동화/배치 `매출 매시간 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:373`
- actual: ('매 정각', '당일 매출 실시간 갱신')

### 429. facts.yml에 없는 신규 자동화/배치 `회원 유지율 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:374`
- actual: ('주간 월요일 04:00', '유지율 재계산')

### 430. facts.yml에 없는 신규 자동화/배치 `출석률 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:375`
- actual: ('매일 03:00', '예약/출석 집계')

### 431. facts.yml에 없는 신규 자동화/배치 `인기 수업 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:376`
- actual: ('주간 월요일 04:00', '종목별 분포 갱신')

### 432. facts.yml에 없는 신규 자동화/배치 `신규 지점 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:378`
- actual: ('매일 00:00', '30일 도래 시 비교 가능 전환')

### 433. facts.yml에 없는 신규 자동화/배치 `HQ-04 KPI 목표 연동`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:379`
- actual: ('목표 변경', '달성률 자동 갱신')

### 434. facts.yml에 없는 신규 자동화/배치 `비활성 채널 선택`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:888`
- actual: ('경고 "해당 채널은 현재 비활성 상태입니다"', '저장은 허용, 발송 시 실패 가능성 안내')

### 435. facts.yml에 없는 신규 자동화/배치 `SET-EXT-01 충돌`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:891`
- actual: ('경고 배지 "외부 연동 세트와 충돌" + 충돌 상세 패널', '충돌 해소 전 두 번째 정책 적용 차단')

### 436. facts.yml에 없는 신규 자동화/배치 `영향 지점 재적용 실패`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:894`
- actual: ('관리자 알림 + 실패 지점 목록 노출', '수동 재적용 버튼 제공')

### 437. facts.yml에 없는 신규 자동화/배치 `정책 수정 배포 이벤트`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:900`
- actual: ('저장 확정 시', '영향 범위 내 지점 정책 캐시 무효화 + 재적용 배치 실행')

### 438. facts.yml에 없는 신규 자동화/배치 `SET-EXT-01 충돌 감지 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:902`
- actual: ('정책 적용 범위 변경 시', '충돌 지점 목록 생성 + 경고 배지 갱신')

### 439. facts.yml에 없는 신규 자동화/배치 `발송 실패 모니터링`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:903`
- actual: ('스텝 발송 실행 후', '실패율 임계값(30%) 초과 시 자동 알림 + 정책 일시 중단 고려 안내')

### 440. facts.yml에 없는 신규 자동화/배치 `채널 가용성 검증 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:905`
- actual: ('스텝 저장 시', '회원앱 Push와 KakaoTalk fallback 가용성 대조, 비활성 채널 경고 플래그 설정')

### 441. facts.yml에 없는 신규 자동화/배치 `정책 내보내기 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:906`
- actual: ('[PDF 내보내기] 클릭', '정책 세트 + 스텝 목록 + 버전 정보 PDF 생성 후 다운로드')

### 442. facts.yml에 없는 신규 자동화/배치 `메인 대시보드(SCR-090)`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:989`
- actual: ('레이아웃 저장', '저장 즉시 대시보드 반영 (캐시 무효화)')

### 443. facts.yml에 없는 신규 자동화/배치 `캐시 무효화 이벤트`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:991`
- actual: ('수동 새로고침 버튼 클릭', '전체 위젯 캐시 즉시 만료 + 재요청')

### 444. facts.yml에 없는 신규 자동화/배치 `레이아웃 내보내기 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:992`
- actual: ('[PNG/PDF 내보내기] 클릭', '캔버스 스냅샷 + 실시간 데이터 취합 후 파일 생성 다운로드')

### 445. facts.yml에 없는 신규 자동화/배치 `프리셋 FIFO 관리 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:994`
- actual: ('프리셋 최대 한도 초과 저장 시도', '사용자에게 기존 프리셋 삭제 요청 (자동 삭제 안 함)')

### 446. facts.yml에 없는 신규 자동화/배치 `개선 여지 하이라이트 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1067`
- actual: ('분석 결과 생성 시', '업계 평균 대비 20% 미달 지표 플래그 자동 설정')

### 447. facts.yml에 없는 신규 자동화/배치 `PDF 생성 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1068`
- actual: ('[PDF 다운로드] 클릭', '차트 스냅샷 + 인사이트 텍스트 + 헤더 메타 취합 → PDF 파일 생성')

### 448. facts.yml에 없는 신규 자동화/배치 `샘플 임계치 검증 이벤트`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1069`
- actual: ('분석 실행 전', '풀 내 센터 수 카운트 → 5개 미만 시 분석 차단 플래그')

### 449. facts.yml에 없는 신규 자동화/배치 `액션 아이템 매핑 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1072`
- actual: ('하이라이트 지표 확정 시', '시스템 정의 액션 아이템 텍스트 매핑 → 인사이트 요약 패널 갱신')

### 450. facts.yml에 없는 신규 자동화/배치 `자동 재학습 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1150`
- actual: ('신규 데이터 누적 10% 증가 감지', '모델 재학습 큐 등록 → 재학습 완료 후 정확도 재산출')

### 451. facts.yml에 없는 신규 자동화/배치 `이탈 위험 급증 알림`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1151`
- actual: ('이탈 위험 회원 수 전주 대비 20% 증가', 'NFR-19 경유 운영팀 인앱 알림 발송')

### 452. facts.yml에 없는 신규 자동화/배치 `재학습 완료 알림`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1152`
- actual: ('재학습 배치 완료', 'superAdmin·요청자 인앱 알림 "모델 재학습이 완료되었습니다"')

### 453. facts.yml에 없는 신규 자동화/배치 `예측 백그라운드 처리`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1153`
- actual: ('실행 타임아웃(60초)', '백그라운드 큐 전환 → 완료 후 인앱 알림 + 결과 페이지 이동 링크')

### 454. facts.yml에 없는 신규 자동화/배치 `이탈 위험 회원 목록 갱신 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1154`
- actual: ('매일 06:00', '전일 기준 위험도 재산출 → 임계값 기준 목록 갱신')

### 455. facts.yml에 없는 신규 자동화/배치 `정확도 모니터링 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1155`
- actual: ('매주 월요일 04:00', '이전 예측값 vs 실제값 비교 → MAPE 산출 → 임계 초과 시 경고 플래그 설정')

### 456. facts.yml에 없는 신규 자동화/배치 `보완 예측 매핑 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1157`
- actual: ('학습 데이터 부족 지점 예측 실행', '유사 규모 지점 집계 데이터 조회 → 보완 예측값 산출 → 워터마크 플래그 설정')

### 457. facts.yml에 없는 신규 자동화/배치 `설문 발송 스케줄러`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1243`
- actual: ('설정된 주기(월 1회/분기 1회) 도달', '발송 대상 조회 → 선택 채널로 설문 링크 발송')

### 458. facts.yml에 없는 신규 자동화/배치 `낮은 점수 자동 알림`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1244`
- actual: ('0~3점 응답 접수 시', 'NFR-19 경유 Owner(지점장)·FC 인앱 알림 즉시 발송. 실패 시 재시도 3회')

### 459. facts.yml에 없는 신규 자동화/배치 `키워드 추출 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1245`
- actual: ('신규 자유 의견 응답 누적 시', '형태소 분석 + 빈도 계산 → 키워드 클라우드 데이터 갱신')

### 460. facts.yml에 없는 신규 자동화/배치 `NPS 점수 산출 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1246`
- actual: ('응답 수집 후', '추천자/중립/비추천 분류 → NPS 공식 적용 → 요약 카드·추이 차트 데이터 갱신')

### 461. facts.yml에 없는 신규 자동화/배치 `응답 익명화 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1247`
- actual: ('응답 보존 기간(3년) 만료', '회원 식별 정보 자동 익명화 처리')

### 462. facts.yml에 없는 신규 자동화/배치 `엑셀 다운로드 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1248`
- actual: ('대용량(1만 건 이상) 다운로드 요청', '백그라운드 처리 → 완료 후 인앱 알림 + 다운로드 링크')

### 463. facts.yml에 없는 신규 자동화/배치 `세그먼트별 NPS 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1250`
- actual: ('세그먼트 필터 변경 시', '해당 세그먼트 응답 재집계 → NPS 독립 산출')

### 464. facts.yml에 없는 신규 자동화/배치 `후속 조치 알림`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1251`
- actual: ('비추천 응답 후속 조치 미등록 48시간 경과', '담당 FC·Owner(지점장) 리마인드 알림 발송')

### 465. facts.yml에 없는 신규 자동화/배치 `발송 채널 응답률 통계 배치`

- category: `new_automation`
- source: `D10-본사관리/본사관리.md:1252`
- actual: ('매월 1일 03:00', '채널별 발송 수·응답 수·응답률 집계 → 발송 관리 패널 통계 갱신')

### 466. facts.yml에 없는 신규 자동화/배치 `KPI 5분 캐시`

- category: `new_automation`
- source: `D10-본사관리/운영정책.md:78`
- actual: ('5분 경과', '자동 무효화 + 재계산')

### 467. facts.yml에 없는 신규 자동화/배치 `KPI 매시간 배치`

- category: `new_automation`
- source: `D10-본사관리/운영정책.md:79`
- actual: ('매 정각', '활성 회원·매출·출석 갱신')

### 468. facts.yml에 없는 신규 자동화/배치 `이상 감지 배치`

- category: `new_automation`
- source: `D10-본사관리/운영정책.md:83`
- actual: ('매시간', '직원 0 또는 출석 -50% 감지 시 알림')

### 469. facts.yml에 없는 신규 자동화/배치 `지점 코드 중복`

- category: `new_automation`
- source: `D10-본사관리/운영정책.md:103`
- actual: ('인라인 "이미 사용 중인 코드입니다"', '자동 생성 권장')

### 470. facts.yml에 없는 신규 자동화/배치 `캐시 만료`

- category: `new_automation`
- source: `D10-본사관리/운영정책.md:110`
- actual: ('자동 재조회', '')

### 471. facts.yml에 없는 신규 자동화/배치 `수동 새로고침`

- category: `new_automation`
- source: `D10-본사관리/운영정책.md:111`
- actual: ('즉시 5분 캐시 무시 갱신', '모든 카드 동시 갱신')

### 472. facts.yml에 없는 신규 자동화/배치 `권한 부족`

- category: `new_automation`
- source: `D10-본사관리/운영정책.md:113`
- actual: ('"슈퍼관리자 전용" 안내', '본사 대시보드 자동 이동')

### 473. facts.yml에 없는 신규 자동화/배치 `5분 캐시 만료`

- category: `new_automation`
- source: `D10-본사관리/운영정책.md:117`
- actual: ('자동 재조회', '')

### 474. facts.yml에 없는 신규 자동화/배치 `WebSocket 출석 스트림`

- category: `new_automation`
- source: `D11-통합운영/운영정책.md:51`
- actual: ('키오스크/앱/수동 출석 이벤트', '본 화면 테이블 즉시 push')

### 475. facts.yml에 없는 신규 자동화/배치 `SCR-I004 옷 락커 운영`

- category: `new_automation`
- source: `D11-통합운영/운영정책.md:53`
- actual: ('락커 배정·회수', '본 화면 옷 락커 컬럼 즉시 갱신')

### 476. facts.yml에 없는 신규 자동화/배치 `출입 게이트 이벤트 수신`

- category: `new_automation`
- source: `D11-통합운영/운영정책.md:54`
- actual: ('게이트 통과·실패 이벤트', '최근 이벤트 패널과 출석 테이블에 표시')

### 477. facts.yml에 없는 신규 자동화/배치 `SCR-I007 회원 건강 요약`

- category: `new_automation`
- source: `D11-통합운영/운영정책.md:55`
- actual: ('회원 출석 이벤트', '"최근 출석" 카드 동기화')

### 478. facts.yml에 없는 신규 자동화/배치 `회원앱 출석 이력 화면(SCR-MA-111)`

- category: `new_automation`
- source: `D11-통합운영/운영정책.md:56`
- actual: ('출석 이벤트 적재', '회원앱 출석 이력 즉시 노출. 회원앱 상세 화면명은 client-pando 문서에서 확정')

### 479. facts.yml에 없는 신규 자동화/배치 `출입 게이트/키오스크 상태 수신`

- category: `new_automation`
- source: `D11-통합운영/운영정책.md:58`
- actual: ('heartbeat 또는 상태 이벤트 수신', 'SCR-I001 상태 배지와 최근 수신 시각 갱신')

### 480. facts.yml에 없는 신규 자동화/배치 `락커 컨트롤러 상태 수신`

- category: `new_automation`
- source: `D11-통합운영/운영정책.md:59`
- actual: ('락커 잠금/해제 결과 또는 상태 이벤트 수신', 'SCR-I004/SCR-I005 락커 상태 배지 갱신')

### 481. facts.yml에 없는 신규 자동화/배치 `키오스크 운영 이벤트`

- category: `new_automation`
- source: `D11-통합운영/운영정책.md:61`
- actual: ('KIOSK 문서 기준 운영 이벤트 수신', 'D11에서는 출석 성공/실패 이벤트만 표시하고 단말 조작은 제공하지 않음')

### 482. facts.yml에 없는 신규 자동화/배치 `기기 상태 미수신`

- category: `new_automation`
- source: `D11-통합운영/운영정책.md:84`
- actual: ('상태 배지 "상태 확인 불가" + 마지막 수신 시각 표시', '운영자 알림 확인, 현장 점검 안내')

### 483. facts.yml에 없는 신규 자동화/배치 `키오스크 오프라인 임계 초과 이벤트 수신`

- category: `new_automation`
- source: `D11-통합운영/운영정책.md:85`
- actual: ('출석 화면 상단 경고 배지', 'D09 SCR-083 임계값 기준 및 KIOSK 운영 문서 기준 대응 안내')

### 484. facts.yml에 없는 신규 자동화/배치 `출입 게이트 이벤트 누락`

- category: `new_automation`
- source: `D11-통합운영/운영정책.md:86`
- actual: ('"최근 출입 이벤트가 지연될 수 있습니다"', '수동 출석 등록 CTA')

### 485. facts.yml에 없는 신규 자동화/배치 `마감 시간 자동 퇴실`

- category: `new_automation`
- source: `D11-통합운영/통합운영.md:165`
- actual: ('운영 시간 종료 후 10분 기본값. ON/OFF 가능, 기본값 OFF', 'ON일 때 미퇴실 회원 자동 퇴실 처리')

### 486. facts.yml에 없는 신규 자동화/배치 `일별 출석 KPI 배치`

- category: `new_automation`
- source: `D11-통합운영/통합운영.md:166`
- actual: ('매일 23:59', '지점별 채널 분포·실패율·미배정률 집계')

### 487. facts.yml에 없는 신규 자동화/배치 `기기 상태 수신값`

- category: `new_automation`
- source: `D11-통합운영/통합운영.md:167`
- actual: ('출입 게이트/키오스크 heartbeat가 D09 오프라인 임계 N분(기본 30분)을 초과해 미수신', '본 화면 상태 배지와 최근 이벤트 경고만 표시')

### 488. facts.yml에 없는 신규 자동화/배치 `옷 락커 만료 임박 자동 감지`

- category: `new_automation`
- source: `D11-통합운영/통합운영.md:327`
- actual: ('매일 00:30', 'HQ-09 락커 만료 본사 step + 지점 추가 step 대상 락커 status=expiring + 알림')

### 489. facts.yml에 없는 신규 자동화/배치 `옷 락커 일 단위 자동 회수`

- category: `new_automation`
- source: `D11-통합운영/통합운영.md:328`
- actual: ('매일 22:00', 'overtime 상태 갱신은 고정 ON. 실제 자동 해제/알림은 D09 일일 사물함 22:00 실제 일괄 회수 ON일 때만 실행. 실제 회수 기본값 OFF')

### 490. facts.yml에 없는 신규 자동화/배치 `NFR-19 회원 알림`

- category: `new_automation`
- source: `D11-통합운영/통합운영.md:329`
- actual: ('락커 만료 임박·회수', '회원에게 회원앱 Push 발송. KakaoTalk fallback은 지점 선택 시 사용')

### 491. facts.yml에 없는 신규 자동화/배치 `고정 물품 락커 계약 만료 임박 자동 감지`

- category: `new_automation`
- source: `D11-통합운영/통합운영.md:446`
- actual: ('매일 00:30', 'HQ-09 락커 만료 본사 step + 지점 추가 step 대상 고정 물품 락커 status=expiring + 알림')

### 492. facts.yml에 없는 신규 자동화/배치 `고정 물품 락커 계약 만료 자동 회수`

- category: `new_automation`
- source: `D11-통합운영/통합운영.md:447`
- actual: ('매일 02:00 (D09 만료 경과 자동 회수 ON일 때)', '계약 만료 락커 자동 해제 + 알림. 기본값 OFF')

### 493. facts.yml에 없는 신규 자동화/배치 `고정 물품 락커 점검 알림`

- category: `new_automation`
- source: `D11-통합운영/통합운영.md:448`
- actual: ('점검 예정일 D-7 / D-1', '운영자 알림')

### 494. facts.yml에 없는 신규 조건/시점 표현

- category: `new_timing_condition`
- source: `D04-수업관리/수업관리.md:240`
- actual: 12개월 초과

### 495. facts.yml에 없는 신규 외부연동 ID/채널

- category: `new_external_integration`
- source: `D03-매출관리/매출관리.md:656`
- actual: SAL-EXT-

### 496. facts.yml에 없는 신규 예외처리

- category: `new_exception`
- source: `D03-매출관리/매출관리.md:85`
- actual: ('전체 데이터 없음', '빈 화면 안내', '')
