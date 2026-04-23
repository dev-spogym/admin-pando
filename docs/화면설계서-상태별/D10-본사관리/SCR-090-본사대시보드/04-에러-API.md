# SCR-090 본사대시보드 — 상태 04: 에러 (API 오류)

> 상속: [`00-기본화면.md`](./00-기본화면.md) — 이 문서는 **변경점(델타)**만 기술합니다.

## 메타
| 항목 | 값 |
|---|---|
| 상태 코드 | `dashboard-error-api` |
| 상태 ID | STATE_ERROR_API |
| 다이어그램 노드 | `F6_상태별.md` → STATE_ERROR, `F8_에러.md` 전체 |
| 이전 상태 | `01-로딩` (모든 쿼리 실패) / `02-정상` (refetch 실패) |
| 다음 상태 | `01-로딩` (재시도) / `02-정상` (복구) / `03-빈상태` |

## 상태 진입 조건
다음 중 하나:
- 모든 핵심 쿼리(stats, gender, age, widgets) 실패 (400/401/403/500/503/`ENETDOWN` 등)
- 특정 쿼리만 실패 → **부분 실패 모드** (위젯 단위 에러 카드, 배너는 없음)
- 권한 오류(403) → 전역 `/forbidden` 이동(이 상태 아님)

### 실패 유형
| 유형 | errorCode | 배너 Tone | 대응 |
|---|---|---|---|
| 서버 오류 | E500001 | error | 재시도 버튼 |
| 서비스 점검 | E503001 | warn | 예상 시간 표시, 자동 폴링 |
| DB 커넥션 | E500002 | error | "데이터베이스 연결 불가" |
| 타임아웃 | E504001 | warn | 재시도 |
| JWT 만료 | E401999 | — | 자동 /login 리다이렉트(전역 처리) |
| 권한 없음 | E403001 | — | /forbidden 리다이렉트 |
| 부분 실패 | mixed | — | 위젯별 에러 카드, 배너 없음 |
| 네트워크 단절 | NETWORK | — | `05-에러-오프라인` 전환 |

## 상태 고유 비주얼 델타

### Case A: 전역 실패 (모든 쿼리 실패)
```
┌───────────────────────────────────────────────────────────────┐
│ PageHeader                                                     │
├───────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ ⚠️ 대시보드 데이터를 불러오지 못했습니다 (E500001)           │ │  ← 상단 에러 배너
│ │     서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.     │ │     role="alert"
│ │                                      [🔄 재시도] [자세히]  │ │     bg-red-50 border-red-200
│ └───────────────────────────────────────────────────────────┘ │
│                                                               │
│ [회색 카드 스켈레톤 + 에러 아이콘이 각 영역에 표시됨]             │
└───────────────────────────────────────────────────────────────┘
```

### Case B: 부분 실패 (위젯별)
```
마스터 레이아웃 유지, 실패한 위젯만 에러 카드로 교체:
┌──────────────────┐
│ ⚠️ 매출 차트      │
│ 데이터 로드 실패  │
│                  │
│  [재시도]        │
└──────────────────┘
```

### 변경 요소
| 요소 | Case A (전역) | Case B (부분) |
|---|---|---|
| 상단 배너 | `<ErrorBanner tone="error" />` | 없음 |
| KPI 카드 | 각각 `<StatCardError onRetry />` | 실패한 것만 |
| 차트 | `<ChartError onRetry />` | 실패한 것만 |
| 리스트 | `<WidgetError onRetry />` | 실패한 것만 |
| 새로고침 버튼 | 활성, 아이콘 `animate-spin` when retrying | 동일 |

## 역할별 에러 처리 차이
| 역할 | 특이사항 |
|---|---|
| super/primary | 에러 상세 (`stack/errorCode/traceId`) 표시 + Sentry 링크 |
| owner | 에러 메시지 + 재시도만 |
| manager/fc | 에러 메시지 + 재시도 |
| trainer/staff/front | 간단 메시지 "일시적인 오류입니다. 다시 시도해주세요." + 재시도 |

