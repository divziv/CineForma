/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { PipelineTraceLog } from "../types";
import { Terminal, ChevronDown, ChevronUp, Activity, Play, Settings } from "lucide-react";

interface DiagnosticConsoleProps {
  logs: PipelineTraceLog[];
  isPinnedOpen?: boolean;
}

export default function DiagnosticConsole({ logs, isPinnedOpen = true }: DiagnosticConsoleProps) {
  const [isOpen, setIsOpen] = useState(isPinnedOpen);

  const getStepColorClass = (step: PipelineTraceLog["step"]) => {
    switch (step) {
      case "TOKENIZATION":
        return "bg-purple-900/40 text-purple-300 border-purple-850/60";
      case "EMOTION_ANALYSIS":
        return "bg-rose-900/40 text-rose-300 border-rose-850/60";
      case "ASSET_ORCHESTRATION":
        return "bg-cyan-900/40 text-cyan-300 border-cyan-850/60";
      default:
        return "bg-emerald-900/40 text-emerald-300 border-emerald-850/60";
    }
  };

  return (
    <div id="diagnostic-console-panel" className="bg-bento-card border border-bento-border rounded-xl overflow-hidden shadow-2xl flex flex-col mt-4">
      {/* Console Top Indicator */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-bento-panel px-4 py-3 border-b border-bento-border flex items-center justify-between cursor-pointer hover:bg-bento-bg/55 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h2 className="font-mono text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-2">
            Pipeline Diagnostic Console
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline-block">
            {logs.length} Trace Events Recorded
          </span>
          <button className="text-slate-400 hover:text-slate-200">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Logging Textbox */}
      {isOpen && (
        <div className="p-4 bg-bento-canvas h-60 overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col gap-2">
          {logs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-2 font-mono">
              <Terminal className="w-8 h-8 opacity-30 text-slate-400" />
              <span>[Console Idle] Run the screenplay pipeline to trace active processes...</span>
            </div>
          ) : (
            logs.map((log, idx) => {
              const formattedTime = new Date(log.timestamp).toLocaleTimeString([], { hour12: false });
              return (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 border-b border-bento-border/40 pb-1.5">
                  <span className="text-slate-600 shrink-0 text-[10px] pt-0.5">{formattedTime}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded border ${getStepColorClass(log.step)}`}>
                      {log.step}
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="text-slate-300 font-medium">{log.message}</span>
                    {log.details && (
                      <span className="block text-[10px] text-slate-500 italic mt-0.5">
                        ↳ {log.details}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
