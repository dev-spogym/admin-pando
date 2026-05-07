# SCR-MA-110 QR 발급 → KIO-101 스캔

> 작성일: 2026-05-04
> 회원앱이 발급한 QR 토큰이 키오스크 카메라로 스캔되어 출석 처리되는 흐름

## 1. 시퀀스

```mermaid
sequenceDiagram
    actor 회원
    participant clientapp as 회원앱 SCR-MA-110
    participant admin
    participant kiosk as 키오스크 KIO-101
    participant 게이트

    회원->>clientapp: 앱 진입 → QR 화면
    clientapp->>admin: 토큰 발급 요청 (회원ID + 디바이스)
    admin->>admin: 1회용 토큰 생성 (60초 유효)
    admin-->>clientapp: 토큰
    clientapp-->>회원: QR 코드 표시 (화면 밝기 최대)

    Note over 회원: 키오스크 앞에 도착
    회원->>kiosk: QR을 카메라에 노출
    kiosk->>kiosk: QR 스캔 + 토큰 디코딩
    kiosk->>admin: 토큰 검증 + 회원 식별
    admin->>admin: 토큰 유효성 + 회원 + 이용권 검증

    alt 정상
        admin->>게이트: 출입문 5초 개방
        admin->>admin: 출석 이력 적재 + 토큰 폐기
        admin-->>kiosk: 회원 정보 + 락커 정책
        kiosk->>회원: KIO-201 성공 모달
        admin-->>clientapp: SCR-MA-111 출석이력 즉시 갱신
    else 토큰 만료
        admin-->>kiosk: 만료 코드
        kiosk->>회원: "QR 만료. 앱에서 재발급"
        clientapp->>clientapp: 자동 재발급
    else 회원 차단/만료
        admin-->>kiosk: 사유
        kiosk->>회원: KIO-201 실패 + 사유
    end
```

## 2. 회원앱 측 요건

| 항목 | 회원앱 처리 |
|---|---|
| QR 토큰 형식 | admin이 발급한 1회용 토큰 그대로 표시 |
| 유효 시간 | 60초 권장 |
| 자동 재발급 | 만료 직전 자동 갱신 또는 사용자 액션 시 갱신 |
| 화면 밝기 | QR 표시 동안 최대 밝기 권장 |
| 푸시 진입 | 푸시 알림 클릭 시 SCR-MA-110으로 빠른 진입 |
| 앱 미실행 시 | 위젯 또는 단축아이콘 권장 |

## 3. 보안

- QR 토큰에 회원 PII 직접 포함하지 않음 (서버 토큰 ↔ 회원 매핑만)
- 1회용 또는 짧은 유효시간으로 도난 위험 최소화
- 토큰 위변조는 admin 검증 단계에서 거부

## 4. 회원앱 측 화면 흐름

```mermaid
flowchart TD
    A[회원앱 홈 SCR-MA-100] --> B[QR 체크인 진입 SCR-MA-110]
    B --> C[admin에 토큰 발급 요청]
    C --> D[QR 표시 - 카운트다운]
    D --> E{만료?}
    E -->|N| D
    E -->|Y| F[자동 재발급]
    F --> D
    D --> G[키오스크 스캔 완료 후 사용자가 닫음]
    G --> H[SCR-MA-111 출석이력으로 자동 이동 가능]
```

## 관련 산출물

- ../../화면설계서/D12-회원앱/SCR-MA-110-QR체크인/키오스크-연동.md
- ../../../kiosk/화면설계서/A1-메인및출석/KIO-101-QR체크인/00-기본화면.md
- ../../../kiosk/다이어그램/30_시나리오_시퀀스/X02_QR_체크인.md
