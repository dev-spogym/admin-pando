import React, { useState } from "react";
import { 
  Plus, 
  History, 
  TrendingUp, 
  Scale, 
  Activity, 
  Zap,
  ChevronLeft,
  Calendar,
  Download,
  FileText
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import TabNav from "@/components/TabNav";
import { moveToPage } from "@/internal";

/**
 * 신체/체성분 정보 (BodyComposition) 뷰
 * 회원의 체성분 변화를 확인하고 관리하는 화면입니다.
 */
export default function BodyComposition() {
  const [activeTab, setActiveTab] = useState("list");

  // Mock 데이터: 회원 정보
  const member = {
    id: "M10042",
    name: "김태희",
    age: 28,
    gender: "여성",
    height: 165,
    targetWeight: 52,
  };

  // Mock 데이터: 체성분 측정 기록
  const [measurements] = useState([
    {
      id: 1,
      date: "2024-05-15",
      weight: 54.5,
      muscle: 23.2,
      fat: 12.8,
      bmi: 20.0,
      pbf: 23.5,
      bmr: 1320,
    },
    {
      id: 2,
      date: "2024-04-10",
      weight: 55.8,
      muscle: 22.8,
      fat: 14.1,
      bmi: 20.5,
      pbf: 25.3,
      bmr: 1305,
    },
    {
      id: 3,
      date: "2024-03-05",
      weight: 57.2,
      muscle: 22.5,
      fat: 15.6,
      bmi: 21.0,
      pbf: 27.2,
      bmr: 1290,
    },
    {
      id: 4,
      date: "2024-02-01",
      weight: 58.5,
      muscle: 22.0,
      fat: 17.2,
      bmi: 21.5,
      pbf: 29.4,
      bmr: 1280,
    },
  ]);

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
  ];

  return (
    <AppLayout >
      <div className="p-xxl bg-bg-main-light-blue min-h-screen" >
        <button // 회원 상세 (953-32=921, but based on my mapping 985)
          className="flex items-center gap-xs text-text-grey-blue hover:text-text-dark-grey mb-md transition-colors" onClick={() => moveToPage(985)}>
          <ChevronLeft size={20}/>
          <span className="text-Body 2" >회원 상세로 돌아가기</span>
        </button>

        <PageHeader title={`${member.name} 회원의 체성분 정보`} description={`최근 측정일: ${latest.date} | 목표 체중: ${member.targetWeight}kg`} actions={
            <div className="flex gap-sm">
              <button 
                className="flex items-center gap-xs px-md py-sm bg-3 border border-border-light text-text-dark-grey rounded-button text-Label hover:bg-bg-main-light-blue transition-all"
              >
                <Download size={16} />
                전체 기록 추출
              </button>
              <button 
                className="flex items-center gap-xs px-md py-sm bg-primary-coral text-white rounded-button text-Label font-bold shadow-md hover:shadow-lg transition-all"
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
            {activeTab === "list" ? (
              <DataTable columns={columns} data={measurements} title="체성분 측정 히스토리"/>
            ) : (
              <div className="py-xxl flex flex-col items-center justify-center text-center" >
                <div className="w-full h-[400px] bg-bg-main-light-blue/50 rounded-card-normal flex items-end justify-between px-xxl pb-xl gap-md relative overflow-hidden" >
                  {/* Grid Lines Placeholder */}
                  <div className="absolute inset-0 flex flex-col justify-between p-lg opacity-10" >
                    {[1, 2, 3, 4, 5].map(i => (
                      <div className="w-full h-[1px] bg-4" key={i}/>
                    ))}
                  </div>

                  {/* Mock Chart Bars */}
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

                  {/* Legend */}
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
          </div>
        </div>

        {/* 체성분 상세 분석 정보 (InBody Style) */}
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
                <span className="text-Heading 2 text-text-dark-grey font-bold" >41.7 <small className="text-Label font-normal" >kg</small></span>
              </div>
              <div className="flex justify-between items-center p-md bg-bg-main-light-blue/30 rounded-md" >
                <span className="text-Body 1 text-text-grey-blue" >권장 섭취 열량</span>
                <span className="text-Heading 2 text-text-dark-grey font-bold" >1,840 <small className="text-Label font-normal" >kcal</small></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
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
