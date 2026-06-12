/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { ShotAsset, CameraMetadata, SceneMetadata } from "../types";
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
  Aperture,
  Lock,
  Unlock,
  ZoomIn,
  RefreshCw,
  Move,
  Mic,
  MicOff
} from "lucide-react";

interface StoryboardCardProps {
  key?: string;
  shot: ShotAsset;
  onUpdate: (updatedShot: ShotAsset) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "left" | "right") => void;
  onGenImage: (id: string, prompt: string) => Promise<string | undefined>;
  totalShots: number;
  highlighted?: boolean;
  onSelect?: (id: string) => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetId: string) => void;
  scenes?: SceneMetadata[];
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  aspectRatio?: "2.39:1" | "16:9" | "4:3";
}

export default function StoryboardCard({
  shot,
  onUpdate,
  onDelete,
  onMove,
  onGenImage,
  totalShots,
  highlighted = false,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  scenes = [],
  isSelected = false,
  onToggleSelect,
  aspectRatio = "16:9"
}: StoryboardCardProps) {
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Simulated progress during rendering
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setGenerationProgress(5);
      interval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 92) return prev;
          return prev + Math.floor(Math.random() * 15 + 4);
        });
      }, 250);
    } else {
      setGenerationProgress(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Edit states
  const [editTitle, setEditTitle] = useState(shot.title);
  const [editAction, setEditAction] = useState(shot.actionDescription);
  const [editDialogue, setEditDialogue] = useState(shot.dialogueText || "");
  const [editCharacter, setEditCharacter] = useState(shot.characterInShot || "");
  const [editAngle, setEditAngle] = useState(shot.cameraMetadata.angle);
  const [editLens, setEditLens] = useState(shot.cameraMetadata.lens);
  const [editMotion, setEditMotion] = useState(shot.cameraMetadata.motion);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [descError, setDescError] = useState<string | null>(null);
  
  const [isDictating, setIsDictating] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);

  const startDictation = (target: "edit" | "view") => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setDictationError("Speech recognition not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsDictating(true);
        setDictationError(null);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === "not-allowed") {
          setDictationError("Microphone permission denied.");
        } else {
          setDictationError(`Error: ${event.error}`);
        }
        setIsDictating(false);
      };

      recognition.onend = () => {
        setIsDictating(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          if (target === "edit") {
            setEditAction(prev => prev ? `${prev} ${transcript}` : transcript);
          } else {
            onUpdate({
              ...shot,
              actionDescription: shot.actionDescription ? `${shot.actionDescription} ${transcript}` : transcript
            });
          }
        }
      };

      recognition.start();
    } catch (e: any) {
      setDictationError("Failed to initiate voice capture.");
      setIsDictating(false);
    }
  };

  const handleAutoDescribe = async () => {
    setIsGeneratingDesc(true);
    setDescError(null);
    try {
      const response = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          cameraAngle: editAngle,
          cameraLens: editLens,
          cameraMotion: editMotion,
          generationPrompt: shot.generationPrompt
        })
      });
      if (!response.ok) {
        throw new Error("Failed to communicate with description pipeline.");
      }
      const data = await response.json();
      if (data.description) {
        setEditAction(data.description);
      } else {
        throw new Error("No description generated in response.");
      }
    } catch (err: any) {
      setDescError(err.message || "Failed to auto-generate description.");
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Focus and lens focal length classification profiles
  const getFocalProfile = (lensStr: string) => {
    const cleanStr = (lensStr || "").toLowerCase();
    if (cleanStr.includes("24") || cleanStr.includes("18") || cleanStr.includes("12") || cleanStr.includes("wide") || cleanStr.includes("anamorphic") || cleanStr.includes("establishing")) {
      return { type: "wide" as const, label: "Wide Angle Focus", desc: "Immense environmental scope, deep spatial capture" };
    } else if (cleanStr.includes("85") || cleanStr.includes("tele") || cleanStr.includes("portrait") || cleanStr.includes("105") || cleanStr.includes("135") || cleanStr.includes("zoom")) {
      return { type: "tele" as const, label: "Telephoto Isolation", desc: "Compressed spatial layering, isolated subject portraiture" };
    } else {
      return { type: "standard" as const, label: "Standard Prime", desc: "Organic spatial fidelity, matches human optic geometry" };
    }
  };

  // Continuous Camera Motion Path Animation Preview Loop
  useEffect(() => {
    const canvas = motionCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let frameCount = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frameCount++;

      const motionLower = (isEditing ? editMotion : shot.cameraMetadata.motion || "static").toLowerCase();

      // Render futuristic procedural engineering mesh
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 8) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);

      if (motionLower.includes("pan") || motionLower.includes("tilt")) {
        const isPan = motionLower.includes("pan");
        const isTilt = motionLower.includes("tilt");

        ctx.strokeStyle = "#f27d26"; // bento-accent
        ctx.fillStyle = "#f27d26";
        ctx.lineWidth = 2.5;

        if (isPan && isTilt) {
          const offset = Math.sin(frameCount * 0.05) * 12;
          ctx.beginPath();
          ctx.moveTo(-12 + offset, -8 + offset);
          ctx.lineTo(12 + offset, 8 + offset);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(12 + offset, 8 + offset, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (isPan) {
          const offset = Math.sin(frameCount * 0.06) * 14;
          ctx.beginPath();
          ctx.moveTo(-15 + offset, 0);
          ctx.lineTo(15 + offset, 0);
          ctx.stroke();
          
          const dir = Math.cos(frameCount * 0.06);
          ctx.beginPath();
          if (dir > 0) {
            ctx.moveTo(15 + offset, 0);
            ctx.lineTo(10 + offset, -3);
            ctx.lineTo(10 + offset, 3);
          } else {
            ctx.moveTo(-15 + offset, 0);
            ctx.lineTo(-10 + offset, -3);
            ctx.lineTo(-10 + offset, 3);
          }
          ctx.fill();
        } else {
          const offset = Math.sin(frameCount * 0.06) * 10;
          ctx.beginPath();
          ctx.moveTo(0, -12 + offset);
          ctx.lineTo(0, 12 + offset);
          ctx.stroke();

          const dir = Math.cos(frameCount * 0.06);
          ctx.beginPath();
          if (dir > 0) {
            ctx.moveTo(0, 12 + offset);
            ctx.lineTo(-3, 8 + offset);
            ctx.lineTo(3, 8 + offset);
          } else {
            ctx.moveTo(0, -12 + offset);
            ctx.lineTo(-3, -8 + offset);
            ctx.lineTo(3, -8 + offset);
          }
          ctx.fill();
        }

        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1;
        ctx.strokeRect(-5, -3, 10, 6);
        ctx.beginPath();
        ctx.moveTo(5, -1.5);
        ctx.lineTo(8, -3);
        ctx.lineTo(8, 3);
        ctx.lineTo(5, 1.5);
        ctx.closePath();
        ctx.stroke();

      } else if (motionLower.includes("zoom") || motionLower.includes("push") || motionLower.includes("pull") || motionLower.includes("dolly")) {
        const isPull = motionLower.includes("pull") || motionLower.includes("out");
        const scaleCycle = 0.5 + (isPull ? (1 - (frameCount * 0.015) % 1) : ((frameCount * 0.015) % 1)) * 1.0;
        
        ctx.strokeStyle = "rgba(242, 125, 38, " + (1.2 - scaleCycle) + ")";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-16 * scaleCycle, -10 * scaleCycle, 32 * scaleCycle, 20 * scaleCycle);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.strokeRect(-16, -10, 32, 20);
        
        ctx.strokeStyle = "#f27d26";
        ctx.lineWidth = 1;
        const arrowSign = isPull ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(-12, -7); ctx.lineTo(-12 + 4 * arrowSign, -7 + 2.5 * arrowSign);
        ctx.moveTo(12, -7); ctx.lineTo(12 - 4 * arrowSign, -7 + 2.5 * arrowSign);
        ctx.moveTo(-12, 7); ctx.lineTo(-12 + 4 * arrowSign, 7 - 2.5 * arrowSign);
        ctx.moveTo(12, 7); ctx.lineTo(12 - 4 * arrowSign, 7 - 2.5 * arrowSign);
        ctx.stroke();
      } else if (motionLower.includes("track") || motionLower.includes("motion") || motionLower.includes("follow") || motionLower.includes("move")) {
        const angle = frameCount * 0.04;
        const rX = 13;
        const rY = 8;
        const tX = Math.cos(angle) * rX;
        const tY = Math.sin(angle) * rY;

        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.ellipse(0, 0, rX, rY, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#f27d26";
        ctx.beginPath();
        ctx.arc(tX, tY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(242, 125, 38, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tX - 5, tY); ctx.lineTo(tX + 5, tY);
        ctx.moveTo(tX, tY - 5); ctx.lineTo(tX, tY + 5);
        ctx.stroke();
      } else if (motionLower.includes("handheld") || motionLower.includes("shake") || motionLower.includes("jiggle")) {
        const shakeX = Math.sin(frameCount * 0.5) * 2 + Math.cos(frameCount * 1.3) * 1;
        const shakeY = Math.cos(frameCount * 0.6) * 2 + Math.sin(frameCount * 1.1) * 1;

        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.strokeRect(-10 + shakeX, -7 + shakeY, 20, 14);

        ctx.fillStyle = "rgba(242, 125, 38, 0.7)";
        ctx.beginPath();
        ctx.arc(shakeX, shakeY, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
        ctx.moveTo(0, -8); ctx.lineTo(0, 8);
        ctx.stroke();
        
        ctx.fillStyle = "rgba(16, 185, 129, 0.85)";
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animFrame = requestAnimationFrame(draw);
    };

    animFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrame);
  }, [shot.cameraMetadata.motion, editMotion, isEditing]);

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

    // Subtle Lens Flare overlay
    if (shot.lensFlareIntensity === "Subtle") {
      ctx.save();
      const centerX = width * 0.45;
      const centerY = height * 0.4;
      
      const refX1 = width * 0.61;
      const refY1 = height * 0.54;
      const refX2 = width * 0.76;
      const refY2 = height * 0.68;

      const leakage = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 120);
      leakage.addColorStop(0, "rgba(251, 146, 60, 0.22)");
      leakage.addColorStop(0.4, "rgba(251, 146, 60, 0.07)");
      leakage.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = leakage;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 120, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
      ctx.beginPath();
      ctx.arc(refX1, refY1, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(253, 186, 116, 0.1)";
      ctx.beginPath();
      ctx.arc(refX2, refY2, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Anamorphic Lens Flare overlay
    if (shot.lensFlareIntensity === "Anamorphic") {
      ctx.save();
      const centerY = height * 0.45;

      const streakGrad = ctx.createRadialGradient(width * 0.5, centerY, 2, width * 0.5, centerY, 60);
      streakGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      streakGrad.addColorStop(0.15, "rgba(56, 189, 248, 0.65)");
      streakGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.25)");
      streakGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = streakGrad;
      ctx.beginPath();
      ctx.arc(width * 0.5, centerY, 60, 0, Math.PI * 2);
      ctx.fill();

      const streakLine = ctx.createLinearGradient(0, centerY, width, centerY);
      streakLine.addColorStop(0, "rgba(56, 189, 248, 0)");
      streakLine.addColorStop(0.4, "rgba(56, 189, 248, 0.6)");
      streakLine.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
      streakLine.addColorStop(0.6, "rgba(56, 189, 248, 0.6)");
      streakLine.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = streakLine;
      ctx.fillRect(0, centerY - 2, width, 4);

      const softHalo = ctx.createLinearGradient(0, centerY, width, centerY);
      softHalo.addColorStop(0.1, "rgba(56, 189, 248, 0)");
      softHalo.addColorStop(0.5, "rgba(56, 189, 248, 0.1)");
      softHalo.addColorStop(0.9, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = softHalo;
      ctx.fillRect(0, centerY - 20, width, 40);

      ctx.restore();
    }

  }, [shot.themeColors, shot.cameraMetadata.angle, shot.characterInShot, shot.generationPrompt, aiImageUrl, shot.lensFlareIntensity]);

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

  const getMotionBadge = () => {
    const motion = (shot.cameraMetadata.motion || "").toLowerCase();
    
    let text = "Static";
    let icon = <Camera className="w-3 h-3 text-slate-400" />;
    let style = "bg-slate-950/85 text-slate-400 border-slate-700/60";

    if (motion.includes("pan") || motion.includes("panning") || motion.includes("tilt")) {
      text = "Panning";
      icon = <RefreshCw className="w-3 h-3 text-sky-450 animate-spin" style={{ animationDuration: "6s" }} />;
      style = "bg-sky-950/90 text-sky-400 border-sky-850/50";
    } else if (motion.includes("zoom") || motion.includes("zooming") || motion.includes("push") || motion.includes("pull")) {
      text = "Zooming";
      icon = <ZoomIn className="w-3 h-3 text-amber-450 animate-pulse" />;
      style = "bg-amber-950/90 text-amber-450 border-amber-850/50";
    } else if (motion.includes("track") || motion.includes("tracking") || motion.includes("follow") || motion.includes("move")) {
      text = "Tracking";
      icon = <Move className="w-3 h-3 text-indigo-400" />;
      style = "bg-indigo-950/90 text-indigo-400 border-indigo-850/50";
    } else if (motion.includes("boom") || motion.includes("crane") || motion.includes("dolly") || motion.includes("glide")) {
      text = "Dolly Glide";
      icon = <Compass className="w-3 h-3 text-emerald-400" />;
      style = "bg-emerald-950/90 text-emerald-400 border-emerald-850/50";
    } else if (motion.includes("handheld") || motion.includes("shake") || motion.includes("jiggle")) {
      text = "Handheld";
      icon = <Sparkles className="w-3 h-3 text-rose-450" />;
      style = "bg-rose-950/90 text-rose-400 border-rose-850/50";
    } else if (motion && motion !== "static") {
      text = shot.cameraMetadata.motion;
      icon = <Compass className="w-3 h-3 text-bento-accent" />;
      style = "bg-orange-950/90 text-bento-accent border-orange-850/50";
    }

    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border uppercase tracking-wider ${style}`} title={`Camera Work: ${shot.cameraMetadata.motion}`}>
        {icon}
        <span>{text}</span>
      </span>
    );
  };

  const matchingScene = (scenes || []).find(s => s && s.sceneNumber === shot.sceneNumber);
  const lightingMoodText = matchingScene?.lightingMood || "Cinematic atmosphere";
  const aspectStyleValue = aspectRatio === "2.39:1" ? "2.39 / 1" : aspectRatio === "4:3" ? "4 / 3" : "16 / 9";

  const getTransitionDetails = (t: string) => {
    switch (t) {
      case "Dissolve":
        return { label: "Dissolve", icon: "🌫️", desc: "Poetic soft cross-dissolve frame blending" };
      case "Fade":
        return { label: "Fade", icon: "🎬", desc: "Cinematic fade down to neutral timeline backdrop" };
      case "Fade to Black":
        return { label: "Fade to Black", icon: "⬛", desc: "Dip down to pure black of absolute silence" };
      case "Wipe":
        return { label: "Wipe", icon: "↔️", desc: "Spatially wiping panel sweep transition style" };
      default:
        return { label: "Cut", icon: "✂️", desc: "Instantaneous physical spline-cut scene transition" };
    }
  };

  return (
    <div 
      id={`shot-card-${shot.id}`} 
      onClick={() => onSelect?.(shot.id)}
      draggable={!shot.isLocked}
      onDragStart={(e) => {
        if (shot.isLocked) {
          e.preventDefault();
          return;
        }
        onDragStart?.(e, shot.id);
      }}
      onDragOver={(e) => onDragOver?.(e)}
      onDrop={(e) => onDrop?.(e, shot.id)}
      className={`bg-bento-card border rounded-xl overflow-hidden shadow-xl flex flex-col transition-all duration-300 group ${
        shot.isLocked 
          ? "cursor-default select-none border-bento-border/40 opacity-95" 
          : "cursor-grab active:cursor-grabbing hover:border-bento-accent/50 hover:border-bento-accent hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.55)]"
      } ${
        highlighted ? "ring-2 ring-bento-accent border-bento-accent shadow-[0_0_20px_rgba(242,125,38,0.3)] bg-slate-900/40" : "border-bento-border"
      }`}
    >
      {/* Visual Frame Block (Procedural Canvas or Generated AI Image) */}
      <div 
        className="relative w-full bg-bento-canvas overflow-hidden group-hover:shadow-[0_0_25px_rgba(242,125,38,0.22)] transition-all z-10"
        style={{ aspectRatio: aspectStyleValue }}
      >
        {isGenerating && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 z-20 animate-pulse duration-1000">
            <div className="flex items-center gap-1.5 mb-2 text-bento-accent animate-bounce">
              <Sparkles className="w-4 h-4 text-bento-accent" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">RENDERING PRE-VIZ...</span>
            </div>
            <div className="w-3/4 bg-slate-900 border border-bento-border h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-bento-accent transition-all duration-200"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-slate-400 mt-1">{generationProgress}% READY</span>
          </div>
        )}
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

        {/* Lock Shot Quick Toggle Absolute Overlay in Header */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-35">
          {/* Lens Flare Slider */}
          <div className="flex items-center gap-1.5 bg-black/85 backdrop-blur-xs border border-bento-border/70 px-2 py-0.5 rounded text-[8.5px] font-mono select-none" title="Cinematic Lens Flare Overlay: None, Subtle, Anamorphic Streak">
            <span className="text-slate-400 font-extrabold uppercase">Flare:</span>
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={shot.lensFlareIntensity === "Anamorphic" ? 2 : shot.lensFlareIntensity === "Subtle" ? 1 : 0}
              onChange={(e) => {
                e.stopPropagation();
                const val = parseInt(e.target.value);
                const stringVal = val === 2 ? "Anamorphic" : val === 1 ? "Subtle" : "None";
                onUpdate({ ...shot, lensFlareIntensity: stringVal });
              }}
              disabled={shot.isLocked}
              className="w-10 accent-bento-accent cursor-pointer disabled:opacity-50 h-1 bg-slate-900 rounded"
            />
            <span className="text-bento-accent font-extrabold uppercase w-7 text-center text-[7.5px]">
              {shot.lensFlareIntensity === "Anamorphic" ? "ANAM" : shot.lensFlareIntensity === "Subtle" ? "SUBT" : "NONE"}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({
                ...shot,
                isLocked: !shot.isLocked
              });
            }}
            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase flex items-center gap-1 shadow-md border cursor-pointer transition-all ${
              shot.isLocked 
                ? "bg-rose-600/90 hover:bg-rose-500 text-white border-rose-500 animate-fade-in" 
                : "bg-black/75 hover:bg-slate-900 border-bento-border text-slate-400 hover:text-slate-200"
            }`}
            title={shot.isLocked ? "Shot is locked. Click to unlock assets" : "Lock shot to protect from any edits, deletions, or drags"}
          >
            {shot.isLocked ? (
              <>
                <Lock className="w-2.5 h-2.5 text-white" />
                <span>LOCKED</span>
              </>
            ) : (
              <>
                <Unlock className="w-2.5 h-2.5 text-slate-400" />
                <span>LOCK</span>
              </>
            )}
          </button>
        </div>

        {/* Selection Checkbox & Framing HUD details */}
        <div className="absolute top-2 left-2 flex gap-1.5 items-center flex-wrap z-40 bg-black/75 backdrop-blur-xs pl-1.5 pr-2 py-1 rounded-lg border border-bento-border/60">
          <input
            id={`checkbox-select-${shot.id}`}
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.(shot.id);
            }}
            className="w-3.5 h-3.5 accent-bento-accent bg-slate-950 border border-bento-border/70 rounded cursor-pointer pointer-events-auto shrink-0 transition-transform active:scale-95"
            title="Select for batch actions"
          />
          <span className="bg-black/40 px-1 py-0.5 rounded text-[8px] font-mono font-bold text-bento-accent tracking-wider uppercase">
            SC {shot.sceneNumber}
          </span>
          <span className="bg-black/40 px-1 py-0.5 rounded text-[8px] font-mono font-bold text-slate-350 tracking-wider">
            #{shot.sequenceId}
          </span>
        </div>

        {/* Overlaid Camera Specs */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 items-center">
          <span className="flex items-center gap-1 bg-slate-950/85 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-300 border border-bento-border uppercase">
            <Compass className="w-3 h-3 text-bento-accent" />
            {shot.cameraMetadata.angle}
          </span>
          <span className="flex items-center gap-1 bg-slate-950/85 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-300 border border-bento-border uppercase font-bold text-slate-200">
            <Aperture className="w-3 h-3 text-emerald-400" />
            {shot.cameraMetadata.lens}
          </span>
          {getMotionBadge()}
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
                <div className="flex justify-between items-center mb-0.5">
                  <label className="block text-[10px] font-mono text-slate-400">Action & Narrative Scene</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isDictating) {
                          // Stopping speech recognition simply triggers onend
                          setIsDictating(false);
                        } else {
                          startDictation("edit");
                        }
                      }}
                      disabled={shot.isLocked}
                      className={`text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors px-1.5 py-0.5 rounded border ${
                        isDictating 
                          ? "bg-red-950/70 border-red-500/50 text-red-400 animate-pulse" 
                          : "bg-slate-950/30 border-bento-border/30 text-amber-450 hover:text-amber-300 hover:border-amber-400/40"
                      }`}
                      title={isDictating ? "Microphone active. Click to finalize/stop transcript." : "Dictate Narrative Action with Microphone"}
                    >
                      {isDictating ? (
                        <>
                          <MicOff className="w-2.5 h-2.5 text-red-500 animate-pulse" />
                          <span>RECORDING...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-2.5 h-2.5 text-amber-500" />
                          <span>DIKTAT</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleAutoDescribe}
                      disabled={isGeneratingDesc}
                      className="text-[9px] font-mono font-semibold text-bento-accent hover:text-orange-500 disabled:text-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Render action description with Gemini"
                    >
                      {isGeneratingDesc ? (
                        <>
                          <svg className="animate-spin h-2.5 w-2.5 text-bento-accent" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Describing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AI Describe</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  value={editAction}
                  onChange={(e) => setEditAction(e.target.value)}
                  rows={3}
                  className="w-full bg-bento-bg border border-bento-border rounded px-2 py-1 text-xs text-slate-300 font-sans focus:outline-none focus:border-bento-accent resize-none animate-fade-in"
                />
                {descError && (
                  <span className="text-[9px] font-mono text-red-400 block mt-0.5">⚠️ {descError}</span>
                )}
                {dictationError && (
                  <span className="text-[9px] font-mono text-rose-450 block mt-0.5">🎙️ {dictationError}</span>
                )}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 mb-0.5">Camera Angle</label>
                  <input
                    type="text"
                    value={editAngle}
                    onChange={(e) => setEditAngle(e.target.value)}
                    className="w-full bg-bento-bg border border-bento-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-bento-accent text-slate-200 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 mb-0.5">Camera Motion</label>
                  <input
                    type="text"
                    value={editMotion}
                    onChange={(e) => setEditMotion(e.target.value)}
                    className="w-full bg-bento-bg border border-bento-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-bento-accent text-slate-200 font-sans"
                  />
                </div>
              </div>

              <div className="bg-bento-bg/85 p-2 rounded-lg border border-bento-border/60">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[9px] font-mono text-slate-450 uppercase font-semibold">Cinematic Lens Profile</label>
                  <select
                    value={["24mm Anamorphic", "35mm Wide-Angle", "50mm Standard Prime", "85mm Telephoto Portrait"].includes(editLens) ? editLens : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setEditLens(e.target.value);
                      }
                    }}
                    className="bg-bento-canvas border border-bento-border text-slate-300 font-mono text-[9px] rounded px-1 py-0.5 focus:outline-none focus:border-bento-accent cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">Choose...</option>
                    <option value="24mm Anamorphic" className="bg-slate-900">24mm Anamorphic 🎬</option>
                    <option value="35mm Wide-Angle" className="bg-slate-900">35mm Wide-Angle 🖼️</option>
                    <option value="50mm Standard Prime" className="bg-slate-900">50mm Standard Prime 👁️</option>
                    <option value="85mm Telephoto Portrait" className="bg-slate-900">85mm Telephoto Portrait 👤</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={editLens}
                  onChange={(e) => setEditLens(e.target.value)}
                  className="w-full bg-bento-canvas border border-bento-border rounded px-1.5 py-0.5 text-[11px] font-mono focus:outline-none focus:border-bento-accent text-bento-accent/90 mb-2"
                  placeholder="e.g. 50mm Prime"
                />
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-mono text-slate-500 uppercase">PRESETS:</span>
                  <div className="flex flex-wrap gap-1">
                    {["24mm", "35mm", "50mm", "85mm"].map((presetLens) => {
                      const isActive = editLens.toLowerCase().includes(presetLens);
                      return (
                        <button
                          key={presetLens}
                          type="button"
                          onClick={() => {
                            if (presetLens === "24mm") setEditLens("24mm Anamorphic");
                            else if (presetLens === "35mm") setEditLens("35mm Wide-Angle");
                            else if (presetLens === "50mm") setEditLens("50mm Standard Prime");
                            else if (presetLens === "85mm") setEditLens("85mm Telephoto Portrait");
                          }}
                          className={`px-1.5 py-0.5 text-[8px] font-mono rounded border transition-all cursor-pointer ${
                            isActive
                              ? "bg-bento-accent/20 border-bento-accent text-bento-accent font-bold"
                              : "bg-bento-canvas border-bento-border text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {presetLens}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Real-time Focal Length helper chart for edit selection */}
                <div className="mt-2.5 pt-2 border-t border-bento-border/30">
                  <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded border border-bento-border/20">
                    <div className={`flex flex-col items-center justify-center py-1 rounded transition-all ${getFocalProfile(editLens).type === "wide" ? "bg-bento-accent/20 border border-bento-accent/40 text-bento-accent" : "text-slate-500 border border-transparent"}`}>
                      <span className="text-[8px] font-mono font-bold leading-none">WIDE</span>
                      <span className="text-[6px] font-mono text-slate-400">18-35m</span>
                    </div>
                    <div className={`flex flex-col items-center justify-center py-1 rounded transition-all ${getFocalProfile(editLens).type === "standard" ? "bg-bento-accent/20 border border-bento-accent/40 text-bento-accent" : "text-slate-500 border border-transparent"}`}>
                      <span className="text-[8px] font-mono font-bold leading-none">STD</span>
                      <span className="text-[6px] font-mono text-slate-400">50mm</span>
                    </div>
                    <div className={`flex flex-col items-center justify-center py-1 rounded transition-all ${getFocalProfile(editLens).type === "tele" ? "bg-bento-accent/20 border border-bento-accent/40 text-bento-accent" : "text-slate-500 border border-transparent"}`}>
                      <span className="text-[8px] font-mono font-bold leading-none">TELE</span>
                      <span className="text-[6px] font-mono text-slate-400">85m+</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-sans text-slate-400 block mt-1 leading-tight text-center">
                    🔭 <b className="text-slate-350">{getFocalProfile(editLens).label}</b>: {getFocalProfile(editLens).desc}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-bento-border/40">
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
                  className="px-2.5 py-1 text-[10px] font-mono bg-bento-accent hover:bg-orange-500 rounded text-black font-bold cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <CheckCircle className="w-3 h-3 text-black" /> Save Specs
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-1.5">
                <h3 className="font-sans font-semibold text-slate-200 text-sm tracking-tight leading-snug group-hover:text-bento-accent transition-colors flex items-center gap-1.5">
                  {shot.isLocked && <Lock className="w-3 h-3 text-rose-450 inline shrink-0 animate-pulse" />}
                  <span>{shot.title}</span>
                </h3>
                <button
                  onClick={() => !shot.isLocked && setIsEditing(true)}
                  disabled={shot.isLocked}
                  className="text-slate-500 hover:text-slate-300 pointer-events-auto p-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  title={shot.isLocked ? "Shot is locked. Click unlock header to edit Specs" : "Edit Specs"}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-start gap-1 justify-between">
                <p className="text-xs text-slate-400 leading-relaxed font-sans line-clamp-3">
                  {shot.actionDescription}
                </p>
                {!shot.isLocked && (
                  <button
                    onClick={() => {
                      if (isDictating) {
                        setIsDictating(false);
                      } else {
                        startDictation("view");
                      }
                    }}
                    className={`p-1 rounded-full text-[10px] shrink-0 pointer-events-auto cursor-pointer transition-colors ${
                      isDictating 
                        ? "bg-red-950/60 text-red-500 border border-red-500/55 animate-pulse" 
                        : "text-slate-500 hover:text-amber-500 hover:bg-slate-900/60"
                    }`}
                    title={isDictating ? "Currently recording transcription... Click to stop." : "Dictate Action: Record voice to update description on this card."}
                  >
                    {isDictating ? (
                      <MicOff className="w-3.5 h-3.5" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

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

        {/* Cinematic Scene Atmosphere & lightingMood derived descriptors */}
        {matchingScene && (
          <div className="mx-4 bg-slate-950/40 border border-bento-border/40 p-2 rounded-lg flex items-center justify-between gap-2 text-slate-300">
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                🎬 ATMOSPHERE ({matchingScene.timeOfDay})
              </span>
              <span className="text-[10px] text-slate-350 truncate font-semibold" title={lightingMoodText}>
                {lightingMoodText}
              </span>
            </div>
            <div className="shrink-0 text-right bg-bento-bg/85 border border-bento-border/70 px-1.5 py-0.5 rounded text-[9px] font-mono text-bento-accent">
              🔥 {matchingScene.emotionalIntensity}/10
            </div>
          </div>
        )}

        {/* Cinematic Diagnostics Widget Section */}
        <div className="mx-4 bg-bento-canvas/50 border border-bento-border/50 rounded-lg p-2.5 grid grid-cols-5 gap-3 items-center">
          {/* Col 1: Animation Tool */}
          <div className="col-span-2 flex flex-col items-center justify-center gap-1.5 border-r border-bento-border/30 pr-2">
            <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest text-center font-semibold">Motion Vector</span>
            <div className="relative w-full h-[55px] bg-black/60 rounded-md overflow-hidden border border-bento-border/40">
              <canvas
                ref={motionCanvasRef}
                width={70}
                height={55}
                className="w-full h-full block"
              />
            </div>
            <span className="text-[8.5px] font-mono text-bento-accent text-center font-bold tracking-tight truncate max-w-full uppercase" title={`Camera Work: ${shot.cameraMetadata.motion}`}>
              {shot.cameraMetadata.motion || "Static"}
            </span>
          </div>

          {/* Col 2: Focal Length Chart */}
          <div className="col-span-3 flex flex-col gap-1.5 h-full justify-between">
            <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest font-semibold">Focal Profile Chart</span>
            {(() => {
              const profile = getFocalProfile(shot.cameraMetadata.lens);
              return (
                <>
                  <div className="grid grid-cols-3 gap-1 bg-black/45 p-1 rounded border border-bento-border/30">
                    <div className={`flex flex-col items-center justify-center py-1 rounded transition-all ${profile.type === "wide" ? "bg-bento-accent/20 border border-bento-accent/40 text-bento-accent" : "text-slate-500 border border-transparent"}`} title="Wide-Angle focus for immense scope">
                      <span className="text-[8px] font-mono font-bold leading-none">WIDE</span>
                      <span className="text-[6.5px] font-mono text-slate-400">18-35m</span>
                    </div>

                    <div className={`flex flex-col items-center justify-center py-1 rounded transition-all ${profile.type === "standard" ? "bg-bento-accent/20 border border-bento-accent/40 text-bento-accent" : "text-slate-500 border border-transparent"}`} title="Standard prime focus mimicking natural human vision">
                      <span className="text-[8px] font-mono font-bold leading-none">STD</span>
                      <span className="text-[6.5px] font-mono text-slate-400">50mm</span>
                    </div>

                    <div className={`flex flex-col items-center justify-center py-1 rounded transition-all ${profile.type === "tele" ? "bg-bento-accent/20 border border-bento-accent/40 text-bento-accent" : "text-slate-500 border border-transparent"}`} title="Telephoto backdrop compression portraiture">
                      <span className="text-[8px] font-mono font-bold leading-none">TELE</span>
                      <span className="text-[6.5px] font-mono text-slate-400">85m+</span>
                    </div>
                  </div>
                  <div className="text-[8px] font-sans text-slate-400 leading-tight">
                    🔭 <b className="text-slate-350">{profile.label}</b>: {profile.desc}
                  </div>
                </>
              );
            })()}
          </div>
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

          {/* Lighting Palette Strip */}
          <div className="bg-bento-canvas/60 border border-bento-border/60 rounded-lg p-1.5 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Lighting:</span>
              <button
                type="button"
                onClick={() => onUpdate({ ...shot, isColorPaletteLocked: !shot.isColorPaletteLocked })}
                className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold tracking-tight transition-all border flex items-center gap-1 ${
                  shot.isColorPaletteLocked 
                    ? "bg-indigo-950 border-indigo-700/50 text-indigo-400" 
                    : "bg-slate-950/40 border-bento-border/40 text-slate-500 hover:text-slate-350 hover:bg-slate-900"
                }`}
                title={shot.isColorPaletteLocked ? "Palette locked: protects current themeColors from analysis re-writes." : "Lock Palette Grade: retains coloring across updates."}
              >
                {shot.isColorPaletteLocked ? "🔒 Grade Locked" : "🔓 Lock Grade"}
              </button>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {shot.themeColors.map((color, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleCopyColor(color, idx)}
                  className="flex items-center gap-1 bg-slate-950/40 hover:bg-slate-900/80 px-1.5 py-0.5 rounded border border-bento-border/40 cursor-pointer select-none transition-all active:scale-95"
                  title="Click to copy hex color"
                >
                  <span className="w-2.5 h-2.5 rounded-sm border border-black/40 shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-mono text-[9px] text-slate-350 uppercase font-bold">{color}</span>
                  {copiedIndex === idx && <Check className="w-2.5 h-2.5 text-bento-accent shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Shot Timing Pacing Controls */}
          <div className="bg-bento-canvas border border-bento-border p-2.5 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-bento-accent" />
                Duration Specs:
              </span>
              <span className="text-bento-accent font-bold">{shot.durationSeconds.toFixed(1)}s</span>
            </div>

            {/* Real-time Rhythm Feedback Badge */}
            {(() => {
              const rhythm = shot.durationSeconds < 3.0 
                ? { label: "Rapid Pace ⚡", color: "text-amber-400 bg-amber-950/45 border-amber-850/30" }
                : shot.durationSeconds <= 7.0 
                ? { label: "Standard Rhythm ⏱️", color: "text-emerald-400 bg-emerald-950/45 border-emerald-850/30" }
                : { label: "Slow Epic / Cinematic 🎬", color: "text-indigo-400 bg-indigo-950/45 border-indigo-850/30" };
              return (
                <div className={`py-1 px-1.5 rounded text-[8px] font-mono border ${rhythm.color} flex items-center justify-between transition-all duration-300`}>
                  <span className="uppercase font-semibold tracking-wider">Rhythm Cadence:</span>
                  <span className="font-bold">{rhythm.label}</span>
                </div>
              );
            })()}

            <input
              type="range"
              min={1.0}
              max={15.0}
              step={0.5}
              value={shot.durationSeconds}
              onChange={handleDurationChange}
              disabled={shot.isLocked}
              className="w-full accent-bento-accent h-1 bg-bento-card rounded-lg cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              title={shot.isLocked ? "Unlock shot to adjust duration" : "Drag to adjust durationSeconds"}
            />

            <div className="flex justify-between text-[7px] text-slate-500 font-mono px-0.5 pt-0.5">
              <span>1.0s (Cut)</span>
              <span>4.5s (Pacing)</span>
              <span>8.0s</span>
              <span>11.5s</span>
              <span>15.0s (Scene)</span>
            </div>
          </div>

          {/* Generative Error warning indicator */}
          {genError && (
            <div className="text-[10px] font-mono text-red-400 leading-tight bg-red-950/30 border border-red-900/50 p-1.5 rounded">
              ⚠️ Frame rendering: {genError}
            </div>
          )}

          {/* Core Sequencing controls */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">Flow:</span>
              <select
                id={`transition-select-${shot.id}`}
                value={shot.transition || "Cut"}
                onChange={(e) => onUpdate({ ...shot, transition: e.target.value as any })}
                disabled={shot.isLocked}
                className="bg-bento-canvas border border-bento-border text-slate-300 font-mono text-[10px] rounded px-1.5 py-1 focus:outline-none focus:border-bento-accent cursor-pointer transition-colors max-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
                title={shot.isLocked ? "Shot is locked" : "Select Transition Flow Style"}
              >
                <option value="Cut" className="bg-bento-bg text-slate-200">Cut ✂️</option>
                <option value="Dissolve" className="bg-bento-bg text-slate-200">Dissolve 🌫️</option>
                <option value="Fade" className="bg-bento-bg text-slate-200">Fade 🎬</option>
                <option value="Fade to Black" className="bg-bento-bg text-slate-200">Fade to Black ⬛</option>
                <option value="Wipe" className="bg-bento-bg text-slate-200">Wipe ↔️</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                id={`btn-move-left-${shot.id}`}
                onClick={() => !shot.isLocked && onMove(shot.id, "left")}
                disabled={shot.isLocked || shot.sequenceId <= 1}
                className="bg-bento-canvas hover:bg-bento-bg disabled:bg-slate-900/40 disabled:text-slate-700 text-slate-300 p-1.5 rounded border border-bento-border flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={shot.isLocked ? "Locked" : "Shift Sequence Left"}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                id={`btn-move-right-${shot.id}`}
                onClick={() => !shot.isLocked && onMove(shot.id, "right")}
                disabled={shot.isLocked || shot.sequenceId >= totalShots}
                className="bg-bento-canvas hover:bg-bento-bg disabled:bg-slate-900/40 disabled:text-slate-700 text-slate-300 p-1.5 rounded border border-bento-border flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={shot.isLocked ? "Locked" : "Shift Sequence Right"}
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              id={`btn-delete-shot-${shot.id}`}
              onClick={() => !shot.isLocked && onDelete(shot.id)}
              disabled={shot.isLocked}
              className="text-slate-500 hover:text-red-400 hover:bg-bento-bg/50 p-1.5 rounded transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={shot.isLocked ? "Unlock shot to enable delete" : "Delete Shot"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Connected Scene Flow Transition Ribbon */}
          {shot.sequenceId < totalShots && (
            <div className="mt-3 pt-2.5 border-t border-dashed border-bento-border/50 flex items-center justify-between bg-slate-950/20 px-2 py-1 rounded-md">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
                <span>Edit Flow</span>
                <span className="text-indigo-400 font-bold">#{shot.sequenceId} ➜ #{shot.sequenceId + 1}</span>
              </span>
              <div 
                className="bg-indigo-950/30 border border-indigo-500/20 px-2 py-0.5 rounded flex items-center gap-1 text-[9.5px] font-mono text-indigo-300 font-bold uppercase select-none transition-all active:scale-95"
                title={getTransitionDetails(shot.transition || "Cut").desc}
              >
                <span>{getTransitionDetails(shot.transition || "Cut").icon}</span>
                <span>{getTransitionDetails(shot.transition || "Cut").label}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
