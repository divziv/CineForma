/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Shared types inline for server compilation mapping
interface CameraMetadata {
  angle: string;
  lens: string;
  motion: string;
}

interface SceneMetadata {
  sceneNumber: number;
  locationType: "INT" | "EXT" | "INT/EXT";
  setting: string;
  timeOfDay: string;
  lightingMood: string;
  emotionalIntensity: number;
  paceValue: number;
  summary: string;
}

interface ShotAsset {
  id: string;
  sceneNumber: number;
  sequenceId: number;
  generationPrompt: string;
  cameraMetadata: CameraMetadata;
  themeColors: string[];
  title: string;
  actionDescription: string;
  dialogueText?: string;
  characterInShot?: string;
  durationSeconds: number;
}

interface ProductionPackage {
  scenes: SceneMetadata[];
  shots: ShotAsset[];
}

interface PipelineTraceLog {
  timestamp: string;
  step: "TOKENIZATION" | "EMOTION_ANALYSIS" | "ASSET_ORCHESTRATION" | "SYSTEM";
  message: string;
  details?: string;
}

// Lazy initialization of Gemini client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not defined. Calls to Gemini parser API will use mock data.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Helper to generate trace logs
  function createTrace(
    logs: PipelineTraceLog[],
    step: PipelineTraceLog["step"],
    message: string,
    details?: string
  ) {
    const logItem: PipelineTraceLog = {
      timestamp: new Date().toISOString(),
      step,
      message,
      details,
    };
    logs.push(logItem);
    console.log(`[${logItem.step}] ${logItem.message} ${details ? `(${details})` : ""}`);
  }

  // POST /api/analyze-script
  app.post("/api/analyze-script", async (req, res) => {
    const { scriptText } = req.body;
    const traceLogs: PipelineTraceLog[] = [];

    createTrace(traceLogs, "SYSTEM", "Received analysis request.", `Text length: ${scriptText?.length || 0} characters`);

    if (!scriptText || typeof scriptText !== "string" || scriptText.trim().length === 0) {
      createTrace(traceLogs, "SYSTEM", "Analysis failed due to empty script body.");
      return res.status(400).json({ error: "Script text is required" });
    }

    createTrace(traceLogs, "TOKENIZATION", "Initiating raw screenplay tokenizer engine.");
    createTrace(traceLogs, "TOKENIZATION", "Looking for cinematic scene boundaries, metadata, acts, and formatting.");

    // Check if API key is active. If not, use high-fidelity fallback generator
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      createTrace(traceLogs, "SYSTEM", "Using fallback mock pre-visualization pipeline as GEMINI_API_KEY is not defined in secrets.");
      const mockResult = generateFallbackData(scriptText, traceLogs);
      return res.json({ result: mockResult, logs: traceLogs });
    }

    try {
      const ai = getGeminiClient();
      createTrace(traceLogs, "EMOTION_ANALYSIS", "Pushing blocks to Gemini semantic analysis pipelines.");
      createTrace(traceLogs, "ASSET_ORCHESTRATION", "Compiling structured JSON generation prompt matrices with strict formatting values.");

      const systemPrompt = `You are an expert film director, cinematographer, and multi-modal pre-visualization pipeline coordinator.
Analyze the provided screenplay text and fragment it into its logical SCENES and cinematic SHOT ASSETS.
For each scene found, construct detailed scene metadata:
- Determine locationMode ('INT', 'EXT', 'INT/EXT')
- Extract the setting (such as 'KITCHEN' or 'STREET') Max 3 words uppercase.
- Extrapolate 'timeOfDay' (such as 'NIGHT', 'DAY', 'GOLDEN HOUR', 'DUSK')
- Devise 'lightingMood' reflecting cinematic lighting (e.g. "Low-key chiaroscuro, cold blue moonbeams through dust motes")
- Gauge 'emotionalIntensity' (1-10) and 'paceValue' (1-10)
- Summarize the scene action in 1 sentence.

For each scene, break down 2 to 4 detailed shot cards (ShotAsset) that visually compose this scene:
- Define a visual 'title' (e.g. "Kai Searches for Clues")
- Build 'generationPrompt': this will define the exact visual storyboard asset. Write a rich image prompt. Describe character posture, camera framing, lighting color scheme, atmosphere, shot angle, cinematic look (e.g. "Neo-noir cinematic still, 35mm anamorphic. Kai looking over shoulder, warm violet backlight, cold teal street reflections..."). Keep style and rendering continuous.
- Detail 'cameraMetadata': 'angle' (e.g. Extreme Close-up, Wide Shot, Dutch Angle), 'lens' (e.g. 50mm Prime, 35mm anamorphic), and 'motion' (e.g. Stable tracking, Low crane tilt).
- Evaluate 'themeColors': Pick exactly 3 hex codes that represent the emotional color psychology palette of the scene.
- Describe 'actionDescription': detail what movement occurs.
- If dialogue is spoken in this shot segment, incorporate 'dialogueText' and the speaking 'characterInShot'.
- 'durationSeconds': visually estimate shot length (1.5 to 10 seconds).

Structure your complete response precisely to match the requested JSON schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze the following screenplay text and output the ProductionPackage:\n\n${scriptText}`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scenes: {
                type: Type.ARRAY,
                description: "List of parsed and analyzed scenes in sequential order",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneNumber: { type: Type.INTEGER },
                    locationType: { type: Type.STRING, description: "Must be 'INT', 'EXT', or 'INT/EXT'" },
                    setting: { type: Type.STRING },
                    timeOfDay: { type: Type.STRING },
                    lightingMood: { type: Type.STRING },
                    emotionalIntensity: { type: Type.INTEGER },
                    paceValue: { type: Type.INTEGER },
                    summary: { type: Type.STRING }
                  },
                  required: ["sceneNumber", "locationType", "setting", "timeOfDay", "lightingMood", "emotionalIntensity", "paceValue", "summary"]
                }
              },
              shots: {
                type: Type.ARRAY,
                description: "Cinematic storyboard shot breakdown comprising visual compositions and camera movements",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    sceneNumber: { type: Type.INTEGER },
                    sequenceId: { type: Type.INTEGER },
                    generationPrompt: { type: Type.STRING },
                    cameraMetadata: {
                      type: Type.OBJECT,
                      properties: {
                        angle: { type: Type.STRING },
                        lens: { type: Type.STRING },
                        motion: { type: Type.STRING }
                      },
                      required: ["angle", "lens", "motion"]
                    },
                    themeColors: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    title: { type: Type.STRING },
                    actionDescription: { type: Type.STRING },
                    dialogueText: { type: Type.STRING },
                    characterInShot: { type: Type.STRING },
                    durationSeconds: { type: Type.NUMBER }
                  },
                  required: ["id", "sceneNumber", "sequenceId", "generationPrompt", "cameraMetadata", "themeColors", "title", "actionDescription", "durationSeconds"]
                }
              }
            },
            required: ["scenes", "shots"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from Gemini model.");
      }

      const parsedPackage: ProductionPackage = JSON.parse(responseText);

      createTrace(traceLogs, "TOKENIZATION", `Tokenizer engine split successfully into ${parsedPackage.scenes.length} scene nodes.`);
      createTrace(traceLogs, "EMOTION_ANALYSIS", "Sequential emotional tension spikes and pacing profiles calculated successfully.");
      createTrace(traceLogs, "ASSET_ORCHESTRATION", `Deterministic cinematic prompts mapped with color matrices for ${parsedPackage.shots.length} camera frames.`);

      res.json({ result: parsedPackage, logs: traceLogs });
    } catch (error: any) {
      createTrace(traceLogs, "SYSTEM", "Gemini pipeline execution threw an error.", error.message);
      console.error("Gemini Parse Error:", error);
      // Friendly high-quality fallback on error
      const mockResult = generateFallbackData(scriptText, traceLogs);
      res.json({ result: mockResult, logs: traceLogs, isFallback: true, warning: "Fell back to offline parsing due to API restriction or rate limit." });
    }
  });

  // POST /api/generate-frame
  // This endpoint leverages image generation models (gemini-2.5-flash-image) for storyboards
  app.post("/api/generate-frame", async (req, res) => {
    const { prompt, aspectRatio } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ error: "Missing GEMINI_API_KEY environment variable. Storyboard AI image generation requires an active key." });
    }

    try {
      const ai = getGeminiClient();
      // gemini-2.5-flash-image generates images via generateContent (or we can use standard flash config)
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [{ text: prompt || "Cinematic movie frame, cinematic lighting, style consistent storyboard" }]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || "16:9",
          }
        }
      });

      let base64Image = "";
      if (response?.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Image = part.inlineData.data;
            break;
          }
        }
      }

      if (base64Image) {
        return res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
      } else {
        throw new Error("No image piece found in generation feedback.");
      }
    } catch (err: any) {
      console.error("AI Image Generation Error:", err);
      // Return beautiful fallback illustration code or detailed error message
      return res.status(500).json({ error: err.message || "Failed to generate image from AI pipeline" });
    }
  });

  // Vite middleware setup or production content
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CineForma Pre-Viz Studio container running on http://0.0.0.0:${PORT}`);
  });
}

