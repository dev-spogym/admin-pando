# SCR-101 대시보드 통합 — 상태 06: IoT 장애

> 상속: [`00-기본화면.md`](./00-기본화면.md) — 이 문서는 **변경점(델타)**만 기술합니다.

## 메타
| 항목 | 값 |
|------|----|
| 상태 코드 | `dashboard-iot-issue` |
| 상태 ID | STATE_IOT_BADGE |
| 다이어그램 노드 | `F6_상태별.md` → IOT_BADGE |
| 이전 상태 | `02-정상` (IoT/키오스크 장애 감지) |
| 다음 상태 | `02-정상` (장애 해소) / `/settings/iot` (배지 클릭) |

## 상태 진입 조건
- `sysStatus.iotOffline > 0` 또는 `sysStatus.kioskOffline > 0`
- Supabase realtime `iot_devices.status='error'` 이벤트 수신
- `GET /system/status` 응답에 장애 플래그 포함

## 상태 고유 비주얼 델타

```
┌────────────────────────────────────────────┐
│ SystemStatusBar (IoT 장애 배너)             │
│   ⚠ IoT 장치 3개 오프라인, 키오스크 1개 점검│
│   [자세히 보기 → /settings/iot]  [닫기 X]   │
├────────────────────────────────────────────┤
│ 기존 대시보드 콘텐츠 (02-정상 그대로)        │
└────────────────────────────────────────────┘
```

| 요소 | 변경 |
|---|---|
| SystemStatusBar | warn 톤 `bg-amber-50 border-amber-200 text-amber-800` |
| 아이콘 | `AlertTriangle size-5 text-amber-500` |
| 메시지 | "IoT 장치 {N}개 오프라인" + 키오스크 N개 추가 |
| "자세히 보기" | `/settings/iot` 이동 링크 |
| 닫기 X 버튼 | 세션 1회 숨김(sessionStorage `iot-dismissed=true`) |
| aria | `role="alert" aria-live="polite"` (비긴급, 서비스 차단 아님) |

## 상태 고유 인터랙션
1. "자세히 보기" → `/settings/iot` (SCR-083)
2. "닫기" → 배너 숨김, sessionStorage 저장(재진입 시까지)
3. 장애 해소 realtime 이벤트 → 배너 자동 제거
4. 새 장애 발생(해소 후 재발) → 숨김 해제 + 다시 표시

## 역할별 차이
- superAdmin/primary/owner/manager: IoT 배너 + `/settings/iot` 이동 가능
- fc/trainer/staff/front: 읽기만(`aria-disabled`), "자세히 보기" 링크 숨김
- IoT 미사용 지점: `sysStatus.iotDevicesTotal===0` 시 배너 자체 노출 금지

## 상태 고유 비즈니스 룰 델타
- **배너 표시는 대시보드 기능을 차단하지 않음**
- **우선순위**: 오프라인(05) > IoT 장애(06) — 동시 발생 시 오프라인 배너만 표시
- **장애 상세**: 배너 클릭 시 `/settings/iot` 진입 → 장애 장치 리스트 + 재연결 액션
- **Supabase realtime**: `supabase.channel('iot-status').on('postgres_changes', ...)` 구독
- **감사로그**: 장치 상태 변경은 서버에서 자동 기록

## 에지 케이스
- **N이 10을 초과**: "IoT 장치 10+ 개 오프라인" 으로 포맷
- **세션 내 닫기 후 새 장애**: 새 장애 카운트가 증가하면 숨김 해제
- **키오스크만 장애**: "키오스크 N개 점검 필요" 문구
- **offline + IoT 동시**: 오프라인 우선, IoT 배너는 숨김

## 🧩 바이브코딩 프롬프트 (델타)
```
상속: 00-기본화면.md §14 프롬프트 전체 적용
상태: dashboard-iot-issue

Supabase realtime 구독:
useEffect(() => {
  const ch = supabase.channel('iot-status')
    .on('postgres_changes', { event:'*', schema:'public', table:'iot_devices' },
        () => qc.invalidateQueries({queryKey:['system','status']}))
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}, []);

배너 렌더 분기:
const dismissed = typeof window !== 'undefined' && sessionStorage.getItem('iot-dismissed') === 'true';
const show = online && !dismissed && (sys.iotOffline > 0 || sys.kioskOffline > 0);

{show && (
  <div role="alert" aria-live="polite"
       className="flex items-center gap-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
    <AlertTriangle className="size-5 text-amber-500 shrink-0" aria-hidden />
    <div className="flex-1">
      <p className="font-medium">
        IoT 장치 {sys.iotOffline}개 오프라인
        {sys.kioskOffline > 0 && `, 키오스크 ${sys.kioskOffline}개 점검 필요`}
      </p>
    </div>
    {canManageIot(role) && (
      <Link href="/settings/iot" className="text-xs font-medium underline">자세히 보기 →</Link>
    )}
    <button aria-label="배너 닫기"
            onClick={() => { sessionStorage.setItem('iot-dismissed','true'); setDismissed(true); }}
            className="size-6 rounded-md hover:bg-amber-100">
      <X className="size-4 mx-auto" aria-hidden />
    </button>
  </div>
)}

숨김 해제 트리거(새 장애):
useEffect(() => {
  const prev = prevIotCount.current;
  if (sys.iotOffline > prev) sessionStorage.removeItem('iot-dismissed');
  prevIotCount.current = sys.iotOffline;
}, [sys.iotOffline]);
```

## TC 후보
| TC ID | 타입 | Given | When | Then |
|---|---|---|---|---|
| TC-101-06-01 | positive | iotOffline=3 | — | warn 배너 "3개 오프라인" |
| TC-101-06-02 | positive | iotOffline=3 + kiosk=1 | — | "3개 오프라인, 키오스크 1개 점검 필요" |
| TC-101-06-03 | positive | owner | "자세히 보기" 클릭 | `/settings/iot` 이동 |
| TC-101-06-04 | positive | 닫기 클릭 | — | 배너 숨김, sessionStorage |
| TC-101-06-05 | positive | 새 장애 발생 | — | 배너 재노출 |
| TC-101-06-06 | positive | 장애 해소 | — | 배너 자동 제거 |
| TC-101-06-07 | negative | staff | — | "자세히 보기" 숨김 |
| TC-101-06-08 | edge | offline 동시 | — | IoT 배너 숨김, 오프라인 배너 우선 |
| TC-101-06-09 | a11y | SR | — | role="alert" aria-live="polite" 공지 |

## 다이어그램 링크
- F6 상태별: IOT_BADGE
- F2 메인: NAV_IOT → /settings/iot
