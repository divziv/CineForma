/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CameraMetadata {
  angle: string;       // e.g. "Close-up", "Wide Shot", "High Angle", "Dutch Angle"
  lens: string;        // e.g. "50mm Prime", "24mm Anamorphic", "85mm Telephoto"
  motion: string;      // e.g. "Static", "Tracking Shot", "Pan & Tilt", "Crane Shot", "Handheld Shake"
}

export interface SceneMetadata {
  sceneNumber: number;
  locationType: "INT" | "EXT" | "INT/EXT";
  setting: string;      // e.g. "COFFEE SHOP"
  timeOfDay: string;    // e.g. "NIGHT", "GOLDEN HOUR", "DAY", "DUSK"
  lightingMood: string; // e.g. "Chiaroscuro, high-contrast shadows with warm tungsten highlights"
  emotionalIntensity: number; // 1 to 10
  paceValue: number;    // 1 to 10 (1 = slow/dialogue, 10 = rapid pacing/action)
  summary: string;      // 1-sentence recap
}

export interface ShotAsset {
  id: string;               // unique ID e.g. "shot-1"
  sceneNumber: number;
  sequenceId: number;       // sequence ordering
  generationPrompt: string; // deterministic prompt formula for storyboard generation
  cameraMetadata: CameraMetadata;
  themeColors: string[];    // hex-code color psychology themes matching the scene's emotional structure (e.g. ["#030712", "#ec4899", "#8b5cf6"])
  title: string;            // shot heading e.g. "Kai's Confrontation"
  actionDescription: string;// visual description
  dialogueText?: string;    // dialogue overlay if any
  characterInShot?: string; // e.g. "Kai"
  durationSeconds: number;  // pacing time (1.5 - 15.0 seconds per shot)
  transition?: "Cut" | "Dissolve" | "Fade" | "Fade to Black" | "Wipe"; // transition style to next shot
  isLocked?: boolean;       // prevent editing, dragging or deleting
  isColorPaletteLocked?: boolean; // prevent themeColors from being updated on reload
  lensFlareIntensity?: "None" | "Subtle" | "Anamorphic"; // cinematic lens flare overlay intensity
}

export interface ProductionPackage {
  scenes: SceneMetadata[];
  shots: ShotAsset[];
}

export interface PipelineTraceLog {
  timestamp: string;
  step: "TOKENIZATION" | "EMOTION_ANALYSIS" | "ASSET_ORCHESTRATION" | "SYSTEM";
  message: string;
  details?: string;
}
