/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { SceneMetadata, ShotAsset, PipelineTraceLog } from "./types";
import ScreenplayEditor from "./components/ScreenplayEditor";
import StoryboardCard from "./components/StoryboardCard";
import PacingVitals from "./components/PacingVitals";
import DiagnosticConsole from "./components/DiagnosticConsole";
import { SCREENPLAY_PRESETS } from "./data";
import { 
  Film, 
  Sparkles, 
  Plus, 
  RefreshCw, 
  Sliders, 
  HelpCircle, 
  Tv, 
  Clapperboard, 
  Video 
} from "lucide-react";

export default function App() {
  const [scenes, setScenes] = useState<SceneMetadata[]>([]);
  const [shots, setShots] = useState<ShotAsset[]>([]);
  const [logs, setLogs] = useState<PipelineTraceLog[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"workspace" | "vitals" | "help">("workspace");

  // On mount, load initial screenplay analysis using the offline preset data
  // This guarantees when the app loads, it has interactive data ready-to-test
  useEffect(() => {
    const startupLogs: PipelineTraceLog[] = [
      {
        timestamp: new Date().toISOString(),
        step: "SYSTEM",
        message: "CineForma Pre-Visualization Engine booted successfully."
      },
      {
        timestamp: new Date().toISOString(),
        step: "SYSTEM",
        message: "Loading default screenplay template (Terminal Echoes)."
      }
    ];

    setLogs(startupLogs);
    triggerInitialAnalysis(startupLogs);
  }, []);

  const triggerInitialAnalysis = async (currentLogs: PipelineTraceLog[]) => {
    setIsAnalyzing(true);
    try {
      const defaultText = SCREENPLAY_PRESETS[0].text;
      
      const response = await fetch("/api/analyze-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptText: defaultText })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          setScenes(data.result.scenes || []);
          setShots(data.result.shots || []);
        }
        if (data.logs) {
          // Merge logs
          setLogs([...currentLogs, ...data.logs]);
        }
      } else {
        throw new Error("Initial loading could not fetch from server.");
      }
    } catch (err: any) {
      console.warn("Server connection bypassed on startup, parsing mock payload locally.", err);
      // Fallback local mock simulation
      const localPackage = parseMockLocally(SCREENPLAY_PRESETS[0].text, currentLogs);
      setScenes(localPackage.scenes);
      setShots(localPackage.shots);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Main analyze trigger communicating with server
  const handleAnalyzeScript = async (text: string) => {
    setIsAnalyzing(true);
    setScenes([]);
    setShots([]);
    
    const initialLog: PipelineTraceLog = {
      timestamp: new Date().toISOString(),
      step: "SYSTEM",
      message: "Sending screenplay text to raw parser pipeline...",
      details: `${text.length} characters`
    };
    setLogs([initialLog]);

    try {
      const response = await fetch("/api/analyze-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptText: text })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP Error ${response.status}`);
      }

      const payload = await response.json();
      if (payload.result) {
        setScenes(payload.result.scenes || []);
        setShots(payload.result.shots || []);
      }
      if (payload.logs) {
        setLogs(prev => [...prev, ...payload.logs]);
      }
    } catch (error: any) {
      console.error("Analysis Pipeline Failed:", error);
      const errLog: PipelineTraceLog = {
        timestamp: new Date().toISOString(),
        step: "SYSTEM",
        message: "Analysis pipeline failed, generating local fallback structure.",
        details: error.message
      };
      setLogs(prev => [...prev, errLog]);
      // Local fallback parsing
      const fallbackResult = parseMockLocally(text, [errLog]);
      setScenes(fallbackResult.scenes);
      setShots(fallbackResult.shots);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Proxy to hit AI Image generator on server
  const handleGenImage = async (id: string, prompt: string): Promise<string | undefined> => {
    const traceLog: PipelineTraceLog = {
      timestamp: new Date().toISOString(),
      step: "ASSET_ORCHESTRATION",
      message: `Requesting AI Image generation for Shot Card: ${id}.`,
      details: `Prompt: ${prompt.substring(0, 45)}...`
    };
    setLogs(prev => [...prev, traceLog]);

    try {
      const response = await fetch("/api/generate-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspectRatio: "16:9" })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.imageUrl) {
        setLogs(prev => [...prev, {
          timestamp: new Date().toISOString(),
          step: "ASSET_ORCHESTRATION",
          message: `Successfully rendered high-quality AI frame for Shot ${id}.`
        }]);
        return data.imageUrl;
      }
    } catch (err: any) {
      console.error("AI Image Generation Failed:", err);
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        step: "SYSTEM",
        message: `AI Image Generation for ${id} failed. falling back to smart canvas mockup.`,
        details: err.message
      }]);
      throw err;
    }
  };

  // Card update: duration, specs edits, character overlays
  const handleUpdateShot = (updatedShot: ShotAsset) => {
    setShots(prev => prev.map(s => s.id === updatedShot.id ? updatedShot : s));
  };

  // Card deletion: removes card and recalculates sequential ranks inside scenes
  const handleDeleteShot = (id: string) => {
    setShots(prev => {
      const filtered = prev.filter(s => s.id !== id);
      // Recalculate ordering sequenceId sequentially
      return filtered.map((s, idx) => ({
        ...s,
        sequenceId: idx + 1
      }));
    });

    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      step: "SYSTEM",
      message: `Shot ${id} removed from pre-visualization stack. Sequencer coordinates re-mapped.`
    }]);
  };

  // Resequencing shifts
  const handleMoveShot = (id: string, direction: "left" | "right") => {
    const currentIndex = shots.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= shots.length) return;

    const updatedShots = [...shots];
    // Swap elements
    const temp = updatedShots[currentIndex];
    updatedShots[currentIndex] = updatedShots[targetIndex];
    updatedShots[targetIndex] = temp;

    // Re-rank sequence indices
    const finalized = updatedShots.map((s, idx) => ({
      ...s,
      sequenceId: idx + 1
    }));

    setShots(finalized);
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      step: "SYSTEM",
      message: `Resequenced pre-viz cards. Shifted shot ${id} ${direction}.`
    }]);
  };

  // Add individual customizable card
  const handleAddCustomShot = () => {
    const sceneNumber = scenes.length > 0 ? scenes[scenes.length - 1].sceneNumber : 1;
    const newId = `custom-shot-${Date.now()}`;
    const sequenceId = shots.length + 1;

    const customShot: ShotAsset = {
      id: newId,
      sceneNumber,
      sequenceId,
      generationPrompt: "Cinematic storyboard sketch, close-up anamorphic, high contrast ambient reflections, filming visual cues.",
      cameraMetadata: {
        angle: "Medium Shot",
        lens: "50mm Prime",
        motion: "Slow Tracking Pan"
      },
      themeColors: ["#020617", "#6366f1", "#f43f5e"],
      title: "New Custom Viewport",
      actionDescription: "Enter visual instructions here. Drag/adjust shot speed to modify dramatic timing metrics.",
      durationSeconds: 3.5
    };

    setShots(prev => [...prev, customShot]);
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      step: "SYSTEM",
      message: `Inserted custom camera viewport Shot #${sequenceId}.`
    }]);
  };

  // Reset viewport stack to start over
  const handleResetWorkspace = () => {
    setScenes([]);
    setShots([]);
    setLogs([
      {
        timestamp: new Date().toISOString(),
        step: "SYSTEM",
        message: "Studio cleared. Back to slate zero."
      }
    ]);
  };

  // Fallback parses algorithm matching server logic to prevent empty state on API failures
  const parseMockLocally = (text: string, currentLogs: PipelineTraceLog[]): { scenes: SceneMetadata[]; shots: ShotAsset[] } => {
    const lines = text.split("\n");
    const scenes: SceneMetadata[] = [];
    const shots: ShotAsset[] = [];
    let sceneCount = 1;

    scenes.push({
      sceneNumber: 1,
      locationType: "EXT",
      setting: "NARRATIVE SEQUENCE",
      timeOfDay: "NIGHT",
      lightingMood: "Chiaroscuro, deep sapphire shadow contrast with warm flares",
      emotionalIntensity: 6,
      paceValue: 5,
      summary: "Cinematic narrative drafted from custom script blocks."
    });

    const paragraphs = lines.filter(l => l.trim().length > 30);
    const count = Math.max(2, Math.min(6, paragraphs.length));

    for (let i = 0; i < count; i++) {
      const p = paragraphs[i] || "Visual pre-visualization panel highlighting the focus depth of field.";
      const sequenceId = i + 1;
      
      shots.push({
        id: `local-shot-${i + 1}`,
        sceneNumber: 1,
        sequenceId,
        generationPrompt: `Cinematic movie frame. Medium Shot, 35mm lens. Glowing highlights. Action: ${p.substring(0, 70)}`,
        cameraMetadata: {
          angle: i === 0 ? "Wide Establishing" : i === 1 ? "Medium Shot" : "Extreme Close-up",
          lens: i % 2 === 0 ? "35mm Anamorphic" : "50mm Prime",
          motion: i === 0 ? "Slow Boom Up" : "Static Framed"
        },
        themeColors: i % 2 === 0 ? ["#020617", "#ec4899", "#06b6d4"] : ["#0b1329", "#8b5cf6", "#f59e0b"],
        title: `Visual Frame Node #${sequenceId}`,
        actionDescription: p,
        durationSeconds: 3.0 + i * 1.5
      });
    }

    return { scenes, shots };
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Studio Header Nav */}
      <header className="bg-[#0b0f19] border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-lg shadow-md flex items-center justify-center">
            <Clapperboard className="w-6 h-6 text-slate-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-bold tracking-tight text-lg text-slate-100">
                CineForma
              </h1>
              <span className="bg-blue-950 text-blue-400 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-900/40 tracking-wider">
                PRE-VIZ v1.2
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Script-to-Canvas Cinematic Pre-Visualization Studio
            </p>
          </div>
        </div>

        {/* Global workspace tabs */}
        <div className="flex items-center gap-1.5 bg-[#05070e] p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab("workspace")}
            className={`px-3 py-1.5 rounded-md font-sans font-medium text-xs tracking-wide transition-all uppercase flex items-center gap-1.5 cursor-pointer ${
              activeTab === "workspace"
                ? "bg-[#182136] text-blue-400 shadow-sm border border-slate-800"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Video className="w-4 h-4" /> Studio Board
          </button>
          <button
            onClick={() => setActiveTab("vitals")}
            disabled={shots.length === 0}
            className={`px-3 py-1.5 rounded-md font-sans font-medium text-xs tracking-wide transition-all uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === "vitals"
                ? "bg-[#182136] text-blue-400 shadow-sm border border-slate-800"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-4 h-4" /> Rhythm Vitals
          </button>
          <button
            onClick={() => setActiveTab("help")}
            className={`px-3 py-1.5 rounded-md font-sans font-medium text-xs tracking-wide transition-all uppercase flex items-center gap-1.5 cursor-pointer ${
              activeTab === "help"
                ? "bg-[#182136] text-blue-400 shadow-xs border border-slate-800"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <HelpCircle className="w-4 h-4" /> Lab Guide
          </button>
        </div>
      </header>

      {/* Main Sandbox Layout Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {activeTab === "workspace" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Screenplay Slideline Area: Span 5 */}
            <div className="lg:col-span-5 h-full flex flex-col">
              <ScreenplayEditor 
                onAnalyze={handleAnalyzeScript} 
                isAnalyzing={isAnalyzing} 
              />
              <DiagnosticConsole logs={logs} />
            </div>

            {/* Right Storyboard Pre-Viz Track Area: Span 7 */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Tv className="w-5 h-5 text-purple-400" />
                    <h2 className="font-sans font-semibold text-slate-200 tracking-tight text-sm uppercase">
                      Cinematic Viewport Grid
                    </h2>
                  </div>
                  {shots.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddCustomShot}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-sans px-2.5 py-1.5 rounded border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Viewport
                      </button>
                      <button
                        onClick={handleResetWorkspace}
                        className="bg-[#1e141a] border border-red-950 hover:bg-[#2e1d27] text-rose-450 text-xs font-sans px-2.5 py-1.5 rounded flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Clear board"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Reset Board
                      </button>
                    </div>
                  )}
                </div>

                {/* Grid Deck */}
                {shots.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                    <div className="bg-[#0f1424] p-5 rounded-full border border-slate-800 mb-4 animate-pulse">
                      <Film className="w-10 h-10 text-slate-500" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-300">
                      Pre-viz Studio Unloaded
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1.5">
                      Enter or select a screenplay preset in the left editor panel, then click "Run Pre-Viz Pipeline" to parse storyboards, camera directions, and emotional palettes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Location Summary Strip */}
                    <div className="bg-[#070b13] border border-slate-800 p-3 rounded-lg flex flex-col gap-2">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-505 block">
                        Active Direction Blueprint
                      </span>
                      {scenes.map((scene, idx) => (
                        <div key={idx} className="flex gap-2.5 items-center bg-[#0f1424]/60 p-2.5 rounded border border-slate-800/40 text-xs">
                          <span className="bg-purple-950 text-purple-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-purple-900/30">
                            Scene {scene.sceneNumber}
                          </span>
                          <span className="font-mono text-slate-300 uppercase tracking-tight">
                            [{scene.locationType}] {scene.setting} — {scene.timeOfDay}
                          </span>
                          <span className="text-[10px] text-slate-500 italic hidden sm:inline ml-auto truncate max-w-xs">
                            "{scene.summary}"
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {shots.map((shot) => (
                        <StoryboardCard
                          key={shot.id}
                          shot={shot}
                          onUpdate={handleUpdateShot}
                          onDelete={handleDeleteShot}
                          onMove={handleMoveShot}
                          onGenImage={handleGenImage}
                          totalShots={shots.length}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "vitals" && (
          <div className="max-w-4xl mx-auto w-full">
            <PacingVitals scenes={scenes} shots={shots} />
          </div>
        )}

        {activeTab === "help" && (
          <div className="max-w-2xl mx-auto w-full bg-[#0b0f19] border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <Film className="w-5 h-5 text-blue-400" />
              <h2 className="font-sans font-semibold text-slate-100 uppercase tracking-wide text-sm">
                CineForma Lab Guide & Methodologies
              </h2>
            </div>
            
            <div className="space-y-4 text-xs select-text text-slate-300 leading-relaxed">
              <p>
                CineForma parses standard screenwriting format styles, extracting structured camera angles and emotional pacing profiles.
              </p>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-200">1. Semantic Script Tokenizer</h3>
                <p>
                  Our natural language parsing pipeline identifies traditional sluglines: <code className="bg-[#12192c] text-blue-400 px-1.5 py-0.5 rounded font-mono">INT.</code> or <code className="bg-[#12192c] text-blue-400 px-1.5 py-0.5 rounded font-mono">EXT.</code> followed by location headings and time parameters. Dialogue lines are tokenized to link spoken overlays directly to visual cards.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-200">2. Emotional Psychology Mappings</h3>
                <p>
                  Each scene generates exactly 3 color hex blocks representing filmmaking lighting moods. A high-stakes standoff maps to high-contrast warm oranges and cold obsidian shadows, while clinical tech labs map to high-key white daylight fills and digital cyan blooms.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-200">3. Camera Metadata Orchestration</h3>
                <p>
                  Every camera card features direct focal details (e.g. 50mm cinematic primes or 35mm wide lenses) and camera motions (such as static layouts, tracking sweeps, and slow push-ins), simulating a physical pre-production meeting.
                </p>
              </div>
            </div>

            <div className="bg-[#131922] p-4 rounded-lg border border-slate-800 text-[11px] font-mono leading-relaxed space-y-1">
              <span className="block text-slate-400 font-bold uppercase">⚡ Diagnostic Parameters:</span>
              <p className="text-slate-500">
                - Port access: Bound to secure ingress Port 3000
                <br />
                - Model targeting: models/gemini-3.5-flash & gemini-2.5-flash-image
                <br />
                - Data Contracts: Typed SceneMetadata, ShotAsset, and ProductionPackage definitions
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info Area */}
      <footer className="bg-[#04060b] border-t border-slate-900 py-4 px-6 text-center text-slate-600 text-[10px] font-mono uppercase tracking-widest mt-auto">
        <span>© 2026 CineForma Lab Inc. • All pre-viz data persisted locally inside app frame memory.</span>
      </footer>
    </div>
  );
}
