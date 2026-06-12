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

/**
 * Executes a Gemini generateContent call with automatic retry on transient errors (like 503 or 429).
 */
async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 3, initialDelayMs = 1500): Promise<any> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      attempt++;
      const errMsg = error.message || "";
      const errStatus = error.status || error.statusCode || 0;
      
      const isTransient = 
        errStatus === 503 || 
        errStatus === 429 || 
        errMsg.includes("503") || 
        errMsg.includes("429") || 
        errMsg.toLowerCase().includes("unavailable") || 
        errMsg.toLowerCase().includes("rate limit") || 
        errMsg.toLowerCase().includes("high demand") || 
        errMsg.toLowerCase().includes("resource exhausted") ||
        errMsg.toLowerCase().includes("spikes in demand");

      if (!isTransient || attempt >= maxRetries) {
        throw error;
      }
      
      const delay = initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 800;
      console.warn(`[GEMINI RETRY] Attempt ${attempt}/${maxRetries} failed with error: ${errMsg}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
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

      const response = await generateContentWithRetry(ai, {
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
  // This endpoint leverages image generation models (gemini-2.5-flash-image) for storyboards.
  // It features an extremely robust, beautiful developer-grade SVG pre-visualizer mock fallback if the model is busy or key is undefined.
  app.post("/api/generate-frame", async (req, res) => {
    const { prompt, aspectRatio } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("[IMAGE GEN] Missing key, falling back to beautiful SVG filmmaker mock frame.");
      return res.json({ imageUrl: generateMockStoryboardSVG(prompt), isFallback: true });
    }

    try {
      const ai = getGeminiClient();
      // gemini-2.5-flash-image generates images via generateContent (or we can use standard flash config)
      const response = await generateContentWithRetry(ai, {
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
      console.warn("[IMAGE GEN FAIL] Gemini generation busy or failed. Triggering filmmaking SVG pre-viz layout fallback. Error:", err.message);
      return res.json({ imageUrl: generateMockStoryboardSVG(prompt), isFallback: true, warning: err.message });
    }
  });

  // POST /api/generate-description
  // Uses Gemini to auto-generate a concise cinematic description based on shot metadata
  app.post("/api/generate-description", async (req, res) => {
    const { title, cameraAngle, cameraLens, cameraMotion, generationPrompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      const angleDesc = cameraAngle ? `shot from a ${cameraAngle} angle` : "captured beautifully";
      const lensDesc = cameraLens ? `using a cinematic ${cameraLens} lens` : "with intense artistic depth";
      const motionDesc = cameraMotion ? `empowered by a ${cameraMotion} camera movement` : "";
      const generated = `A mesmerizing scene of "${title || "Pre-viz Scene"}", ${angleDesc} ${lensDesc}. The visual narrative highlights ${generationPrompt || "the focal elements"} ${motionDesc}, establishing deep cinematic gravitas and flawless emotional alignment.`;
      return res.json({ description: generated });
    }

    try {
      const ai = getGeminiClient();
      const prompt = `You are an expert film director's assistant. Help write a concise action/scene description (2-3 sentences max) for a storyboard shot card.
Here is the context:
- Shot Title: ${title || "Untitled Shot"}
- Camera Angle: ${cameraAngle || "Not specified"}
- Lens: ${cameraLens || "Not specified"}
- Motion: ${cameraMotion || "Not specified"}
- Pre-viz Prompt: ${generationPrompt || "Not specified"}

Write a highly descriptive, professional filmmaker-style action description detailing what happens in this cinematic frame. Do not use conversational preambles like "Sure, here is..." or "Here is the description." Output only the concise description paragraph.`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: prompt
      });

      const responseText = response.text?.trim();
      if (!responseText) {
        throw new Error("Empty description generated from Gemini model.");
      }
      return res.json({ description: responseText });
    } catch (err: any) {
      console.error("AI Description Generation Error (gracefully falling back):", err);
      const angleDesc = cameraAngle ? `shot from a ${cameraAngle} angle` : "captured beautifully";
      const lensDesc = cameraLens ? `using a cinematic ${cameraLens} lens` : "with intense artistic depth";
      const motionDesc = cameraMotion ? `empowered by a ${cameraMotion} camera movement` : "";
      const generated = `A mesmerizing scene of "${title || "Pre-viz Scene"}", ${angleDesc} ${lensDesc}. The visual narrative highlights ${generationPrompt || "the focal elements"} ${motionDesc}, establishing deep cinematic gravitas and flawless emotional alignment.`;
      return res.json({ description: generated, isFallback: true, warning: err.message });
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

// Generates an elegant, detailed cinematic layout SVG with full filmmaking metrics to act as the storyboard fallback
function generateMockStoryboardSVG(prompt: string): string {
  const p = (prompt || "").toLowerCase();
  
  // Extract camera technical markers
  let angle = "MEDIUM SHOT";
  if (p.includes("close-up") || p.includes("close up") || p.includes("ecu") || p.includes("extreme close")) angle = "CLOSE-UP";
  else if (p.includes("establishing") || p.includes("wide shot") || p.includes("extreme wide")) angle = "WIDE ESTABLISHING";
  else if (p.includes("dutch angle") || p.includes("canted")) angle = "DUTCH ANGLE";
  else if (p.includes("low angle")) angle = "LOW ANGLE";
  else if (p.includes("high angle")) angle = "HIGH ANGLE";
  
  let lens = "35MM";
  if (p.includes("24mm")) lens = "24MM";
  else if (p.includes("50mm")) lens = "50MM";
  else if (p.includes("85mm")) lens = "85MM";
  else if (p.includes("135mm")) lens = "135MM";
  else if (p.includes("anamorphic")) lens = "ANAMORPHIC";

  // Build colorway parameters depending on theme keywords
  let colorStart = "#111827"; // deep slate gray
  let colorEnd = "#030712"; // pitch black
  let accentColor = "#6366f1"; // indigo
  let bokeh1 = "rgba(99, 102, 241, 0.15)";
  let bokeh2 = "rgba(168, 85, 247, 0.12)";
  
  if (p.includes("neon") || p.includes("pink") || p.includes("teal") || p.includes("cyberpunk") || p.includes("cyber")) {
    colorStart = "#090514";
    colorEnd = "#020108";
    accentColor = "#ec4899"; // bright pink
    bokeh1 = "rgba(236, 72, 153, 0.2)"; // neon pink
    bokeh2 = "rgba(6, 182, 212, 0.18)"; // cyan
  } else if (p.includes("fire") || p.includes("amber") || p.includes("warm") || p.includes("orange") || p.includes("sunset") || p.includes("gold")) {
    colorStart = "#1a0b05";
    colorEnd = "#070200";
    accentColor = "#f97316"; // orange
    bokeh1 = "rgba(249, 115, 22, 0.22)"; // warm orange
    bokeh2 = "rgba(234, 179, 8, 0.15)"; // gold yellow
  } else if (p.includes("forest") || p.includes("wood") || p.includes("green") || p.includes("jungle") || p.includes("emerald")) {
    colorStart = "#021c15";
    colorEnd = "#010806";
    accentColor = "#10b981"; // emerald
    bokeh1 = "rgba(16, 185, 129, 0.18)";
    bokeh2 = "rgba(234, 179, 8, 0.12)"; // sun shafts
  } else if (p.includes("clinical") || p.includes("lab") || p.includes("white") || p.includes("sterile") || p.includes("sci-fi")) {
    colorStart = "#0f172a";
    colorEnd = "#020617";
    accentColor = "#38bdf8"; // sky blue
    bokeh1 = "rgba(56, 189, 248, 0.16)";
    bokeh2 = "rgba(148, 163, 184, 0.12)"; // steel silver
  } else if (p.includes("rain") || p.includes("alley") || p.includes("blue") || p.includes("storm") || p.includes("dusk") || p.includes("night")) {
    colorStart = "#081125";
    colorEnd = "#02050c";
    accentColor = "#2563eb";
    bokeh1 = "rgba(37, 99, 235, 0.2)";
    bokeh2 = "rgba(168, 85, 247, 0.12)";
  }

  // Draw bokeh circles
  const circle1X = Math.floor(30 + Math.random() * 40) + "%"; // 30% - 70%
  const circle1Y = Math.floor(25 + Math.random() * 30) + "%";
  const circle2X = Math.floor(40 + Math.random() * 35) + "%";
  const circle2Y = Math.floor(40 + Math.random() * 35) + "%";

  const isAnamorphic = p.includes("anamorphic") || p.includes("streak") || p.includes("flare");

  // Create SVG string
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="100%" height="100%" style="font-family: system-ui, -apple-system, sans-serif;">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colorStart}" />
        <stop offset="100%" stop-color="${colorEnd}" />
      </linearGradient>
      <!-- Center spot highlight -->
      <radialGradient id="centerHighlight" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.06)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0)" />
      </radialGradient>
      <!-- Blur filter for depth of field / bokeh -->
      <filter id="bokehBlur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="35" />
      </filter>
      <filter id="flareBlur" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="8" />
      </filter>
    </defs>

    <!-- Canvas Background -->
    <rect width="100%" height="100%" fill="url(#bgGrad)" />
    <rect width="100%" height="100%" fill="url(#centerHighlight)" />

    <!-- Depth Layer: Bokeh Circles (Simulated Actors / Lights) -->
    <g filter="url(#bokehBlur)">
      <circle cx="${circle1X}" cy="${circle1Y}" r="110" fill="${bokeh1}" />
      <circle cx="${circle2X}" cy="${circle2Y}" r="140" fill="${bokeh2}" />
      <!-- Subtle ground plane reflection vector -->
      <ellipse cx="640" cy="580" rx="400" ry="80" fill="rgba(255,255,255,0.02)" />
    </g>

    <!-- Cinematic Grids & Guides (Rule of Thirds) -->
    <g stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5" stroke-dasharray="8 8">
      <!-- Verticals -->
      <line x1="426" y1="0" x2="426" y2="720" />
      <line x1="853" y1="0" x2="853" y2="720" />
      <!-- Horizontals -->
      <line x1="0" y1="240" x2="1280" y2="240" />
      <line x1="0" y1="480" x2="1280" y2="480" />
    </g>

    <!-- Center Crosshair Target -->
    <g stroke="rgba(255, 255, 255, 0.2)" stroke-width="1.5" fill="none">
      <path d="M 640 330 L 640 350" />
      <path d="M 640 370 L 640 390" />
      <path d="M 610 360 L 630 360" />
      <path d="M 650 360 L 670 360" />
      <circle cx="640" cy="360" r="8" opacity="0.3" />
    </g>

    <!-- Bounding Safe Area Corner Markers -->
    <g stroke="rgba(255, 255, 255, 0.35)" stroke-width="2.5" fill="none">
      <!-- TL -->
      <path d="M 80 120 L 80 80 L 120 80" />
      <!-- TR -->
      <path d="M 1200 120 L 1200 80 L 1160 80" />
      <!-- BL -->
      <path d="M 80 600 L 80 640 L 120 640" />
      <!-- BR -->
      <path d="M 1200 600 L 1200 640 L 1160 640" />
    </g>

    <!-- Subtle Lens Flare Streak if Anamorphic -->
    ${isAnamorphic ? `
    <g filter="url(#flareBlur)">
      <!-- Main flare core -->
      <ellipse cx="640" cy="360" rx="90" ry="8" fill="rgba(255,255,255,0.9)" />
      <!-- Horizontal side bands -->
      <line x1="100" y1="360" x2="1180" y2="360" stroke="${accentColor}" stroke-width="4" opacity="0.8" />
      <line x1="50" y1="360" x2="1230" y2="360" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" opacity="0.9" />
      <!-- Radial reflections -->
      <circle cx="420" cy="360" r="15" fill="rgba(56, 189, 248, 0.25)" />
      <circle cx="880" cy="360" r="28" fill="rgba(253, 186, 116, 0.18)" />
    </g>
    ` : ""}

    <!-- Director / Camera Metadatas Labels (Text Overlay) -->
    <!-- Top-Left System Status -->
    <g fill="rgba(255, 255, 255, 0.82)" font-size="20" font-weight="bold" letter-spacing="1">
      <circle cx="106" cy="116" r="6" fill="#ef4444" />
      <text x="122" y="122" font-family="monospace">REC ● [PRE-VIS]</text>
    </g>

    <!-- Top-Right Timecode -->
    <text x="1180" y="122" text-anchor="end" fill="#f97316" font-size="20" font-weight="bold" font-family="monospace" letter-spacing="1">
      TC 01:${Math.floor(10 + Math.random() * 80)}:14:09
    </text>

    <!-- Bottom Left Spec Metadata Information -->
    <g fill="rgba(255, 255, 255, 0.45)" font-size="14" font-family="monospace">
      <text x="100" y="580" fill="${accentColor}" font-size="16" font-weight="bold" letter-spacing="1">CAMERA SPECIFICATION</text>
      <text x="100" y="605">LENS: <tspan fill="#f8fafc" font-weight="bold">${lens}</tspan></text>
      <text x="100" y="625">ANGLE: <tspan fill="#f8fafc" font-weight="bold">${angle}</tspan></text>
      <text x="100" y="645">ASPECT RATIO: <tspan fill="#f8fafc" font-weight="bold">16:9 / CINEMATIC</tspan></text>
    </g>

    <!-- Bottom Right Status Notification -->
    <g font-family="monospace" text-anchor="end">
      <text x="1180" y="580" fill="rgba(255,255,255,0.3)" font-size="13" letter-spacing="2" font-weight="bold">CINEFORMA DRAFT ENGINE</text>
      <text x="1180" y="610" fill="#f8fafc" font-size="18" font-weight="extrabold" letter-spacing="1">PRE-VISUALIZATION LAYOUT</text>
      <text x="1180" y="635" fill="rgba(255, 255, 255, 0.55)" font-size="12">OFFLINE RENDERING MODE ACTIVE</text>
    </g>

    <!-- Subtle framing border line -->
    <rect x="0" y="0" width="1280" height="720" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="6" />
  </svg>`;
  
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

startServer();
