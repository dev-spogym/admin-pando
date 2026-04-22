# D11 통합운영 / IoT / 헬스 — 다이어그램 인덱스

> **도메인**: D11 통합운영
> **화면설계서**: `docs/화면설계서/통합운영_IOT_헬스`
> ****: 2026-04-20

---

## 개요

출석 이벤트를 중심으로 입출입(키오스크/IoT 밴드/얼굴인식), 옷 락커, 고정 물품 락커, InBody 체성분, Health Connect 활동량을 하나의 운영 흐름으로 연결하는 도메인.

---

## SCR 목록

| SCR ID | 화면명 | 접근 경로 | 다이어그램 수 | |--------|--------|-----------|:---:| | SCR-I001 | 통합 출석 관리 | `/` | 9 | | SCR-I002 | 키오스크 설정 | `` | 9 | | SCR-I003 | IoT 연동 관리 | `` | 9 | | SCR-I004 | 옷 락커 운영 관리 | `/locker` | 9 | | SCR-I005 | 고정 물품 락커 관리 | `` | 9 | | SCR-I006 | 체성분 통합 관리 | `/body-composition` | 9 | | SCR-I007 | 회원 상세 건강/연동 요약 | `` | 9 |

**SCR 소계**: 7 × 9 = **63개 다이어그램**

---

## DLG 목록

| DLG ID | 모달명 | 트리거 SCR | 다이어그램 수 | |--------|--------|-----------|:---:| | DLG-I001 | 수동 출석 등록 | SCR-I001 | 3 | | DLG-I002 | 옷 락커 배정 | SCR-I001, SCR-I004 | 3 | | DLG-I003 | 체성분 수기 등록 | SCR-I006 | 3 |

**DLG 소계**: 3 × 3 = **9개 다이어그램**

---

## 도메인 특이사항

- **IoT 장치**: 출입문/게이트, 키오스크, 락커 컨트롤러, InBody — external(점선) 노드로 표시
- **실시간 이벤트**: IoT 밴드(X14), 키오스크 체크인(X23) 시퀀스와 연결
- **체성분 자동 반영**: InBody API → CRM 자동 수신 (X04, X22 시퀀스 참조)
- **자동화 참조**: A14 알림 상태, A1 만료 임박 알림
- **오프라인 장비**: `오류/오프라인/점검중` 상태 장비는 자동 처리 대상 제외

---

## classDef 공통 (전 파일 통일)

```mermaid
classDef screen fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
classDef modal fill:#FFF3E0,stroke:#F57C00,color:#E65100
classDef newFeature fill:#F3E5F5,stroke:#9C27B0,stroke-dasharray:5 5
classDef error fill:#FFEBEE,stroke:#C62828,color:#B71C1C
classDef success fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
classDef warning fill:#FFF8E1,stroke:#F9A825,color:#F57F17
classDef info fill:#E0F7FA,stroke:#00838F
classDef system fill:#EDE7F6,stroke:#5E35B2
classDef external fill:#ECEFF1,stroke:#455A64,stroke-dasharray:3 3
classDef cron fill:#E0F2F1,stroke:#00695C
classDef rbacBlocked fill:#F5F5F5,stroke:#9E9E9E,color:#616161
```
