# SCR-I006 체성분통합관리 — 상태: InBody 연동 오류 배지

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-I006 |
| 상태 코드 | `inbody-error-badge` |
| 경로 | `/body-composition` |
| 역할 | superAdmin, primary, owner, manager, fc |
| 우선순위 | P1 |
| 이전 상태 | `02-정상` (InBody 연동 오류 감지) |
| 다음 상태 | 복구 → `02-정상` / SCR-I003으로 이동 |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-I006 체성분통합관리 — 상태: InBody 연동 오류

파일: src/app/body-composition/page.tsx

조건: inbodyDevice.status === 'error' || inbodyDevice.status === 'offline'
      (SELECT FROM iot_devices WHERE type='inbody' AND branch_id=?)

[InBody 오류 배지 — PageHeader 아래]
<div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
  <div className="flex-1">
    <p className="text-sm font-semibold text-amber-700">InBody 연동 오류</p>
    <p className="text-xs text-amber-600 mt-0.5">
      InBody 장비 연결이 끊겼습니다. 자동 측정 데이터 수신이 중단되었습니다.
      수기 등록은 정상 이용 가능합니다.
    </p>
  </div>
  <button
    onClick={() => moveToPage('/settings/iot')}
    className="text-xs text-amber-600 underline whitespace-nowrap"
  >
    IoT 관리 →
  </button>
</div>

- 측정 결과 테이블: 정상 표시 (기존 데이터 조회 가능)
- "수기 등록" 버튼: 정상 (DLG-I003 사용 가능)
- "파일 업로드" 버튼: 정상 (수동 파일 파싱 가능)
- InBody 자동 수신 중단 안내만 표시

InBody 상태 30초 폴링:
useEffect(() => {
  const interval = setInterval(fetchInBodyStatus, 30_000)
  return () => clearInterval(interval)
}, [])

복구 시: toast.success('InBody 연결 복구') + 배너 제거
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- `iot_devices.status IN ('error', 'offline')` WHERE `type='inbody'`
- 30초 폴링에서 감지

### 필수 데이터
- inbodyDevice: `iot_devices` WHERE `type='inbody'`, `branch_id=?`
- 오류 코드/메시지

### 인터랙션 (User Actions)
1. "IoT 관리 →" → SCR-I003
2. 수기 등록 DLG-I003 정상 사용
3. 파일 업로드 정상 사용
4. 복구 자동 감지 → 배너 제거

### 비즈니스 룰
- InBody 오류 시에도 수기 입력/파일 업로드 정상
- InBody 자동 수신만 중단 (기존 데이터 영향 없음)
- SCR-I001에서도 동일 장비 상태 공유 (같은 `iot_devices` 테이블)

### 에지 케이스
- InBody 없는 지점: 오류 배지 미표시 (device 레코드 없음)
- InBody + 락커 컨트롤러 동시 오류: 각 화면에서 독립적 배지 표시

### 연결 화면
- 이전: `02-정상`
- 다음: SCR-I003 / 복구 후 `02-정상`
