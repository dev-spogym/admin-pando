# SCR-M002 회원 등록 — 상태: Step 2 (new-step2)

> 🧭 **델타**. 공통 스펙은 [`00-기본화면.md`](./00-기본화면.md) 참조.

## 메타

| 항목 | 값 |
|------|----|
| 상태 코드 | `new-step2` |
| 다이어그램 | `STATE_STEP2` @ `F6_상태별.md` |
| 이전 | `02-입력중` (Step 1 [다음] 통과) |
| 다음 | `02-입력중` ([이전]) / `07-저장중` ([저장]) / `03-유효성에러` |

## 진입 조건
- Step 1 필수 필드 검증 통과 (`trigger(['name','gender','phone','memberType','birthDate','height'])` true)
- `phoneChecked === true` (등록 모드 필수)
- `setStep('step2')` + `window.scrollTo(0, 0)`

## 비주얼 델타
| 요소 | 변경 |
|---|---|
| StepIndicator | `[✓ ① 필수 정보]` 완료 체크 + `[② 추가 정보]` 활성 |
| Step 1 섹션 | **숨김** (또는 접힌 요약 카드로 표시 🆕) |
| Step 2 섹션 | 노출: 추가 연락 정보, 기타 설정 |
| 하단 액션 | `[← 이전]` + `[저장]` (primary) |
| [저장] disabled 조건 | `isSubmitting` OR Step 2 검증 실패 |
| 진입 시 애니메이션 | `translate-x-2 opacity-0 → 0 1` 200ms |

### Step 1 요약 카드 (🆕 권장)
```
┌─ Step 1 요약 (접힌 뷰) ──────────────────────── [편집 ✎]
│ 홍길동 (남) · 010-1234-5678 · 일반 · 생년월일 1990-01-15
└─────────────────────────────────────────────
```

## 인터랙션
| 액션 | 동작 |
|---|---|
| [← 이전] | `setStep('step1')` + scroll top. Step 1 값 유지 |
| [저장] | `handleSubmit(onSave)` |
| 이메일 onBlur | 형식 검증 |
| 주소 [주소 검색] 클릭 | DLG-M027 오픈 |
| 주소 직접 입력 | onBlur 5자 검증 |
| 메모 입력 | 500자 카운터 표시, 초과 시 빨강 + 에러 |
| 광고성 체크박스 | toggle |
| Ctrl/Cmd+S | 저장 (🆕) |

## 룰 델타
1. Step 1 값은 **절대 초기화되지 않음** — [이전] 재진입 시 모두 유지.
2. Step 2 필드 모두 선택 — 비워도 저장 가능 (서버 nullable).
3. 주소는 Step 1 검증에 포함되지 않음 — Step 2에서만 선택 검증.
4. 이메일: 빈값 허용. 입력된 경우만 `z.string().email()` 검증.
5. 메모 500자 카운터: 450자 도달 시 카운터 색 `text-amber-600`, 500자 도달 시 `text-red-600`.
6. Step 2 진입 시 첫 필드(닉네임)에 autoFocus.
7. 분석 이벤트 `member_new_step2_enter` 기록.

## 에지
- Step 1 필드를 Step 2에서 수정할 수 없음 — [이전] 버튼으로만 이동.
- 주소 검색 후 수기 수정 → 길이 검증 재실행.
- 메모 초과 500자 상태로 저장 시 에러 → 포커스 이동.
- 이메일 입력 후 [이전] → Step 1 → [다음] 재이동 시 이메일 값 유지.
- Ctrl/Cmd+S → preventDefault + `handleSubmit` 호출.

## 🧩 바이브코딩 (델타)
```
const [step, setStep] = useState<'step1'|'step2'>('step1');

async function handleNext() {
  const ok = await trigger(['name','gender','phone','memberType','birthDate','height']);
  if (!ok) return;
  if (!phoneChecked) return toast.error('전화번호 중복확인이 필요합니다.');
  setStep('step2');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => document.getElementById('nickname')?.focus(), 220);
}

function handlePrev() {
  setStep('step1');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

<StepIndicator current={step} steps={[
  { key:'step1', label:'필수 정보', done: step==='step2' },
  { key:'step2', label:'추가 정보' }
]} />

{step === 'step2' && (
  <motion.section initial={{ x: 8, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}>
    <Step1Summary values={watch()} onEdit={handlePrev} />  {/* 🆕 */}
    <FormSection title="추가 연락 정보">...</FormSection>
    <FormSection title="기타 설정">
      <Checkbox {...register('marketingConsent')} label="광고성 정보 수신 동의" />
      <FormField label="메모" error={errors.notes?.message}>
        <Textarea id="notes" {...register('notes')} maxLength={500} rows={5} />
        <CharCounter current={watch('notes')?.length ?? 0} max={500} />
      </FormField>
    </FormSection>
  </motion.section>
)}

<BottomActionBar>
  {step === 'step2' && <>
    <Button variant="secondary" icon={<ArrowLeft/>} onClick={handlePrev}>이전</Button>
    <Button variant="primary" type="submit" loading={isSubmitting} disabled={isSubmitting}>저장</Button>
  </>}
</BottomActionBar>

// Ctrl/Cmd+S
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && step === 'step2') {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [step]);
```

## TC 후보
| TC ID | 내용 |
|---|---|
| TC-M002-06-01 | Step 1 통과 + phoneChecked → Step 2 진입 |
| TC-M002-06-02 | Step 1 미통과 → Step 2 차단 |
| TC-M002-06-03 | phoneChecked 없이 [다음] → toast.error |
| TC-M002-06-04 | Step 2 진입 시 scroll top + nickname autoFocus |
| TC-M002-06-05 | [이전] → Step 1, 값 유지 |
| TC-M002-06-06 | 메모 501자 입력 시 에러 + 카운터 빨강 |
| TC-M002-06-07 | 이메일 빈값 → 저장 허용 |
| TC-M002-06-08 | 이메일 "abc" → 검증 실패 |
| TC-M002-06-09 | Ctrl/Cmd+S → 저장 실행 |
| TC-M002-06-10 | 주소 검색 모달 [DLG-M027] 정상 동작 |

## 다이어그램
- `STATE_STEP2` @ `F6_상태별.md`
- `E_STEP1_TO_STEP2`, `E_STEP2_TO_STEP1`