## 상태 고유 인터랙션
1. **재시도 버튼**: `qc.invalidateQueries(['dashboard'])` → `01-로딩` 전환
2. **"자세히" 토글**: super/primary만 — errorCode, traceId 등 노출
3. **E503001 자동 폴링**: 30초마다 `GET /health` 체크, 200이면 자동 복구
4. **지점 전환**: 에러 상태에서도 전환 가능 → 새 지점 쿼리 시작
5. **Esc 키**: 배너 닫기(선택, 배너는 닫혀도 카드 에러는 유지)

## 상태 고유 비즈니스 룰 델타
- **Retry 전략**: React Query `retry: 2, retryDelay: exponentialBackoff (1s/4s/9s)`
- **타임아웃**: axios 10s, 503은 Retry-After 헤더 따름
- **감사 로그**: 에러 발생 시 클라이언트에서 `console.error` + Sentry 전송
- **E401 만료**: 전역 인터셉터가 처리 (이 컴포넌트에서는 다루지 않음)
- **부분 실패 규칙**: 핵심 쿼리(stats) 실패 시 → 전역 배너. 위젯 쿼리 실패 시 → 부분 에러
- **E503 점검**: Retry-After 헤더 파싱 → 카운트다운 표시

## 에지 케이스
- **일부 쿼리만 401**: 인터셉터가 전역 처리, 다른 쿼리는 취소
- **재시도 중 또 실패**: 2번째 재시도 후 "지속적 실패 시 관리자에게 문의" 안내
- **네트워크 복구 감지**: `online` 이벤트 → 자동 재시도
- **권한 변경 중**: 사용자 역할이 바뀌어 일부 위젯 권한 없음 → 해당 위젯만 숨김(에러 아님)

