# SCR-I001 통합출석관리 — 상태: WebSocket 재연결 중

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-I001 |
| 상태 코드 | `ws-reconnecting` |
| 경로 | `/attendance` |
| 역할 | superAdmin, primary, owner, manager, fc, staff |
| 우선순위 | P1 |
| 이전 상태 | `02-정상` (WebSocket 끊김) |
| 다음 상태 | 재연결 성공 → `02-정상` / 3회 실패 → `05-에러` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-I001 통합출석관리 — 상태: WebSocket 재연결 중

파일: src/app/attendance/page.tsx

WebSocket 상태 관리:
type WsStatus = 'connected' | 'reconnecting' | 'failed'
const [wsStatus, setWsStatus] = useState<WsStatus>('connected')
const reconnectCount = useRef(0)

Supabase Realtime 채널 구독:
const channel = supabase
  .channel('attendance-live')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance' }, handleNewAttendance)
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') { setWsStatus('connected'); reconnectCount.current = 0 }
    if (status === 'CLOSED') {
      setWsStatus('reconnecting')
      reconnectCount.current++
      if (reconnectCount.current >= 3) setWsStatus('failed')
    }
  })

[재연결 배너 — wsStatus === 'reconnecting']
<div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 mb-4">
  <svg className="w-4 h-4 text-yellow-500 animate-spin" /> {/* 스피너 */}
  <span className="text-sm text-yellow-700">실시간 연결 끊김 — 재연결 중...</span>
  <span className="ml-auto text-xs text-yellow-500">({reconnectCount.current}/3회 시도)</span>
</div>

[실패 배너 — wsStatus === 'failed']
<div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
  <span className="text-sm font-semibold text-red-700">실시간 연결 실패 — 수동 새로고침이 필요합니다</span>
  <button onClick={() => window.location.reload()} className="ml-auto text-xs text-red-600 underline">
    새로고침
  </button>
</div>

- LIVE 배지: 재연결 중 → 주황색 animate-pulse / 실패 → 회색 "오프라인"
- 기존 로그 테이블: 정상 표시 유지 (실시간만 중단)
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- Supabase Realtime 채널 `CLOSED` 이벤트 수신
- 네트워크 일시 불안정

### 필수 데이터
- wsStatus: 'reconnecting' | 'failed'
- reconnectCount: 재시도 횟수

### 인터랙션 (User Actions)
1. 재연결 중: 수동 액션 없음 (자동 재시도)
2. 3회 실패 후 "새로고침" 버튼 → 페이지 리로드
3. 기존 로그 조회/필터 변경 정상 사용 가능

### 비즈니스 룰
- 재연결 최대 3회 시도 후 failed 상태
- 재연결 성공: LIVE 배지 복구 + toast.success('실시간 연결 복구')
- 재연결 실패 3회: `05-에러` 분기 (선택적)
- 기존 데이터(HTTP fetch)는 영향 없음 — 실시간만 중단

### 에지 케이스
- 재연결 중 신규 출석 발생: WebSocket 수신 불가 → 다음 필터/새로고침 시 반영
- 오프라인 완전 단절: 재연결 실패 즉시 → failed로 전환

### 연결 화면
- 이전: `02-정상`
- 다음: 재연결 성공 → `02-정상` / 3회 실패 → `05-에러` 또는 페이지 리로드
