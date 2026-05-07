# 키오스크 ↔ admin 연동 다이어그램

> 작성일: 2026-05-04
> kiosk-pando 시점에서 admin과 주고받는 데이터/이벤트 흐름

## 1. 전체 데이터 흐름

```mermaid
flowchart LR
    subgraph admin[admin-pando]
        A1[SCR-I001 통합출석관리]
        A2[SCR-I002 키오스크설정]
        A8[SCR-I008 키오스크운영현황]
        L50[SCR-050 락커관리]
        L52[SCR-052 밴드카드관리]
        G54[SCR-054 골프타석관리]
        D63[SCR-063 직원근태]
        S81[SCR-081 권한설정]
        DB[(admin DB)]
    end

    subgraph kiosk[kiosk-pando]
        K001[KIO-001 대기]
        K1XX[KIO-101~105 인증]
        K201[KIO-201 출석 결과]
        K2XX[KIO-202~204 락커]
        K3XX[KIO-301~305 회원 정보]
        K4XX[KIO-401~402 관리자]
        K5XX[KIO-501~504 골프]
        K6XX[KIO-601 주차]
        K7XX[KIO-701~702 매점]
    end

    %% admin → kiosk (정책/마스터)
    A1 -.정책.-> K201
    A2 -.설정.-> K001
    A2 -.설정.-> K1XX
    A2 -.설정.-> K2XX
    A2 -.설정.-> K3XX
    A2 -.설정.-> K5XX
    A2 -.설정.-> K6XX
    A2 -.설정.-> K7XX
    L50 -.락커 풀.-> K201
    L52 -.카드/밴드 매핑.-> K1XX
    L52 -.밴드 재고.-> K2XX
    G54 -.타석 상태.-> K5XX
    D63 -.직원 근태 정책.-> K1XX
    S81 -.PIN 정책.-> K4XX

    %% kiosk → admin (이벤트/상태)
    K201 -.출석 이벤트.-> A1
    K201 -.락커 배정.-> L50
    K2XX -.전달 결과.-> DB
    K5XX -.예약 이벤트.-> G54
    K7XX -.결제 이벤트.-> DB
    K4XX -.기기 상태/감사 로그.-> A8
    K1XX -.직원 출퇴근.-> D63
```

## 2. 시퀀스 — 정책 수신

```mermaid
sequenceDiagram
    participant kiosk
    participant admin

    Note over kiosk: 단말 부팅 또는 ADM-03-01
    kiosk->>admin: SCR-I002 설정 요청
    admin-->>kiosk: 메뉴 토글 / 인증 수단 / 얼굴 인식 정책 / 락커 전달 / 골프 / 주차 / 공지
    kiosk->>kiosk: 캐시 갱신 + 화면 분기 결정
```

## 3. 시퀀스 — 출석 이벤트

```mermaid
sequenceDiagram
    participant kiosk
    participant admin
    participant DB

    kiosk->>admin: 출석 검증 (회원 ID + 인증 수단)
    admin->>DB: 회원/이용권/중복 체크
    DB-->>admin: 결과
    admin-->>kiosk: 성공/실패 + 락커 정책
    kiosk->>admin: 출석 기록 적재
    admin->>DB: 출석 이력 INSERT
    admin->>admin: 회원앱 동기화 트리거
```

## 4. 시퀀스 — 골프 예약 이벤트

```mermaid
sequenceDiagram
    participant kiosk
    participant admin

    kiosk->>admin: 가용 타석 조회
    admin-->>kiosk: 타석 그리드
    kiosk->>admin: 예약 확정 (타석 + 시간 + 회원)
    admin->>admin: 중복/충돌 검증 + 이용권 차감
    admin-->>kiosk: 예약 ID
    admin-->>admin: SCR-054 즉시 반영 + 회원앱 알림 트리거
```

## 5. 시퀀스 — 관리자 패널 보고

```mermaid
sequenceDiagram
    participant kiosk
    participant admin

    Note over kiosk: 단말 부팅
    kiosk->>admin: 단말 정보 보고 (kioskId/branchId/version)
    admin->>admin: SCR-I008에 online 표시

    loop 핑
        kiosk->>admin: heartbeat
        admin->>admin: 마지막 핑 시각 갱신
    end

    Note over kiosk: 관리자 액션 (KIO-402)
    kiosk->>admin: 감사 로그 적재 (PIN진입/문열기/TTS 등)
    admin->>admin: SCR-I008 감사 로그 누적
```

## 6. 데이터 일관성 원칙

1. **단일 원천**: 회원/이용권/예약/락커/카드 매핑은 admin DB만 사용. 키오스크는 캐시.
2. **정책 우선**: 출석/락커/골프 운영 규칙은 admin 정책 우선. 키오스크는 표시/입력만.
3. **이벤트는 admin에 적재**: 키오스크에서 발생한 이벤트는 모두 admin 운영 로그로.
4. **신규 설정 키 합의**: 키오스크가 요구하는 신규 설정은 admin/SCR-I002에 명시 후 수신.
5. **오프라인 큐**: 단절 시 로컬 큐, 복구 즉시 admin 반영.

## 관련 산출물

- admin/KIOSK-연동매트릭스.md
- admin/화면설계서/D11-통합운영/SCR-I001-통합출석관리/키오스크-연동.md
- admin/화면설계서/D11-통합운영/SCR-I002-키오스크설정/키오스크-연동.md
- admin/화면설계서/D11-통합운영/SCR-I008-키오스크운영현황/키오스크-연동.md
- admin/화면설계서/D06-시설관리/SCR-050-락커관리/키오스크-연동.md
- admin/화면설계서/D06-시설관리/SCR-052-밴드카드관리/키오스크-연동.md
- admin/화면설계서/D06-시설관리/SCR-054-골프타석관리/키오스크-연동.md
