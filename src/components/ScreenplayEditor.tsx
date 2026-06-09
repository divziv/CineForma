/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SCREENPLAY_PRESETS, ScreenplayPreset } from "../data";
import { FileText, Sparkles, Wand2, ChevronRight, Drama } from "lucide-react";

interface ScreenplayEditorProps {
  onAnalyze: (text: string) => Promise<void>;
  isAnalyzing: boolean;
}

export default function ScreenplayEditor({ onAnalyze, isAnalyzing }: ScreenplayEditorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("neon-noir");
  const [scriptText, setScriptText] = useState<string>(
    SCREENPLAY_PRESETS.find((p) => p.id === "neon-noir")?.text || ""
  );

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = SCREENPLAY_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setScriptText(preset.text);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScriptText(e.target.value);
    setSelectedPreset("custom");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptText.trim() || isAnalyzing) return;
    onAnalyze(scriptText);
  };

  return (
    <div id="screenplay-editor-panel" className="bg-[#0b0f19] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full flex-1">
      {/* Header Tabs */}
      <div className="bg-[#111625] px-4 py-3 border-b border-slate-800 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <h2 className="font-sans font-semibold text-slate-200 tracking-tight text-sm uppercase">
            Screenplay Input Desk
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-mono">Preset Template:</label>
          <select
            id="preset-selector"
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="bg-[#172033] border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 focus:outline-none focus:border-blue-500 font-mono"
          >
            {SCREENPLAY_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="custom">✍️ Custom Screenplay</option>
          </select>
        </div>
      </div>

      {/* Editor Body */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 gap-4 overflow-hidden min-h-[500px]">
        <div className="flex-1 relative flex flex-col">
          <textarea
            id="screenplay-textarea"
            value={scriptText}
            onChange={handleCustomChange}
            placeholder="INT. SCENE HEADING - DAY&#10;&#10;Describe physical scene and visual actions here.&#10;&#10;CHARACTER NAME&#10;(parenthetical direction)&#10;Dialogue lines go here."
            className="flex-1 w-full bg-[#070b13] border border-slate-800 rounded-lg p-5 text-slate-300 font-mono text-sm leading-relaxed focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 overflow-y-auto resize-none"
          />
          {selectedPreset !== "custom" && (
            <div className="absolute top-3 right-3 bg-[#111827]/85 border border-slate-800 rounded-md px-2 py-1 text-[10px] text-slate-400 font-mono pointer-events-none flex items-center gap-1.5 shadow">
              <Drama className="w-3.5 h-3.5 text-rose-400" />
              {SCREENPLAY_PRESETS.find((p) => p.id === selectedPreset)?.genre}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 justify-between">
          <div className="hidden sm:block">
            <span className="text-[11px] text-slate-500 font-mono">
              ⚡ Supports slugline, dialogue, action tokenizer
            </span>
          </div>

          <button
            type="submit"
            disabled={isAnalyzing || !scriptText.trim()}
            className={`w-full sm:w-auto font-sans font-medium text-xs tracking-wide uppercase px-6 py-3 rounded-lg flex items-center justify-center gap-2.5 transition-all shadow-lg ${
              isAnalyzing || !scriptText.trim()
                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 text-white shadow-cyan-950/40 hover:-translate-y-0.5 cursor-pointer"
            }`}
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Processing Screenplay...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Run Pre-Viz Pipeline</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
