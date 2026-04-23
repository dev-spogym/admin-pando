# SCR-I001 통합출석관리 — 상태: IoT 장애 배지

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-I001 |
| 상태 코드 | `iot-error-badge` |
| 경로 | `/attendance` |
| 역할 | superAdmin, primary, owner, manager, fc, staff |
| 우선순위 | P1 |
| 이전 상태 | `02-정상` (IoT 장비 오류 감지) |
| 다음 상태 | 배지 클릭 → SCR-I003 / 장애 해소 → `02-정상` |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-I001 통합출석관리 — 상태: IoT 장애 배지 오버레이

파일: src/app/attendance/page.tsx (조건부 배지 렌더링)

조건: iotDevices.some(d => d.status === 'error' || d.status === 'offline')

[IoT 장애 배지 — PageHeader 우측 또는 상단 배너]
<div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4">
  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
  <span className="text-sm font-medium text-amber-700">
    IoT 입장 장비 오류 감지 — 자동 출석이 일부 중단될 수 있습니다
  </span>
  <button
    onClick={() => moveToPage('/settings/iot')}
    className="ml-auto text-xs text-amber-600 underline hover:text-amber-800"
  >
    장비 관리 →
  </button>
</div>

- 정상 출석 로그 테이블은 그대로 유지 표시
- KPI 카드: 정상 표시 (단, 얼굴인식 카드에 ⚠️ 아이콘 추가)
- LIVE 배지는 유지 (WebSocket 정상인 경우)

폴링: useEffect에서 iot_devices 상태 30초마다 재조회
장애 해소 감지 시: 배너 자동 제거 + toast.success('IoT 장비가 복구되었습니다')

데이터:
SELECT * FROM iot_devices WHERE branch_id=? AND type='entrance' AND status IN ('error','offline')
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- `iot_devices.status IN ('error', 'offline')` 감지
- WebSocket으로 IoT 상태 변경 이벤트 수신
- 30초 폴링 결과 장애 감지

### 필수 데이터
| 블록 | 테이블 | 조건 |
|------|--------|------|
| IoT 상태 | `iot_devices` | `branch_id=?`, `type='entrance'`, status 확인 |

### 인터랙션 (User Actions)
1. "장비 관리 →" 링크 → SCR-I003 (`/settings/iot`)
2. 나머지 기능 정상 사용 가능 (수동 등록 가능)
3. 배너 닫기 X 버튼 (세션 중 숨김, 새로고침 시 재표시)

### 비즈니스 룰
- IoT 장애 시에도 수동 출석 등록(DLG-I001) 가능
- 앱QR/키오스크 출석은 영향 없음 (서버 처리)
- 얼굴인식만 영향: 해당 KPI 카드 ⚠️ 마커 표시
- 장애 30분 이상 지속 시 manager 이상 역할에 알림 (별도 알림 시스템)

### 에지 케이스
- 모든 IoT 장비 오프라인 → 배너 텍스트 "전체 IoT 장비 오프라인" 강조
- IoT 장애 + WebSocket 끊김 동시 → 두 배너 모두 표시

### 연결 화면
- 이전: `02-정상`
- 다음: SCR-I003 (`/settings/iot`) / 장애 해소 후 `02-정상`
