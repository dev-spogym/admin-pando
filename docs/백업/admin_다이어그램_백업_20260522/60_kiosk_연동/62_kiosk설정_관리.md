# 키오스크 설정 관리 흐름

> 작성일: 2026-05-04
> SCR-I002 키오스크설정 변경이 단말에 반영되는 전 과정

## 1. 설정 변경 → 단말 반영

```mermaid
sequenceDiagram
    actor 운영자
    participant admin as admin/SCR-I002
    participant DB
    participant kiosk as 키오스크 단말

    운영자->>admin: 설정 변경 (예: 락커 전달 방식 = app)
    admin->>DB: 설정 묶음 저장
    DB-->>admin: 저장 OK

    alt push 방식
        admin->>kiosk: 변경 알림 push
        kiosk->>admin: 최신 설정 요청
        admin-->>kiosk: 새 설정 묶음
    else polling 방식
        loop 5분 주기
            kiosk->>admin: 설정 요청
            admin-->>kiosk: 최신값 (변경 시 새 값, 미변경 시 캐시 이용)
        end
    else 강제 갱신
        운영자->>kiosk: KIO-402 ADM-03-01 설정 새로고침
        kiosk->>admin: 강제 재요청
        admin-->>kiosk: 최신값
    end

    kiosk->>kiosk: 로컬 캐시 갱신 + 화면 분기 결정
```

## 2. 설정 묶음 → 화면 영향 매트릭스

```mermaid
flowchart LR
    SET[SCR-I002 설정 묶음] --> M1[메뉴 노출 토글]
    SET --> M2[인증 수단 사용]
    SET --> M3[얼굴 인식 정책]
    SET --> M4[락커 후처리 분기]
    SET --> M5[락커 번호 전달 방식]
    SET --> M6[골프 예약 활성]
    SET --> M7[주차 안내 선택 설정]
    SET --> M8[공지 텍스트]

    M1 --> KIO001[KIO-001/301 메뉴 카드]
    M2 --> KIO1XX[KIO-101~105 진입 가능 여부]
    M3 --> KIO103[KIO-103 정지 판정]
    M4 --> KIO201[KIO-201 락커 후처리 분기]
    M5 --> KIO2XX[KIO-202/203/204 분기]
    M6 --> KIO5XX[KIO-501~504 진입]
    M7 --> KIO601[KIO-601 분기]
    M8 --> KIO305[KIO-305 + KIO-001 배너]
```

## 3. 신규 설정 키 합의 흐름

키오스크가 새로 요구하는 설정 키는 admin/SCR-I002에 명시되어야 한다.

```mermaid
flowchart TD
    A[키오스크 기획에서 신규 정책 요구] --> B[/kiosk/KIOSK-기획연계정의서.md § 4 추가/]
    B --> C[admin/KIOSK-연동매트릭스.md § 4 추가]
    C --> D[admin/SCR-I002 화면 보강 - 새 설정 항목]
    D --> E[관리자문서_통합_ID대응표.md - 설정 키 ID 부여]
    E --> F[키오스크 단말이 새 키 수신/사용]
```

## 4. 단말별 vs 지점별 설정 분리

| 분류 | 설정 항목 | 적용 단위 |
|---|---|---|
| 단말 단위 | 얼굴 인식 ON/OFF, 인증 수단, 메뉴 노출 | 키오스크 1대 |
| 지점 단위 | 출석 정책, 직원 출퇴근, 골프 정책, 공지 | 지점 모든 단말 |
| 지점 선택 | 주차 안내 문구, 외부 링크, 프런트 호출 안내 | 필요한 지점의 단말 |
| 본사 단위 | 자동화 정책 라이브러리, 정책 세트 | 모든 지점 |

```mermaid
flowchart TD
    H[본사 SCR-100 자동화 정책 라이브러리] --> B[지점 SCR-080A 지점 자동화 적용]
    B --> S[지점 SCR-I002 단말 설정]
    S --> T1[키오스크 단말 1]
    S --> T2[키오스크 단말 2]
    S --> T3[키오스크 단말 N]
```

## 5. 캐시/오프라인 정책

```mermaid
flowchart TD
    A[키오스크 설정 요청] --> B{admin 응답?}
    B -->|성공| C[새 설정 적용]
    B -->|실패| D[로컬 캐시 사용]
    D --> E{캐시 존재?}
    E -->|있음| F[캐시 적용]
    E -->|없음| G[안전 기본값 - 보조 메뉴 모두 숨김]
```

## 관련 산출물

- ../../화면설계서/D11-통합운영/SCR-I002-키오스크설정/키오스크-연동.md
- ../../../kiosk/기능명세서/설정및외부연동.md
- ../../../kiosk/다이어그램/40_자동화/40_자동복귀_자동배정.md § 4
