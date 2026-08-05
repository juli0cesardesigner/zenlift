// @ts-nocheck
import React from 'react';
import { Clock, Trash2, X, ChevronRight, FileText, Zap, Dumbbell, Users } from 'lucide-react';
import { HistoryLog } from '../../../types';
import { STATS_PERIOD_LABEL_MAP, muscleColors } from '../../../lib/constants';
import { isValidVideoUrl } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const PERIOD_LABEL_MAP = { week: "Semana", month: "Mês", year: "Ano", all: "Todos" } as const;

export function HistoryView(props: any) {
  const {
    activeTab, history, statsPeriod, setStatsPeriod, workoutSummary, setWorkoutSummary,
    reviewingWorkoutLog, setReviewingWorkoutLog, expandedCompletedExercises,
    setExpandedCompletedExercises, hoveredLogIdx, setHoveredLogIdx, statsData,
    handleDeleteHistoryLog, renderSyncButton, formatTime, filteredLogs, setIsAddingFocusModalOpen, focusedExercises, exerciseMapByName, setFocusedExercises, totalSetsAggregated, donutSlices, linesToDraw, nodesToDraw
  } = props;

  return (
    <>
        
          <div className="p-6 flex flex-col min-h-full">
            <div className="flex justify-between items-center mb-6">
              <h1 className="font-sans font-extrabold text-3xl uppercase text-white tracking-tight">Estatísticas</h1>
              {renderSyncButton()}
            </div>

            {/* Period Filters */}
            <div className="flex gap-2 mb-6 border-b border-concrete/15 pb-4">
              {(["week", "month", "year", "all"] as const).map((period) => {
                const isActive = statsPeriod === period;
                return (
                  <button
                    key={period}
                    onClick={() => setStatsPeriod(period)}
                    className={`flex-1 py-2 font-sans text-xs font-semibold uppercase rounded-xl border transition-all ${
                      isActive 
                        ? "bg-vulcanico border-vulcanico text-white font-bold shadow-lg shadow-vulcanico/20" 
                        : "border-concrete/20 text-concrete hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {PERIOD_LABEL_MAP[period]}
                  </button>
                );
              })}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 border border-concrete/15 rounded-2xl p-4 flex flex-col justify-between aspect-[3/2]">
                <span className="font-sans text-xs font-semibold text-concrete uppercase tracking-wider leading-none">Sessões</span>
                <span className="font-mono font-bold text-3xl sm:text-4xl text-white mt-2 leading-none">{filteredLogs.length}</span>
                <span className="font-sans text-[10px] font-medium text-concrete/80 uppercase mt-1">Treinos Realizados</span>
              </div>
              
              <div className="bg-white/5 border border-concrete/15 rounded-2xl p-4 flex flex-col justify-between aspect-[3/2]">
                <span className="font-sans text-xs font-semibold text-concrete uppercase tracking-wider leading-none">Tempo Total</span>
                <span className="font-mono font-bold text-3xl sm:text-4xl text-vulcanico mt-2 leading-none">
                  {((filteredLogs.reduce((acc, log) => acc + log.durationMs, 0)) / (1000 * 60 * 60)).toFixed(1)}h
                </span>
                <span className="font-sans text-[10px] font-medium text-concrete/80 uppercase mt-1">Horas de Atividade</span>
              </div>

              <div className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4 flex flex-col justify-between aspect-[3/2]">
                <span className="font-mono text-[9px] text-concrete uppercase tracking-widest leading-none">Média Sessão</span>
                <span className="font-display text-4xl text-white mt-2 leading-none">
                  {filteredLogs.length > 0 
                    ? Math.round((filteredLogs.reduce((acc, log) => acc + log.durationMs, 0) / filteredLogs.length) / 60000)
                    : 0
                  }m
                </span>
                <span className="font-mono text-[8px] text-concrete uppercase mt-1">Minutos por Treino</span>
              </div>

              <div className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4 flex flex-col justify-between aspect-[3/2]">
                <span className="font-mono text-[9px] text-concrete uppercase tracking-widest leading-none">Séries Feitas</span>
                <span className="font-display text-4xl text-white mt-2 leading-none">
                  {filteredLogs.reduce((acc, log) => acc + log.exercises.reduce((exAcc, ex) => exAcc + ex.sets.length, 0), 0)}
                </span>
                <span className="font-mono text-[8px] text-concrete uppercase mt-1">Total de Séries</span>
              </div>
            </div>

            {/* Section: Exercícios em Foco */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex justify-between items-center border-b border-concrete/20 pb-2">
                <h2 className="font-display text-xl uppercase text-white leading-none">Exercícios em Foco</h2>
                <button
                  onClick={() => setIsAddingFocusModalOpen(true)}
                  className="font-mono text-[9px] text-vulcanico uppercase tracking-wider underline hover:text-white"
                >
                  + Adicionar Foco
                </button>
              </div>

              {focusedExercises.length === 0 ? (
                <div className="bg-concrete/5 border border-dashed border-concrete/20 rounded-2xl p-6 text-center">
                  <p className="font-mono text-xs text-concrete uppercase">Nenhum exercício em foco.</p>
                  <p className="font-mono text-[9px] text-concrete/70 uppercase mt-1">Acompanhe seu histórico de cargas máximas e séries.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {focusedExercises.map(focusedName => {
                    const def = exerciseMapByName[focusedName];
                    
                    // Retrieve historical logs containing this exercise
                    let maxWeight = 0;
                    let totalSetsEver = 0;
                    const weightHistory: { date: number; maxWeight: number }[] = [];

                    history.filter(log => !log.isDeleted).forEach(log => {
                      let sessionMax = 0;
                      log.exercises.forEach(ex => {
                        if (ex.name === focusedName) {
                          ex.sets.forEach(s => {
                            totalSetsEver++;
                            const w = parseFloat(s.weight) || 0;
                            if (w > sessionMax) sessionMax = w;
                          });
                        }
                      });
                      if (sessionMax > 0) {
                        weightHistory.push({ date: log.date, maxWeight: sessionMax });
                        if (sessionMax > maxWeight) maxWeight = sessionMax;
                      }
                    });

                    // Sort chronological history of PRs for sparkline
                    const sortedWeightHistory = weightHistory.sort((a, b) => a.date - b.date);

                    // Generate Sparkline Path
                    let sparklinePath = "";
                    if (sortedWeightHistory.length > 1) {
                      const wMax = Math.max(...sortedWeightHistory.map(h => h.maxWeight));
                      const wMin = Math.min(...sortedWeightHistory.map(h => h.maxWeight));
                      const wDiff = wMax - wMin || 1;
                      const sWidth = 80;
                      const sHeight = 24;
                      const points = sortedWeightHistory.map((h, hIdx) => {
                        const x = (hIdx / (sortedWeightHistory.length - 1)) * sWidth;
                        const y = sHeight - ((h.maxWeight - wMin) / wDiff) * sHeight;
                        return `${x},${y}`;
                      });
                      sparklinePath = `M ${points.join(" L ")}`;
                    }

                    return (
                      <div key={focusedName} className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4 flex justify-between items-center transition-all">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display text-lg uppercase text-white leading-tight truncate">{focusedName}</h3>
                            <button
                              onClick={() => setFocusedExercises(prev => prev.filter(name => name !== focusedName))}
                              className="text-concrete hover:text-red-500 transition-colors shrink-0"
                              title="Remover Foco"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <span className="font-mono text-[9px] text-concrete uppercase bg-concrete/10 px-1.5 py-0.5 rounded">
                            {def?.muscle || "Geral"}
                          </span>
                          
                          <div className="grid grid-cols-2 gap-4 mt-3 pt-2 border-t border-concrete/10">
                            <div>
                              <span className="font-mono text-[8px] text-concrete uppercase block">Carga Máxima (PR)</span>
                              <span className="font-display text-xl text-vulcanico leading-none">{maxWeight} kg</span>
                            </div>
                            <div>
                              <span className="font-mono text-[8px] text-concrete uppercase block">Total de Séries</span>
                              <span className="font-display text-xl text-white leading-none">{totalSetsEver}</span>
                            </div>
                          </div>
                        </div>

                        {/* Sparkline Visual */}
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {sortedWeightHistory.length > 1 ? (
                            <svg className="w-20 h-8" viewBox="0 0 80 24">
                              <path
                                d={sparklinePath}
                                fill="none"
                                stroke="#FF4103"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <span className="font-mono text-[8px] text-concrete uppercase text-right leading-tight max-w-[80px]">
                              Dados insuficientes para gráfico
                            </span>
                          )}
                          <span className="font-mono text-[8px] text-concrete/70 uppercase">Evolução Cargas</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Visuals: Pie Chart & Network Graph */}
            <div className="flex flex-col gap-6 mb-8">
              
              {/* Gráfico de Pizza (Donut SVG) */}
              <div className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4">
                <h3 className="font-mono text-[10px] text-vulcanico uppercase font-bold tracking-widest border-b border-concrete/10 pb-2 mb-4">
                  Séries por Grupo Muscular
                </h3>
                {totalSetsAggregated === 0 ? (
                  <p className="font-mono text-xs text-concrete uppercase text-center py-6">Sem dados neste período.</p>
                ) : (
                  <div className="flex items-center gap-6 justify-center py-2">
                    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                      {/* Donut SVG */}
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="4.2" />
                        {donutSlices.map((slice, idx) => (
                          <circle 
                            key={idx}
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="4"
                            strokeDasharray={slice.strokeDasharray}
                            strokeDashoffset={slice.strokeDashoffset}
                            transform="rotate(-90 18 18)"
                          />
                        ))}
                      </svg>
                      {/* Central label */}
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="font-display text-2xl text-white leading-none">{totalSetsAggregated}</span>
                        <span className="font-mono text-[7px] text-concrete uppercase mt-0.5 tracking-wider">Séries</span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="flex-1 flex flex-col gap-2 min-w-0 pr-2">
                      {donutSlices.slice(0, 6).map((slice, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                            <span className="font-mono text-[9px] text-white uppercase truncate">{slice.muscle}</span>
                          </div>
                          <span className="font-mono text-[9px] text-concrete font-bold shrink-0">{Math.round(slice.percent)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Gráfico de Rede SVG */}
              <div className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4">
                <h3 className="font-mono text-[10px] text-vulcanico uppercase font-bold tracking-widest border-b border-concrete/10 pb-2 mb-4">
                  Sinergia e Distribuição Muscular
                </h3>
                {totalSetsAggregated === 0 ? (
                  <p className="font-mono text-xs text-concrete uppercase text-center py-6">Sem treinos para mapear rede.</p>
                ) : (
                  <div className="flex flex-col items-center">
                    <svg viewBox="0 0 300 240" className="w-full h-auto max-w-[280px]">
                      {/* Connection Lines */}
                      {linesToDraw.map((line) => (
                        <line
                          key={line.key}
                          x1={line.x1}
                          y1={line.y1}
                          x2={line.x2}
                          y2={line.y2}
                          stroke="#FF4103"
                          strokeOpacity={0.15 + Math.min(0.6, line.weight / 10)}
                          strokeWidth={Math.min(4, 1 + line.weight / 3)}
                          strokeDasharray={line.weight === 1 ? "2,2" : undefined}
                        />
                      ))}

                      {/* Nodes */}
                      {nodesToDraw.map((node) => (
                        <g key={node.muscle}>
                          {node.sets > 0 && (
                            <circle
                              cx={node.pos.x}
                              cy={node.pos.y}
                              r={node.radius + 4}
                              fill="transparent"
                              stroke={node.color}
                              strokeOpacity="0.2"
                              strokeWidth="1.5"
                              className={node.sets > 5 ? "animate-pulse" : ""}
                            />
                          )}
                          <circle
                            cx={node.pos.x}
                            cy={node.pos.y}
                            r={node.radius}
                            fill="#001621"
                            stroke={node.sets > 0 ? node.color : "#555555"}
                            strokeWidth="2.5"
                          />
                          {node.sets > 0 && (
                            <circle
                              cx={node.pos.x}
                              cy={node.pos.y}
                              r={node.radius - 3}
                              fill={node.color}
                              fillOpacity="0.8"
                            />
                          )}
                          <text
                            x={node.pos.x}
                            y={node.pos.y - node.radius - 5}
                            fill={node.sets > 0 ? "#ffffff" : "#555555"}
                            textAnchor="middle"
                            className="font-mono text-[8px] uppercase tracking-wider font-bold select-none"
                          >
                            {node.muscle}
                          </text>
                        </g>
                      ))}
                    </svg>
                    <p className="font-mono text-[8px] text-concrete/70 uppercase text-center mt-2 max-w-xs">
                      Linhas conectam músculos treinados juntos na mesma sessão. Espessura indica frequência.
                    </p>
                  </div>
                )}
              </div>

              {/* Gráfico de Linhas (Volume dos Treinos) */}
              <div className="bg-concrete/5 border border-concrete/10 rounded-2xl p-4">
                <h3 className="font-mono text-[10px] text-vulcanico uppercase font-bold tracking-widest border-b border-concrete/10 pb-2 mb-4">
                  Evolução de Volume de Carga
                </h3>
                {filteredLogs.length === 0 ? (
                  <p className="font-mono text-xs text-concrete uppercase text-center py-6">Sem treinos no período.</p>
                ) : (() => {
                  const sortedLogs = [...filteredLogs].sort((a, b) => a.date - b.date);
                  const wChart = 280;
                  const hChart = 140;
                  const pLeft = 40;
                  const pRight = 10;
                  const pTop = 15;
                  const pBottom = 25;
                  
                  const volumes = sortedLogs.map(l => l.volumeKg);
                  const maxVol = Math.max(...volumes, 500);
                  const minVol = 0;
                  const volDiff = maxVol - minVol || 1;

                  const points = sortedLogs.map((log, idx) => {
                    const x = pLeft + (idx / (sortedLogs.length - 1 || 1)) * (wChart - pLeft - pRight);
                    const y = pTop + (1 - (log.volumeKg - minVol) / volDiff) * (hChart - pTop - pBottom);
                    return { x, y, log, idx };
                  });

                  let pathD = "";
                  let areaD = "";
                  if (points.length > 0) {
                    const lineCoords = points.map(p => `${p.x},${p.y}`);
                    pathD = `M ${lineCoords.join(" L ")}`;
                    areaD = `${pathD} L ${points[points.length - 1].x},${hChart - pBottom} L ${points[0].x},${hChart - pBottom} Z`;
                  }

                  const hoveredPoint = hoveredLogIdx !== null ? points[hoveredLogIdx] : null;

                  return (
                    <div className="flex flex-col relative">
                      <svg viewBox={`0 0 ${wChart} ${hChart}`} className="w-full h-auto">
                        <defs>
                          <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF4103" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#FF4103" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Y Axis Grid Lines */}
                        {[0, 0.5, 1].map((ratio) => {
                          const y = pTop + ratio * (hChart - pTop - pBottom);
                          const val = Math.round(maxVol - ratio * volDiff);
                          return (
                            <g key={ratio} className="opacity-20">
                              <line
                                x1={pLeft}
                                y1={y}
                                x2={wChart - pRight}
                                y2={y}
                                stroke="#555555"
                                strokeWidth="0.8"
                                strokeDasharray="3,3"
                              />
                              <text
                                x={pLeft - 6}
                                y={y + 3}
                                fill="#ffffff"
                                textAnchor="end"
                                className="font-mono text-[7px] uppercase"
                              >
                                {val}kg
                              </text>
                            </g>
                          );
                        })}

                        {/* Chart Line Path */}
                        {points.length > 1 && (
                          <>
                            <path d={areaD} fill="url(#chartAreaGrad)" />
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#FF4103"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </>
                        )}

                        {/* Data Node Dots */}
                        {points.map((pt) => (
                          <circle
                            key={pt.idx}
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredLogIdx === pt.idx ? 5.5 : 3.5}
                            fill={hoveredLogIdx === pt.idx ? "#ffffff" : "#FF4103"}
                            stroke="#001621"
                            strokeWidth="1.5"
                            className="cursor-pointer transition-all"
                            onMouseEnter={() => setHoveredLogIdx(pt.idx)}
                            onMouseLeave={() => setHoveredLogIdx(null)}
                            onClick={() => setHoveredLogIdx(pt.idx)}
                          />
                        ))}

                        {/* X-Axis label dates */}
                        {points.length > 0 && (
                          <g className="opacity-40">
                            {[0, points.length - 1].map((pIdx) => {
                              const pt = points[pIdx];
                              if (!pt) return null;
                              const d = new Date(pt.log.date);
                              const label = `${d.getDate()}/${d.getMonth() + 1}`;
                              return (
                                <text
                                  key={pIdx}
                                  x={pt.x}
                                  y={hChart - 8}
                                  fill="#ffffff"
                                  textAnchor={pIdx === 0 ? "start" : "end"}
                                  className="font-mono text-[7px]"
                                >
                                  {label}
                                </text>
                              );
                            })}
                          </g>
                        )}
                      </svg>

                      {/* Tooltip Overlay */}
                      {hoveredPoint && (
                        <div className="absolute top-0 right-0 bg-noturno border border-concrete/30 p-2 rounded-xl flex flex-col gap-0.5 pointer-events-none select-none max-w-[120px] animate-fade-in shadow-xl z-10">
                          <span className="font-mono text-[8px] text-vulcanico uppercase tracking-wider font-bold">
                            {new Date(hoveredPoint.log.date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}
                          </span>
                          <span className="font-display text-[9px] text-white uppercase truncate leading-tight">
                            {hoveredPoint.log.name}
                          </span>
                          <span className="font-mono text-[9px] text-white">
                            Vol: <strong className="text-vulcanico">{hoveredPoint.log.volumeKg} kg</strong>
                          </span>
                          <span className="font-mono text-[8px] text-concrete">
                            Tempo: {formatTime(hoveredPoint.log.durationMs)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Workout History Log List */}
            <div className="flex flex-col gap-6">
              <h3 className="font-display text-xl uppercase text-white border-b border-concrete/20 pb-2 mb-2">
                Histórico de Treinos
              </h3>
              
              <div className="flex flex-col gap-8 pb-12">
                {filteredLogs.length === 0 ? (
                  <p className="font-mono text-concrete text-xs uppercase">Nenhum treino concluído no período.</p>
                ) : (() => {
                  const sortedChronological = [...filteredLogs].sort((a, b) => b.date - a.date); // newest first
                  return sortedChronological.map(log => {
                    const dateStr = new Date(log.date).toLocaleDateString("pt-BR", { 
                      weekday: 'short', 
                      day: '2-digit', 
                      month: 'short' 
                    });
                    return (
                      <div key={log.id} className="flex flex-col animate-fade-in">
                        <div className="flex justify-between items-end mb-4 border-b border-concrete/15 pb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-mono text-vulcanico text-[10px] uppercase">{dateStr}</p>
                              {log.workoutType === "forca" ? (
                                <span className="font-mono text-[9px] uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                  <Zap size={10} className="fill-amber-400" /> FORÇA
                                </span>
                              ) : (
                                <span className="font-mono text-[9px] uppercase bg-concrete/10 text-concrete border border-concrete/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Dumbbell size={10} /> ROTINA
                                </span>
                              )}
                              {log.sessionMode === "dual" && (
                                <span className="font-mono text-[9px] uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                  <Users size={10} className="text-cyan-400" /> DUAL ({log.partner1Name || "P1"} & {log.partner2Name || "P2"})
                                </span>
                              )}
                            </div>
                            <h2 className="font-display text-2xl uppercase text-white leading-none">{log.name}</h2>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <button
                              onClick={() => handleDeleteHistoryLog(log.id)}
                              className="text-concrete/50 hover:text-red-500 transition-colors p-1"
                              title="Excluir Treino"
                            >
                              <Trash2 size={14} />
                            </button>
                            <div className="text-right font-mono text-[9px] text-concrete uppercase leading-tight">
                              <p>{formatTime(log.durationMs)}</p>
                              <p className="text-vulcanico font-bold mt-0.5">{log.volumeKg} kg Vol</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 pl-2">
                          {log.exercises.map((ex, i) => (
                            <div 
                              key={i} 
                              className={`flex flex-col ${
                                ex.supersetGroupId 
                                  ? "border-l-2 border-l-purple-500 pl-2 bg-purple-500/2 py-1 my-0.5 rounded-r" 
                                  : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-display text-sm uppercase text-white">{ex.name}</span>
                                  {ex.supersetGroupId && (
                                    <span className="font-mono text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 rounded font-bold uppercase">
                                      Conjugado
                                    </span>
                                  )}
                                </div>
                                {ex.elapsedSeconds !== undefined && ex.elapsedSeconds > 0 && (
                                  <span className="font-mono text-[9px] text-concrete uppercase flex items-center gap-1">
                                    <Clock size={9} />
                                    {formatTime(ex.elapsedSeconds * 1000)}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 font-mono text-[9px] text-concrete uppercase mt-0.5">
                                {ex.sets.map((s, idx) => {
                                  let label = s.weight ? `${s.weight}kg x ${s.reps}` : s.reps;
                                  let methodTag = "";
                                  const type = s.methodType || (s.isDropSet ? "drop-set" : s.isToFailure ? "failure" : "normal");
                                  if (type === "drop-set") {
                                    methodTag = `D${s.dropCount && s.dropCount > 1 ? `x${s.dropCount}` : ""}`;
                                  } else if (type === "failure") {
                                    const fMap: Record<string, string> = { concentrica: "C", excentrica: "E", isometrica: "I" };
                                    const fLetter = s.failureType ? fMap[s.failureType] || "" : "";
                                    methodTag = `F${fLetter ? `-${fLetter}` : ""}`;
                                  } else if (type === "rest-pause") {
                                    const sub = s.restPauseSets ? `x${s.restPauseSets}` : "";
                                    methodTag = `RP${sub ? ` ${sub}` : ""}`;
                                  } else if (type === "warmup") {
                                    methodTag = "W";
                                  } else if (type === "custom") {
                                    methodTag = (s.customMethodName || "CST").substring(0, 3).toUpperCase();
                                  }
                                  if (methodTag) {
                                    label += ` [${methodTag}]`;
                                  }
                                  return (
                                    <span key={idx} className="bg-concrete/5 px-1.5 py-0.5 rounded">
                                      S{idx + 1}: {label}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

          </div>
    </>
  );
}
