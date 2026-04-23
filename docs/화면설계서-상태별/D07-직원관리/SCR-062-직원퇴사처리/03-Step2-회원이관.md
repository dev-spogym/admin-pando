# SCR-062 직원 퇴사 처리 — 03 Step 2 회원 재배정 (델타)

> 이 문서는 `00-기본화면.md`의 **델타**입니다. **FC 직원만** 진입.

## 메타
| 항목 | 값 |
|---|---|
| 상태 코드 | `resign-step2` |
| 상태 ID | 03 |
| 다이어그램 노드 | F6 > STEP2 |
| 이전 상태 | `02-Step1-직원선택` (isFC=true) |
| 다음 상태 | `04-Step3-스케줄확인` (미배정 PT 없음) |

## 진입 조건
- `currentStep === 2` + `isFC === true`
- `loadStep2Data()` 호출 (members + activeFcList)

## 비주얼 델타

```
┌─ 담당 회원 재배정 ──────────────────────────────────────┐
│ 👥 담당 회원 재배정 (총 N명)  ⚠ PT 잔여 M명 미배정     │
│                                                          │
│ 일괄 배정: [FC 선택 ▼] [미배정 회원에 적용]             │
│                                                          │
│ SimpleTable                                              │
│ ┌──────────────────────────────────────────────────┐     │
│ │ 회원명│연락처│PT 잔여│재배정 담당자           ▼  │     │
│ │ 홍길동│010-..│[PT잔여]│[FC 선택 ▼ — 에러 border]│     │
│ │ 김민수│010-..│   -    │[FC 선택 ▼]              │     │
│ └──────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
[← 이전]                                      [다음 →]
```

| 변경 요소 | From → To |
|---|---|
| 로딩 중 | "불러오는 중..." | |
| 담당 회원 없음 | "담당 회원이 없습니다." | |
| 미배정 PT 경고 | — | `bg-amber-50 border-amber-200` 배너 |
| 일괄 배정 컨트롤 | — | FC Select + "적용" 버튼 |
| SimpleTable | 미표시 | 멤버 목록 + Select 컬럼 |
| PT잔여 배지 | — | `bg-error/10 text-error border border-error/20 text-[11px]` |
| 미배정+PT 행 | — | Select border-error |

## 역할별 차이
- 공통. 재배정 후보는 퇴사 대상 제외한 활성 FC.

## 고유 인터랙션
- `bulkStaffId` 선택 → "미배정 회원에 적용" → 미배정 회원만 일괄 배정 (이미 배정된 회원은 유지).
- 개별 Select 변경: 해당 member.assignedStaffId 업데이트.
- 헤더 스캔: 미배정 PT 있을 때 "⚠ PT 잔여 M명 미배정" 배너 상단 sticky.
- "다음" 클릭 시 `unassignedPtCount > 0` → toast.warning + 페이지 이동 없음.

## 비즈니스 룰 델타
1. **미배정 PT 차단**: `hasPtRemaining && assignedStaffId === null` → 검증 실패.
2. **일괄 배정 정책**: 미배정만. 이미 배정된 회원은 덮어쓰지 않음.
3. **FC 후보**: `getStaff({ role:'FC', size:100 })` + `filter(s => s.id !== selectedStaff.id)`.
4. **PT 잔여 판정**: `Number(members.ptRemaining ?? 0) > 0`.
5. **0명 담당**: 빈 테이블 + "담당 회원이 없습니다." → "다음" 바로 가능.
6. **재배정 즉시 저장 안 함**: Step 2는 로컬 state만. 실제 mutation은 Step 4에서.

## 에지 케이스
- 활성 FC가 본인뿐인 경우: 일괄 배정 Select에 옵션 없음 → "다른 FC가 없습니다" 안내.
- 담당 회원 1000명+: 페이지네이션 또는 가상 스크롤 (초기 구현은 미지원).
- 로드 실패: toast.error + Step 1로 복귀(선택).
- 일괄 배정 후 개별 수정: 개별 Select 값이 우선.

## 바이브코딩 프롬프트 (델타)
```
currentStep === 2 && isFC:
{membersLoading && <div className="text-center py-8 text-content-secondary">불러오는 중...</div>}
{!membersLoading && members.length === 0 && (
  <div className="text-center py-8 text-content-secondary">담당 회원이 없습니다.</div>
)}
{!membersLoading && members.length > 0 && (
  <>
    <header className="flex items-center justify-between">
      <h2 className="text-base font-semibold"><Users size={16} className="inline mr-1"/>
        담당 회원 재배정 (총 {members.length}명)
      </h2>
      {unassignedPtCount > 0 && (
        <span className="bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-3 py-1 text-xs font-medium">
          ⚠ PT 잔여 {unassignedPtCount}명 미배정
        </span>
      )}
    </header>

    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-input">
      <span className="text-sm text-content-secondary">일괄 배정:</span>
      <Select value={bulkStaffId ?? ''} onChange={e=>setBulkStaffId(Number(e.target.value)||null)}>
        <option value="">FC 선택</option>
        {activeFcList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
      <Button variant="primary" size="sm" disabled={!bulkStaffId} onClick={applyBulkAssign}>
        미배정 회원에 적용
      </Button>
    </div>

    <SimpleTable columns={[
      { key:'name', header:'회원명' },
      { key:'phone', header:'연락처', render:(v)=><span className="text-content-secondary">{v}</span> },
      { key:'hasPtRemaining', header:'PT 잔여',
        render:(v)=> v
          ? <span className="text-[11px] bg-error/10 text-error border border-error/20 px-2 py-[2px] rounded-full font-semibold">PT잔여</span>
          : <span className="text-content-secondary">-</span> },
      { key:'assignedStaffId', header:'재배정 담당자',
        render:(v, row)=>(
          <Select value={v ?? ''} onChange={e=>updateMemberAssignee(row.id, Number(e.target.value)||null)}
            className={cn(row.hasPtRemaining && v===null ? 'border-error' : '')}>
            <option value="">선택</option>
            {activeFcList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        )},
    ]} data={members} />
  </>
)}

<div className="flex justify-between">
  <Button variant="secondary" onClick={handleBack}><ArrowLeft size={16}/> 이전</Button>
  <Button variant="primary" onClick={handleStep2Next}>다음 <ArrowRight size={16}/></Button>
</div>
```

## TC 후보
| TC ID | 시나리오 | 기대 |
|---|---|---|
| TC-062-03-001 | FC 직원 Step 2 진입 | members + activeFcList 로드 |
| TC-062-03-002 | 담당 회원 0명 | "담당 회원이 없습니다." + "다음" 허용 |
| TC-062-03-003 | PT잔여 3명 미배정 + "다음" | toast.warning |
| TC-062-03-004 | 일괄 배정 선택 + 적용 | 미배정만 덮임 |
| TC-062-03-005 | 개별 Select 변경 | 즉시 반영, unassignedPtCount 감소 |
| TC-062-03-006 | 이전 버튼 | Step 1 복귀 |
| TC-062-03-007 | 활성 FC 0명 | "다른 FC가 없습니다" 안내 |
| TC-062-03-008 | members 로드 실패 | toast.error + Step 1 |

## 다이어그램 링크
- F6 STEP2, F8 unassigned PT 경고
