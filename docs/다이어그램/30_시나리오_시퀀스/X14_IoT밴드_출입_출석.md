---
title: IoT 밴드 출입 → 출석 기록 → 대시보드 반영
type: sequenceDiagram
scope: 크로스도메인
actors: [회원, IoT게이트, 시스템, 대시보드]
relatedScreens: [SCR-I001, SCR-083, SCR-101]
lastUpdated: 2026-04-20
---

# X14 — IoT 밴드 출입 → 출석 기록 → 대시보드 반영

## 1. 시나리오 개요

회원이 IoT 밴드(NFC/BLE)를 출입 게이트에 태그 → 게이트 서버가 CRM API로 인증 요청 → 이용권 유효성 검증 → 출입문 개방 → 출석 자동 기록 → 대시보드 실시간 반영까지의 시나리오.

| 항목 | 내용 |
|------|------|
| 트리거 | 회원의 IoT 밴드 태그 |
| 종료 조건 | 출석 기록 저장 + 대시보드 실시간 반영 |
| 참여 도메인 | 통합운영(D11), 공통(D1) |

## 2. 전제조건

- 회원의 IoT 밴드가 시스템에 등록되어 있음 (SCR-052)
- 출입 게이트 IoT 장비가 연동 설정 완료 (SCR-083)
- 유효한 이용권 보유 상태

## 3. 참여 액터

| 액터 | 설명 |
|------|------|
| 회원 | IoT 밴드 소지자 |
| 게이트장비 | 출입문 IoT 컨트롤러 |
| CRM API | FitGenie CRM 백엔드 |
| DB | 데이터베이스 |
| 대시보드 | 실시간 현황 표시 (SCR-101) |
| 알림서비스 | 이상 상황 알림 |

## 4. 시퀀스 다이어그램

```mermaid

    actor MB as 회원
    participant GW as 게이트장비
    participant API as CRM API
    participant DB as DB
    participant DASH as 대시보드
    participant N as 알림서비스

    MB->>GW: 1. IoT 밴드 태그 (NFC/BLE) %% GW->>API: 2. POST {band_uid, gate_id, timestamp} %% API->>DB: 3. WHERE band_uid=?
    DB-->>API: 4. 회원 정보 (member_id, status)

    alt 회원 식별 성공
        API->>DB: 5. memberships WHERE member_id=? AND status=ACTIVE AND expiry_date >= TODAY %% DB-->>API: 6. 유효 이용권 여부

        alt 유효 이용권 보유
            API->>DB: 7. attendances {member_id, gate_id, type=ENTRY, timestamp} %% DB-->>API: 8. attendance_id
            API-->>GW: 9. 200 OK {access=GRANTED} %% GW->>GW: 10. 출입문 개방 (3초)
            API->>DASH: 11. 실시간 출석 이벤트 발행 {member_id, name, timestamp} %% DASH->>DASH: 12. 대시보드 현재 방문자 수 +1 갱신
        else 이용권 만료/없음
            API-->>GW: 13. 200 OK {access=DENIED, reason=NO_MEMBERSHIP} %% GW->>GW: 14. 출입 거부음 + 안내 표시
            API->>N: 15. 만료 알림 트리거 (회원에게 갱신 안내) %% N-->>MB: 16. SMS — "이용권이 만료되었습니다. 갱신 후 이용 가능합니다"
        else 회원 상태 비활성 (정지/탈퇴)
            API-->>GW: 17. 200 OK {access=DENIED, reason=INACTIVE} %% GW->>GW: 18. 출입 거부음 + 프론트 연락 안내
        end
    else 밴드 미등록 또는 오류
        API-->>GW: 19. 404 Not Found %% GW->>GW: 20. 밴드 오류음 + 프론트 안내
    end

    Note over MB,API: [퇴장 처리]
    MB->>GW: 21. 퇴장 태그 (출구 게이트) %% GW->>API: 22. POST {band_uid, gate_id=EXIT, timestamp}
    API->>DB: 23. attendances SET exit_at=?, duration=DIFF WHERE member_id=? AND exit_at IS NULL
    DB-->>API: 24. OK
    API-->>GW: 25. 200 OK {access=GRANTED}
    GW->>GW: 26. 출구문 개방
    API->>DASH: 27. 실시간 퇴장 이벤트 발행
    DASH->>DASH: 28. 현재 방문자 수 -1 갱신
```

## 5. 주요 메시지 설명

| 번호 | 메시지 | 설명 |
|------|--------|------|
| 2 | POST | band_uid로 회원 조회 + 이용권 유효성 + 출석 기록을 단일 트랜잭션으로 처리 |
| 7 | attendances | type=ENTRY. 퇴장 시 로 exit_at, duration 업데이트 |
| 11 | 실시간 이벤트 발행 | WebSocket 또는 SSE로 대시보드에 즉시 반영 |
| 23 | attendances | 동일 회원의 가장 최근 ENTRY 레코드에 퇴장 시각 기록 |

## 6. 예외/분기

| 상황 | 처리 방법 |
|------|-----------|
| 밴드 분실/도난 | SCR-052에서 밴드 비활성화 처리 |
| 이용권 만료 당일 | expiry_date >= TODAY 조건으로 당일 이용 허용 |
| 게이트 통신 장애 | 장비 로컬 캐시로 최근 인증 회원 목록 유지, 복구 후 동기화 |
| 퇴장 기록 누락 | 다음 입장 시 이전 미종료 출석 자동 종료 처리 |

## 7. 관련 화면/모달 링크

| 화면/모달 | 설명 |
|-----------|------|
| SCR-I001 통합 출석 | IoT 출석 현황 |
| SCR-083 IoT/출입 관리 | 게이트 장비 설정 |
| SCR-052 밴드/카드 관리 | 회원 밴드 등록/해제 |
| SCR-101 대시보드 | 실시간 방문자 현황 위젯 |
