# SCR-083 IoT출입관리 — 상태: IoT 연결 끊김

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-083 |
| 상태 코드 | `iot-disconnected` |
| 경로 | `/settings/iot` |
| 역할 | primary, owner |
| 우선순위 | P1 |
| 이전 상태 | `02-정상-장비온라인` |
| 다음 상태 | `02-정상-장비온라인` (복구) |

## 🧩 바이브코딩 프롬프트

```
Next.js 15 App Router + TypeScript + Tailwind v4 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-083 IoT출입관리 — 상태: D11 IoT 연결 끊김 (설정만 저장 가능)

파일: src/app/settings/iot/page.tsx

IoT 연결 끊김 배너 (E_F6_083_09):
<div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg mb-6">
  <WifiOff className="w-5 h-5 text-red-500 shrink-0" />
  <div>
    <p className="text-sm font-medium text-red-800">D11 IoT 시스템 연결이 끊겼습니다</p>
    <p className="text-xs text-red-600 mt-0.5">설정 저장은 가능하지만 실시간 제어 및 모니터링이 비활성화됩니다.</p>
  </div>
</div>

연결 끊김 시 UI 변화:
- 장비 카드 전체: opacity-50, 원격 열기 disabled
- 출입 이력: 실시간 업데이트 중단 (마지막 수신 시각 표시)
  <p className="text-xs text-gray-400">마지막 업데이트: {lastUpdateTime}</p>
- 환경 센서 데이터: "--" 표시 (수신 불가)

설정 저장은 정상 작동:
- PATCH /iot_devices/:id (설정 값만)
- 실시간 제어 API만 비활성화
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- D11 IoT 시스템과 WebSocket 연결 끊김
- 이벤트: `E_F6_083_09`

### UI 변화
| 요소 | 연결 끊김 표현 |
|------|-------------|
| 배너 | red-50 bg, WifiOff 아이콘 |
| 장비 카드 | opacity-50 |
| 원격 열기 버튼 | disabled 전체 |
| 이력 업데이트 | 중단, 마지막 시각 표시 |
| 센서 데이터 | "--" |

### 비즈니스 룰
- 설정 저장(PATCH)은 가능 (로컬 설정)
- 실시간 제어, 출입 감지 불가
- 연결 복구 시 자동 재연결 (WebSocket reconnect)

### 연결 화면
- 복구: `02-정상-장비온라인`
