# 키오스크 단말 운영 현황

> 작성일: 2026-05-04
> SCR-I008 키오스크운영현황과 키오스크 단말의 양방향 통신

## 1. 단말 라이프사이클

```mermaid
flowchart LR
    A[지점 신설] --> B[admin/SCR-I002에서 단말 등록]
    B --> C[kioskId 발급]
    C --> D[현장 설치 + 부팅]
    D --> E[admin/SCR-I008에 online 보고]
    E --> F[운영 중 - 감사로그 적재]
    F --> G{퇴역?}
    G -->|N| F
    G -->|Y| H[admin에서 단말 비활성]
    H --> I[키오스크 동작 차단]
```

## 2. 양방향 통신

```mermaid
sequenceDiagram
    participant kiosk
    participant admin as admin/SCR-I008

    Note over kiosk: 부팅
    kiosk->>admin: 단말 정보 (kioskId/branchId/version)
    admin->>admin: online 표시 + 마지막 부팅 시각 기록

    loop 주기 heartbeat
        kiosk->>admin: heartbeat
        admin->>admin: 마지막 핑 시각 갱신
    end

    Note over kiosk: 관리자 액션 (KIO-402)
    kiosk->>admin: 감사 로그 (PIN 진입/문열기/TTS/설정새로고침)
    admin->>admin: 감사 로그 누적

    Note over admin: 본사 운영자가 원격 명령
    admin->>kiosk: 강제 설정 새로고침
    kiosk->>kiosk: 설정 캐시 갱신

    Note over admin: 본사 운영자가 단말 차단
    admin->>kiosk: 차단 신호
    kiosk->>kiosk: 모든 KIO 화면을 점검 안내로 전환
```

## 3. SCR-I008 표시 항목

| 항목 | 데이터 출처 |
|---|---|
| kioskId / branchId / version | kiosk → admin (부팅 시) |
| 온라인 상태 | heartbeat 마지막 시각 |
| 마지막 출석 처리 시각 | 출석 이벤트 발생 시각 |
| 감사 로그 | KIO-402 운영자 액션 |
| 장비 상태 | 카메라/프린터/리더기/게이트/TTS 오류 보고 |
| 오프라인 큐 잔여 | 단절 시 적재된 큐 카운트 |

## 4. 본사 통합 모니터링

```mermaid
flowchart TD
    A[본사 운영자 - SCR-I008 진입] --> B[전체 지점 통합 조회]
    B --> C[지점별 단말 그리드]
    C --> D{단말 상태}
    D -->|정상| E[헬시 표시]
    D -->|단절| F[알림 + 운영팀 호출]
    D -->|장비 오류| G[알림 + 점검 트리거]
    D -->|감사 이상| H[관리자 액션 이상 로그 강조]
```

## 5. 원격 명령 카탈로그

| 명령 | 발신 | 키오스크 영향 |
|---|---|---|
| 강제 설정 새로고침 | admin/SCR-I008 | 즉시 새 설정 적용 |
| 단말 비활성/활성 토글 | admin/SCR-I002 | 모든 KIO 화면이 점검 안내로 |
| 원격 재기동 | admin/SCR-I008 | 단말 재부팅 |
| 원격 문 열기 | admin/SCR-I008 | 게이트 개방 (예외 대응) |
| 감사 로그 일괄 다운로드 | admin/SCR-I008 | — (조회만) |

## 6. 감사 로그 카테고리

| 카테고리 | 발생 화면 | 예시 |
|---|---|---|
| PIN 진입 | KIO-401 | 성공/실패 |
| 운영 액션 | KIO-402 | 설정새로고침/연결테스트/문열기/TTS |
| 장비 이벤트 | (백그라운드) | 카메라 차단, 프린터 오류 |
| 출석 이상 | KIO-201 | 미식별 다발, 직원 출퇴근 차단 |
| 결제 이상 | KIO-702 | 실패/재시도/취소 |

## 관련 산출물

- ../../화면설계서/D11-통합운영/SCR-I008-키오스크운영현황/키오스크-연동.md
- ../../../kiosk/기능명세서/관리자및운영관리.md
- ../../../kiosk/다이어그램/50_에러_예외/50_인증실패_장비오프라인.md
