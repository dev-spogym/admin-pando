# SCR-089 데이터백업복원 — 상태: 자동 백업 OFF 경고

## 메타

| 항목 | 값 |
|------|----|
| 화면 ID | SCR-089 |
| 상태 코드 | `auto-off-warn` |
| 경로 | `/settings/backup` |
| 역할 | primary, owner |
| 우선순위 | P1 |
| 이전 상태 | `03-이력있음` |
| 다음 상태 | `03-이력있음` (자동 백업 활성화 후) |

## 🧩 바이브코딩 프롬프트

```
화면: SCR-089 데이터백업복원 — 상태: 자동 백업 비활성 경고 배너 (E_F6_089_09)

자동 백업 카드 (settings.auto_backup_enabled=false):
<div className="p-5 rounded-xl border-2 border-amber-200 bg-amber-50/30">
  <div className="flex items-center justify-between">
    <div>
      <div className="flex items-center gap-2">
        <p className="font-semibold text-gray-900">자동 백업</p>
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">비활성</span>
      </div>
      <p className="text-sm text-amber-700 mt-1 flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5" />
        자동 백업이 꺼져 있습니다. 데이터 손실 위험이 있습니다.
      </p>
    </div>
    <Button size="sm" onClick={openBackupSettings} className="bg-amber-500 hover:bg-amber-600 text-white">
      지금 활성화
    </Button>
  </div>
</div>
```

## 📝 디스크립션

### 사용 시점 (Trigger)
- backup_settings.auto_backup_enabled = false
- 이벤트: `E_F6_089_09`

### UI 변화
| 요소 | 표현 |
|------|------|
| 자동 백업 카드 | border-2 border-amber-200 bg-amber-50/30 |
| 배지 | "비활성" amber |
| 경고 문구 | AlertTriangle + 데이터 손실 위험 |
| CTA | "지금 활성화" amber 버튼 |

### 비즈니스 룰
- 자동 백업 OFF → 카드 테두리 amber 강조
- "지금 활성화" → DLG-089-002 (자동 백업 ON 상태로 열기)

### 연결 화면
- 설정 변경: DLG-089-002
