/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { SceneMetadata, ShotAsset } from "../types";
import { Activity, Music, TrendingUp, Sparkles, Film, Percent } from "lucide-react";

interface PacingVitalsProps {
  scenes: SceneMetadata[];
  shots: ShotAsset[];
  onUpdateAllShots?: (updatedShots: ShotAsset[]) => void;
}

export default function PacingVitals({ scenes, shots, onUpdateAllShots }: PacingVitalsProps) {
  // Aggregate stats
  const totalShots = shots.length;
  const totalDuration = shots.reduce((sum, s) => sum + s.durationSeconds, 0);
  const avgShotDuration = totalShots > 0 ? totalDuration / totalShots : 0;
  
  // Calculate average emotional intensity
  const avgIntensity = scenes.length > 0 
    ? (scenes.reduce((sum, s) => sum + s.emotionalIntensity, 0) / scenes.length) 
    : 0;

  const handleSyncAllSceneColors = () => {
    if (!onUpdateAllShots || shots.length === 0) return;
    
    let updatedShots = [...shots];
    const uniqueScenes = Array.from(new Set(shots.map(s => s.sceneNumber)));
    
    uniqueScenes.forEach(scNum => {
      const sceneShots = updatedShots.filter(s => s.sceneNumber === scNum);
      if (sceneShots.length > 1) {
        const targetColors = [...sceneShots[0].themeColors];
        updatedShots = updatedShots.map(s => {
          if (s.sceneNumber === scNum) {
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
    if (scenes.length === 0) return "Ambient drone";
    const primaryPace = scenes[0].paceValue;
    const primaryIntensity = scenes[0].emotionalIntensity;

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
    if (shots.length === 0) return "";
    
    const width = 500;
    const height = 110;
    const padding = 15;
    
    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;
    
    const stepX = shots.length > 1 ? usableWidth / (shots.length - 1) : usableWidth;
    
    let points = "";
    
    shots.forEach((shot, idx) => {
      // Find corresponding scene for intensity/tension
      const associatedScene = scenes.find(s => s.sceneNumber === shot.sceneNumber);
      
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

      {/* SVG Rhythm Graph */}
      {shots.length > 1 && (
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
              {shots.map((shot, idx) => {
                const associatedScene = scenes.find(s => s.sceneNumber === shot.sceneNumber);
                const stepX = (500 - 30) / (shots.length - 1);
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
