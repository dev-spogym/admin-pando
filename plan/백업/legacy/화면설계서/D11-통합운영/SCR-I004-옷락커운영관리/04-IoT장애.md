# SCR-I004 옷락커운영관리 — 상태: IoT 락커 컨트롤러 장애

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-I004 |
| 상태 코드 | `iot-error` |
| 경로 | `/(facilities)/locker` |
| 역할 | superAdmin, primary, owner, manager, staff |
| 우선순위 | P1 |
| 이전 상태 | `02-정상` (IoT 컨트롤러 오프라인 감지) |
| 다음 상태 | 복구 → `02-정상` / SCR-I003으로 이동 |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-I004 옷락커운영관리 — 상태: IoT 락커 컨트롤러 장애

파일: src/app/(facilities)/locker/page.tsx

조건: iotController.status === 'offline' || iotController.status === 'error'
(iot_devices WHERE type = 'locker_controller' AND branch_id = ?)

[IoT 장애 배너 — 상단]
<div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-0.5 flex-shrink-0" />
  <div className="flex-1">
    <p className="text-sm font-semibold text-amber-700">락커 컨트롤러 오프라인</p>
    <p className="text-xs text-amber-600 mt-0.5">
      자동 락커 잠금/해제가 불가합니다. 수동 배정은 가능하나 물리적 열쇠를 이용하세요.
    </p>
  </div>
  <button
    onClick={() => moveToPage('/settings/iot')}
    className="text-xs text-amber-600 underline hover:text-amber-800 whitespace-nowrap"
  >
    IoT 관리 →
  </button>
</div>

[락커 그리드 — 정상 표시]
- 그리드 정상 렌더 (배정 현황 확인 가능)
- 빈 락커 셀: "자동 잠금 불가" 툴팁 추가
  <div title="IoT 장애로 자동 잠금이 불가합니다. 수동 열쇠를 사용하세요.">...</div>
- 배정 가능: IoT 없이 DB 배정만 처리 (locker:write 권한 있으면 허용)

[안내 모달 — 배정 클릭 시]
"현재 락커 컨트롤러가 오프라인입니다.
자동 잠금 처리 없이 배정만 등록됩니다.
실제 잠금은 물리적 열쇠를 사용해 주세요.
계속 진행하시겠습니까?"
→ 확인: DLG-I002 열기 / 취소: 닫기

IoT 상태 30초 폴링 유지
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- `iot_devices.status IN ('offline', 'error')` WHERE `type='locker_controller'`
- 30초 폴링에서 감지

### 필수 데이터
- iot_devices: type='locker_controller', status
- 락커 그리드 데이터 (정상 유지)

### 인터랙션 (User Actions)
1. "IoT 관리 →" → SCR-I003
2. 빈 락커 클릭 → 안내 모달 → 확인 시 DLG-I002
3. 복구 자동 감지 → 배너 제거 + toast.success

### 비즈니스 룰
- IoT 장애 시에도 DB 배정 가능 (물리 열쇠 병행 안내)
- 자동 잠금 해제 불가 명시
- 장애 이력 `iot_events` 테이블 기록 (향후)

### 연결 화면
- 이전: `02-정상`
- 다음: SCR-I003 / DLG-I002 / 복구 후 `02-정상`