// Visual color matcher helper based on text cues
function extractThemeColorByTerms(setting: string, text: string): string[] {
  const t = (setting + " " + text).toLowerCase();
  if (t.includes("neon") || t.includes("rain") || t.includes("alley")) {
    return ["#030712", "#ec4899", "#06b6d4"]; // pink & teal
  }
  if (t.includes("lab") || t.includes("clinical") || t.includes("white")) {
    return ["#0f172a", "#38bdf8", "#f1f5f9"]; // clinical blue & silver
  }
  if (t.includes("fire") || t.includes("warm") || t.includes("shadow")) {
    return ["#180808", "#ea580c", "#eab308"]; // embers & gold
  }
  if (t.includes("forest") || t.includes("wood") || t.includes("day")) {
    return ["#05150e", "#16a34a", "#fef08a"]; // forest green, gold daylight
  }
  // Default elegant moody colorway
  return ["#090d16", "#c084fc", "#3b82f6"]; // obsidian purple, electric blue
}

// Fallback high-fidelity parser on offline flow or missing key
function generateFallbackData(script: string, logs: PipelineTraceLog[]): ProductionPackage {
  createTrace(logs, "TOKENIZATION", "Offline regex parser triggered.");
  
  // Basic heuristic parser for scene header detections e.g. "INT. COFFEE SHOP - DAY"
  const lines = script.split("\n");
  const parsedScenes: { num: number; heading: string; bodyLines: string[] }[] = [];
  let sceneCount = 0;
  let currentSceneLines: string[] = [];
  let currentHeader = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("INT.") || trimmed.startsWith("EXT.") || trimmed.startsWith("INT/EXT.")) {
      if (currentHeader) {
        parsedScenes.push({ num: sceneCount, heading: currentHeader, bodyLines: currentSceneLines });
      }
      sceneCount++;
      currentHeader = trimmed;
      currentSceneLines = [];
    } else if (trimmed.length > 0) {
      currentSceneLines.push(trimmed);
    }
  }
  if (currentHeader) {
    parsedScenes.push({ num: sceneCount, heading: currentHeader, bodyLines: currentSceneLines });
  }

  // If no structured headings detected, split by double newline
  if (parsedScenes.length === 0) {
    createTrace(logs, "TOKENIZATION", "No rigid screenplay headings found. Partitioning script via narrative block paragraphs.");
    const paragraphs = script.split(/\n\s*\n/).filter(p => p.trim().length > 10);
    
    // Create 1-2 generic scenes
    const sceneSize = Math.max(1, Math.ceil(paragraphs.length / 3));
    for (let s = 1; s <= 3; s++) {
      const pIndexStart = (s - 1) * sceneSize;
      const pLines = paragraphs.slice(pIndexStart, pIndexStart + sceneSize);
      if (pLines.length === 0) break;
      parsedScenes.push({
        num: s,
        heading: s === 1 ? "INT. THE MAINSTAGE - NIGHT" : s === 2 ? "EXT. RAIN-SLICKED ALLEY - DUSK" : "INT. CONTROL TOWER - GOLDEN HOUR",
        bodyLines: pLines
      });
    }
  }

  const scenes: SceneMetadata[] = [];
  const shots: ShotAsset[] = [];
  let shotGlobalCounter = 1;

  for (const item of parsedScenes) {
    const num = item.num;
    const heading = item.heading;
    const bodyText = item.bodyLines.join(" ");

    // Extract setting/type/day
    let locationType: "INT" | "EXT" | "INT/EXT" = "INT";
    if (heading.includes("EXT")) locationType = "EXT";
    if (heading.includes("INT/EXT")) locationType = "INT/EXT";

    const parts = heading.split("-").map(p => p.trim());
    const cleanHeadingPart = parts[0]?.replace(/^(INT\.|EXT\.|INT\/EXT\.)/, "").trim() || "WORKSPACE";
    const timePart = parts[1] || "NIGHT";

    // Lighting profiling mapping based on time
    let lightingMood = "Neon amber highlight with deep cast shadows";
    if (timePart.includes("DAY")) lightingMood = "Chalky daylight with soft atmospheric scattering";
    else if (timePart.includes("GOLDEN")) lightingMood = "Warm 5600k fill with rich golden volumetric shafts";
    else if (timePart.includes("DUSK") || timePart.includes("DAWN")) lightingMood = "Cool desaturated gradient ambient casting deep obsidian structures";

    const emotionalIntensity = bodyText.includes("?") || bodyText.match(/[A-Z]{3,}/) ? 8 : 4;
    const paceValue = bodyText.split(" ").length > 80 ? 7 : 3;

    scenes.push({
      sceneNumber: num,
      locationType,
      setting: cleanHeadingPart,
      timeOfDay: timePart.toUpperCase(),
      lightingMood,
      emotionalIntensity,
      paceValue,
      summary: `Scene ${num} focusing on the physical interaction at ${cleanHeadingPart}.`
    });

    createTrace(logs, "EMOTION_ANALYSIS", `Processed Scene ${num} emotional profile. Intensity: ${emotionalIntensity}/10. Pace: ${paceValue}/10.`);

    // Fabricate shot frames (2 to 3 shots per scene)
    const paragraphs = item.bodyLines.filter(l => l.length > 20);
    const shotCountInScene = Math.max(2, Math.min(3, paragraphs.length));

    for (let i = 0; i < shotCountInScene; i++) {
      const paragraph = paragraphs[i] || "Visual interaction continues in the main scene framing, exploring the depth of field.";
      const sequenceId = i + 1;
      const themeColors = extractThemeColorByTerms(cleanHeadingPart, paragraph);

      // Camera layout setup
      const angle = i === 0 ? "Wide Establishing" : i === 1 ? "Medium Two-Shot" : "Extreme Close-up";
      const lens = i === 0 ? "24mm Anamorphic" : i === 1 ? "50mm Prime" : "85mm Narrative Telephoto";
      const motion = i === 0 ? "Slow Boom Up" : i === 1 ? "Pan and Tracking Focus" : "Static Frame";

      const dialogueMatch = paragraph.match(/^([A-Z\s]+)\n(.*)/m);
      let dialogueText: string | undefined;
      let characterInShot: string | undefined;

      if (dialogueMatch) {
        characterInShot = dialogueMatch[1]?.trim();
        dialogueText = dialogueMatch[2]?.trim();
      } else {
        // Mock actor voice representation if text looks like standard screen format
        if (paragraph.length < 150 && /^[A-Z\s\(\)]+$/.test(paragraph.substring(0, 15))) {
          const splitPt = paragraph.indexOf("\n");
          if (splitPt !== -1) {
            characterInShot = paragraph.substring(0, splitPt).trim();
            dialogueText = paragraph.substring(splitPt + 1).trim();
          }
        }
      }

      const generatedPrompt = `Storyboard panel cinematic direct frame. ${angle}, ${lens}. A high-definition view of ${cleanHeadingPart} with ${timePart.toLowerCase()} lighting. Mood is ${lightingMood}. Depicting: ${paragraph.substring(0, 100)}`;

      shots.push({
        id: `shot-${shotGlobalCounter++}`,
        sceneNumber: num,
        sequenceId,
        generationPrompt: generatedPrompt,
        cameraMetadata: { angle, lens, motion },
        themeColors,
        title: paragraph.substring(0, 30).trim() + "...",
        actionDescription: paragraph,
        dialogueText,
        characterInShot,
        durationSeconds: Math.round((2.5 + Math.random() * 5) * 10) / 10
      });
    }

    createTrace(logs, "ASSET_ORCHESTRATION", `Constructed ${shotCountInScene} shot layouts for Scene ${num}. Mapped palette theme.`);
  }

  createTrace(logs, "SYSTEM", `Offline tokenizer completed processing. scenes: ${scenes.length}, shots: ${shots.length}`);
  return { scenes, shots };
}

// Function helper to logging outputs
function createTrace(
  logs: PipelineTraceLog[],
  step: PipelineTraceLog["step"],
  message: string,
  details?: string
) {
  const logItem: PipelineTraceLog = {
    timestamp: new Date().toISOString(),
    step,
    message,
    details,
  };
  logs.push(logItem);
  console.log(`[${logItem.step}] ${logItem.message} ${details ? `(${details})` : ""}`);
}

startServer();
