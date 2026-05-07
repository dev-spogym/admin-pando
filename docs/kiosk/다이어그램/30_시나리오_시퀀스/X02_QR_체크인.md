# X02 QR 체크인 시퀀스

> 작성일: 2026-05-04
> 관련 화면: KIO-001, KIO-101, KIO-201, client/SCR-MA-110

## 시퀀스 (회원앱 발급 QR)

```mermaid
sequenceDiagram
    actor 회원 as 회원
    participant clientapp as 회원앱 SCR-MA-110
    participant kiosk as 키오스크 KIO-101
    participant admin as admin
    participant 게이트 as 출입문

    회원->>clientapp: 앱 진입 → QR 발급
    clientapp-->>회원: QR 코드 표시 (60초 유효)
    회원->>kiosk: QR을 카메라에 노출
    kiosk->>kiosk: QR 스캔 + 토큰 디코딩
    kiosk->>admin: 토큰 검증 + 회원 식별
    admin-->>kiosk: 회원 ID + 이용권 상태

    alt 정상 (이용권 OK + 미중복)
        admin->>게이트: 출입문 개방 (5초)
        admin->>admin: 출석 이력 적재
        admin-->>clientapp: SCR-MA-111 출석이력에 즉시 반영
        kiosk->>회원: KIO-201 성공 모달
    else 이용권 만료/미수금/중복
        kiosk->>회원: KIO-201 실패 + 사유
    else 토큰 만료
        kiosk->>회원: "QR이 만료되었습니다. 앱에서 재발급해주세요"
        clientapp->>clientapp: 자동 재발급
    end
```

## 보안 메모

- QR 토큰에 회원 PII 직접 포함하지 않음 (서버 토큰 ↔ 회원 매핑만)
- 1회용 또는 짧은 유효시간 (60초 권장)
- 위변조 토큰은 서버 검증 단계에서 거부

## 관련 산출물

- KIO-101 화면설계서
- client/SCR-MA-110-QR체크인 키오스크-연동.md
- 키오스크 기능명세서 출석및입장관리.md (ATT-02-01)
