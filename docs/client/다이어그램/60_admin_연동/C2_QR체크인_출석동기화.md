# C2. QR 입장 → 출석 동기화

> 회원이 회원앱(MA-110)에서 QR을 표시하거나 센터 QR을 스캔하면, admin 출석 관리(SCR-086 / SCR-I001 / SCR-C014)에 즉시 반영되어 출석 통계·이용권 차감·KPI에 반영된다.

## 주요 화면

| 시스템 | 화면 |
|---|---|
| client | MA-110 QR 입장 / MA-111 출석 이력 |
| admin | SCR-086 출석 관리(회원) / SCR-I001 통합 출석 / SCR-C014 출석 QR / SCR-094 KPI |

## 연동 시퀀스

```mermaid
sequenceDiagram
    actor Member as 회원
    participant App as 회원앱
    participant Kiosk as 센터 키오스크
    participant API
    participant AdminWeb as Admin Web
    participant Realtime as Realtime 채널

    Note over Member,Kiosk: A. 회원 QR 표시 (기본)
    Member->>App: MA-110 진입
    App->>API: 회원 QR 토큰 발급 (60초 갱신)
    API-->>App: QR 이미지 + 시간 토큰
    App-->>Member: QR 표시 + 단말 밝기 최대
    Member->>Kiosk: 키오스크에 QR 스캔
    Kiosk->>API: 체크인 요청 (회원 ID + 시간 토큰 + 키오스크 ID)
    API->>API: 토큰 검증 + 중복 체크인 점검
    API->>API: 출석 INSERT + 이용권 사용 카운트 갱신
    API-->>App: 출석 완료 토스트
    App-->>Member: 햅틱 + "출석 완료 — HH:MM"

    par 실시간 admin 반영
        API->>Realtime: attendance_created 이벤트
        Realtime-->>AdminWeb: SCR-086 출석 카운트 즉시 갱신
        Realtime-->>AdminWeb: SCR-I001 통합 출석 / SCR-094 KPI 즉시 반영
    end

    Note over Member,App: B. 회원 카메라로 센터 QR 스캔
    Member->>App: MA-110 → 스캔 모드
    App->>App: 카메라 권한 요청
    Member->>Kiosk: 센터 QR 스캔
    App->>API: 체크인 요청 (회원 ID + 센터 QR + 위치)
    API-->>App: 출석 완료

    Note over Member,App: C. 이용권 만료/없음 케이스
    Member->>App: QR 스캔
    API->>API: 이용권 상태 확인
    alt 이용권 활성
        API-->>App: 출석 완료
    else 이용권 만료
        API-->>App: 출석 OK + 경고
        App-->>Member: "이용권을 확인해 주세요" + MA-131 진입 CTA
        API->>AdminWeb: 스태프에게 알림 (만료 회원 입장)
    else 이용권 없음
        API-->>App: 출석 OK + 경고
        AdminWeb-->>Staff: 프론트 데스크 경고
    end
```

## 데이터 동기화

| 데이터 | 발생 시점 | client 반영 | admin 반영 |
|---|---|---|---|
| 출석 레코드 (회원 ID, 일시, 키오스크) | 체크인 즉시 | MA-111 출석 이력 + MA-100 홈 카운트 | SCR-086 출석 관리 + SCR-I001 통합 / SCR-094 KPI |
| 이용권 사용 카운트 (일일/누적) | 체크인 즉시 | MA-131 이용권 잔여 | SCR-M004 회원 상세 |
| 노쇼 페널티 누적 | 별도 처리 | (회원 직접 조회 X) | SCR-C008 페널티 관리 |
| 키오스크 운영 현황 (체크인 수) | 체크인 즉시 | (해당 없음) | SCR-I008 키오스크 운영 현황 |

## R&R 분리

| 영역 | client | admin |
|---|---|---|
| QR 표시 / 스캔 | ✅ MA-110 | ❌ |
| 키오스크 설정 | ❌ | ✅ SCR-082 (계약 외) |
| 수동 출석 (스태프) | ❌ | ✅ SCR-520 (스태프 화면) |
| 출석 통계 / 분석 | ✅ MA-111 (본인) | ✅ SCR-086 / SCR-094 (전체) |
| 노쇼 페널티 부여 | ❌ | ✅ SCR-C008 |

## 정책 출처

- **출석 정책** (당일 중복 차단 / 이용권 없는 회원 경고): admin 본사 정책 세트
- **QR 토큰 갱신 주기 (60초)**: 회원앱 보안 정책 (앱 측 결정)
- **수동 출석 권한**: admin 권한 매트릭스 (스태프만)
