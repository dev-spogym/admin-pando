# SCR-101 대시보드 통합 — 상태: IoT 장애 감지

## 메타
| 항목 | 값 |
|------|----|
| 화면 ID | SCR-101 |
| 상태 코드 | `dashboard-iot-error` |
| 경로 | `/` |
| 역할 | superAdmin / primary / owner / manager / fc / staff |
| 우선순위 | P1 |
| 다이어그램 | `docs/다이어그램/D01_공통/SCR-101_대시보드_통합/F6_상태별.md` |
| 이전 상태 | `02-정상` (IoT 장애 감지) |
| 다음 상태 | `02-정상` (장애 해소) / SCR-I003 (배지 클릭) |

## 🧩 바이브코딩 프롬프트
```
Next.js 15 App Router + TypeScript + Tailwind + Supabase 기반 'use client' 컴포넌트를 작성하라.
화면: SCR-101 대시보드 통합 — 상태: IoT 장애 배지

파일: src/app/(dashboard)/page.tsx (isIotError 분기, 02-정상과 동일 레이아웃)

레이아웃:
- AppLayout (사이드바 + 헤더)
- 02-정상 레이아웃과 동일
- 추가: IoT 장애 배너 (StatCardGrid 상단)

컴포넌트 구조:
1. IoTAlertBanner:
   - bg-orange-50 border border-orange-200 rounded-lg p-3
   - AlertTriangle 아이콘 (text-orange-500) + "IoT 장치 연결 장애가 감지되었습니다."
   - "자세히 보기" 링크 → moveToPage('/iot') (SCR-I003)
   - 닫기 버튼 (X) → 배너 숨김 (세션 중 1회)
2. 나머지 대시보드 콘텐츠 정상 표시 (02-정상과 동일)

데이터:
- isIotError: boolean
- iotErrorCount?: number (장애 장치 수)
- Supabase realtime subscription: iot_devices 테이블 status 변경 구독

인터랙션:
- "자세히 보기" → moveToPage('/iot')
- 닫기 버튼 → 배너 숨김 (sessionStorage에 dismissed 저장)
- IoT 장애 해소 → 배너 자동 사라짐 (realtime)

사용 유틸:
- useAuthStore, supabase, moveToPage, lucide-react (AlertTriangle, X)
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- IoT 장치 상태 모니터링에서 장애 감지
- Supabase realtime `iot_devices.status = 'error'` 이벤트 수신
- 대시보드 로드 시 기존 IoT 장애 존재

### 필수 데이터
| 항목 | 출처 | 비고 |
|------|------|------|
| isIotError | iot_devices 쿼리 | status='error' 존재 여부 |
| iotErrorCount | iot_devices COUNT | 장애 장치 수 |

### 인터랙션 (User Actions)
1. "자세히 보기" → SCR-I003 IoT 관리 화면
2. 배너 닫기(X) → 세션 동안 배너 숨김 (장애 유지 중이어도)
3. 나머지 대시보드 기능 정상 사용 가능

### 비즈니스 룰
- IoT 장애는 대시보드 사용을 차단하지 않음 (배너만 표시)
- 장애 해소 시 배너 자동 제거 (realtime)
- 닫은 후 새 장애 발생 → 새 배너 표시

### 에지 케이스
- 복수 장치 장애 → "N개 장치 장애" 문구
- IoT 기능 미사용 지점 → isIotError 항상 false (배너 미표시)

### 접근성 (A11y)
- 배너 `role="alert"` `aria-live="polite"` (assertive 아님, 비긴급)
- 닫기 버튼 `aria-label="IoT 장애 알림 닫기"`

### 연결 화면
- IoT 관리: SCR-I003
- 장애 해소 후: `02-정상`

### 다이어그램 참조
- F6: `docs/다이어그램/D01_공통/SCR-101_대시보드_통합/F6_상태별.md` → IOT_BADGE 노드
- F2: `docs/다이어그램/D01_공통/SCR-101_대시보드_통합/F2_메인.md` → NAV_IOT 노드
