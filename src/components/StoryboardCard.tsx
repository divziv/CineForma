/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { ShotAsset, CameraMetadata } from "../types";
import { 
  Camera, 
  Clock, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  Copy, 
  Check, 
  Edit2, 
  CheckCircle, 
  Eye, 
  Compass, 
  Aperture 
} from "lucide-react";

interface StoryboardCardProps {
  key?: string;
  shot: ShotAsset;
  onUpdate: (updatedShot: ShotAsset) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "left" | "right") => void;
  onGenImage: (id: string, prompt: string) => Promise<string | undefined>;
  totalShots: number;
}

export default function StoryboardCard({
  shot,
  onUpdate,
  onDelete,
  onMove,
  onGenImage,
  totalShots
}: StoryboardCardProps) {
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Edit states
  const [editTitle, setEditTitle] = useState(shot.title);
  const [editAction, setEditAction] = useState(shot.actionDescription);
  const [editDialogue, setEditDialogue] = useState(shot.dialogueText || "");
  const [editCharacter, setEditCharacter] = useState(shot.characterInShot || "");
  const [editAngle, setEditAngle] = useState(shot.cameraMetadata.angle);
  const [editLens, setEditLens] = useState(shot.cameraMetadata.lens);
  const [editMotion, setEditMotion] = useState(shot.cameraMetadata.motion);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Procedural canvas drafting engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || aiImageUrl) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear and draw background grading gradient
    const c1 = shot.themeColors[0] || "#090d16";
    const c2 = shot.themeColors[1] || "#3b82f6";
    const c3 = shot.themeColors[2] || "#ec4899";

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, c1);
    gradient.addColorStop(0.5, c2);
    gradient.addColorStop(1, c3);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Apply procedural vignette/environmental shadowing
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, width, height);

    // Context cues checker
    const pStr = (shot.generationPrompt || "").toLowerCase();
    const isNight = pStr.includes("night") || pStr.includes("neon") || pStr.includes("alley");
    const isDay = pStr.includes("day") || pStr.includes("sunlight") || pStr.includes("stark");

    // Draw stylized sky ambient stars or dust or flares
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    if (isNight) {
      // Glow stars / particle structures
      for (let i = 0; i < 25; i++) {
        const sx = (Math.sin(i * 123.45) * 0.5 + 0.5) * width;
        const sy = (Math.cos(i * 789.01) * 0.5 + 0.5) * (height * 0.7);
        const radius = (Math.sin(i * 99) * 0.5 + 0.5) * 1.5;
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (isDay) {
      // Golden halo sun flare
      const flareGrad = ctx.createRadialGradient(width * 0.8, height * 0.2, 5, width * 0.8, height * 0.2, 80);
      flareGrad.addColorStop(0, "rgba(253, 224, 71, 0.4)");
      flareGrad.addColorStop(0.2, "rgba(251, 146, 60, 0.1)");
      flareGrad.addColorStop(1, "rgba(251, 146, 60, 0)");
      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(width * 0.8, height * 0.2, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw camera horizon guidelines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(0, height * 0.6);
    ctx.lineTo(width, height * 0.6);
    ctx.stroke();

    // Perspective depth lines from a focal center point
    const fcX = width * 0.5;
    const fcY = height * 0.55;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(fcX, fcY);
      ctx.lineTo(fcX + Math.cos(angle) * width, fcY + Math.sin(angle) * width);
      ctx.stroke();
    }

    // Procedural silhouetted character representation based on angle and name tags
    const charName = shot.characterInShot;
    ctx.fillStyle = "rgba(10, 15, 26, 0.85)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1.5;

    const angleType = (shot.cameraMetadata.angle || "").toLowerCase();
    
    if (angleType.includes("close-up") || angleType.includes("ecu")) {
      // Close up face/shoulder silhouette
      ctx.beginPath();
      // Shoulder oval
      const sY = height * 0.7;
      ctx.ellipse(width * 0.5, sY + 60, 60, 80, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Head sphere
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.45, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Neon backlights casting edge lines
      ctx.strokeStyle = c2;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.45, 30, Math.PI * 0.7, Math.PI * 1.3);
      ctx.stroke();
    } else if (angleType.includes("wide") || angleType.includes("establishing")) {
      // Wide shot: small full figure at center or rule-of-thirds crosshair
      const chX = width * 0.35;
      const chY = height * 0.55;

      ctx.beginPath();
      // Legs / Torso
      ctx.moveTo(chX - 4, chY + 30);
      ctx.lineTo(chX - 2, chY + 12);
      ctx.lineTo(chX + 2, chY + 12);
      ctx.lineTo(chX + 4, chY + 30);
      ctx.lineTo(chX + 2, chY + 30);
      ctx.lineTo(chX + 1, chY + 17);
      ctx.lineTo(chX - 1, chY + 17);
      ctx.lineTo(chX - 2, chY + 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Torso & head
      ctx.beginPath();
      ctx.ellipse(chX, chY + 6, 4, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(chX, chY - 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glow flare outline
      ctx.strokeStyle = c3;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(chX, chY - 4, 2.5, Math.PI * 0.6, Math.PI * 1.4);
      ctx.stroke();
    } else {
      // Medium shot: torso up
      const chX = width * 0.5;
      const chY = height * 0.5;

      ctx.beginPath();
      ctx.ellipse(chX, chY + 45, 35, 45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(chX, chY + 12, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = c2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(chX, chY + 12, 17, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
    }

    // Overlay cinematographic camera monitor details (safe frames + aspect guides)
    // Horizontal rule-of-thirds lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 3);
    ctx.lineTo(width, height / 3);
    ctx.moveTo(0, (height * 2) / 3);
    ctx.lineTo(width, (height * 2) / 3);
    ctx.moveTo(width / 3, 0);
    ctx.lineTo(width / 3, height);
    ctx.moveTo((width * 2) / 3, 0);
    ctx.lineTo((width * 2) / 3, height);
    ctx.stroke();

    // Red safe boundaries / corners
    ctx.strokeStyle = "rgba(220, 38, 38, 0.45)";
    ctx.lineWidth = 2;
    const padding = 12;
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(padding, padding + 15);
    ctx.lineTo(padding, padding);
    ctx.lineTo(padding + 15, padding);
    // Top-right corner
    ctx.moveTo(width - padding - 15, padding);
    ctx.lineTo(width - padding, padding);
    ctx.lineTo(width - padding, padding + 15);
    // Bottom-left corner
    ctx.moveTo(padding, height - padding - 15);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(padding + 15, height - padding);
    // Bottom-right corner
    ctx.moveTo(width - padding - 15, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(width - padding, height - padding - 15);
    ctx.stroke();

    // Center Crosshair
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 8, height / 2);
    ctx.lineTo(width / 2 + 8, height / 2);
    ctx.moveTo(width / 2, height / 2 - 8);
    ctx.lineTo(width / 2, height / 2 + 8);
    ctx.stroke();

  }, [shot.themeColors, shot.cameraMetadata.angle, shot.characterInShot, shot.generationPrompt, aiImageUrl]);

  const handleCopyColor = (color: string, idx: number) => {
    navigator.clipboard.writeText(color);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdate({
      ...shot,
      durationSeconds: val
    });
  };

  const handleTriggerGenImage = async () => {
    setIsGenerating(true);
    setGenError(null);
    try {
      const url = await onGenImage(shot.id, shot.generationPrompt);
      if (url) {
        setAiImageUrl(url);
      } else {
        setGenError("Image generation returned empty content.");
      }
    } catch (err: any) {
      setGenError(err.message || "Failed to generate visual frame.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveEdits = () => {
    const updatedMetadata: CameraMetadata = {
      angle: editAngle,
      lens: editLens,
      motion: editMotion
    };

    onUpdate({
      ...shot,
      title: editTitle,
      actionDescription: editAction,
      dialogueText: editDialogue.trim() ? editDialogue : undefined,
      characterInShot: editCharacter.trim() ? editCharacter : undefined,
      cameraMetadata: updatedMetadata
    });
    setIsEditing(false);
  };

  return (
    <div id={`shot-card-${shot.id}`} className="bg-bento-card border border-bento-border rounded-xl overflow-hidden shadow-xl flex flex-col hover:border-bento-accent/50 transition-all group">
      {/* Visual Frame Block (Procedural Canvas or Generated AI Image) */}
      <div className="relative aspect-video w-full bg-bento-canvas overflow-hidden group-hover:shadow-[0_0_20px_rgba(242,125,38,0.15)] transition-all">
        {aiImageUrl ? (
          <img
            src={aiImageUrl}
            alt={shot.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={384}
            height={216}
            className="w-full h-full object-cover block"
          />
        )}

        {/* Framing HUD HUD details */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          <span className="bg-black/75 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-bento-accent tracking-wider uppercase border border-bento-border">
            SCENE {shot.sceneNumber}
          </span>
          <span className="bg-black/75 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-slate-350 tracking-wider border border-bento-border">
            SHOT #{shot.sequenceId}
          </span>
        </div>

        {/* Overlaid Camera Specs */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          <span className="flex items-center gap-1 bg-slate-950/85 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-300 border border-bento-border uppercase">
            <Compass className="w-3 h-3 text-bento-accent" />
            {shot.cameraMetadata.angle}
          </span>
          <span className="flex items-center gap-1 bg-slate-950/85 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-300 border border-bento-border uppercase">
            <Aperture className="w-3 h-3 text-emerald-400" />
            {shot.cameraMetadata.lens}
          </span>
        </div>

        {/* AI Generator Overlay Panel */}
        <div className="absolute bottom-2 right-2">
          {!aiImageUrl ? (
            <button
              onClick={handleTriggerGenImage}
              disabled={isGenerating}
              className="bg-bento-accent hover:bg-orange-500 disabled:bg-slate-800 text-black font-mono text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded shadow-md border border-bento-border flex items-center gap-1 cursor-pointer transition-colors"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-2.5 w-2.5 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>RENDERING AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-2.5 h-2.5 text-black/70" />
                  <span>PRE-VIZ GENERATOR</span>
                </>
              )}
            </button>
          ) : (
            <span className="bg-emerald-600/90 text-white font-mono text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded flex items-center gap-1 shadow border border-emerald-450/40">
              <CheckCircle className="w-2.5 h-2.5" /> AI DIRECT
            </span>
          )}
        </div>
      </div>

      {/* Shot Info & Formats */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3 text-slate-200">
        <div>
          {isEditing ? (
            <div className="space-y-2.5 bg-bento-panel border border-bento-border rounded-lg p-3">
              <div className="flex items-center justify-between border-b border-bento-border pb-1.5 mb-1.5">
                <span className="text-[10px] font-mono text-bento-accent font-semibold uppercase">Edit Shot Assets</span>
                <span className="text-[10px] text-slate-500 font-mono">id: {shot.id}</span>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-bento-bg border border-bento-border rounded px-2 py-1 text-xs text-slate-200 font-sans focus:outline-none focus:border-bento-accent"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Action & Narrative Scene</label>
                <textarea
                  value={editAction}
                  onChange={(e) => setEditAction(e.target.value)}
                  rows={2}
                  className="w-full bg-bento-bg border border-bento-border rounded px-2 py-1 text-xs text-slate-300 font-sans focus:outline-none focus:border-bento-accent resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Character Focus</label>
                  <input
                    type="text"
                    value={editCharacter}
                    onChange={(e) => setEditCharacter(e.target.value)}
                    placeholder="None"
                    className="w-full bg-bento-bg border border-bento-border rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-bento-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Dialogue Overlay</label>
                  <input
                    type="text"
                    value={editDialogue}
                    onChange={(e) => setEditDialogue(e.target.value)}
                    placeholder="None"
                    className="w-full bg-bento-bg border border-bento-border rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-bento-accent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 mb-0.5">Angle</label>
                  <input
                    type="text"
                    value={editAngle}
                    onChange={(e) => setEditAngle(e.target.value)}
                    className="w-full bg-bento-bg border border-bento-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 mb-0.5">Lens</label>
                  <input
                    type="text"
                    value={editLens}
                    onChange={(e) => setEditLens(e.target.value)}
                    className="w-full bg-bento-bg border border-bento-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 mb-0.5">Motion</label>
                  <input
                    type="text"
                    value={editMotion}
                    onChange={(e) => setEditMotion(e.target.value)}
                    className="w-full bg-bento-bg border border-bento-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-bento-border">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 text-[10px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdits}
                  className="px-2.5 py-1 text-[10px] font-mono bg-bento-accent hover:bg-orange-500 rounded text-black font-bold cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3 text-black" /> Save Specs
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-1.5">
                <h3 className="font-sans font-semibold text-slate-200 text-sm tracking-tight leading-snug group-hover:text-bento-accent transition-colors">
                  {shot.title}
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-slate-500 hover:text-slate-300 pointer-events-auto p-1 cursor-pointer"
                  title="Edit Specs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans line-clamp-3">
                {shot.actionDescription}
              </p>

              {/* Dialogue Bubble overlays inside frames */}
              {shot.characterInShot && (
                <div className="bg-bento-canvas border border-bento-border rounded-lg p-2 mt-2">
                  <span className="block text-[9px] tracking-wider font-bold text-bento-accent uppercase font-mono mb-0.5">
                    {shot.characterInShot} (DIALOGUE)
                  </span>
                  <p className="text-xs text-slate-300 italic font-sans leading-snug">
                    "{shot.dialogueText || "..."}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interactive Timing & Slider */}
        <div className="pt-2 border-t border-bento-border flex flex-col gap-2">
          {/* Tone & Emotional Swatches */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-bento-accent" />
              Emotional Tone
            </span>
            <div className="flex gap-1.5">
              {shot.themeColors.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCopyColor(color, idx)}
                  className="w-5 h-5 rounded-full border border-bento-border shadow hover:scale-115 transition-all relative flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: color }}
                  title={`Copy hex: ${color}`}
                >
                  {copiedIndex === idx ? (
                    <span className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-emerald-450" />
                    </span>
                  ) : (
                    <span className="absolute opacity-0 hover:opacity-100 inset-0 bg-black/30 rounded-full flex items-center justify-center">
                      <Copy className="w-2 h-2 text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Shot Timing Pacing Controls */}
          <div className="bg-bento-canvas border border-bento-border p-2 rounded-lg space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-bento-accent" />
                Duration Specs:
              </span>
              <span className="text-bento-accent font-bold">{shot.durationSeconds.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={15.0}
              step={0.5}
              value={shot.durationSeconds}
              onChange={handleDurationChange}
              className="w-full accent-bento-accent h-1 bg-bento-card rounded-lg cursor-pointer focus:outline-none"
            />
          </div>

          {/* Generative Error warning indicator */}
          {genError && (
            <div className="text-[10px] font-mono text-red-400 leading-tight bg-red-950/30 border border-red-900/50 p-1.5 rounded">
              ⚠️ Frame rendering: {genError}
            </div>
          )}

          {/* Core Sequencing controls */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1.5">
              <button
                onClick={() => onMove(shot.id, "left")}
                disabled={shot.sequenceId <= 1}
                className="bg-bento-canvas hover:bg-bento-bg disabled:bg-slate-900/40 disabled:text-slate-700 text-slate-300 p-1.5 rounded border border-bento-border flex items-center justify-center cursor-pointer"
                title="Shift Sequence Left"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onMove(shot.id, "right")}
                disabled={shot.sequenceId >= totalShots}
                className="bg-bento-canvas hover:bg-bento-bg disabled:bg-slate-900/40 disabled:text-slate-700 text-slate-300 p-1.5 rounded border border-bento-border flex items-center justify-center cursor-pointer"
                title="Shift Sequence Right"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => onDelete(shot.id)}
              className="text-slate-500 hover:text-red-400 hover:bg-bento-bg/50 p-1.5 rounded transition-all cursor-pointer"
              title="Delete Shot"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
