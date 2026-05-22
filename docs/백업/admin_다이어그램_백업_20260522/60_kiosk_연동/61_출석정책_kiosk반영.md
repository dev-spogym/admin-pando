# 출석 정책의 키오스크 반영

> 작성일: 2026-05-04
> SCR-I001 통합출석관리 정책이 키오스크 단말에서 어떻게 실행되는지

## 1. 정책 → 단말 적용 흐름

```mermaid
flowchart TD
    A[운영자: SCR-I001/I002에서 정책 변경] --> B[admin 저장]
    B --> C{변경 종류}
    C -->|출석 룰| D1[중복방지/만료/미수금 처리 변경]
    C -->|타이머| D2[출입문 개방/모달 복귀 시간 변경]
    C -->|인증 수단 토글| D3[QR/RFID/얼굴/전화/바코드 노출]
    C -->|직원 출퇴근 허용| D4[KIO-104 직원 분기 변경]
    D1 --> E[키오스크가 다음 검증 시 새 정책 사용]
    D2 --> F[키오스크가 다음 결과 화면에서 새 타이머 적용]
    D3 --> G[키오스크가 다음 부팅 또는 새로고침 시 메뉴 갱신]
    D4 --> H[키오스크가 다음 인증 시 새 분기 적용]
```

## 2. 검증 시퀀스

```mermaid
sequenceDiagram
    actor 사용자
    participant kiosk as kiosk (KIO-101~105)
    participant admin as admin/SCR-I001
    participant DB as admin DB
    participant 게이트

    사용자->>kiosk: 인증 입력
    kiosk->>admin: 출석 검증 요청 (회원ID + 인증수단)
    admin->>DB: 회원 / 이용권 / 출석 이력 조회

    alt 정책: 정상 회원
        DB-->>admin: 회원 OK + 이용권 활성 + 미중복
        admin->>게이트: 출입문 개방 (5초)
        admin->>DB: 출석 이력 INSERT
        admin-->>kiosk: 성공 + 회원 정보 + 락커 정책
    else 정책: 만료
        DB-->>admin: 이용권 만료
        admin-->>kiosk: 실패(만료) + 프런트 안내 문구
    else 정책: 중복 (10분 내)
        DB-->>admin: 최근 출석 발견
        admin-->>kiosk: 실패(중복)
    else 정책: 미수금
        DB-->>admin: 미수금 존재
        admin->>admin: SCR-I001의 미수금 처리 (경고/차단)
        admin-->>kiosk: 경고 통과 또는 차단
    end
```

## 3. 정책 변경의 즉시성 매트릭스

| 정책 항목 | 변경 적용 시점 | 키오스크 동작 |
|---|---|---|
| 중복 방지 시간 | 다음 검증 즉시 | admin이 매번 정책을 적용해 결정 |
| 출입문 개방 시간 | 다음 검증 즉시 | admin이 게이트 명령에 포함 |
| 성공 모달 자동 복귀 | 단말 캐시 갱신 후 | 설정 새로고침 또는 polling |
| 인증 수단 토글 | 단말 캐시 갱신 후 | 메뉴 노출 갱신 |
| 직원 출퇴근 허용 | 다음 검증 즉시 | admin이 분기 신호 반환 |
| 미수금 차단 정책 | 다음 검증 즉시 | admin이 경고/차단 결정 |

## 4. 출석 결과의 다채널 반영

```mermaid
flowchart LR
    K[KIO-201 출석 성공] --> A[admin DB]
    A --> CL[client/SCR-MA-111 출석이력]
    A --> AD1[admin/SCR-I001 통합출석현황]
    A --> AD2[admin/SCR-I008 단말별 통계]
```

키오스크에서 일어난 출석은 회원앱과 admin 양쪽에서 동일하게 즉시 조회 가능하다.

## 관련 산출물

- ../../화면설계서/D11-통합운영/SCR-I001-통합출석관리/키오스크-연동.md
- ../../../kiosk/다이어그램/20_상태전이도/21_출석_상태전이.md
- ../../../kiosk/다이어그램/30_시나리오_시퀀스/X01, X02, X03
