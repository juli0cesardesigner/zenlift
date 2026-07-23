// @ts-nocheck
import React, { useMemo } from 'react';
import { Activity, Trophy, Clock, Dumbbell, Target, Flame, Calendar, ChevronRight, History } from 'lucide-react';
import { muscleColors } from '../../../lib/constants';

export function AdvancedStatsDashboard(props: any) {
  const { 
    history, 
    filteredLogs, 
    totalSetsAggregated, 
    donutSlices, 
    formatTime, 
    handleDeleteHistoryLog,
    statsPeriod,
    setStatsPeriod
  } = props;

  // KPIs
  const totalWorkouts = filteredLogs.length;
  const totalSets = Object.values(totalSetsAggregated as Record<string, number>).reduce((a, b) => a + b, 0);
  
  const favoriteMuscle = useMemo(() => {
    if (donutSlices.length === 0) return { name: "N/A", sets: 0 };
    return donutSlices.reduce((prev: any, current: any) => (prev.sets > current.sets) ? prev : current);
  }, [donutSlices]);


  // Muscle Recovery/Fatigue Logic (Last 7 Days)
  const muscleFatigue = useMemo(() => {
    const fatigue = {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0,0,0,0);
    
    if (history && exerciseMapByName) {
      history.forEach((log) => {
        const logDate = new Date(log.date);
        if (logDate >= sevenDaysAgo) {
          log.exercises.forEach((exLog) => {
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

  const getFatigueColor = (sets) => {
    if (!sets || sets === 0) return "bg-green-500/20 text-green-400 border-green-500/30"; // Descansado
    if (sets <= 6) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"; // Leve
    if (sets <= 12) return "bg-orange-500/20 text-orange-400 border-orange-500/30"; // Moderado
    return "bg-red-500/20 text-red-500 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]"; // Fadigado
  };

  const getFatigueLabel = (sets) => {
    if (!sets || sets === 0) return "Pronto (0s)";
    if (sets <= 6) return `Leve (${sets}s)`;
    if (sets <= 12) return `Fadigado (${sets}s)`;
    return `Exausto (${sets}s)`;
  };


  // PR Hunter Logic (Simplified mock detection)
  const recentPRs = useMemo(() => {
    if (!history || history.length === 0) return [];
    const prs = [];
    // We just take the last 3 workouts and pretend the max weight lifted was a PR for demonstration
    const recentLogs = [...history].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    
    recentLogs.forEach(log => {
      if (log.exercises && log.exercises.length > 0) {
         const bestEx = log.exercises.reduce((prev, curr) => {
            const prevMax = Math.max(...prev.sets.map(s => s.weight || 0), 0);
            const currMax = Math.max(...curr.sets.map(s => s.weight || 0), 0);
            return currMax > prevMax ? curr : prev;
         }, log.exercises[0]);
         
         const maxWeight = Math.max(...bestEx.sets.map(s => s.weight || 0), 0);
         if (maxWeight > 0) {
            prs.push({
               exercise: bestEx.name,
               weight: maxWeight,
               date: log.date
            });
         }
      }
    });
    return prs;
  }, [history]);

  // Heatmap Logic (Last 90 days)
  const heatmapData = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const workoutsOnDay = history.filter((h: any) => h.date.startsWith(dateStr)).length;
      days.push({ date: d, count: workoutsOnDay });
    }
    return days;
  }, [history]);

  return (
    <div className="w-full h-full p-8 flex flex-col gap-8 overflow-y-auto animate-fade-in custom-scrollbar">
      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-concrete/20 pb-6">
        <div>
          <h1 className="text-4xl font-display uppercase tracking-widest text-white flex items-center gap-3">
            <Activity className="text-vulcanico" size={36} />
            Command Center
          </h1>
          <p className="text-concrete font-mono text-xs uppercase mt-2">Visão Estratégica do seu Progresso</p>
        </div>

        {/* Period Selector (Reused from Mobile but styled for Desktop) */}
        <div className="flex bg-black/40 p-1 rounded-lg border border-concrete/10">
          {["week", "month", "year", "all"].map(p => (
            <button
              key={p}
              onClick={() => setStatsPeriod(p)}
              className={`px-6 py-2 rounded-md font-mono text-xs uppercase transition-all ${
                statsPeriod === p ? "bg-vulcanico text-noturno font-bold shadow-lg" : "text-concrete hover:text-white"
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
            <div className="bg-gradient-to-br from-noturno to-black border border-concrete/20 p-6 rounded-2xl flex items-center gap-6 shadow-xl relative overflow-hidden group hover:border-vulcanico/50 transition-colors">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Trophy size={100} />
              </div>
              <div className="p-4 bg-vulcanico/10 text-vulcanico rounded-xl">
                <Trophy size={32} />
              </div>
              <div>
                <p className="font-mono text-xs text-concrete uppercase tracking-wider mb-1">Treinos Realizados</p>
                <p className="font-display text-4xl text-white">{totalWorkouts}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-noturno to-black border border-concrete/20 p-6 rounded-2xl flex items-center gap-6 shadow-xl relative overflow-hidden group hover:border-vulcanico/50 transition-colors">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Dumbbell size={100} />
              </div>
              <div className="p-4 bg-blue-500/10 text-blue-400 rounded-xl">
                <Dumbbell size={32} />
              </div>
              <div>
                <p className="font-mono text-xs text-concrete uppercase tracking-wider mb-1">Volume (Séries)</p>
                <p className="font-display text-4xl text-white">{totalSets}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-noturno to-black border border-concrete/20 p-6 rounded-2xl flex items-center gap-6 shadow-xl relative overflow-hidden group hover:border-vulcanico/50 transition-colors">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Flame size={100} />
              </div>
              <div className="p-4 bg-red-500/10 text-red-400 rounded-xl">
                <Flame size={32} />
              </div>
              <div>
                <p className="font-mono text-xs text-concrete uppercase tracking-wider mb-1">Músculo Foco</p>
                <p className="font-display text-2xl text-white uppercase">{favoriteMuscle.name}</p>
              </div>
            </div>
          </div>

          {/* HEATMAP */}
          <div className="bg-noturno border border-concrete/20 p-8 rounded-2xl shadow-xl flex flex-col gap-6">
             <div className="flex items-center gap-2 text-white">
                <Calendar className="text-vulcanico" size={20} />
                <h3 className="font-display text-lg uppercase tracking-widest">Frequência (90 Dias)</h3>
             </div>
             
             <div className="flex flex-wrap gap-2">
                {heatmapData.map((day, i) => {
                  let colorClass = "bg-concrete/10"; // 0 workouts
                  if (day.count === 1) colorClass = "bg-vulcanico/40";
                  if (day.count === 2) colorClass = "bg-vulcanico/70";
                  if (day.count >= 3) colorClass = "bg-vulcanico shadow-[0_0_10px_rgba(255,65,3,0.8)]";

                  return (
                    <div 
                      key={i} 
                      className={`w-4 h-4 rounded-sm ${colorClass} transition-all hover:scale-125 cursor-help`}
                      title={`${day.date.toLocaleDateString()}: ${day.count} treinos`}
                    />
                  )
                })}
             </div>
             <div className="flex items-center gap-2 justify-end font-mono text-[10px] text-concrete uppercase mt-2">
               <span>Menos</span>
               <div className="flex gap-1">
                 <div className="w-3 h-3 rounded-sm bg-concrete/10"></div>
                 <div className="w-3 h-3 rounded-sm bg-vulcanico/40"></div>
                 <div className="w-3 h-3 rounded-sm bg-vulcanico/70"></div>
                 <div className="w-3 h-3 rounded-sm bg-vulcanico"></div>
               </div>
               <span>Mais</span>
             </div>
          </div>

          
          {/* VOLUME PROGRESSION CHART */}
          <div className="bg-noturno border border-concrete/20 p-8 rounded-2xl shadow-xl flex flex-col gap-6 group hover:border-vulcanico/30 transition-colors relative overflow-hidden">
             <div className="flex justify-between items-center text-white border-b border-concrete/10 pb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <Activity className="text-vulcanico" size={20} />
                  <h3 className="font-display text-lg uppercase tracking-widest">Progressão de Volume (Séries/Dia)</h3>
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
                    const dataPoints = heatmapData.slice(-14); // Last 14 days
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
                          stroke="#ff4103"
                          strokeWidth="2"
                          points={points}
                          className="drop-shadow-[0_0_8px_rgba(255,65,3,0.8)]"
                        />
                        {dataPoints.map((d, i) => {
                          const x = (i / (dataPoints.length - 1)) * 100;
                          const y = 100 - ((d.count / maxCount) * 100);
                          return (
                            <circle key={i} cx={x} cy={y} r="2" fill="#001621" stroke="#ff4103" strokeWidth="1" className="hover:r-3 cursor-crosshair transition-all" />
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


          {/* HORIZONTAL BARS FOR MUSCLES */}
          <div className="bg-noturno border border-concrete/20 p-8 rounded-2xl shadow-xl flex flex-col gap-6">
             <div className="flex items-center gap-2 text-white">
                <Target className="text-vulcanico" size={20} />
                <h3 className="font-display text-lg uppercase tracking-widest">Distribuição Muscular</h3>
             </div>

             <div className="flex flex-col gap-4 mt-4">
                {donutSlices.map((slice: any, idx: number) => {
                  const percentage = ((slice.sets / totalSets) * 100).toFixed(1);
                  const color = muscleColors[slice.name] || "#FFFFFF";
                  return (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono text-xs uppercase">
                        <span style={{ color }}>{slice.name}</span>
                        <span className="text-concrete">{slice.sets} Séries ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-black/50 h-3 rounded-full overflow-hidden border border-concrete/10">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${percentage}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
                {donutSlices.length === 0 && (
                  <p className="text-concrete font-mono text-xs uppercase text-center py-8">Sem dados no período</p>
                )}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT HISTORY */}
        <div className="col-span-4 bg-noturno border border-concrete/20 rounded-2xl p-6 shadow-xl flex flex-col h-[850px] overflow-hidden">
          <h3 className="font-display text-lg uppercase tracking-widest text-white mb-6 border-b border-concrete/20 pb-4">
            Histórico Detalhado
          </h3>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
            {filteredLogs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-concrete/50">
                <History size={48} className="mb-4 opacity-50" />
                <p className="font-mono text-xs uppercase">Nenhum treino no período</p>
              </div>
            ) : (
              filteredLogs.map((log: any, idx: number) => (
                <div key={log.id} className="bg-black/40 border border-concrete/10 p-4 rounded-xl flex flex-col gap-3 group hover:border-vulcanico/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-display text-white uppercase text-sm">{log.planName}</h4>
                      <p className="font-mono text-[10px] text-vulcanico uppercase mt-1">{new Date(log.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-xs text-concrete flex items-center gap-1">
                        <Clock size={12} /> {formatTime(log.durationMs)}
                      </span>
                      <span className="font-mono text-[10px] text-concrete mt-1">
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
