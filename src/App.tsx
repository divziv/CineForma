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
  Video,
  Download,
  Trash2,
  Printer,
  Grid,
  LayoutList
} from "lucide-react";

export default function App() {
  const [scenes, setScenes] = useState<SceneMetadata[]>([]);
  const [shots, setShots] = useState<ShotAsset[]>([]);
  const [logs, setLogs] = useState<PipelineTraceLog[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"workspace" | "vitals" | "help">("workspace");
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  const [draggingShotId, setDraggingShotId] = useState<string | null>(null);
  
  // Custom states for sorting and multi-selection
  const [sortBy, setSortBy] = useState<"sequence" | "sceneNumber" | "duration">("sequence");
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([]);
  const [gridColumnMode, setGridColumnMode] = useState<"single" | "two">("two");
  const [displayColumns, setDisplayColumns] = useState<1 | 2>(2);

  const handleToggleSelectShot = (id: string) => {
    setSelectedShotIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBatchDeleteSelected = () => {
    // Keep shots that are either not selected, or are locked
    const shotsToKeep = shots.filter(s => !selectedShotIds.includes(s.id) || s.isLocked);
    const amountDeleted = shots.length - shotsToKeep.length;
    
    if (amountDeleted === 0) {
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        step: "SYSTEM",
        message: "Batch Delete action skipped: no selected, unlocked shots found."
      }]);
      return;
    }

    // Re-sequence remaining shots
    const finalized = shotsToKeep.map((s, idx) => ({
      ...s,
      sequenceId: idx + 1
    }));

    setShots(finalized);
    setSelectedShotIds([]);

    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      step: "SYSTEM",
      message: `Batch deleted ${amountDeleted} selected storyboard shot(s). Re-ordered remaining list.`
    }]);
  };

  // Drag-and-drop mechanics for StoryboardCards
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingShotId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggingShotId || e.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = shots.findIndex(s => s.id === sourceId);
    const targetIndex = shots.findIndex(s => s.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const updatedShots = [...shots];
    const [removed] = updatedShots.splice(sourceIndex, 1);
    updatedShots.splice(targetIndex, 0, removed);

    // Re-rank sequence indices
    const finalized = updatedShots.map((s, idx) => ({
      ...s,
      sequenceId: idx + 1
    }));

    setShots(finalized);
    setDraggingShotId(null);

    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      step: "SYSTEM",
      message: `Visually reordered shots via drag-and-drop. Moved shot ${sourceId} to target ${targetId}.`
    }]);
  };

  // Jump viewport list to specified scene's first shot
  const handleJumpToScene = (sceneNumber: number) => {
    const firstShot = shots.find(s => s.sceneNumber === sceneNumber);
    if (firstShot) {
      setActiveShotId(firstShot.id);
      setTimeout(() => {
        const el = document.getElementById(`shot-card-${firstShot.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        step: "SYSTEM",
        message: `Navigated viewport to first shot of Scene #${sceneNumber} (${firstShot.title}).`
      }]);
    }
  };

  // Compute filtered list of shots
  const isFiltering = searchQuery.trim().length > 0;
  const filteredShots = shots.filter(shot => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    
    // Check if query is looking for scene, such as "scene 1", "scene: 2", or "2"
    const matchSceneLabel = query.match(/(?:scene\s*[:\s]*)?([0-9]+)/);
    if (matchSceneLabel) {
      const requestedSceneNum = parseInt(matchSceneLabel[1], 10);
      if (shot.sceneNumber === requestedSceneNum) {
        return true;
      }
    }
    
    return shot.title.toLowerCase().includes(query) || (shot.generationPrompt || "").toLowerCase().includes(query);
  });

  const activeShotsCount = filteredShots.length;
  const totalDurationFiltered = filteredShots.reduce((sum, s) => sum + s.durationSeconds, 0);

  const sortedFilteredShots = [...filteredShots].sort((a, b) => {
    if (sortBy === "sceneNumber") {
      if (a.sceneNumber !== b.sceneNumber) {
        return a.sceneNumber - b.sceneNumber;
      }
      return a.sequenceId - b.sequenceId;
    }
    if (sortBy === "duration") {
      if (a.durationSeconds !== b.durationSeconds) {
        return a.durationSeconds - b.durationSeconds;
      }
      return a.sequenceId - b.sequenceId;
    }
    // Default sequence sorting
    return a.sequenceId - b.sequenceId;
  });

  const allFilteredSelected = sortedFilteredShots.length > 0 && sortedFilteredShots.every(s => selectedShotIds.includes(s.id));
  const someFilteredSelected = sortedFilteredShots.length > 0 && sortedFilteredShots.some(s => selectedShotIds.includes(s.id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIds = sortedFilteredShots.map(s => s.id);
      setSelectedShotIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const filteredIds = sortedFilteredShots.map(s => s.id);
      setSelectedShotIds(prev => {
        const union = new Set([...prev, ...filteredIds]);
        return Array.from(union);
      });
    }
  };

  // Global Keyboard Shortcuts Effect
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        activeEl.getAttribute("contenteditable") === "true"
      );

      // 1. Ctrl+S or Cmd+S -> Export project
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        downloadJSON();
        return;
      }

      // 2. Ctrl+N or Cmd+N -> Add custom shot
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleAddCustomShot();
        return;
      }

      if (isInputActive) return;

      // 3. Arrow Keys to navigate between StoryboardCards
      const currentDeck = isFiltering ? filteredShots : shots;
      if (currentDeck.length === 0) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveShotId(prevId => {
          const currentIndex = currentDeck.findIndex(s => s.id === prevId);
          const nextIndex = currentIndex === -1 ? 0 : Math.min(currentDeck.length - 1, currentIndex + 1);
          const nextId = currentDeck[nextIndex].id;
          
          const el = document.getElementById(`shot-card-${nextId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
          return nextId;
        });
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveShotId(prevId => {
          const currentIndex = currentDeck.findIndex(s => s.id === prevId);
          const prevIndex = currentIndex === -1 ? currentDeck.length - 1 : Math.max(0, currentIndex - 1);
          const nextId = currentDeck[prevIndex].id;
          
          const el = document.getElementById(`shot-card-${nextId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
          return nextId;
        });
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [shots, filteredShots, isFiltering]);

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

  const downloadJSON = () => {
    const totalDuration = shots.reduce((acc, s) => acc + s.durationSeconds, 0);
    const avgShotDuration = shots.length > 0 ? totalDuration / shots.length : 0;
    const avgIntensity = scenes.length > 0 
      ? scenes.reduce((acc, s) => acc + s.emotionalIntensity, 0) / scenes.length 
      : 0;

    const exportData = {
      productionTitle: "CineForma Pre-Visualization Blueprints",
      exportedAt: new Date().toISOString(),
      vitals: {
        totalScenes: scenes.length,
        sequenceAirTimeSeconds: totalDuration,
        avgShotDurationSeconds: avgShotDuration,
        avgEmotionalIntensity: avgIntensity,
      },
      scenes: scenes,
      shots: shots
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CineForma-Production-Package-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      step: "SYSTEM",
      message: "Exported CineForma production package as structured JSON successfully."
    }]);
  };

  const downloadProductionCallSheet = () => {
    const totalDuration = shots.reduce((acc, s) => acc + s.durationSeconds, 0);
    const avgShotDuration = shots.length > 0 ? totalDuration / shots.length : 0;
    const avgIntensity = scenes.length > 0 
      ? scenes.reduce((acc, s) => acc + s.emotionalIntensity, 0) / scenes.length 
      : 0;

    let text = `================================================================================
CINEFORMA PRE-VISUALIZATION CALL SHEET & BLUEPRINTS
================================================================================
Exported On: ${new Date().toLocaleDateString()}
Total Scenes: ${scenes.length}
Total Shots: ${shots.length}
Total Estimated Duration: ${totalDuration.toFixed(2)} seconds
Avg Shot Pace: ${avgShotDuration.toFixed(2)}s per cut
Average Emotional Intensity: ${avgIntensity.toFixed(1)}/10

================================================================================
SCENE METADATA SUMMARY
================================================================================
`;

    scenes.forEach((sc) => {
      text += `Scene #${sc.sceneNumber} | ${sc.locationType} ${sc.setting} - ${sc.timeOfDay}
-> Lighting: ${sc.lightingMood}
-> Emotional Peak: ${sc.emotionalIntensity}/10 | Pace Flow: ${sc.paceValue}/10
-> Summary: "${sc.summary}"
--------------------------------------------------------------------------------
`;
    });

    text += `
================================================================================
CHRONOLOGICAL SHOT & STORYBOARD LISTING
================================================================================
`;

    shots.forEach((sh) => {
      text += `Shot #${sh.sequenceId} (ID: ${sh.id})
-> Title: ${sh.title}
-> Duration: ${sh.durationSeconds.toFixed(1)}s (Transition: ${sh.transition || "Cut"})
-> Camera: ${sh.cameraMetadata.angle} | Lens: ${sh.cameraMetadata.lens} | Motion: ${sh.cameraMetadata.motion}
-> Theme Colors: ${sh.themeColors.join(", ")}
-> Action Setup: ${sh.actionDescription}
`;
      if (sh.characterInShot) {
        text += `-> Focus: ${sh.characterInShot}
-> Dialogue: "${sh.dialogueText || ""}"
`;
      }
      text += `--------------------------------------------------------------------------------
`;
    });

    text += `\n© 2026 CineForma Lab Inc. All rights reserved.\n`;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CineForma-Call-Sheet-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      step: "SYSTEM",
      message: "Exported production call sheet summary (.txt) successfully."
    }]);
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
    <div className="min-h-screen bg-bento-bg text-slate-100 flex flex-col font-sans selection:bg-bento-accent selection:text-black">
      {/* Studio Header Nav */}
      <header className="bg-bento-card border-b border-bento-border px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-orange-500 to-bento-accent p-2.5 rounded-lg shadow-md flex items-center justify-center">
            <Clapperboard className="w-6 h-6 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-bold tracking-tight text-lg text-slate-100">
                CineForma
              </h1>
              <span className="bg-bento-canvas text-bento-accent font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-bento-border tracking-wider">
                PRE-VIZ v1.2
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Script-to-Canvas Cinematic Pre-Visualization Studio
            </p>
          </div>
        </div>

        {/* Search filtration bar in header */}
        <div id="search-filter-container" className="flex-1 max-w-xs mx-0 md:mx-4 w-full relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            id="search-input-header"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scene (e.g. 2) or title keyword..."
            className="w-full bg-bento-canvas text-slate-200 placeholder-slate-500 text-xs rounded-lg border border-bento-border transition-all pl-9 pr-9 py-2 focus:outline-none focus:border-bento-accent font-sans"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 font-sans text-xs cursor-pointer"
              title="Clear search filter"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Global workspace tabs */}
          <div className="flex items-center gap-1.5 bg-bento-canvas p-1 rounded-lg border border-bento-border animate-fade-in">
            <button
              onClick={() => setActiveTab("workspace")}
              className={`px-3 py-1.5 rounded-md font-sans font-medium text-xs tracking-wide transition-all uppercase flex items-center gap-1.5 cursor-pointer ${
                activeTab === "workspace"
                  ? "bg-bento-card text-bento-accent shadow-sm border border-bento-border"
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
                  ? "bg-bento-card text-bento-accent shadow-sm border border-bento-border"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sliders className="w-4 h-4" /> Rhythm Vitals
            </button>
            <button
              onClick={() => setActiveTab("help")}
              className={`px-3 py-1.5 rounded-md font-sans font-medium text-xs tracking-wide transition-all uppercase flex items-center gap-1.5 cursor-pointer ${
                activeTab === "help"
                  ? "bg-bento-card text-bento-accent shadow-xs border border-bento-border"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <HelpCircle className="w-4 h-4" /> Lab Guide
            </button>
          </div>

          {/* Export Action Dropdown */}
          {shots.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                id="btn-print-grid"
                onClick={() => window.print()}
                className="bg-bento-panel hover:bg-slate-800 text-slate-100 hover:text-bento-accent border border-bento-border font-sans font-medium text-xs px-3.5 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition-all uppercase hover:scale-[1.02] active:scale-95"
                title="Print Storyboard Grid"
              >
                <Printer className="w-4 h-4 text-bento-accent" />
                <span>Print Grid</span>
              </button>

              <div className="relative inline-block text-left" id="header-export-selector">
                <button
                  id="btn-trigger-export"
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  className="bg-bento-accent hover:bg-orange-500 text-black font-sans font-bold text-xs px-3.5 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition-all uppercase hover:scale-[1.02] active:scale-95"
                  title="Export Production Blueprints"
                >
                  <Download className="w-4 h-4 text-black" />
                  <span>Export Package</span>
                </button>
              {isExportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-bento-card border border-bento-border rounded-lg shadow-2xl z-50 overflow-hidden font-mono text-[10px]">
                  <div className="px-3 py-2 bg-bento-canvas border-b border-bento-border text-slate-400 font-bold uppercase tracking-wider">
                    Format Selection
                  </div>
                  <button
                    id="btn-export-json"
                    onClick={() => {
                      downloadJSON();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-bento-bg text-slate-200 hover:text-bento-accent flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    🚀 Structured JSON package
                  </button>
                  <button
                    id="btn-export-callsheet"
                    onClick={() => {
                      downloadProductionCallSheet();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-bento-bg text-slate-200 hover:text-bento-accent flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    📄 Formatted Call Sheet (.txt)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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
              <div className="bg-bento-card border border-bento-border rounded-xl p-5 shadow-2xl flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-bento-border pb-3.5 gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tv className="w-5 h-5 text-bento-accent" />
                    <h2 className="font-sans font-semibold text-slate-200 tracking-tight text-sm uppercase">
                      Cinematic Viewport Grid ({activeShotsCount} Shot{activeShotsCount !== 1 ? "s" : ""})
                    </h2>
                    {shots.length > 0 && (
                      <span className="bg-orange-500/10 border border-bento-accent/30 text-[10px] font-mono px-2 py-0.5 rounded text-bento-accent font-bold" title="Cumulative duration of all filtered shots combined">
                        ⏳ {totalDurationFiltered.toFixed(1)}s TOTAL
                      </span>
                    )}
                  </div>
                  {shots.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Select All Checkbox */}
                      <label className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-bento-canvas border border-bento-border/70 px-2 py-1.5 rounded cursor-pointer select-none hover:text-slate-200">
                        <input
                          id="checkbox-select-all"
                          type="checkbox"
                          checked={filteredShots.length > 0 && filteredShots.every(s => selectedShotIds.includes(s.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allFilteredIds = filteredShots.map(s => s.id);
                              setSelectedShotIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                            } else {
                              const allFilteredIds = filteredShots.map(s => s.id);
                              setSelectedShotIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                            }
                          }}
                          className="w-3.5 h-3.5 accent-bento-accent bg-slate-950 border border-bento-border rounded cursor-pointer"
                        />
                        <span>Select All</span>
                      </label>

                      {/* Columns Toggler */}
                      <button
                        id="btn-toggle-columns"
                        onClick={() => setDisplayColumns(prev => prev === 1 ? 2 : 1)}
                        className="bg-bento-canvas hover:bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-1.5 rounded border border-bento-border/70 flex items-center gap-1.5 cursor-pointer transition-colors"
                        title={displayColumns === 1 ? "Switch to Two Column layout" : "Switch to Single Column layout"}
                      >
                        {displayColumns === 1 ? (
                          <>
                            <Grid className="w-3.5 h-3.5 text-bento-accent" />
                            <span>Two Column</span>
                          </>
                        ) : (
                          <>
                            <LayoutList className="w-3.5 h-3.5 text-bento-accent" />
                            <span>Single Column</span>
                          </>
                        )}
                      </button>

                      {/* Sorting Dropdown */}
                      <div className="flex items-center gap-1.5 bg-bento-canvas border border-bento-border/70 px-2 py-1.5 rounded">
                        <span className="text-[9px] uppercase font-mono text-slate-400">Sort:</span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="bg-transparent text-slate-250 font-mono text-[10px] focus:outline-none cursor-pointer text-slate-200 focus:text-bento-accent"
                          title="Choose tracking sort key for viewports"
                        >
                          <option value="sequence" className="bg-slate-900 border-none text-slate-300">Sequence</option>
                          <option value="sceneNumber" className="bg-slate-900 border-none text-slate-300">Scene Num</option>
                          <option value="duration" className="bg-slate-900 border-none text-slate-300">Duration</option>
                        </select>
                      </div>

                      {/* Batch Delete Selected Trigger */}
                      {selectedShotIds.length > 0 && (
                        <button
                          onClick={handleBatchDeleteSelected}
                          className="bg-rose-950/50 border border-rose-500/50 hover:bg-rose-900/60 text-rose-300 text-[10px] font-mono font-bold px-2 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-colors uppercase animate-pulse"
                          title={`Trash ${selectedShotIds.length} checked item(s)`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-450" />
                          <span>Trash ({selectedShotIds.length})</span>
                        </button>
                      )}

                      <button
                        onClick={handleAddCustomShot}
                        className="bg-bento-panel hover:bg-slate-800 text-slate-100 text-xs font-sans px-2.5 py-1.5 rounded border border-bento-border flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-bento-accent" /> Add Viewport
                      </button>
                      <button
                        onClick={handleResetWorkspace}
                        className="bg-red-950/20 border border-red-950/80 hover:bg-red-950/40 text-red-400 text-xs font-sans px-2.5 py-1.5 rounded flex items-center gap-1.5 cursor-pointer transition-colors"
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
                    <div className="bg-bento-canvas p-5 rounded-full border border-bento-border mb-4 animate-pulse">
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
                    <div className="bg-bento-canvas border border-bento-border p-3 rounded-lg flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                          Active Direction Blueprint
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase">
                          🖱️ Click scene to jump to its shots
                        </span>
                      </div>
                      {(scenes || []).filter(Boolean).map((scene, idx) => {
                        const hasShots = (shots || []).some(s => s && s.sceneNumber === scene.sceneNumber);
                        return (
                          <div 
                            key={idx} 
                            onClick={() => hasShots && handleJumpToScene(scene.sceneNumber)}
                            className={`flex gap-2.5 items-center bg-bento-card p-2.5 rounded border border-bento-border text-xs transition-all ${
                              hasShots 
                                ? "hover:border-bento-accent/60 hover:bg-slate-900/40 cursor-pointer group/scene" 
                                : "opacity-50 cursor-not-allowed"
                            }`}
                            title={hasShots ? `Scroll viewport to Scene ${scene.sceneNumber} first shot` : "No shots generated for this scene"}
                          >
                            <span className="bg-bento-bg text-bento-accent font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-bento-border group-hover/scene:border-bento-accent/60 transition-all">
                              Scene {scene.sceneNumber}
                            </span>
                            <span className="font-mono text-slate-300 uppercase tracking-tight group-hover/scene:text-slate-200">
                              [{scene.locationType}] {scene.setting} — {scene.timeOfDay}
                            </span>
                            <span className="text-[10px] text-slate-500 italic hidden sm:inline ml-auto truncate max-w-xs group-hover/scene:text-slate-400">
                              "{scene.summary}"
                            </span>
                            {hasShots ? (
                              <span className="text-[9px] font-mono font-bold text-bento-accent/70 flex items-center gap-1 shrink-0 ml-2 group-hover/scene:text-bento-accent">
                                <span>JUMP</span>
                                <span className="text-xs transition-transform group-hover/scene:translate-y-0.5">↓</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-slate-600 shrink-0 ml-2">EMPTY</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {filteredShots.length === 0 && isFiltering ? (
                      <div className="py-10 text-center bg-bento-canvas/40 border border-bento-border rounded-xl p-6">
                        <p className="text-xs text-slate-400 font-sans">No shots found matching "{searchQuery}"</p>
                        <button
                          onClick={() => setSearchQuery("")}
                          className="mt-2 text-xs font-mono font-bold text-bento-accent hover:underline cursor-pointer uppercase"
                        >
                          Clear Filter
                        </button>
                      </div>
                    ) : (
                      <div className={`grid gap-5 ${displayColumns === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
                        {sortedFilteredShots.map((shot) => (
                          <StoryboardCard
                             key={shot.id}
                             shot={shot}
                             onUpdate={handleUpdateShot}
                             onDelete={handleDeleteShot}
                             onMove={handleMoveShot}
                             onGenImage={handleGenImage}
                             totalShots={shots.length}
                             highlighted={shot.id === activeShotId}
                             onSelect={(id) => setActiveShotId(id)}
                             onDragStart={handleDragStart}
                             onDragOver={handleDragOver}
                             onDrop={handleDrop}
                             scenes={scenes}
                             isSelected={selectedShotIds.includes(shot.id)}
                             onToggleSelect={handleToggleSelectShot}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "vitals" && (
          <div className="max-w-4xl mx-auto w-full">
            <PacingVitals scenes={scenes} shots={shots} onUpdateAllShots={setShots} />
          </div>
        )}

        {activeTab === "help" && (
          <div className="max-w-2xl mx-auto w-full bg-bento-card border border-bento-border rounded-xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-2.5 border-b border-bento-border pb-3">
              <Film className="w-5 h-5 text-bento-accent" />
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
                  Our natural language parsing pipeline identifies traditional sluglines: <code className="bg-bento-canvas text-bento-accent px-1.5 py-0.5 rounded font-mono border border-bento-border">INT.</code> or <code className="bg-bento-canvas text-bento-accent px-1.5 py-0.5 rounded font-mono border border-bento-border">EXT.</code> followed by location headings and time parameters. Dialogue lines are tokenized to link spoken overlays directly to visual cards.
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

            {/* Keyboard Shortcuts Reference Guide */}
            <div className="bg-bento-canvas/40 border border-bento-border rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-bento-accent/10 text-bento-accent px-1.5 py-0.5 rounded font-mono border border-bento-accent/30 font-bold">⚡ POWER-USER</span>
                <span className="font-sans font-bold text-slate-100 text-xs uppercase tracking-wider">Keyboard Shortcuts Guide</span>
              </div>
              <div id="keyboard-shortcuts-grid" className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2 rounded bg-bento-canvas border border-bento-border/70">
                  <span className="text-xs text-slate-300 font-sans">Export Project</span>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] rounded font-mono shadow">Ctrl</kbd>
                    <span className="text-slate-500 font-mono text-[10px] self-center">+</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] rounded font-mono shadow">S</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-bento-canvas border border-bento-border/70">
                  <span className="text-xs text-slate-300 font-sans">Add Custom Shot</span>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] rounded font-mono shadow">Ctrl</kbd>
                    <span className="text-slate-500 font-mono text-[10px] self-center">+</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] rounded font-mono shadow">N</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-bento-canvas border border-bento-border/70">
                  <span className="text-xs text-slate-300 font-sans">Next Storyboard Card</span>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] rounded font-mono shadow">Arrow Right</kbd>
                    <span className="text-slate-400 font-mono text-[10px] self-center">/</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] rounded font-mono shadow">Down</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-bento-canvas border border-bento-border/70">
                  <span className="text-xs text-slate-300 font-sans">Previous Storyboard Card</span>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] rounded font-mono shadow">Arrow Left</kbd>
                    <span className="text-slate-400 font-mono text-[10px] self-center">/</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] rounded font-mono shadow">Up</kbd>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-mono leading-relaxed italic">
                * Note: To use navigation shortcuts key triggers, make sure you are not selected inside text writing areas.
              </p>
            </div>

            <div className="bg-bento-canvas p-4 rounded-lg border border-bento-border text-[11px] font-mono leading-relaxed space-y-1">
              <span className="block text-bento-accent font-bold uppercase">⚡ Diagnostic Parameters:</span>
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
      <footer className="bg-[#05060a] border-t border-bento-border py-4 px-6 text-center text-slate-600 text-[10px] font-mono uppercase tracking-widest mt-auto">
        <span>© 2026 CineForma Lab Inc. • All pre-viz data persisted locally inside app frame memory.</span>
      </footer>
    </div>
  );
}
