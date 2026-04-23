# SCR-062 직원 퇴사 처리 — 04 Step 3 스케줄 확인 (델타)

> 이 문서는 `00-기본화면.md`의 **델타**입니다.

## 메타
| 항목 | 값 |
|---|---|
| 상태 코드 | `resign-step3` |
| 상태 ID | 04 |
| 다이어그램 노드 | F6 > STEP3 |
| 이전 상태 | `03-Step2`(FC) / `02-Step1`(비FC) |
| 다음 상태 | `05-Step4-최종확인` |

## 진입 조건
- `currentStep === 3`
- `futureSchedules` 로드 (현재는 빈 배열 하드코딩 + 추후 API)

## 비주얼 델타

```
┌─ 미래 스케줄 확인 ──────────────────────────────────────┐
│ 📋 미래 스케줄 확인                                     │
│                                                          │
│ (스케줄 0건)                                             │
│ ✅ 퇴사 예정일 이후 예정된 스케줄이 없습니다.            │
│                                                          │
│ (스케줄 있음 — SimpleTable)                              │
│ │스케줄명│유형│날짜                 │                   │
│ │PT 세션 │PT  │2026-05-02 10:00     │                   │
│ │요가 클래스│GX│2026-05-03 19:00    │                   │
│                                                          │
│ 처리 방법:                                               │
│ (●) 후임에게 일괄 이관                                   │
│ (○) 일괄 취소                                            │
└──────────────────────────────────────────────────────────┘
[← 이전]                                      [다음 →]
```

| 변경 요소 | From → To |
|---|---|
| 스케줄 없음 메시지 | — | ✅ 체크 + "예정된 스케줄이 없습니다." |
| SimpleTable | — | 스케줄 목록(있을 때) |
| RadioGroup | — | `transfer`/`cancel` 선택 |
| 처리 방법 라벨 | — | "처리 방법:" |

## 역할별 차이
- 공통.

## 고유 인터랙션
- RadioGroup 변경: `scheduleAction` state 업데이트.
- "이전" 클릭: FC면 Step 2, 비FC면 Step 1로.
- "다음" 클릭: Step 4 진입 (검증 없음 — 기본값 transfer).
- 스케줄 있음 + 선택 강제: `scheduleAction` 필수 (기본값으로 허용하되 명시적 선택 유도).

## 비즈니스 룰 델타
1. **스케줄 API 미구현 (현재)**: `futureSchedules = []` 하드코딩. `// TODO: API 연동`.
2. **추후 API**: `GET /schedules?staffId={id}&startDate={resignDate}&endDate={+60d}`.
3. **processing 로직 추후 구현**:
   - `transfer`: 재배정된 담당자(Step 2)에게 스케줄 이관 (UPDATE schedules.staffId).
   - `cancel`: 해당 스케줄 status='CANCELLED'.
4. **기본값**: `'transfer'` (이관이 보수적 선택).
5. **Step 3 건너뛰기**: 스케줄 없음 + 미구현 상태여도 반드시 경유 (교육 목적).

## 에지 케이스
- 매우 많은 스케줄(100+): 페이지네이션 또는 그룹화 (초기 미지원).
- 스케줄 API 실패: 경고 배너 "스케줄 확인 중 오류 — 이관 옵션 사용 시 주의" + 다음 진행 허용.
- 스케줄과 PT 잔여 회원 충돌: 이관 시 해당 회원의 새 담당자와 매칭.

## 바이브코딩 프롬프트 (델타)
```
currentStep === 3:
<section aria-labelledby="step3-title" className="rounded-xl ring-1 ring-line bg-white p-6 space-y-4">
  <h2 id="step3-title" className="text-base font-semibold flex items-center gap-1.5">
    <Calendar size={16}/> 미래 스케줄 확인
  </h2>

  {futureSchedules.length === 0 ? (
    <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-input">
      <CheckCircle size={16} className="text-emerald-600"/>
      <span className="text-sm text-emerald-800">퇴사 예정일 이후 예정된 스케줄이 없습니다.</span>
    </div>
  ) : (
    <SimpleTable columns={[
      { key:'title', header:'스케줄명' },
      { key:'type', header:'유형', render:(v)=>
        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold',
          v==='PT' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success')}>{v}</span> },
      { key:'date', header:'날짜', render:(v)=><span className="text-content-secondary">{v}</span> },
    ]} data={futureSchedules} />
  )}

  <fieldset>
    <legend className="text-sm font-medium text-gray-700 mb-2">처리 방법:</legend>
    <div role="radiogroup" aria-label="스케줄 처리 방법" className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="radio" name="schedAction" value="transfer"
               checked={scheduleAction==='transfer'} onChange={()=>setScheduleAction('transfer')} />
        <span className="text-sm">후임에게 일괄 이관</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="radio" name="schedAction" value="cancel"
               checked={scheduleAction==='cancel'} onChange={()=>setScheduleAction('cancel')} />
        <span className="text-sm">일괄 취소</span>
      </label>
    </div>
  </fieldset>
</section>

<div className="flex justify-between">
  <Button variant="secondary" onClick={handleBack}><ArrowLeft size={16}/> 이전</Button>
  <Button variant="primary" onClick={()=>setCurrentStep(4)}>다음 <ArrowRight size={16}/></Button>
</div>
```

## TC 후보
| TC ID | 시나리오 | 기대 |
|---|---|---|
| TC-062-04-001 | 스케줄 0건 | ✅ 메시지 |
| TC-062-04-002 | 스케줄 있음 | SimpleTable 렌더 |
| TC-062-04-003 | RadioGroup "이관" 선택 | state=transfer |
| TC-062-04-004 | RadioGroup "취소" 선택 | state=cancel |
| TC-062-04-005 | 이전 (FC) | Step 2 |
| TC-062-04-006 | 이전 (비FC) | Step 1 |
| TC-062-04-007 | 다음 | `05-Step4` |
| TC-062-04-008 | 스케줄 API 실패(미구현이므로 skip) | — |

## 다이어그램 링크
- F6 STEP3, F2 메인인터랙션
