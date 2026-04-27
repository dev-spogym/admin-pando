# SCR-062 직원 퇴사 처리 — 02 Step 1 직원 선택 (델타)

> 이 문서는 `00-기본화면.md`의 **델타**입니다.

## 메타
| 항목 | 값 |
|---|---|
| 상태 코드 | `resign-step1` |
| 상태 ID | 02 |
| 다이어그램 노드 | F6 > STEP1 |
| 이전 상태 | `01-로딩` / `03/04/05`(이전) |
| 다음 상태 | `03-Step2-회원이관`(FC) / `04-Step3-스케줄확인`(비FC) |

## 진입 조건
- `currentStep === 1` + staffList 로드 완료

## 비주얼 델타
- 섹션: "퇴사 대상 직원 선택" + "퇴사 정보" 2개.
- 직원 Select 변경 시 선택 카드(하단) 재렌더.
- 퇴사일 input min=today.
- 검증 실패 시 인라인 에러(`step1Errors`).

```
┌─ 퇴사 대상 직원 선택 ─────────────────────────────────┐
│ 👤 퇴사 대상 직원 선택                                 │
│ 직원 * [홍길동 (트레이너)                          ▼] │
│ ┌ 선택 카드 ─────────────────────────────────────┐   │
│ │ 홍길동 [트레이너]                                │   │
│ │ 📅 입사일: 2024-01-15  👥 담당: N명(FC일때)      │   │
│ └──────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
┌─ 퇴사 정보 ───────────────────────────────────────────┐
│ 퇴사 예정일 * [2026-05-01] (min=today)                 │
│ 퇴사 사유      [textarea]                              │
└────────────────────────────────────────────────────────┘
                                              [다음 →]
```

| 변경 요소 | From(01) → To(02) |
|---|---|
| Skeleton | → 실제 Select + 카드 |
| 직원 Select | disabled | 활성 |
| 선택 카드 | — | `selectedStaff` 있을 때 표시 |
| 퇴사일 | — | date input (min=today) |
| 퇴사 사유 | — | textarea (max 500자 권장) |
| 다음 버튼 | disabled | 활성 (검증은 클릭 시) |

## 역할별 차이
- superAdmin/primary: 직원 Select에 **지점 라벨** prefix: "강남점 · 홍길동(트레이너)".
- owner: 자기 지점 직원만 목록.
- 자기 자신은 Select에 노출되지만 선택 시 경고.

## 고유 인터랙션
- 직원 Select 변경: `setSelectedStaffId` → `getStaffById` → `selectedStaff` 업데이트 → 카드 렌더.
- 카드에 "담당 회원 수" 표시(FC일 때만).
- 퇴사일 기본값: 비어 있음. 사용자 직접 입력.
- Enter 키: "다음" 트리거.

## 비즈니스 룰 델타
1. **검증**: `selectedStaffId` 필수 + `resignDate` 필수 + `selectedStaffId !== user.id`.
2. **자기 자신 선택 차단**: 경고 toast + 선택 해제 또는 "다음" disabled.
3. **FC 판정**: `selectedStaff.role === 'FC' || 'fc'` → isFC=true → Step 2 경로.
4. **퇴사일 미래**: 오늘 포함 허용(당일 퇴사 가능). 과거 날짜는 HTML `min`으로 방지 + 추가 검증.
5. **사유 max**: 500자 (DB 컬럼 길이 고려). 기본 설정.
6. **preselectedId 전달**: URL `?staffId=` 값이 있으면 자동 selected.

## 에지 케이스
- 직원 Select에서 staffStatus=RESIGNED는 제외(필터).
- 담당 회원 수 조회 실패: 카드에 "조회 전" 표시, Step 2에서 실제 재조회.
- 날짜 포맷 입력(YYYY-MM-DD 외): HTML date 입력으로 차단.
- 매우 먼 미래 날짜(예: 2099년): 허용하되 "1년 이내 권장" 안내(선택).

## 바이브코딩 프롬프트 (델타)
```
currentStep === 1:
<section aria-labelledby="step1-title" className="rounded-xl ring-1 ring-line bg-white p-6 space-y-6">
  <h2 id="step1-title" className="text-base font-semibold flex items-center gap-1.5">
    <User size={16}/> 퇴사 대상 직원 선택
  </h2>

  <FormField label="직원" htmlFor="staff-select" required error={step1Errors.staff}>
    <Select id="staff-select" value={selectedStaffId ?? ''}
            onChange={(e)=>setSelectedStaffId(Number(e.target.value))}
            aria-required aria-invalid={!!step1Errors.staff}>
      <option value="">선택하세요</option>
      {staffList.filter(s => s.staffStatus !== 'RESIGNED').map(s => (
        <option key={s.id} value={s.id}>
          {canSeeBranch ? `${s.branchName} · ` : ''}{s.name} ({s.role})
        </option>
      ))}
    </Select>
  </FormField>

  {selectedStaff && (
    <div role="status" aria-label="선택된 직원"
         className="bg-primary-light border border-primary/20 rounded-input p-4 space-y-1">
      <p className="font-medium">
        <User size={14} className="inline mr-1"/> {selectedStaff.name}
        <span className="ml-2 text-xs text-content-secondary">[{selectedStaff.role}]</span>
      </p>
      <p className="text-xs text-content-secondary flex gap-4">
        <span><Calendar size={12} className="inline mr-0.5"/> 입사: {selectedStaff.hireDate?.slice(0,10)}</span>
        {isFC && <span><Users size={12} className="inline mr-0.5"/> 담당: 조회 전</span>}
      </p>
    </div>
  )}
</section>

<section aria-labelledby="step1-info" className="rounded-xl ring-1 ring-line bg-white p-6 space-y-4">
  <h2 id="step1-info" className="text-base font-semibold flex items-center gap-1.5">
    <Calendar size={16}/> 퇴사 정보
  </h2>
  <FormField label="퇴사 예정일" htmlFor="resign-date" required error={step1Errors.date}>
    <input id="resign-date" type="date" min={new Date().toISOString().split('T')[0]}
           value={resignDate} onChange={e=>setResignDate(e.target.value)}
           className="rounded-input border border-line h-10 px-3" />
  </FormField>
  <FormField label="퇴사 사유" htmlFor="resign-reason">
    <textarea id="resign-reason" value={resignReason}
              onChange={e=>setResignReason(e.target.value.slice(0,500))}
              maxLength={500} className="rounded-input border border-line min-h-[84px] p-3 w-full"/>
  </FormField>
</section>

<div className="flex justify-end">
  <Button variant="primary" onClick={handleStep1Next}>
    다음 <ArrowRight size={16}/>
  </Button>
</div>
```

## TC 후보
| TC ID | 시나리오 | 기대 |
|---|---|---|
| TC-062-02-001 | 직원 미선택 "다음" | step1Errors.staff 노출 |
| TC-062-02-002 | 퇴사일 미입력 "다음" | step1Errors.date |
| TC-062-02-003 | FC 직원 + 날짜 입력 "다음" | `03-Step2` 이동 |
| TC-062-02-004 | 매니저 직원 + 날짜 "다음" | `04-Step3` 직행 |
| TC-062-02-005 | 자기 자신 선택 | 경고 toast + 다음 차단 |
| TC-062-02-006 | 퇴사일 과거 선택 | HTML min으로 차단 |
| TC-062-02-007 | preselectedId URL | 자동 selected |
| TC-062-02-008 | RESIGNED 직원 목록 | Select에서 제외 |
| TC-062-02-009 | 사유 500자 초과 입력 | 자동 truncate |

## 다이어그램 링크
- F6 STEP1, F2 메인인터랙션
