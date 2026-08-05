import React, { useMemo } from 'react';
import { Activity, Trophy, Clock, Dumbbell, Target, Flame, Calendar, History, Cpu, Sparkles } from 'lucide-react';
import { muscleColors } from '../../../lib/constants';
import { calculateMuscleRank, recommendOptimalMuscles } from '../../../lib/muscleRank';

import { HistoryLog } from '../../../types';

export function AdvancedStatsDashboard(props: any) {
  const { 
    history, 
    filteredLogs, 
    totalSetsAggregated, 
    donutSlices, 
    formatTime, 
    handleDeleteHistoryLog,
    statsPeriod,
    setStatsPeriod,
    exerciseMapByName
  } = props;

  // KPIs
  const totalWorkouts = filteredLogs ? filteredLogs.length : 0;
  const totalSets = totalSetsAggregated ? Object.values(totalSetsAggregated as Record<string, number>).reduce((a, b) => a + b, 0) : 0;
  
  const favoriteMuscle = useMemo(() => {
    if (!donutSlices || donutSlices.length === 0) return { name: "N/A", sets: 0 };
    return donutSlices.reduce((prev: any, current: any) => (prev.sets > current.sets) ? prev : current);
  }, [donutSlices]);

  // Page & Brin MuscleRank Engine
  const muscleRankData = useMemo(() => {
    return calculateMuscleRank(history || []);
  }, [history]);

  const recommendedMuscles = useMemo(() => {
    return recommendOptimalMuscles(muscleRankData);
  }, [muscleRankData]);


  // Muscle Recovery/Fatigue Logic (Last 7 Days)
  const muscleFatigue = useMemo(() => {
    const fatigue: Record<string, number> = {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0,0,0,0);
    
    if (history && exerciseMapByName) {
      history.forEach((log: HistoryLog) => {
        const logDate = new Date(log.date);
        if (logDate >= sevenDaysAgo) {
          log.exercises?.forEach((exLog: any) => {
             const def = exerciseMapByName[exLog.name];
             if (def) {
                fatigue[def.muscle] = (fatigue[def.muscle] || 0) + exLog.sets.length;
             }
          });
        }
      });
    }
    return fatigue;
  }, [history, exerciseMapByName]);

  // Heatmap Logic (Last 90 days)
  const heatmapData = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const workoutsOnDay = history ? history.filter((h: any) => {
        if (!h || !h.date) return false;
        try {
          const logDateStr = (typeof h.date === 'string' && h.date.includes('-')) 
            ? h.date.split('T')[0] 
            : new Date(Number(h.date) || h.date).toISOString().split('T')[0];
          return logDateStr === dateStr;
        } catch {
          return false;
        }
      }).length : 0;
      days.push({ date: d, count: workoutsOnDay });
    }
    return days;
  }, [history]);

  return (
    <div className="w-full h-full p-8 flex flex-col gap-8 overflow-y-auto animate-fade-in custom-scrollbar">
      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-concrete/15 pb-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-sans font-extrabold tracking-tight text-white flex items-center gap-3">
            <Activity className="text-vulcanico" size={32} />
            Estatísticas & Performance
          </h1>
          <p className="text-concrete font-sans text-xs uppercase tracking-wider font-semibold mt-1">Visão Estratégica do seu Progresso</p>
        </div>

        {/* Period Selector */}
        <div className="flex bg-black/40 p-1.5 rounded-xl border border-concrete/15 gap-1">
          {["week", "month", "year", "all"].map(p => (
            <button
              key={p}
              onClick={() => setStatsPeriod && setStatsPeriod(p)}
              className={`px-5 py-2 rounded-lg font-sans text-xs font-semibold uppercase tracking-wider transition-all ${
                statsPeriod === p ? "bg-vulcanico text-white font-bold shadow-lg shadow-vulcanico/25" : "text-concrete hover:text-white hover:bg-white/5"
              }`}
            >
              {p === "week" ? "7 Dias" : p === "month" ? "30 Dias" : p === "year" ? "1 Ano" : "Tudo"}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: CHARTS AND KPIS */}
        <div className="col-span-8 flex flex-col gap-8">
          
          {/* KPIS */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-noturno/90 to-black border border-concrete/15 p-6 rounded-2xl flex items-center gap-5 shadow-xl relative overflow-hidden group hover:border-vulcanico/40 transition-all">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Trophy size={100} />
              </div>
              <div className="p-3.5 bg-vulcanico/10 text-vulcanico rounded-xl border border-vulcanico/20">
                <Trophy size={28} />
              </div>
              <div>
                <p className="font-sans text-xs font-semibold text-concrete uppercase tracking-wider mb-1">Treinos Realizados</p>
                <p className="font-mono font-bold text-3xl text-white tracking-tight">{totalWorkouts}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-noturno/90 to-black border border-concrete/15 p-6 rounded-2xl flex items-center gap-5 shadow-xl relative overflow-hidden group hover:border-blue-500/40 transition-all">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Dumbbell size={100} />
              </div>
              <div className="p-3.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Dumbbell size={28} />
              </div>
              <div>
                <p className="font-sans text-xs font-semibold text-concrete uppercase tracking-wider mb-1">Volume (Séries)</p>
                <p className="font-mono font-bold text-3xl text-white tracking-tight">{totalSets}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-noturno/90 to-black border border-concrete/15 p-6 rounded-2xl flex items-center gap-5 shadow-xl relative overflow-hidden group hover:border-red-500/40 transition-all">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Flame size={100} />
              </div>
              <div className="p-3.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                <Flame size={28} />
              </div>
              <div>
                <p className="font-sans text-xs font-semibold text-concrete uppercase tracking-wider mb-1">Músculo Foco</p>
                <p className="font-sans font-bold text-xl text-white uppercase tracking-tight">{favoriteMuscle.name}</p>
              </div>
            </div>
          </div>

          {/* HEATMAP */}
          <div className="bg-noturno/90 border border-concrete/15 p-8 rounded-2xl shadow-xl flex flex-col gap-6">
             <div className="flex items-center gap-2 text-white">
                <Calendar className="text-vulcanico" size={20} />
                <h3 className="font-sans font-bold text-base uppercase tracking-wider">Frequência (Últimos 90 Dias)</h3>
             </div>
             
             <div className="flex flex-wrap gap-2">
                {heatmapData.map((day, i) => {
                  let colorClass = "bg-white/5 border border-white/5"; // 0 workouts
                  if (day.count === 1) colorClass = "bg-vulcanico/40 border border-vulcanico/50";
                  if (day.count === 2) colorClass = "bg-vulcanico/75 border border-vulcanico/80";
                  if (day.count >= 3) colorClass = "bg-vulcanico shadow-[0_0_12px_rgba(255,65,3,0.8)] border border-vulcanico";

                  return (
                    <div 
                      key={i} 
                      className={`w-4 h-4 rounded-md ${colorClass} transition-all hover:scale-125 cursor-help`}
                      title={`${day.date.toLocaleDateString('pt-BR')}: ${day.count} treino(s)`}
                    />
                  )
                })}
             </div>
             <div className="flex items-center gap-2 justify-end font-sans text-xs font-semibold text-concrete uppercase tracking-wider mt-2">
               <span>Menos</span>
               <div className="flex gap-1.5">
                 <div className="w-3.5 h-3.5 rounded-sm bg-white/5 border border-white/5"></div>
                 <div className="w-3.5 h-3.5 rounded-sm bg-vulcanico/40"></div>
                 <div className="w-3.5 h-3.5 rounded-sm bg-vulcanico/75"></div>
                 <div className="w-3.5 h-3.5 rounded-sm bg-vulcanico"></div>
               </div>
               <span>Mais</span>
             </div>
          </div>

          
          {/* VOLUME PROGRESSION CHART */}
          <div className="bg-noturno/90 border border-concrete/15 p-8 rounded-2xl shadow-xl flex flex-col gap-6 group hover:border-vulcanico/30 transition-all relative overflow-hidden">
             <div className="flex justify-between items-center text-white border-b border-concrete/10 pb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <Activity className="text-vulcanico" size={20} />
                  <h3 className="font-sans font-bold text-base uppercase tracking-wider">Progressão de Volume (Séries/Dia)</h3>
                </div>
             </div>
             
             <div className="h-48 w-full mt-4 relative z-10">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                  {/* Grid lines */}
                  <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  
                  {/* Dynamic Line based on heatmapData */}
                  {(() => {
                    const dataPoints = heatmapData.slice(-14);
                    const maxCount = Math.max(...dataPoints.map(d => d.count), 1);
                    const points = dataPoints.map((d, i) => {
                      const x = (i / (dataPoints.length - 1)) * 100;
                      const y = 100 - ((d.count / maxCount) * 100);
                      return `${x},${y}`;
                    }).join(" ");
                    
                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#FF4103"
                          strokeWidth="2.5"
                          points={points}
                          className="drop-shadow-[0_0_10px_rgba(255,65,3,0.8)]"
                        />
                        {dataPoints.map((d, i) => {
                          const x = (i / (dataPoints.length - 1)) * 100;
                          const y = 100 - ((d.count / maxCount) * 100);
                          return (
                            <circle key={i} cx={x} cy={y} r="2.5" fill="#001621" stroke="#FF4103" strokeWidth="1.5" className="hover:r-4 cursor-crosshair transition-all" />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
             </div>
             
             {/* Decorative Background */}
             <Activity size={200} className="absolute -bottom-10 -right-10 text-white/5 pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
          </div>


          {/* MUSCLERANK AI RECOVERY ENGINE (Page, Brin & Jensen Huang) */}
          <div className="bg-gradient-to-br from-[#001E2E] to-[#00121C] border border-vulcanico/30 p-8 rounded-2xl shadow-2xl flex flex-col gap-6 relative overflow-hidden">
            <div className="flex justify-between items-center z-10">
              <div className="flex items-center gap-2 text-white">
                <Cpu className="text-vulcanico animate-pulse" size={22} />
                <h3 className="font-sans font-bold text-base uppercase tracking-wider">MuscleRank™ Recovery Engine</h3>
              </div>
              <span className="font-mono text-[9px] bg-vulcanico/20 text-vulcanico px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-vulcanico/30 flex items-center gap-1">
                <Sparkles size={10} /> AI Recommendation
              </span>
            </div>

            {/* Optimal Muscles Recommended for Today */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 z-10">
              <span className="font-mono text-[10px] text-concrete uppercase tracking-widest font-bold">
                Músculos Ideais para Treinar Hoje (Maior Nível de Recuperação):
              </span>
              <div className="flex gap-2 flex-wrap mt-1">
                {recommendedMuscles.map(m => (
                  <span key={m} className="bg-vulcanico text-noturno font-display text-sm font-extrabold uppercase px-3 py-1 rounded-lg shadow-[0_0_10px_rgba(255,65,3,0.4)]">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Recovery Matrix breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 z-10">
              {Object.values(muscleRankData).map(item => (
                <div key={item.muscle} className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-white uppercase">{item.muscle}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      item.status === 'recuperado' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' :
                      item.status === 'em_recuperacao' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' :
                      'bg-red-500 shadow-[0_0_8px_#ef4444]'
                    }`} />
                  </div>
                  <div className="mt-2 flex justify-between items-baseline">
                    <span className="font-mono text-lg font-bold text-vulcanico">{item.recoveryPercentage}%</span>
                    <span className="font-mono text-[9px] text-concrete uppercase">
                      {item.lastTrainedHoursAgo !== null ? `${item.lastTrainedHoursAgo}h atrás` : 'Sem dados'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HORIZONTAL BARS FOR MUSCLES */}
          <div className="bg-noturno/90 border border-concrete/15 p-8 rounded-2xl shadow-xl flex flex-col gap-6">
             <div className="flex items-center gap-2 text-white">
                <Target className="text-vulcanico" size={20} />
                <h3 className="font-sans font-bold text-base uppercase tracking-wider">Distribuição Muscular</h3>
             </div>

             <div className="flex flex-col gap-4 mt-2">
                {donutSlices && donutSlices.map((slice: any, idx: number) => {
                  const percentage = totalSets > 0 ? ((slice.sets / totalSets) * 100).toFixed(1) : "0";
                  const color = muscleColors[slice.name] || "#FFFFFF";
                  return (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <div className="flex justify-between font-sans text-xs font-semibold">
                        <span style={{ color }} className="uppercase tracking-wider">{slice.name}</span>
                        <span className="font-mono text-concrete font-medium">{slice.sets} Séries ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-black/50 h-2.5 rounded-full overflow-hidden border border-concrete/10">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${percentage}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(!donutSlices || donutSlices.length === 0) && (
                  <p className="text-concrete font-sans text-xs uppercase tracking-wider text-center py-8">Sem dados no período</p>
                )}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT HISTORY */}
        <div className="col-span-4 bg-noturno/90 border border-concrete/15 rounded-2xl p-6 shadow-xl flex flex-col h-[850px] overflow-hidden">
          <h3 className="font-sans font-bold text-base uppercase tracking-wider text-white mb-6 border-b border-concrete/15 pb-4">
            Histórico Detalhado
          </h3>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
            {(!filteredLogs || filteredLogs.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-concrete/50">
                <History size={48} className="mb-4 opacity-40" />
                <p className="font-sans text-xs font-semibold uppercase tracking-wider">Nenhum treino no período</p>
              </div>
            ) : (
              filteredLogs.map((log: any, idx: number) => (
                <div key={log.id || idx} className="bg-black/40 border border-concrete/10 p-4 rounded-xl flex flex-col gap-3 group hover:border-vulcanico/30 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-sans font-bold text-white uppercase text-sm tracking-wide">{log.planName}</h4>
                      <p className="font-mono text-[11px] font-semibold text-vulcanico uppercase mt-1">
                        {new Date(log.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-xs font-medium text-concrete flex items-center gap-1.5">
                        <Clock size={13} className="text-concrete" /> {formatTime ? formatTime(log.durationMs) : log.durationMs}
                      </span>
                      <span className="font-mono text-xs font-semibold text-concrete/80 mt-1">
                        {log.totalSets} Séries
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
