# 🎬 CineForma — Script-to-Canvas Pre-Visualization Studio

CineForma is a professional, high-fidelity pre-visualization suite designed for indie filmmakers, screenwriters, and directors. It bridges the gap between text screenplay structures and instant spatial layouts, generating structured visual metadata, emotional pace analysis, and customizable storyboard grids.

---

## ⏳ Hackathon Context
Developed as part of our hackathon sprint, **CineForma** resolves a critical bottleneck in modern filmmaking: the slow, repetitive translation of script screenplays into physical shot lists. By marrying a powerful heuristic script parser running parallel pipeline trace logs with an interactive, highly interactive pre-viz track grid, CineForma brings lightning-fast structure to creative chaos. It empowers creators to visualize camera angles, focal lengths, and scene rhythms under 10 seconds.

---

## 🎯 Core Mission & Inspiration
We believe cinematography shouldn't be gated behind costly software or hand-drawn sketches. Our mission is **democratization of pre-viz workflows**. 
- **The Inspiration**: The golden era of storyboards (like Alfred Hitchcock’s detailed sketch directories) met with modern bento-grid modular design.
- **The Philosophy**: Make the interface feel like a premium high-contrast edit-bay suite, utilizing elegant display typography, strict visual hierarchy, and instant, responsive feedback to help creators dial in scene dynamics.

---

## 🚀 Key Actions & Agent Capabilities
CineForma comes packed with modular features to assist filmmakers through pre-production:

1. **Parser & Analyzer Pipeline**:
   - Parses scenes from screenplay inputs instantly, detecting metadata like location type (`EXT.` vs `INT.`), settings, emotional intensity, and camera directions.
   - Outputs a live trace log diagnostic dashboard for complete telemetry, capturing performance bottlenecks or structural warnings.

2. **Cinematic Viewport Grid**:
   - Displays shot cards styled as dynamic movie slides.
   - **Active Counter & Cumulative Badges**: Displays current visible shot counts and the exact sum of shot durations dynamically within the header!
   - **Dynamic Sorting Options**: Easily reorganize your timeline by **Sequence**, **Scene Number**, or shot **Duration** instantly.
   - **Custom Camera Spectrums**: Interactive inputs for angle, motion presets, and cinematic lens profiles (e.g., *24mm Anamorphic*, *50mm Prime*).
   - **Lock Protection**: Lock individual viewports to freeze them against accidental deletion, dragging, or edits while experimenting with nearby scenes.

3. **Batch Management Systems**:
   - Add selection checkboxes on every viewport and run **Batch Delete Selected (Trash)** in a single click to prune unnecessary shots.

4. **Pacing Vitals & Screen Checkers**:
   - Built-in live charts powered by `recharts` plotting duration pacing, emotional fluctuations, and scene transitions over the course of the film’s timeline.

---

## 📦 Built With
- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) for sub-millisecond local rendering responsiveness.
- **Styling Engine**: [Tailwind CSS](https://tailwindcss.com/) with a custom Cosmic Slate color theme.
- **Data Visualizations**: [Recharts](https://recharts.org/) for real-time pacing curves.
- **Icons**: [Lucide React](https://lucide-react.tech/) for crisp editing tools.

---

## 🛠️ Unified Installation & Development

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) installed.

### 2. Standard Installation
Install package dependencies:
```bash
npm install
```

### 3. Local Development Server
Launch the compiler and boot up the real-time development environment on port `3000`:
```bash
npm run dev
```

### 4. Direct Production Build
Compile and bundle all client-side code and backend server layers to static files:
```bash
npm run build
```

---

## 🧑⚖️ Submission
CineForma represents a production-ready, highly interactive Web tool built under hackathon guidelines. Key components:
- **`src/App.tsx`**: Houses the main workspace flow, the viewport grid, filters, sorting systems, and multi-selection handlers.
- **`src/components/StoryboardCard.tsx`**: Modular, highly detailed card module representing camera lense options, lock state constraints, and custom procedural canvas renderings.
- **`src/components/PacingVitals.tsx`**: Dynamic diagnostic chart tracking filmmaker metrics.