## 🧩 바이브코딩 프롬프트 (델타)
```
상속: 00-기본화면.md §13 프롬프트 전체 적용
상태: dashboard-error-api (API 에러)

에러 감지:
const errors = {
  stats: statsQ.error, gender: genderQ.error, age: ageQ.error,
  revenue: revQ.error, weekly: weekQ.error,
  birthdays: birthQ.error, unpaid: unpaidQ.error, holding: holdQ.error, expiring: expQ.error,
  audit: auditQ.error,
};
const isGlobalError = errors.stats && Object.values(errors).filter(Boolean).length >= 3;
const primaryErrorCode = extractErrorCode(errors.stats || Object.values(errors).find(Boolean));

상단 배너 (Case A):
{isGlobalError && (
  <div role="alert" aria-live="assertive"
       className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
    <AlertCircle className="size-5 shrink-0 text-red-600 mt-0.5" />
    <div className="flex-1">
      <p className="font-medium text-red-900">
        대시보드 데이터를 불러오지 못했습니다 ({primaryErrorCode})
      </p>
      <p className="text-sm text-red-700 mt-1">
        {ERROR_MESSAGES[primaryErrorCode] || '일시적인 오류입니다. 잠시 후 다시 시도해주세요.'}
      </p>
      {primaryErrorCode === 'E503001' && retryAfter && (
        <p className="text-xs text-red-600 mt-1">
          예상 복구: {formatKST(new Date(Date.now()+retryAfter*1000),'HH:mm')}
        </p>
      )}
    </div>
    <div className="flex gap-2">
      <button onClick={refetchAll}
        className="h-8 px-3 rounded-md bg-red-600 text-white text-sm hover:bg-red-700">
        <RefreshCw className={cn('size-3.5 inline mr-1', isRefetching && 'animate-spin')} />
        재시도
      </button>
      {(role==='superAdmin'||role==='primary') && (
        <button onClick={() => setShowDetails(v=>!v)}
          className="h-8 px-3 rounded-md border border-red-300 bg-white text-sm text-red-700 hover:bg-red-50">
          {showDetails ? '숨기기' : '자세히'}
        </button>
      )}
    </div>
  </div>
)}
{showDetails && (role==='superAdmin'||role==='primary') && (
  <pre className="rounded-lg bg-gray-900 text-gray-100 text-xs p-3 mb-6 overflow-auto max-h-40">
    {JSON.stringify({ errors, traceId, role, branchId }, null, 2)}
  </pre>
)}

에러 메시지 맵:
const ERROR_MESSAGES = {
  E500001: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  E500002: '데이터베이스 연결 오류입니다. 잠시 후 다시 시도해주세요.',
  E503001: '서비스 점검 중입니다.',
  E504001: '요청 시간이 초과되었습니다. 네트워크를 확인해주세요.',
  E403001: '이 데이터에 대한 접근 권한이 없습니다.',
};

위젯별 에러 (Case B):
<ErrorBoundary fallback={<WidgetError onRetry={() => q.refetch()} />}>
  {q.isError ? <WidgetError title={widgetTitle} code={extractErrorCode(q.error)} onRetry={q.refetch} />
             : <ActualWidget data={q.data} />}
</ErrorBoundary>

const WidgetError = ({title, code, onRetry}: any) => (
  <div className="bg-white rounded-xl shadow-sm ring-1 ring-rose-200 p-5
                  flex flex-col items-center justify-center text-center gap-2 h-full">
    <AlertCircle className="size-6 text-rose-500" aria-hidden="true" />
    <p className="text-sm font-medium text-gray-900">{title} 로드 실패</p>
    <p className="text-xs text-gray-500">{code}</p>
    <button onClick={onRetry} className="text-xs text-blue-600 hover:underline mt-1">
      다시 시도
    </button>
  </div>
);

자동 폴링 (E503001):
useEffect(() => {
  if (primaryErrorCode !== 'E503001') return;
  const id = setInterval(async () => {
    const res = await fetch('/api/health');
    if (res.ok) refetchAll();
  }, 30_000);
  return () => clearInterval(id);
}, [primaryErrorCode]);

네트워크 복구:
useEffect(() => {
  const onOnline = () => refetchAll();
  window.addEventListener('online', onOnline);
  return () => window.removeEventListener('online', onOnline);
}, []);

접근성:
- 배너 role="alert" aria-live="assertive"
- 재시도 버튼 aria-busy={isRefetching}
- 위젯 에러 role="alert"
- reduced-motion: 아이콘 spin 비활성
```

## TC 후보
| TC ID | 타입 | Given | When | Then |
|---|---|---|---|---|
| TC-090-04-01 | negative | 500 응답 | 진입 | 전역 에러 배너 + 재시도 버튼 |
| TC-090-04-02 | positive | 재시도 클릭 | — | 01-로딩 전환 |
| TC-090-04-03 | negative | 503 응답 | — | warn 배너 + 예상 복구 시간 |
| TC-090-04-04 | positive | 503 복구(200) | 30초 후 폴링 | 자동 02-정상 전환 |
| TC-090-04-05 | negative | 매출 API만 500 | — | 매출 위젯만 에러, 나머지 정상 |
| TC-090-04-06 | positive | super 로그인 | "자세히" 클릭 | traceId/errorCode JSON 노출 |
| TC-090-04-07 | negative | staff 로그인 + 에러 | — | 상세 버튼 미노출, 간단 안내만 |
| TC-090-04-08 | positive | 네트워크 복구 | online 이벤트 | 자동 재시도 |
| TC-090-04-09 | a11y | 스크린리더 | — | "데이터 불러오지 못했습니다" 즉시 공지 |

## 다이어그램 링크
- F6 상태별: STATE_ERROR
- F8 에러: E500001/E503001/E504001 분기
- 에러코드정의서: §공통, §매출, §회원
