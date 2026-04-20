# 데이터 흐름 다이어그램 (Data Flow)

> **목적**: 주요 10개 엔티티의 폼→API→DB→캐시→UI 데이터 파이프라인과 ER 관계를 시각화
> **타입**: erDiagram + flowchart
> **기준 계획서**: `../../다이어그램_작성계획.md` 섹션 3.9

---

## 📋 파일 인덱스

| ID | 파일 | 엔티티 | 타입 |
|----|------|--------|:----:|
| DF01 | 60-01_회원_데이터흐름.md | Member + MembershipCard + Body | erDiagram + flowchart |
| DF02 | 60-02_결제_데이터흐름.md | Payment + Sale + Refund | erDiagram + flowchart |
| DF03 | 60-03_이용권_데이터흐름.md | Membership + Product | erDiagram + flowchart |
| DF04 | 60-04_수업_데이터흐름.md | Lesson + Reservation + Schedule | erDiagram + flowchart |
| DF05 | 60-05_직원_데이터흐름.md | Employee + Attendance + Payroll | erDiagram + flowchart |
| DF06 | 60-06_리드_데이터흐름.md | Lead + Consultation | erDiagram + flowchart |
| DF07 | 60-07_쿠폰마일리지_데이터흐름.md | Coupon + Mileage | erDiagram + flowchart |
| DF08 | 60-08_시설_데이터흐름.md | Locker + Facility | erDiagram + flowchart |
| DF09 | 60-09_IoT_데이터흐름.md | IoTDevice + AttendanceLog + BodyComposition | erDiagram + flowchart |
| DF10 | 60-10_감사로그_데이터흐름.md | AuditLog + Notification | erDiagram + flowchart |

---

## 🎨 공통 스타일

```
classDef form        fill:#E3F2FD,stroke:#1976D2
classDef api         fill:#EDE7F6,stroke:#5E35B2
classDef db          fill:#E8F5E9,stroke:#2E7D32
classDef cache       fill:#FFF8E1,stroke:#F9A825
classDef ui          fill:#E0F7FA,stroke:#00838F
classDef external    fill:#ECEFF1,stroke:#455A64,stroke-dasharray:3 3
```

## 📐 표준 구조

각 데이터흐름 MD 파일은:
1. YAML 메타 헤더
2. ## 1. 엔티티 개요
3. ## 2. ER 다이어그램 (erDiagram)
4. ## 3. 쓰기 경로 (폼→API→DB→이벤트→캐시무효화)
5. ## 4. 읽기 경로 (UI→캐시→API→DB→응답)
6. ## 5. 주요 필드 정의
7. ## 6. 인덱스/제약조건
8. ## 7. TC 후보 (데이터 무결성 검증)
