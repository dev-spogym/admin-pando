import React, { useState } from "react";
import {
  Plus,
  History,
  TrendingUp,
  Scale,
  Activity,
  Zap,
  ChevronLeft,
  Download,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Target
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import TabNav from "@/components/TabNav";
import ConfirmDialog from "@/components/ConfirmDialog";
import { moveToPage } from "@/internal";
import { cn } from "@/lib/utils";

/**
 * 신체/체성분 정보 (BodyComposition) 뷰
 * 회원의 체성분 변화를 확인하고 관리하는 화면입니다.
 */

type Measurement = {
  id: number;
  date: string;
  weight: number;
  muscle: number;
  fat: number;
  bmi: number;
  pbf: number;
  bmr: number;
};

const INITIAL_MEASUREMENTS: Measurement[] = [
  { id: 1, date: "2024-05-15", weight: 54.5, muscle: 23.2, fat: 12.8, bmi: 20.0, pbf: 23.5, bmr: 1320 },
  { id: 2, date: "2024-04-10", weight: 55.8, muscle: 22.8, fat: 14.1, bmi: 20.5, pbf: 25.3, bmr: 1305 },
  { id: 3, date: "2024-03-05", weight: 57.2, muscle: 22.5, fat: 15.6, bmi: 21.0, pbf: 27.2, bmr: 1290 },
  { id: 4, date: "2024-02-01", weight: 58.5, muscle: 22.0, fat: 17.2, bmi: 21.5, pbf: 29.4, bmr: 1280 },
];

// 유효 범위 상수
const RANGES = {
  weight: { min: 20, max: 300, label: '체중', unit: 'kg' },
  muscle: { min: 5, max: 80, label: '골격근량', unit: 'kg' },
  pbf: { min: 3, max: 60, label: '체지방률', unit: '%' },
};

export default function BodyComposition() {
  const [activeTab, setActiveTab] = useState("list");
  const [measurements, setMeasurements] = useState<Measurement[]>(INITIAL_MEASUREMENTS);

  // 측정 추가 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    muscle: '',
    pbf: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 덮어쓰기 확인 모달
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingMeasurement, setPendingMeasurement] = useState<Omit<Measurement, 'id'> | null>(null);

  // 목표 설정
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goals, setGoals] = useState({ weight: 52, pbf: 20 });
  const [goalDraft, setGoalDraft] = useState({ weight: '52', pbf: '20' });

  // Mock 데이터: 회원 정보
  const member = {
    id: "M10042",
    name: "김태희",
    age: 28,
    gender: "여성",
    height: 165,
  };

  const latest = measurements[0];
  const prev = measurements[1];

  // 변화량 계산
  const getChange = (current: number, previous: number) => {
    const diff = current - previous;
    const percent = (diff / previous) * 100;
    return {
      value: Math.abs(Number(percent.toFixed(1))),
      isPositive: diff >= 0,
      diff: Number(diff.toFixed(1))
    };
  };

  const weightChange = getChange(latest.weight, prev.weight);
  const muscleChange = getChange(latest.muscle, prev.muscle);
  const fatChange = getChange(latest.fat, prev.fat);

  // BMI 자동 계산 (체중 / 키m^2)
  const calcBMI = (weight: number): number => {
    const heightM = member.height / 100;
    return Number((weight / (heightM * heightM)).toFixed(1));
  };

  // BMR 추정 (Mifflin-St Jeor, 여성)
  const calcBMR = (weight: number, muscle: number): number => {
    return Math.round(10 * weight + 6.25 * member.height - 5 * member.age - 161);
  };

  // 폼 범위 검증
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const w = parseFloat(formData.weight);
    const m = parseFloat(formData.muscle);
    const p = parseFloat(formData.pbf);

    if (!formData.date) errors.date = '날짜를 입력해주세요.';
    if (isNaN(w)) { errors.weight = '체중을 입력해주세요.'; }
    else if (w < RANGES.weight.min || w > RANGES.weight.max) {
      errors.weight = `유효 범위: ${RANGES.weight.min}~${RANGES.weight.max}kg`;
    }
    if (isNaN(m)) { errors.muscle = '골격근량을 입력해주세요.'; }
    else if (m < RANGES.muscle.min || m > RANGES.muscle.max) {
      errors.muscle = `유효 범위: ${RANGES.muscle.min}~${RANGES.muscle.max}kg`;
    }
    if (isNaN(p)) { errors.pbf = '체지방률을 입력해주세요.'; }
    else if (p < RANGES.pbf.min || p > RANGES.pbf.max) {
      errors.pbf = `유효 범위: ${RANGES.pbf.min}~${RANGES.pbf.max}%`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSubmit = () => {
    if (!validateForm()) return;

    const w = parseFloat(formData.weight);
    const m = parseFloat(formData.muscle);
    const p = parseFloat(formData.pbf);
    const fat = Number((w * (p / 100)).toFixed(1));
    const bmi = calcBMI(w);
    const bmr = calcBMR(w, m);

    const newEntry: Omit<Measurement, 'id'> = {
      date: formData.date,
      weight: w,
      muscle: m,
      fat,
      bmi,
      pbf: p,
      bmr,
    };

    // 동일 날짜 중복 확인
    const existing = measurements.find(m => m.date === formData.date);
    if (existing) {
      setPendingMeasurement(newEntry);
      setShowOverwriteDialog(true);
      return;
    }

    commitMeasurement(newEntry);
  };

  const commitMeasurement = (entry: Omit<Measurement, 'id'>) => {
    setMeasurements(prev => {
      // 덮어쓰기 시 기존 날짜 항목 제거 후 추가, 날짜 내림차순 정렬
      const filtered = prev.filter(m => m.date !== entry.date);
      const newId = Math.max(...prev.map(m => m.id), 0) + 1;
      return [{ ...entry, id: newId }, ...filtered].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });
    setShowAddModal(false);
    setShowOverwriteDialog(false);
    setPendingMeasurement(null);
    setFormData({ date: new Date().toISOString().split('T')[0], weight: '', muscle: '', pbf: '' });
    setFormErrors({});
  };

  const openAddModal = () => {
    setFormData({ date: new Date().toISOString().split('T')[0], weight: '', muscle: '', pbf: '' });
    setFormErrors({});
    setShowAddModal(true);
  };

  // 목표 달성률 계산 (낮을수록 좋은 지표는 반전)
  const weightProgress = Math.min(100, Math.max(0,
    goals.weight > 0
      ? latest.weight <= goals.weight
        ? 100
        : Math.round((1 - (latest.weight - goals.weight) / goals.weight) * 100)
      : 0
  ));
  const pbfProgress = Math.min(100, Math.max(0,
    goals.pbf > 0
      ? latest.pbf <= goals.pbf
        ? 100
        : Math.round((1 - (latest.pbf - goals.pbf) / goals.pbf) * 100)
      : 0
  ));

  // BMI 자동 계산 미리보기
  const previewBMI = formData.weight ? calcBMI(parseFloat(formData.weight) || 0) : null;

  // 테이블 컬럼 정의
  const columns = [
    { key: "date", header: "측정일자", align: "center" as const },
    { key: "weight", header: "체중 (kg)", align: "right" as const, render: (v: number) => <span className="font-semibold text-text-dark-grey" >{v}</span> },
    { key: "muscle", header: "골격근량 (kg)", align: "right" as const, render: (v: number) => <span className="text-secondary-mint font-medium" >{v}</span> },
    { key: "fat", header: "체지방량 (kg)", align: "right" as const, render: (v: number) => <span className="text-primary-coral font-medium" >{v}</span> },
    { key: "bmi", header: "BMI (kg/m²)", align: "right" as const },
    { key: "pbf", header: "체지방률 (%)", align: "right" as const },
    { key: "bmr", header: "기초대사량 (kcal)", align: "right" as const },
    {
      key: "actions",
      header: "리포트",
      align: "center" as const,
      render: () => (
        <button className="p-xs text-text-grey-blue hover:text-primary-coral transition-colors" >
          <FileText size={18}/>
        </button>
      )
    },
  ];

  const tabs = [
    { key: "list", label: "기록 목록", icon: History },
    { key: "chart", label: "변화 그래프", icon: TrendingUp },
    { key: "goal", label: "목표 관리", icon: Target },
  ];

  return (
    <AppLayout >
      <div className="p-xxl bg-bg-main-light-blue min-h-screen" >
        <button
          className="flex items-center gap-xs text-text-grey-blue hover:text-text-dark-grey mb-md transition-colors" onClick={() => moveToPage(985)}>
          <ChevronLeft size={20}/>
          <span className="text-Body 2" >회원 상세로 돌아가기</span>
        </button>

        <PageHeader title={`${member.name} 회원의 체성분 정보`} description={`최근 측정일: ${latest.date} | 목표 체중: ${goals.weight}kg | 목표 체지방률: ${goals.pbf}%`} actions={
            <div className="flex gap-sm">
              <button
                className="flex items-center gap-xs px-md py-sm bg-3 border border-border-light text-text-dark-grey rounded-button text-Label hover:bg-bg-main-light-blue transition-all"
              >
                <Download size={16} />
                전체 기록 추출
              </button>
              <button
                className="flex items-center gap-xs px-md py-sm bg-primary-coral text-white rounded-button text-Label font-bold shadow-md hover:shadow-lg transition-all"
                onClick={openAddModal}
              >
                <Plus size={16} />
                새 측정 기록 추가
              </button>
            </div>
          }/>

        {/* 핵심 지표 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl" >
          <StatCard label="현재 체중" value={`${latest.weight} kg`} icon={<Scale />} variant="default" change={{
              value: weightChange.value,
              label: `${weightChange.diff > 0 ? "+" : ""}${weightChange.diff}kg 대비`
            }} description={`표준 범위: 50.1 ~ 67.8 kg`}/>
          <StatCard label="골격근량" value={`${latest.muscle} kg`} icon={<Activity />} variant="mint" change={{
              value: muscleChange.value,
              label: `${muscleChange.diff > 0 ? "+" : ""}${muscleChange.diff}kg 대비`
            }} description={`표준 범위: 21.5 ~ 26.3 kg`}/>
          <StatCard label="체지방량" value={`${latest.fat} kg`} icon={<Zap />} variant="peach" change={{
              value: fatChange.value,
              label: `${fatChange.diff > 0 ? "+" : ""}${fatChange.diff}kg 대비`
            }} description={`표준 범위: 11.2 ~ 17.9 kg`}/>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-3 rounded-card-normal shadow-card-soft overflow-hidden" >
          <TabNav
            className="px-lg pt-sm" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}/>

          <div className="p-lg" >
            {activeTab === "list" && (
              <DataTable columns={columns} data={measurements} title="체성분 측정 히스토리"/>
            )}

            {activeTab === "chart" && (
              <div className="py-xxl flex flex-col items-center justify-center text-center" >
                <div className="w-full h-[400px] bg-bg-main-light-blue/50 rounded-card-normal flex items-end justify-between px-xxl pb-xl gap-md relative overflow-hidden" >
                  <div className="absolute inset-0 flex flex-col justify-between p-lg opacity-10" >
                    {[1, 2, 3, 4, 5].map(i => (
                      <div className="w-full h-[1px] bg-4" key={i}/>
                    ))}
                  </div>
                  {[...measurements].reverse().map((m, i) => (
                    <div className="flex flex-col items-center gap-sm z-10" key={i}>
                      <div className="flex gap-xs items-end h-[250px]" >
                        <div
                          className="w-4 bg-secondary-mint rounded-t-sm transition-all duration-500 hover:opacity-80" style={{ height: `${(m.muscle / 30) * 100}%` }} title={`골격근량: ${m.muscle}kg`}/>
                        <div
                          className="w-4 bg-primary-coral rounded-t-sm transition-all duration-500 hover:opacity-80" style={{ height: `${(m.fat / 30) * 100}%` }} title={`체지방량: ${m.fat}kg`}/>
                      </div>
                      <div className="text-Label text-text-grey-blue rotate-45 mt-md origin-left" >
                        {m.date.split("-").slice(1).join(".")}
                      </div>
                    </div>
                  ))}
                  <div className="absolute top-lg right-lg flex gap-md bg-3/80 backdrop-blur-sm p-sm rounded-md border border-border-light shadow-sm" >
                    <div className="flex items-center gap-xs" >
                      <div className="w-3 h-3 bg-secondary-mint rounded-full" />
                      <span className="text-Label text-text-dark-grey" >골격근량</span>
                    </div>
                    <div className="flex items-center gap-xs" >
                      <div className="w-3 h-3 bg-primary-coral rounded-full" />
                      <span className="text-Label text-text-dark-grey" >체지방량</span>
                    </div>
                  </div>
                </div>
                <div className="mt-xl max-w-md" >
                  <h4 className="text-Heading 2 text-text-dark-grey mb-sm" >체성분 변화 추이</h4>
                  <p className="text-Body 2 text-text-grey-blue" >
                    최근 4개월간 골격근량은 <span className="text-secondary-mint font-bold" >1.2kg 증가</span>하고,
                    체지방량은 <span className="text-primary-coral font-bold" >4.4kg 감소</span>하는 아주 긍정적인 변화를 보이고 있습니다.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "goal" && (
              <div className="space-y-xl py-md" >
                <div className="flex items-center justify-between mb-lg" >
                  <h3 className="text-Heading 2 text-text-dark-grey flex items-center gap-sm" >
                    <Target className="text-primary-coral" size={22}/> 목표 설정 및 달성률
                  </h3>
                  <button
                    className="flex items-center gap-xs px-md py-sm bg-primary-coral text-white rounded-button text-Label font-bold hover:opacity-90 transition-all"
                    onClick={() => { setGoalDraft({ weight: String(goals.weight), pbf: String(goals.pbf) }); setShowGoalModal(true); }}
                  >
                    목표 수정
                  </button>
                </div>

                {/* 목표 체중 게이지 */}
                <GoalGauge
                  label="목표 체중"
                  current={latest.weight}
                  goal={goals.weight}
                  unit="kg"
                  progress={weightProgress}
                  color="coral"
                  description={`현재 ${latest.weight}kg → 목표 ${goals.weight}kg`}
                />

                {/* 목표 체지방률 게이지 */}
                <GoalGauge
                  label="목표 체지방률"
                  current={latest.pbf}
                  goal={goals.pbf}
                  unit="%"
                  progress={pbfProgress}
                  color="mint"
                  description={`현재 ${latest.pbf}% → 목표 ${goals.pbf}%`}
                />
              </div>
            )}
          </div>
        </div>

        {/* 체성분 상세 분석 정보 */}
        <div className="mt-xl grid grid-cols-1 lg:grid-cols-2 gap-lg" >
          <div className="bg-3 p-xl rounded-card-normal border border-border-light shadow-card-soft" >
            <h3 className="text-Heading 2 text-text-dark-grey mb-lg flex items-center gap-sm" >
              <Activity className="text-secondary-mint" />
              비만 분석
            </h3>
            <div className="space-y-xl" >
              <AnalysisRow label="BMI (Body Mass Index)" value={latest.bmi} unit="kg/m²" min={18.5} max={23} current={latest.bmi}/>
              <AnalysisRow label="체지방률 (Percent Body Fat)" value={latest.pbf} unit="%" min={18} max={28} current={latest.pbf} color="coral"/>
            </div>
          </div>

          <div className="bg-3 p-xl rounded-card-normal border border-border-light shadow-card-soft" >
            <h3 className="text-Heading 2 text-text-dark-grey mb-lg flex items-center gap-sm" >
              <Zap className="text-primary-coral" />
              에너지/대사 분석
            </h3>
            <div className="space-y-md" >
              <div className="flex justify-between items-center p-md bg-bg-main-light-blue/30 rounded-md" >
                <span className="text-Body 1 text-text-grey-blue" >기초대사량 (BMR)</span>
                <span className="text-Heading 2 text-text-dark-grey font-bold" >{latest.bmr} <small className="text-Label font-normal" >kcal</small></span>
              </div>
              <div className="flex justify-between items-center p-md bg-bg-main-light-blue/30 rounded-md" >
                <span className="text-Body 1 text-text-grey-blue" >제지방량</span>
                <span className="text-Heading 2 text-text-dark-grey font-bold" >{(latest.weight - latest.fat).toFixed(1)} <small className="text-Label font-normal" >kg</small></span>
              </div>
              <div className="flex justify-between items-center p-md bg-bg-main-light-blue/30 rounded-md" >
                <span className="text-Body 1 text-text-grey-blue" >권장 섭취 열량</span>
                <span className="text-Heading 2 text-text-dark-grey font-bold" >{(latest.bmr * 1.4).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} <small className="text-Label font-normal" >kcal</small></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 측정 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" >
          <div className="bg-3 rounded-card-strong shadow-xl w-full max-w-[480px] mx-lg overflow-hidden" >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-xl py-lg border-b border-border-light bg-bg-main-light-blue" >
              <h2 className="text-Heading 2 text-text-dark-grey flex items-center gap-sm" >
                <Plus className="text-primary-coral" size={20}/> 체성분 측정 추가
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-text-grey-blue hover:text-error transition-colors" >
                <X size={20}/>
              </button>
            </div>

            {/* 모달 바디 */}
            <div className="p-xl space-y-lg" >
              {/* 날짜 */}
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey font-semibold" >측정일 <span className="text-error" >*</span></label>
                <input
                  className={cn(
                    "w-full px-md py-sm rounded-input border border-border-light bg-input-bg-light outline-none focus:ring-2 focus:ring-secondary-mint transition-all",
                    formErrors.date && "border-error ring-1 ring-error"
                  )}
                  type="date" value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
                {formErrors.date && <p className="text-[12px] text-error flex items-center gap-xs" ><AlertCircle size={12}/>{formErrors.date}</p>}
              </div>

              {/* 체중 */}
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey font-semibold" >
                  체중 <span className="text-text-grey-blue font-normal" >({RANGES.weight.min}~{RANGES.weight.max}kg)</span> <span className="text-error" >*</span>
                </label>
                <div className="flex items-center gap-sm" >
                  <input
                    className={cn(
                      "flex-1 px-md py-sm rounded-input border border-border-light bg-input-bg-light outline-none focus:ring-2 focus:ring-secondary-mint transition-all",
                      formErrors.weight && "border-error ring-1 ring-error"
                    )}
                    type="number" step="0.1" placeholder="예: 54.5" value={formData.weight}
                    onChange={e => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  />
                  <span className="text-Body 2 text-text-grey-blue w-[32px]" >kg</span>
                </div>
                {formErrors.weight && <p className="text-[12px] text-error flex items-center gap-xs" ><AlertCircle size={12}/>{formErrors.weight}</p>}
              </div>

              {/* 골격근량 */}
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey font-semibold" >
                  골격근량 <span className="text-text-grey-blue font-normal" >({RANGES.muscle.min}~{RANGES.muscle.max}kg)</span> <span className="text-error" >*</span>
                </label>
                <div className="flex items-center gap-sm" >
                  <input
                    className={cn(
                      "flex-1 px-md py-sm rounded-input border border-border-light bg-input-bg-light outline-none focus:ring-2 focus:ring-secondary-mint transition-all",
                      formErrors.muscle && "border-error ring-1 ring-error"
                    )}
                    type="number" step="0.1" placeholder="예: 23.2" value={formData.muscle}
                    onChange={e => setFormData(prev => ({ ...prev, muscle: e.target.value }))}
                  />
                  <span className="text-Body 2 text-text-grey-blue w-[32px]" >kg</span>
                </div>
                {formErrors.muscle && <p className="text-[12px] text-error flex items-center gap-xs" ><AlertCircle size={12}/>{formErrors.muscle}</p>}
              </div>

              {/* 체지방률 */}
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey font-semibold" >
                  체지방률 <span className="text-text-grey-blue font-normal" >({RANGES.pbf.min}~{RANGES.pbf.max}%)</span> <span className="text-error" >*</span>
                </label>
                <div className="flex items-center gap-sm" >
                  <input
                    className={cn(
                      "flex-1 px-md py-sm rounded-input border border-border-light bg-input-bg-light outline-none focus:ring-2 focus:ring-secondary-mint transition-all",
                      formErrors.pbf && "border-error ring-1 ring-error"
                    )}
                    type="number" step="0.1" placeholder="예: 23.5" value={formData.pbf}
                    onChange={e => setFormData(prev => ({ ...prev, pbf: e.target.value }))}
                  />
                  <span className="text-Body 2 text-text-grey-blue w-[32px]" >%</span>
                </div>
                {formErrors.pbf && <p className="text-[12px] text-error flex items-center gap-xs" ><AlertCircle size={12}/>{formErrors.pbf}</p>}
              </div>

              {/* BMI 자동 계산 미리보기 */}
              {previewBMI !== null && !isNaN(previewBMI) && previewBMI > 0 && (
                <div className="flex items-center gap-sm px-md py-sm bg-bg-soft-mint border border-secondary-mint/30 rounded-card-normal" >
                  <CheckCircle2 className="text-secondary-mint" size={16}/>
                  <span className="text-Body 2 text-text-dark-grey" >
                    BMI 자동 계산: <span className="font-bold text-secondary-mint" >{previewBMI} kg/m²</span>
                  </span>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-end gap-sm px-xl py-lg border-t border-border-light" >
              <button
                className="px-lg py-md rounded-button border border-border-light text-text-grey-blue hover:bg-bg-main-light-blue transition-all"
                onClick={() => setShowAddModal(false)}
              >
                취소
              </button>
              <button
                className="px-lg py-md rounded-button bg-primary-coral text-white font-bold hover:opacity-90 transition-all shadow-md"
                onClick={handleAddSubmit}
              >
                기록 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 덮어쓰기 확인 다이얼로그 */}
      <ConfirmDialog
        open={showOverwriteDialog}
        title="동일 날짜 기록 존재"
        description={`${formData.date} 날짜의 측정 기록이 이미 존재합니다.\n기존 기록을 새 데이터로 덮어쓰시겠습니까?`}
        confirmLabel="덮어쓰기"
        cancelLabel="취소"
        variant="danger"
        onConfirm={() => pendingMeasurement && commitMeasurement(pendingMeasurement)}
        onCancel={() => { setShowOverwriteDialog(false); setPendingMeasurement(null); }}
      />

      {/* 목표 수정 모달 */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" >
          <div className="bg-3 rounded-card-strong shadow-xl w-full max-w-[400px] mx-lg overflow-hidden" >
            <div className="flex items-center justify-between px-xl py-lg border-b border-border-light bg-bg-main-light-blue" >
              <h2 className="text-Heading 2 text-text-dark-grey flex items-center gap-sm" >
                <Target className="text-primary-coral" size={20}/> 목표 설정
              </h2>
              <button onClick={() => setShowGoalModal(false)} className="text-text-grey-blue hover:text-error transition-colors" >
                <X size={20}/>
              </button>
            </div>
            <div className="p-xl space-y-lg" >
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey font-semibold" >목표 체중 (kg)</label>
                <input
                  className="w-full px-md py-sm rounded-input border border-border-light bg-input-bg-light outline-none focus:ring-2 focus:ring-secondary-mint transition-all"
                  type="number" step="0.1" value={goalDraft.weight}
                  onChange={e => setGoalDraft(prev => ({ ...prev, weight: e.target.value }))}
                />
              </div>
              <div className="space-y-xs" >
                <label className="text-Label text-text-dark-grey font-semibold" >목표 체지방률 (%)</label>
                <input
                  className="w-full px-md py-sm rounded-input border border-border-light bg-input-bg-light outline-none focus:ring-2 focus:ring-secondary-mint transition-all"
                  type="number" step="0.1" value={goalDraft.pbf}
                  onChange={e => setGoalDraft(prev => ({ ...prev, pbf: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-sm px-xl py-lg border-t border-border-light" >
              <button
                className="px-lg py-md rounded-button border border-border-light text-text-grey-blue hover:bg-bg-main-light-blue transition-all"
                onClick={() => setShowGoalModal(false)}
              >
                취소
              </button>
              <button
                className="px-lg py-md rounded-button bg-primary-coral text-white font-bold hover:opacity-90 transition-all shadow-md"
                onClick={() => {
                  setGoals({ weight: parseFloat(goalDraft.weight) || 0, pbf: parseFloat(goalDraft.pbf) || 0 });
                  setShowGoalModal(false);
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// 목표 게이지 컴포넌트
function GoalGauge({
  label,
  current,
  goal,
  unit,
  progress,
  color,
  description,
}: {
  label: string;
  current: number;
  goal: number;
  unit: string;
  progress: number;
  color: 'coral' | 'mint';
  description: string;
}) {
  const reached = progress >= 100;
  return (
    <div className="bg-bg-main-light-blue/30 rounded-card-normal p-lg border border-border-light space-y-md" >
      <div className="flex items-center justify-between" >
        <div>
          <p className="text-Body 1 font-bold text-text-dark-grey" >{label}</p>
          <p className="text-Body 2 text-text-grey-blue mt-xs" >{description}</p>
        </div>
        <div className={cn(
          "text-Heading 1 font-bold",
          reached ? "text-secondary-mint" : color === 'coral' ? "text-primary-coral" : "text-secondary-mint"
        )} >
          {progress}%
        </div>
      </div>
      <div className="h-4 bg-bg-main-light-blue rounded-full overflow-hidden relative" >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            reached ? "bg-secondary-mint" : color === 'coral' ? "bg-primary-coral" : "bg-secondary-mint"
          )}
          style={{ width: `${progress}%` }}
        />
        {/* 목표 마커 */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-text-dark-grey/40"
          style={{ left: '100%', transform: 'translateX(-1px)' }}
        />
      </div>
      <div className="flex justify-between text-Label text-text-grey-blue" >
        <span >0{unit}</span>
        <span className={cn("font-bold", reached ? "text-secondary-mint" : "text-primary-coral")} >
          {reached ? '목표 달성!' : `${goal}${unit} 목표`}
        </span>
      </div>
    </div>
  );
}

// 헬퍼 컴포넌트: 분석 로우
function AnalysisRow({
  label,
  value,
  unit,
  min,
  max,
  current,
  color = "mint"
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  current: number;
  color?: "mint" | "coral"
}) {
  const percent = ((current - (min * 0.5)) / (max * 1.5 - min * 0.5)) * 100;

  return (
    <div className="space-y-sm" >
      <div className="flex justify-between items-end" >
        <span className="text-Body 2 text-text-grey-blue" >{label}</span>
        <span className="text-Body 1 font-bold text-text-dark-grey" >
          {value} <small className="text-Label font-normal" >{unit}</small>
        </span>
      </div>
      <div className="h-4 bg-bg-main-light-blue rounded-full relative overflow-hidden" >
        {/* Standard Range Indicator */}
        <div
          className="absolute h-full bg-success/20 border-x border-success/30 z-0" style={{
            left: `${((min - (min * 0.5)) / (max * 1.5 - min * 0.5)) * 100}%`,
            right: `${100 - ((max - (min * 0.5)) / (max * 1.5 - min * 0.5)) * 100}%`
          }}/>
        {/* Value Bar */}
        <div
          className={`absolute h-full rounded-full z-10 transition-all duration-1000 ${color === "mint" ? "bg-secondary-mint" : "bg-primary-coral"}`} style={{ width: `${Math.min(100, percent)}%` }}/>
      </div>
      <div className="flex justify-between text-[10px] text-text-grey-blue px-xs" >
        <span >저체중</span>
        <span >표준</span>
        <span >과체중</span>
      </div>
    </div>
  );
}
