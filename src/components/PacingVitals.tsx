/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { SceneMetadata, ShotAsset } from "../types";
import { Activity, Music, TrendingUp, Sparkles, Film, Percent } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface PacingVitalsProps {
  scenes: SceneMetadata[];
  shots: ShotAsset[];
  onUpdateAllShots?: (updatedShots: ShotAsset[]) => void;
}

export default function PacingVitals({ scenes = [], shots = [], onUpdateAllShots }: PacingVitalsProps) {
  const safeScenes = scenes || [];
  const safeShots = shots || [];

  // Aggregate stats
  const totalShots = safeShots.length;
  const totalDuration = safeShots.reduce((sum, s) => sum + (s?.durationSeconds || 0), 0);
  const avgShotDuration = totalShots > 0 ? totalDuration / totalShots : 0;
  
  // Calculate average emotional intensity
  const avgIntensity = safeScenes.length > 0 
    ? (safeScenes.reduce((sum, s) => sum + (s?.emotionalIntensity || 0), 0) / safeScenes.length) 
    : 0;

  // Prepare recharts data
  const chartData = safeScenes
    .filter(Boolean)
    .map((scene) => ({
      name: `Scene ${scene.sceneNumber}`,
      intensity: scene.emotionalIntensity || 0,
      setting: scene.setting || "UNKNOWN",
      pace: scene.paceValue || 0,
      summary: scene.summary || "",
    })).sort((a, b) => {
      const numA = parseInt(a.name.replace("Scene ", ""), 10) || 0;
      const numB = parseInt(b.name.replace("Scene ", ""), 10) || 0;
      return numA - numB;
    });

  const intensities = chartData.map(d => d.intensity);
  const maxIntensity = intensities.length > 0 ? Math.max(...intensities) : 10;
  const minIntensity = intensities.length > 0 ? Math.min(...intensities) : 1;

  const handleSyncAllSceneColors = () => {
    if (!onUpdateAllShots || safeShots.length === 0) return;
    
    let updatedShots = [...safeShots];
    const uniqueScenes = Array.from(new Set(safeShots.map(s => s?.sceneNumber).filter(Boolean)));
    
    uniqueScenes.forEach(scNum => {
      const sceneShots = updatedShots.filter(s => s && s.sceneNumber === scNum);
      if (sceneShots.length > 1 && sceneShots[0]?.themeColors) {
        const targetColors = [...sceneShots[0].themeColors];
        updatedShots = updatedShots.map(s => {
          if (s && s.sceneNumber === scNum) {
            return {
              ...s,
              themeColors: targetColors
            };
          }
          return s;
        });
      }
    });
    
    onUpdateAllShots(updatedShots);
  };

  // Recommended Sound Design Mood based on intensity & pace
  const getMusicMoodRecommendation = () => {
    if (safeScenes.length === 0 || !safeScenes[0]) return "Ambient drone";
    const primaryPace = safeScenes[0].paceValue || 0;
    const primaryIntensity = safeScenes[0].emotionalIntensity || 0;

    if (primaryIntensity >= 7 && primaryPace >= 7) {
      return "Sub-bass industrial analog synth, sudden percussive drops";
    }
    if (primaryIntensity >= 7 && primaryPace < 7) {
      return "Low-key minor-key piano chord clusters with swells of high-tension strings";
    }
    if (primaryIntensity < 7 && primaryPace >= 7) {
      return "Pulsing mid-tempo electronic synthesizer beat, dynamic percussion click highlights";
    }
    return "Ethereal minimalist pad textures, spacious, cold reverbed atmosphere";
  };

  // Generate SVG graph coordinates for Pacing (blue line) and Tension (rose line)
  const drawGraphPoints = (type: "pacing" | "tension") => {
    if (safeShots.length === 0) return "";
    
    const width = 500;
    const height = 110;
    const padding = 15;
    
    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;
    
    const stepX = safeShots.length > 1 ? usableWidth / (safeShots.length - 1) : usableWidth;
    
    let points = "";
    
    safeShots.forEach((shot, idx) => {
      if (!shot) return;
      // Find corresponding scene for intensity/tension
      const associatedScene = safeScenes.find(s => s && s.sceneNumber === shot.sceneNumber);
      
      const val = type === "pacing"
        // Shot duration inverted as speed indicator (longer shot = slower speed/pacing)
        ? Math.max(1, Math.min(10, 15 / (shot.durationSeconds || 3)))
        : (associatedScene?.emotionalIntensity || 5);
        
      const x = padding + idx * stepX;
      // Invert Y so higher is on top
      const y = padding + usableHeight - ((val - 1) / 9) * usableHeight;
      
      points += `${idx === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)} `;
    });
    
    return points;
  };

  return (
    <div id="pacing-vitals-panel" className="bg-bento-card border border-bento-border rounded-xl p-5 shadow-2xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-bento-border">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-bento-accent" />
          <h2 className="font-sans font-semibold text-slate-200 tracking-tight text-sm uppercase">
            Cinematic Rhythm & Pacing Vitals
          </h2>
        </div>
        {onUpdateAllShots && shots.length > 0 && (
          <button
            id="btn-sync-all-scene-colors"
            onClick={handleSyncAllSceneColors}
            className="self-start sm:self-auto bg-bento-canvas hover:bg-slate-900 border border-bento-accent/30 text-bento-accent hover:border-bento-accent text-[11px] font-mono px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer uppercase font-bold"
            title="Applies a uniform color grade theme to all shots within the same scene based on the first shot of each scene."
          >
            <Sparkles className="w-3.5 h-3.5 text-bento-accent animate-pulse" />
            <span>Sync All Scene Themes</span>
          </button>
        )}
      </div>

      {/* Grid of indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-bento-bg border border-bento-border p-3.5 rounded-lg flex flex-col justify-between hover:border-bento-accent/35 transition-all">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
            Total Narrative Scenes
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100 font-sans tracking-tight">
              {scenes.length}
            </span>
            <span className="text-[10px] font-mono text-slate-500">Locations</span>
          </div>
        </div>

        <div className="bg-bento-bg border border-bento-border p-3.5 rounded-lg flex flex-col justify-between hover:border-bento-accent/35 transition-all">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
            Sequence Air-Time
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-bento-accent font-sans tracking-tight">
              {totalDuration.toFixed(1)}s
            </span>
            <span className="text-[10px] font-mono text-slate-500">Total</span>
          </div>
        </div>

        <div className="bg-bento-bg border border-bento-border p-3.5 rounded-lg flex flex-col justify-between hover:border-bento-accent/35 transition-all">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
            Avg Shot Rhythm
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-bento-accent font-sans tracking-tight">
              {avgShotDuration.toFixed(1)}s
            </span>
            <span className="text-[10px] font-mono text-slate-500">Per Cut</span>
          </div>
        </div>

        <div className="bg-bento-bg border border-bento-border p-3.5 rounded-lg flex flex-col justify-between hover:border-bento-accent/35 transition-all">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
            Emotional Intensity
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-bento-accent font-sans tracking-tight">
              {avgIntensity.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-medium">/10 Peak</span>
          </div>
        </div>
      </div>

      {/* Recommended Audio Treatment */}
      <div className="bg-bento-canvas border border-bento-border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-md bg-bento-card border border-bento-border">
            <Music className="w-5 h-5 text-bento-accent" />
          </div>
          <div>
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              AI Sound Design Recommendation
            </h4>
            <p className="text-sm text-bento-accent font-medium font-sans mt-0.5">
              {getMusicMoodRecommendation()}
            </p>
          </div>
        </div>
        <div className="bg-bento-card px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 flex items-center gap-1 shrink-0 border border-bento-border">
          <Sparkles className="w-3.5 h-3.5 text-bento-accent animate-pulse" /> Directorial Treatment
        </div>
      </div>

      {/* Narrative Arc Recharts Line Chart */}
      {scenes.length > 0 && (
        <div id="narrative-arc-recharts-panel" className="bg-bento-canvas border border-bento-border p-5 rounded-lg flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-bento-accent" />
              <div className="flex flex-col">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Screenplay Narrative Arc Chart
                </span>
                <span className="text-[10px] text-slate-500 font-sans">
                  Plots emotional intensity (1-10) across sequential scenes to map dramatic pacing
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-bento-accent">
                <span className="w-2.5 h-2.5 rounded-full bg-bento-accent inline-block" />
                Emotional Intensity (1-10)
              </span>
              <span className="flex items-center gap-1.5 text-rose-500">
                <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block animate-pulse" />
                Key Climax Peak
              </span>
            </div>
          </div>

          <div className="w-full h-64 bg-slate-950/20 p-3 rounded-lg border border-bento-border/50">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 15, right: 30, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                />
                <YAxis 
                  domain={[0, 10]} 
                  stroke="#64748b" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                  ticks={[2, 4, 6, 8, 10]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isPeak = data.intensity === maxIntensity;
                      const isTrough = data.intensity === minIntensity;
                      return (
                        <div className="bg-slate-950 border border-bento-border p-3 rounded-lg shadow-2xl space-y-1 max-w-[240px]">
                          <div className="flex items-center justify-between gap-2 border-b border-bento-border pb-1">
                            <span className="font-mono text-xs font-bold text-bento-accent uppercase">{data.name}</span>
                            {isPeak && <span className="bg-rose-950/50 text-rose-400 border border-rose-950/60 text-[8px] font-mono px-1 rounded">PEAK CLIMAX</span>}
                            {isTrough && <span className="bg-blue-950/50 text-blue-400 border border-blue-950/60 text-[8px] font-mono px-1 rounded">TROUGH VALVE</span>}
                          </div>
                          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-tight font-semibold">
                            Location: {data.setting}
                          </p>
                          <div className="flex items-center justify-between text-xs font-sans">
                            <span className="text-slate-300">Emotional Intensity:</span>
                            <span className="font-bold text-slate-100">{data.intensity}/10</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-sans">
                            <span className="text-slate-300">Suggested Pace:</span>
                            <span className="font-bold text-slate-100">{data.pace}/10</span>
                          </div>
                          <p className="text-[10px] text-slate-400 italic leading-snug border-t border-bento-border/50 pt-1 mt-1">
                            "{data.summary}"
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="intensity"
                  stroke="#F27D26"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, stroke: "#0A0B0E", fill: "#F27D26" }}
                  activeDot={{ r: 6, strokeWidth: 1, stroke: "#0A0B0E" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Peaks and Troughs Highlights Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            <div className="bg-bento-bg border border-bento-border p-3.5 rounded-lg space-y-2">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-rose-400 block">
                🔥 Climax Peaks (Intensity &gt;= 7)
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {chartData.filter(d => d.intensity >= 7).length === 0 ? (
                  <p className="text-[10px] font-sans text-slate-500 italic">No intense peak scenes detected (Intensity &gt;= 7).</p>
                ) : (
                  chartData.filter(d => d.intensity >= 7).map((d, index) => (
                    <div key={index} className="flex items-center justify-between text-xs font-sans p-1.5 bg-slate-900/30 rounded border border-bento-border/30">
                      <span className="font-semibold text-slate-300 truncate mr-1">{d.name}: {d.setting}</span>
                      <span className="font-mono text-rose-400 font-bold bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-950/60 uppercase text-[9px] shrink-0">{d.intensity} Intensity</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-bento-bg border border-bento-border p-3.5 rounded-lg space-y-2">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-sky-400 block">
                ❄️ Pacing Troughs (Intensity &lt;= 4)
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {chartData.filter(d => d.intensity <= 4).length === 0 ? (
                  <p className="text-[10px] font-sans text-slate-500 italic">No calm valley scenes detected (Intensity &lt;= 4).</p>
                ) : (
                  chartData.filter(d => d.intensity <= 4).map((d, index) => (
                    <div key={index} className="flex items-center justify-between text-xs font-sans p-1.5 bg-slate-900/30 rounded border border-bento-border/30">
                      <span className="font-semibold text-slate-300 truncate mr-1">{d.name}: {d.setting}</span>
                      <span className="font-mono text-sky-450 font-bold bg-sky-950/20 px-1.5 py-0.5 rounded border border-sky-950/60 uppercase text-[9px] shrink-0">{d.intensity} Intensity</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SVG Rhythm Graph */}
      {safeShots.length > 1 && (
        <div className="bg-bento-canvas border border-bento-border p-4 rounded-lg flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Sequence Pacing & Dramatic Tension Waves
            </span>
            <div className="flex gap-4 text-[9px] font-mono">
              <span className="flex items-center gap-1.5 text-bento-accent">
                <span className="w-2.5 h-0.5 bg-bento-accent block" /> Shot Pacing speed
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-0.5 bg-slate-350 block" /> Dramatic Intensity
              </span>
            </div>
          </div>

          <div className="w-full h-32 relative">
            <svg 
              viewBox="0 0 500 110" 
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Grid guide background lines */}
              <line x1="15" y1="15" x2="485" y2="15" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
              <line x1="15" y1="55" x2="485" y2="55" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
              <line x1="15" y1="95" x2="485" y2="95" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />

              {/* Glowing gradients for fills */}
              <defs>
                <linearGradient id="pacingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F27D26" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#F27D26" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="intensityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Area under curves */}
              {drawGraphPoints("pacing") && (
                <path
                  d={`${drawGraphPoints("pacing")} L 485,95 L 15,95 Z`}
                  fill="url(#pacingGrad)"
                />
              )}
              {drawGraphPoints("tension") && (
                <path
                  d={`${drawGraphPoints("tension")} L 485,95 L 15,95 Z`}
                  fill="url(#intensityGrad)"
                />
              )}

              {/* Paths */}
              <path
                d={drawGraphPoints("pacing")}
                fill="none"
                stroke="#F27D26"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={drawGraphPoints("tension")}
                fill="none"
                stroke="#d1d5db"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Node Anchors */}
              {safeShots.map((shot, idx) => {
                if (!shot) return null;
                const associatedScene = safeScenes.find(s => s && s.sceneNumber === shot.sceneNumber);
                const stepX = (500 - 30) / (safeShots.length - 1);
                const x = 15 + idx * stepX;
                
                const pacVal = Math.max(1, Math.min(10, 15 / (shot.durationSeconds || 3)));
                const tensionVal = associatedScene?.emotionalIntensity || 5;

                const yPac = 15 + 80 - ((pacVal - 1) / 9) * 80;
                const yTen = 15 + 80 - ((tensionVal - 1) / 9) * 80;

                return (
                  <g key={idx}>
                    <circle cx={x} cy={yPac} r="3" fill="#0A0B0E" stroke="#F27D26" strokeWidth="1.5" />
                    <circle cx={x} cy={yTen} r="3" fill="#0A0B0E" stroke="#d1d5db" strokeWidth="1.5" />
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex justify-between text-[8px] font-mono text-slate-500 px-1">
            <span>START OF SEQUENCE</span>
            <span>END OF SEQUENCE</span>
          </div>
        </div>
      )}
    </div>
  );
}
