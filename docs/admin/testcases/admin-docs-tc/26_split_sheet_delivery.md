# TC 시트 분리 납품 요약

## 목적
- `full_massive_tc.csv` 207,630행을 클라이언트 검수 관점에서 분리 탭으로 재구성한다.
- 전체본은 `시트1`에 유지하고, 검수 주체별로 `요약`, `Admin`, `회원앱`, `Kiosk`, `통합연동` 탭을 제공한다.

## Google Sheets 탭 구성
- `시트1`: 전체 TC 원본 207,630행
- `요약`: 총량, 채널별 행수, 판정상태별 행수, 분류 규칙
- `Admin`: Admin 코어 TC 132,730행
- `회원앱`: 회원앱 직접/연계 TC 47,750행
- `Kiosk`: Kiosk 직접/연계 TC 5,400행
- `통합연동`: POS/VAN/PG/IoT/앱/Kiosk 연동 TC 34,060행

## 판정상태 기준
- `Ready`: 현 문서 기준 즉시 검수 가능
- `Need-Data`: 외부 연동/응답값/동기화 세부 데이터 확인 필요
- `Need-Decision`: 정산/인센티브/페이롤/운영정책 기준 확정 필요

## 재생성 명령
```bash
python3 scripts/build_split_tc_exports.py
python3 scripts/upload_split_tc_tabs.py
```
