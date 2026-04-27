-- ================================================================
-- FitGenie CRM 데모 시드 데이터 v2 (실제 컬럼명 기준)
-- ================================================================

-- 1. 상품 그룹
INSERT INTO product_groups (name, "sortOrder", "isActive", "branchId", "createdAt", "updatedAt")
VALUES
  ('PT 패키지',        1, true, 1, NOW(), NOW()),
  ('이용권 패키지',    2, true, 1, NOW(), NOW()),
  ('GX 패키지',        3, true, 1, NOW(), NOW()),
  ('바디프로필 패키지',4, true, 1, NOW(), NOW()),
  ('기타',             5, true, 1, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 2. 할인 정책
INSERT INTO discount_policies (name, type, value, "minPeriod", "maxDiscount", "isActive", "branchId", "createdAt", "updatedAt")
VALUES
  ('신규 가입 10% 할인',  'RATE',  10, 1, 50000,  true,  1, NOW(), NOW()),
  ('재등록 5만원 할인',   'FIXED', 50000, 3, 50000, true, 1, NOW(), NOW()),
  ('가족 회원 15% 할인',  'RATE',  15, 1, 80000,  true,  1, NOW(), NOW()),
  ('여름 특가 20% 할인',  'RATE',  20, 3, 100000, false, 1, NOW(), NOW()),
  ('직원 가족 30% 할인',  'RATE',  30, 1, 150000, true,  1, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 3. 운동 프로그램
INSERT INTO exercise_programs (name, description, category, difficulty, exercises, "isActive", "branchId", "createdAt", "updatedAt")
VALUES
  ('기초 체력 향상',   '초보자를 위한 8주 기초 체력 강화', '근력',   'BEGINNER',     '[]'::jsonb, true, 1, NOW(), NOW()),
  ('다이어트 집중',    '체지방 감소 유산소+근력 복합 12주', '유산소',  'INTERMEDIATE', '[]'::jsonb, true, 1, NOW(), NOW()),
  ('근육량 증가',      '벌크업 고강도 웨이트 16주',         '근력',   'ADVANCED',     '[]'::jsonb, true, 1, NOW(), NOW()),
  ('바디프로필 준비',  '촬영 12주 전 특화 프로그램',        '복합',   'ADVANCED',     '[]'::jsonb, true, 1, NOW(), NOW()),
  ('필라테스 기초',    '재활 및 코어 강화 입문',            'GX',     'BEGINNER',     '[]'::jsonb, true, 1, NOW(), NOW()),
  ('기능성 트레이닝',  '일상 동작 개선 기능성 운동',        '복합',   'INTERMEDIATE', '[]'::jsonb, true, 1, NOW(), NOW()),
  ('시니어 건강',      '50대 이상 안전한 건강 관리',        '유산소',  'BEGINNER',     '[]'::jsonb, true, 2, NOW(), NOW()),
  ('청소년 체력',      '10~20대 체력 향상 특화',            '복합',   'BEGINNER',     '[]'::jsonb, true, 2, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 4. 수업 템플릿
INSERT INTO class_templates (name, type, "defaultCapacity", "defaultDuration", description, color, "isActive", "branchId", "createdAt", "updatedAt")
VALUES
  ('PT 1:1 기본',      'PT',      1,  60, '1:1 퍼스널 트레이닝 기본 세션',     '#EF4444', true, 1, NOW(), NOW()),
  ('PT 1:1 고급',      'PT',      1,  90, '고강도 1:1 퍼스널 트레이닝',         '#DC2626', true, 1, NOW(), NOW()),
  ('필라테스 그룹반',  'GX',      10, 50, '그룹 필라테스 기초/중급반',          '#8B5CF6', true, 1, NOW(), NOW()),
  ('요가 기초반',      'GX',      15, 60, '하타 요가 기초 클래스',              '#10B981', true, 1, NOW(), NOW()),
  ('스피닝',           'GX',      20, 45, '실내 사이클 유산소 운동',            '#F59E0B', true, 1, NOW(), NOW()),
  ('줌바 댄스',        'GX',      20, 50, '라틴 리듬 댄스 유산소 운동',         '#EC4899', true, 1, NOW(), NOW()),
  ('크로스핏',         'SPECIAL', 12, 60, '고강도 인터벌 트레이닝',             '#6366F1', true, 2, NOW(), NOW()),
  ('골프 레슨',        'SPECIAL', 4,  60, '실내 골프 기초 레슨',               '#84CC16', true, 3, NOW(), NOW()),
  ('GX 바디펌프',      'GX',      20, 60, '바벨을 이용한 전신 근력 운동',       '#3B82F6', true, 1, NOW(), NOW()),
  ('수영 강습',        'SPECIAL', 8,  45, '레인별 수영 강습 (초/중/고급)',      '#06B6D4', true, 2, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 5. 회원 목표 (goalWeight, goalPbf만 있음)
INSERT INTO member_goals ("memberId", "goalWeight", "goalPbf", "createdAt", "updatedAt")
VALUES
  (1,  77.0, 18.0, NOW(), NOW()),
  (2,  90.0, 12.0, NOW(), NOW()),
  (3,  72.0, 15.0, NOW(), NOW()),
  (4,  64.0, 14.0, NOW(), NOW()),
  (5,  55.0,  9.0, NOW(), NOW()),
  (6,  74.0, 20.0, NOW(), NOW()),
  (7,  92.0, 10.0, NOW(), NOW()),
  (8,  82.0, 13.0, NOW(), NOW()),
  (9,  52.0, 18.0, NOW(), NOW()),
  (10, 68.0, 22.0, NOW(), NOW()),
  (11, 73.0, 18.0, NOW(), NOW()),
  (12, 72.0, 11.0, NOW(), NOW()),
  (13, 78.0, 16.0, NOW(), NOW()),
  (14, 57.0, 20.0, NOW(), NOW()),
  (15, 60.0, 22.0, NOW(), NOW()),
  (20, 74.0, 17.0, NOW(), NOW()),
  (25, 68.0, 16.0, NOW(), NOW()),
  (30, 80.0, 15.0, NOW(), NOW())
ON CONFLICT ("memberId") DO NOTHING;

-- 6. 회원 메모
INSERT INTO member_memos ("memberId", content, category, author, "createdAt", "updatedAt")
VALUES
  (1,  '무릎 부상 이력. 스쿼트 시 주의. 런지 대체 동작 권장.',             '건강', '김태희', '2026-01-15', NOW()),
  (1,  '만료 D-7 연락 완료. 재등록 의사 있음. 6개월 이용권 안내.',           '상담', '유재석', '2026-04-20', NOW()),
  (2,  '고혈압 약 복용 중. 심박수 150 이하 유지.',                          '건강', '정지훈', '2026-02-10', NOW()),
  (2,  '벤치프레스 70kg 달성. 다음 목표 80kg.',                            '운동', '정지훈', '2026-04-01', NOW()),
  (3,  '직장인. 퇴근 후 7시 이후 방문 선호. 주말 수업 우선.',               '메모', '김태희', '2026-03-05', NOW()),
  (4,  '마라톤 동호회 소속. 주 3회 러닝 병행. PT는 근력 위주.',             '운동', '김태희', '2026-01-20', NOW()),
  (5,  '바디프로필 촬영 2026.09 예정. 매월 체성분 측정 예약.',              '관리', '이효리', '2026-02-28', NOW()),
  (5,  '식단 컨설팅 요청. 영양사 연결 안내 완료.',                          '상담', '유재석', '2026-03-15', NOW()),
  (6,  '허리디스크 재활 완료. 정상 트레이닝 시작 가능.',                    '건강', '이효리', '2026-04-10', NOW()),
  (7,  '운동 경력 5년. 고급 회원. 셀프 프로그램 가능하나 가이드 원함.',     '메모', '정지훈', '2026-03-01', NOW()),
  (9,  '필라테스 기초반 수료. 중급반 진입 가능.',                           '운동', '이효리', '2026-04-05', NOW()),
  (10, '당뇨 전단계 진단. 유산소 집중 추천. 식이요법 병행.',                '건강', '김태희', '2026-01-30', NOW()),
  (11, '처음 헬스장. 체험 PT 2회 진행 완료. 기초부터 시작.',               '메모', '정지훈', '2026-04-01', NOW()),
  (13, '어깨 수술 후 재활 목적. 의사 소견서 확인.',                         '건강', '김태희', '2025-12-01', NOW()),
  (14, '외국인 회원. 영어 가능한 박재범 트레이너 매칭.',                    '메모', '유재석', '2026-02-15', NOW()),
  (15, '육아 중. 오전 10~12시 이용 선호.',                                  '메모', '김태희', '2026-03-10', NOW()),
  (17, 'VIP 회원. 전용 락커 배정 완료. 생일 이벤트 4월 준비.',             '관리', '김태희', '2026-04-01', NOW()),
  (20, '체중 감량 10kg 목표. 현재 3kg 감량 완료.',                          '관리', '이효리', '2026-04-15', NOW()),
  (30, '재등록 5회차. 장기 우수 회원. GOLD 등급.',                          '메모', '유재석', '2026-04-01', NOW()),
  (35, '기업 임원. 새벽 6시 오픈 직후 이용. 주차 VIP 안내.',               '메모', '김태희', '2026-02-20', NOW())
ON CONFLICT DO NOTHING;

-- 7. 회원 종합 평가
INSERT INTO member_evaluations ("memberId", "staffId", "staffName", category, score, content, "branchId", "createdAt", "updatedAt")
VALUES
  (1,  1, '김태희', '체력평가',   85, '기초 체력 양호. 하체 근력 집중 보완 필요.',                         1, NOW(), NOW()),
  (1,  1, '김태희', '목표달성도', 72, '3개월 목표 중 72% 달성. 식단 관리 강화 필요.',                       1, NOW(), NOW()),
  (2,  3, '정지훈', '체력평가',   92, '근력 수준 매우 우수. 상급자 프로그램 적용 권장.',                    1, NOW(), NOW()),
  (3,  1, '김태희', '체력평가',   78, '전반적 체력 양호. 유연성 부족. 스트레칭 루틴 추가.',                 1, NOW(), NOW()),
  (5,  2, '이효리', '체력평가',   88, '근육량 증가 추세 좋음. 체지방 감소율 80% 달성.',                     1, NOW(), NOW()),
  (7,  3, '정지훈', '체력평가',   95, '고급 회원. 자체 운동 능력 탁월. 스포츠 퍼포먼스 레벨.',             1, NOW(), NOW()),
  (9,  2, '이효리', '수업참여도', 90, '필라테스 출석률 95%. 동작 숙련도 매우 높음.',                        1, NOW(), NOW()),
  (10, 1, '김태희', '체력평가',   65, '유산소 능력 향상 중. 혈압 수치 개선 확인.',                         1, NOW(), NOW()),
  (13, 3, '정지훈', '재활평가',   80, '어깨 가동 범위 90% 회복. 재활 완료. 정상 훈련 전환 가능.',          1, NOW(), NOW()),
  (15, 2, '이효리', '체력평가',   70, '출산 후 체력 회복 중. 코어 안정화 집중.',                           1, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 8. 운동 기록
INSERT INTO exercise_logs ("memberId", "branchId", "exerciseName", sets, reps, weight, duration, notes, "loggedAt", "createdAt")
VALUES
  (1, 1, '스쿼트',       4, 12, 60,  NULL, '자세 교정 완료. 다음 세션 65kg 도전.', '2026-04-25 10:00', NOW()),
  (1, 1, '레그프레스',   3, 15, 120, NULL, '무릎 상태 양호.',                       '2026-04-25 10:00', NOW()),
  (1, 1, '트레드밀 런닝', NULL, NULL, NULL, 30, '5.5km/h 30분 유산소.',             '2026-04-25 10:00', NOW()),
  (1, 1, '스쿼트',       4, 12, 55,  NULL, '기록 꾸준히 향상 중.',                 '2026-04-22 10:00', NOW()),
  (2, 1, '벤치프레스',   5, 5,  72.5, NULL, '70kg 돌파. 다음 목표 75kg.',           '2026-04-25 19:00', NOW()),
  (2, 1, '인클라인 프레스',4, 8, 55, NULL, '어깨 안정화 양호.',                    '2026-04-25 19:00', NOW()),
  (2, 1, '딥스',         3, 12, 0,   NULL, '체중 딥스 12개 달성.',                 '2026-04-25 19:00', NOW()),
  (2, 1, '벤치프레스',   5, 5,  70,  NULL, '좋은 폼 유지.',                        '2026-04-22 19:00', NOW()),
  (3, 1, '데드리프트',   4, 6,  80,  NULL, '요부 안정화 집중. 폼 개선 중.',        '2026-04-24 18:00', NOW()),
  (3, 1, '바벨로우',     4, 8,  55,  NULL, '광배근 수축감 향상.',                  '2026-04-24 18:00', NOW()),
  (3, 1, '풀업',         3, 8,  0,   NULL, '6→8개 증가. 목표 달성 임박.',          '2026-04-24 18:00', NOW()),
  (5, 1, '힙쓰러스트',   5, 12, 80,  NULL, '둔근 발달 집중. 수축감 매우 좋음.',    '2026-04-25 11:00', NOW()),
  (5, 1, '케이블 크런치', 4, 15, 25, NULL, '복근 선명도 향상 중.',                 '2026-04-25 11:00', NOW()),
  (5, 1, '인터벌 런닝',  NULL, NULL, NULL, 25, '1분 고강도 + 2분 저강도 × 8세트.','2026-04-25 11:00', NOW()),
  (7, 1, '스쿼트',       5, 5,  100, NULL, '100kg 달성!',                          '2026-04-23 20:00', NOW()),
  (7, 1, '데드리프트',   4, 4,  120, NULL, '최고 중량 갱신.',                      '2026-04-23 20:00', NOW()),
  (7, 1, '오버헤드프레스',4, 6, 60, NULL, '어깨 가동 범위 양호.',                  '2026-04-23 20:00', NOW()),
  (4, 1, '트레드밀 런닝', NULL, NULL, NULL, 45, '8km/h 45분. 마라톤 준비 훈련.',  '2026-04-25 07:00', NOW()),
  (4, 1, '데드리프트',   3, 8,  70,  NULL, '유산소 위주라 근력은 보조.',           '2026-04-25 07:00', NOW()),
  (10,1, '사이클',       NULL, NULL, NULL, 30, '저강도 70rpm 30분.',                '2026-04-24 09:00', NOW())
ON CONFLICT DO NOTHING;

-- 9. 회원 체형 정보 (실제 컬럼: height, weight, bloodPressure, heartRate, notes, measuredAt, branchId)
INSERT INTO member_body_info ("memberId", height, weight, "bloodPressure", "heartRate", notes, "measuredAt", "branchId", "createdAt")
VALUES
  (1,  175, 82.5, '125/82', 72, '무릎 통증 이력. 하지 근력 집중.', '2026-04-01', 1, NOW()),
  (2,  180, 88.0, '118/76', 65, '상급자 체력. 고강도 운동 적합.',  '2026-04-01', 1, NOW()),
  (3,  172, 75.0, '122/80', 70, '전반 체력 양호. 유연성 보완.',    '2026-04-01', 1, NOW()),
  (4,  168, 65.0, '115/75', 58, '심폐 기능 우수. 러너 체형.',      '2026-04-01', 1, NOW()),
  (5,  163, 58.0, '112/72', 64, '근육량 증가 중. 체지방 감소 순조.',  '2026-04-01', 1, NOW()),
  (6,  169, 78.0, '138/88', 78, '고혈압 주의. 저강도 위주 권장.',  '2026-04-01', 1, NOW()),
  (7,  182, 90.0, '120/78', 62, '스포츠 퍼포먼스 레벨.',           '2026-04-01', 1, NOW()),
  (8,  176, 84.0, '119/77', 68, '린매스업 진행 중.',               '2026-04-01', 1, NOW()),
  (9,  160, 54.0, '110/70', 66, '필라테스 전문. 코어 강화.',       '2026-04-01', 1, NOW()),
  (10, 165, 72.0, '142/90', 82, '당뇨 전단계. 혈압 관리 필요.',   '2026-04-01', 1, NOW()),
  (11, 170, 78.0, '124/82', 74, '초보자. 기초부터 진행.',          '2026-04-01', 1, NOW()),
  (12, 174, 76.0, '118/76', 69, '바디프로필 목표. 집중 관리.',     '2026-04-01', 1, NOW()),
  (13, 177, 81.0, '120/79', 71, '어깨 재활 완료. 정상 훈련 전환.','2026-04-10', 1, NOW()),
  (14, 165, 60.0, '113/73', 67, '외국인 회원. 영어 소통.',         '2026-04-01', 1, NOW()),
  (15, 162, 68.0, '119/78', 72, '육아 중. 체력 회복 단계.',        '2026-04-01', 1, NOW()),
  (20, 168, 76.0, '121/80', 73, '감량 목표 진행 중.',              '2026-04-01', 1, NOW()),
  (25, 172, 70.0, '116/74', 65, '수영+헬스 병행.',                 '2026-04-01', 1, NOW()),
  (30, 175, 80.0, '122/80', 70, '장기 회원. 유지 관리.',           '2026-04-01', 1, NOW())
ON CONFLICT ("memberId") DO NOTHING;

-- 10. 직원 근태
INSERT INTO staff_attendance ("staffId", "staffName", "branchId", "clockIn", "clockOut", status, "workHours", "createdAt")
SELECT
  s.id, s.name, s."branchId",
  (d::date + INTERVAL '9 hours')::timestamp,
  (d::date + INTERVAL '18 hours')::timestamp,
  'PRESENT',
  9.0,
  NOW()
FROM staff s
CROSS JOIN generate_series('2026-01-02'::date, '2026-04-25'::date, '1 day'::interval) d
WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
ON CONFLICT DO NOTHING;

-- 11. 급여 (branchId 없음, netSalary 컬럼명 확인)
INSERT INTO payroll ("staffId", "staffName", year, month, "baseSalary", bonus, deduction, "netSalary", status, "paidAt", "createdAt", "updatedAt")
SELECT
  s.id, s.name,
  y, m,
  s.salary,
  CASE WHEN m IN (1, 7) THEN (s.salary * 0.5)::int ELSE 0 END,
  (s.salary * 0.078)::int,
  s.salary + CASE WHEN m IN (1, 7) THEN (s.salary * 0.5)::int ELSE 0 END - (s.salary * 0.078)::int,
  'PAID',
  (y::text || '-' || LPAD(m::text, 2, '0') || '-25')::timestamp,
  NOW(), NOW()
FROM staff s
CROSS JOIN (
  SELECT 2025 y, generate_series(1,12) m
  UNION ALL
  SELECT 2026 y, generate_series(1,4) m
) periods
ON CONFLICT DO NOTHING;

-- 12. 공지사항 (category 컬럼 없음)
INSERT INTO notices (title, content, "authorId", "authorName", "isPinned", "isPublished", "branchId", "publishedAt", "createdAt", "updatedAt")
VALUES
  ('5월 운영 안내',          '어린이날(5/5), 어버이날(5/8) 07:00~20:00 단축 운영.',                    1, '운영관리자', true,  true, 1, NOW(), NOW(), NOW()),
  ('시설 보수 공사 안내',    '4/28(월) 오전 보일러 점검. 샤워실 06:00~10:00 이용 불가.',              1, '운영관리자', false, true, 1, NOW()-INTERVAL '5 days', NOW(), NOW()),
  ('신규 GX 프로그램 개설',  '5월부터 HIIT 서킷 화/목 19:00 개설. 수강 신청은 데스크에서.',           1, '운영관리자', true,  true, 1, NOW()-INTERVAL '3 days', NOW(), NOW()),
  ('락커 재배정 안내',       '5/1부터 락커 재배정. 4/30까지 기존 물품 정리 부탁.',                    1, '운영관리자', true,  true, 1, NOW()-INTERVAL '2 days', NOW(), NOW()),
  ('여름 특가 이벤트 예고',  '6~8월 여름 특가! PT 패키지 최대 20% 할인 예정.',                       1, '운영관리자', false, true, 1, NOW()-INTERVAL '1 days', NOW(), NOW()),
  ('[을지로] 4월 우수 회원', '4월 출석률 1위 박지훈 회원님(28회). 단백질 보충제 1통 증정.',          1, '운영관리자', false, true, 2, NOW()-INTERVAL '2 days', NOW(), NOW()),
  ('[종각] 신규 강사 소개',  '5월부터 필라테스 이지영 강사 합류. 경력 7년 전문 강사.',               1, '운영관리자', false, true, 3, NOW()-INTERVAL '4 days', NOW(), NOW()),
  ('회원증 재발급 안내',     '회원증 분실 시 프런트에서 재발급 가능. 재발급 비용 2,000원.',           1, '운영관리자', false, true, 1, NOW()-INTERVAL '10 days', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 13. 메시지 (실제 컬럼: type, title, content, recipients(jsonb), status, branchId, sentAt, scheduledAt)
INSERT INTO messages (type, title, content, recipients, status, "branchId", "sentAt", "scheduledAt", "createdAt")
VALUES
  ('SMS',   '5월 이벤트 안내',     '[FitGenie] 5월 가정의 달 PT 20% 할인. 5월 31일까지.',              '{"count": 892, "target": "ALL"}'::jsonb,      'SENT',      1, NOW()-INTERVAL '3 days',  NULL,                    NOW()),
  ('KAKAO', '만료 임박 알림',      '[FitGenie] 이용권이 7일 후 만료됩니다. 재등록 혜택을 드립니다.',   '{"count": 145, "target": "EXPIRING"}'::jsonb, 'SENT',      1, NOW()-INTERVAL '1 days',  NULL,                    NOW()),
  ('KAKAO', '생일 축하 메시지',    '[FitGenie] 🎉 생일을 축하드립니다! 오늘 방문 시 음료 1잔 제공.',  '{"count": 12,  "target": "BIRTHDAY"}'::jsonb, 'SENT',      1, NOW()-INTERVAL '5 hours', NULL,                    NOW()),
  ('SMS',   '오늘 수업 리마인더',   '[FitGenie] 오늘 19:00 필라테스 수업. 10분 전 도착 부탁.',         '{"count": 28,  "target": "CLASS"}'::jsonb,    'SENT',      1, NOW()-INTERVAL '2 hours', NULL,                    NOW()),
  ('SMS',   '장기 미방문 안내',    '[FitGenie] 30일 이상 미방문. 오늘 방문해보세요!',                  '{"count": 45,  "target": "INACTIVE"}'::jsonb, 'SENT',      1, NOW()-INTERVAL '7 days',  NULL,                    NOW()),
  ('KAKAO', '6월 프로그램 안내',   '[FitGenie] 6월 HIIT 서킷(화/목 19:00), 아쿠아로빅(월/수 10:00).', '{"count": 892, "target": "ALL"}'::jsonb,      'SCHEDULED', 1, NULL,                      NOW()+INTERVAL '3 days', NOW()),
  ('KAKAO', 'PT 종료 후속 케어',   '[FitGenie] PT 종료 후 홈트레이닝 가이드를 제공해드립니다.',        '{"count": 18,  "target": "PT_END"}'::jsonb,   'SENT',      1, NOW()-INTERVAL '10 days', NULL,                    NOW()),
  ('SMS',   '이벤트 당첨 알림',    '[FitGenie 을지로] 4월 이벤트 당첨을 축하합니다!',                  '{"count": 1,   "target": "SELECTED"}'::jsonb, 'SENT',      2, NOW()-INTERVAL '2 days',  NULL,                    NOW())
ON CONFLICT DO NOTHING;

-- 14. 전자계약 (productId 없음)
INSERT INTO contracts ("memberId", "memberName", "productName", amount, "startDate", "endDate", status, "signedAt", "branchId", "createdAt", "updatedAt")
SELECT
  m.id, m.name, p.name, s.amount,
  s."saleDate"::date,
  (s."saleDate" + INTERVAL '90 days')::date,
  'SIGNED',
  s."saleDate",
  s."branchId",
  NOW(), NOW()
FROM sales s
JOIN members m ON m.id = s."memberId"
JOIN products p ON p.id = s."productId"
WHERE s.status = 'PAID' AND s.amount > 150000
ORDER BY s."saleDate" DESC
LIMIT 40
ON CONFLICT DO NOTHING;

-- 15. 선수익금 (remainingAmount 컬럼)
INSERT INTO deferred_revenue ("saleId", "memberId", "memberName", "productName", "totalAmount", "recognizedAmount", "remainingAmount", "startDate", "endDate", "branchId", "createdAt", "updatedAt")
SELECT
  s.id, m.id, m.name, p.name,
  s.amount,
  (s.amount * 0.4)::int,
  (s.amount * 0.6)::int,
  s."saleDate"::date,
  (s."saleDate" + INTERVAL '90 days')::date,
  s."branchId",
  NOW(), NOW()
FROM sales s
JOIN members m ON m.id = s."memberId"
JOIN products p ON p.id = s."productId"
WHERE s.status = 'PAID' AND s.amount > 100000
  AND s."saleDate" > NOW() - INTERVAL '60 days'
LIMIT 30
ON CONFLICT DO NOTHING;

-- 결과 확인
SELECT '✅ 데모 시드 완료' as result,
  (SELECT COUNT(*) FROM product_groups) as product_groups,
  (SELECT COUNT(*) FROM discount_policies) as discount_policies,
  (SELECT COUNT(*) FROM exercise_programs) as exercise_programs,
  (SELECT COUNT(*) FROM class_templates) as class_templates,
  (SELECT COUNT(*) FROM member_goals) as member_goals,
  (SELECT COUNT(*) FROM member_memos) as member_memos,
  (SELECT COUNT(*) FROM member_evaluations) as member_evaluations,
  (SELECT COUNT(*) FROM exercise_logs) as exercise_logs,
  (SELECT COUNT(*) FROM member_body_info) as member_body_info,
  (SELECT COUNT(*) FROM staff_attendance) as staff_attendance,
  (SELECT COUNT(*) FROM payroll) as payroll,
  (SELECT COUNT(*) FROM notices) as notices,
  (SELECT COUNT(*) FROM messages) as messages,
  (SELECT COUNT(*) FROM contracts) as contracts,
  (SELECT COUNT(*) FROM deferred_revenue) as deferred_revenue;
