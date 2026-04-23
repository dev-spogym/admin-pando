# SCR-062 직원 퇴사 처리 — 05 Step 4 최종 확인 (델타)

> 이 문서는 `00-기본화면.md`의 **델타**입니다.

## 메타
| 항목 | 값 |
|---|---|
| 상태 코드 | `resign-step4` |
| 상태 ID | 05 |
| 다이어그램 노드 | F6 > STEP4 |
| 이전 상태 | `04-Step3-스케줄확인` |
| 다음 상태 | `06-제출중` (제출) / `04-Step3`(이전) |

## 진입 조건
- `currentStep === 4` (모든 이전 단계 통과)
- 요약 데이터가 완성됨

## 비주얼 델타

```
┌─ 최종 확인 ───────────────────────────────────────────────┐
│ 🚪 최종 확인                                              │
│                                                            │
│ 🔴 danger banner                                          │
│ ⚠ 퇴사 예정 등록 후에는 수정이 어려울 수 있습니다.        │
│ 반드시 입력 내용을 확인한 후 등록하세요.                   │
│                                                            │
│ 요약 정보 (key-value 리스트)                              │
│ 퇴사 대상:        홍길동 (트레이너)                        │
│ 퇴사 예정일:      2026년 5월 1일                           │
│ 퇴사 사유:        개인 사정                                │
│ 담당 회원 재배정: 5명 완료 (FC일 때)                       │
│ 미래 스케줄:      예정된 스케줄 없음 / 이관 / 취소          │
└────────────────────────────────────────────────────────────┘
[← 이전]                            [🚪 퇴사 예정 등록]
```

| 변경 요소 | From → To |
|---|---|
| danger banner | — | bg-error/5 border-error/20 + ⚠ + "수정 어려움" |
| 요약 리스트 | — | grid 2열(key/value) |
| 제출 버튼 | — | `variant="danger"` + UserMinus 아이콘 + "퇴사 예정 등록" |
| 제출 버튼 disabled | — | `isSubmitting=true` 시 |

## 역할별 차이
- 공통.

## 고유 인터랙션
- 이전: Step 3으로 복귀 (입력 데이터 모두 보존).
- "퇴사 예정 등록": `handleSubmit()` → `06-제출중` 전이.
- 버튼에 `aria-describedby="resign-warning"`로 경고 연결.
- Enter 제출 허용(단, 경고 배너 수신 후).

## 비즈니스 룰 델타
1. **최종 요약 내용**:
   - 퇴사 대상: `${selectedStaff.name} (${selectedStaff.role})`
   - 퇴사 예정일: KST 한국어 (`2026년 5월 1일`)
   - 퇴사 사유: 미입력 시 "없음"
   - 담당 회원 재배정: FC일 때 "N명 완료" / 비FC "해당 없음"
   - 미래 스케줄: `futureSchedules.length === 0 ? '예정된 스케줄 없음' : (scheduleAction==='transfer' ? 'N건 이관' : 'N건 취소')`
2. **제출 버튼 활성 조건**: `!isSubmitting`.
3. **중복 제출 가드**: onClick 후 즉시 `isSubmitting=true`.
4. **감사 로그 payload 준비**: `{ staffId, resignScheduledAt, resignReason, reassignCount, scheduleAction }`.

## 에지 케이스
- 요약 데이터 누락(버그): Step 1로 리셋 + toast "입력 정보가 누락되었습니다. 처음부터 다시 진행해주세요."
- 제출 직전 네트워크 단절: 클릭 시점에 toast "네트워크를 확인해주세요."
- 세션 만료 직전: 제출 시 E401 → `/login?redirect=`.

## 바이브코딩 프롬프트 (델타)
```
currentStep === 4:
<section aria-labelledby="step4-title" className="rounded-xl ring-1 ring-line bg-white p-6 space-y-4">
  <h2 id="step4-title" className="text-base font-semibold flex items-center gap-1.5">
    <DoorOpen size={16}/> 최종 확인
  </h2>

  <div id="resign-warning" role="alert"
       className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/5 p-4 text-sm text-error">
    <AlertTriangle size={16}/>
    <div>
      <p className="font-semibold">퇴사 예정 등록 후에는 수정이 어려울 수 있습니다.</p>
      <p className="mt-1 text-error/80">반드시 입력 내용을 확인한 후 등록하세요.</p>
    </div>
  </div>

  <dl className="grid grid-cols-[140px_1fr] gap-y-3 gap-x-4 text-sm">
    <dt className="text-content-secondary">퇴사 대상:</dt>
    <dd className="font-medium">{selectedStaff.name} ({selectedStaff.role})</dd>

    <dt className="text-content-secondary">퇴사 예정일:</dt>
    <dd className="font-medium">{formatKSTDate(resignDate, 'YYYY년 M월 D일')}</dd>

    <dt className="text-content-secondary">퇴사 사유:</dt>
    <dd className="font-medium">{resignReason || '없음'}</dd>

    {isFC && (<>
      <dt className="text-content-secondary">담당 회원 재배정:</dt>
      <dd className="font-medium">{members.filter(m=>m.assignedStaffId).length}명 완료</dd>
    </>)}

    <dt className="text-content-secondary">미래 스케줄:</dt>
    <dd className="font-medium">
      {futureSchedules.length === 0 ? '예정된 스케줄 없음'
        : `${futureSchedules.length}건 ${scheduleAction==='transfer' ? '이관' : '취소'}`}
    </dd>
  </dl>
</section>

<div className="flex justify-between">
  <Button variant="secondary" onClick={handleBack}><ArrowLeft size={16}/> 이전</Button>
  <Button variant="danger" onClick={handleSubmit} disabled={isSubmitting}
          aria-describedby="resign-warning">
    <UserMinus size={16}/> {isSubmitting ? '처리 중...' : '퇴사 예정 등록'}
  </Button>
</div>
```

## TC 후보
| TC ID | 시나리오 | 기대 |
|---|---|---|
| TC-062-05-001 | Step 4 진입 | 경고 배너 + 요약 표시 |
| TC-062-05-002 | FC 직원 요약 | 재배정 N명 완료 |
| TC-062-05-003 | 비FC 요약 | 재배정 줄 숨김 |
| TC-062-05-004 | 사유 미입력 | "없음" |
| TC-062-05-005 | 이전 버튼 | Step 3로 복귀 |
| TC-062-05-006 | 제출 버튼 클릭 | `06-제출중` 전이 |
| TC-062-05-007 | aria-describedby | 경고 연결 확인 |
| TC-062-05-008 | 오프라인 제출 | toast + 중단 |

## 다이어그램 링크
- F6 STEP4, F3 FINAL_SUBMIT
