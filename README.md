# 🎬 CineForma: Script-to-Canvas Pre-Visualization Studio

🏆 **Microsoft Agents League Hackathon 2026 Submission**
Built during **Microsoft AI Skills Fest 2026**

---

## 🔗 Project Links

### Live Demo

https://ai.studio/apps/567d55b4-ae52-4a03-97e8-4668d8354433?fullscreenApplet=true

### Hackathon Submission

https://innovationstudio.microsoft.com/hackathons/Agents-League-Hackathon/project/123639

### Challenge Track

**🎨 Creative Apps – Microsoft Agents League Hackathon 2026**

---

# 🚀 Overview

CineForma is a screenplay pre-visualization workspace that transforms structured script content into an interactive planning environment for filmmakers, directors, and creative teams.

The platform helps creators move from screenplay text to production planning by organizing scenes, visualizing pacing, configuring camera metadata, and managing storyboard sequences within a unified workspace.

Rather than relying on disconnected tools for script review, shot planning, and pacing analysis, CineForma centralizes these workflows into a single creative production interface.

---

# 🎯 The Creative Challenge

Pre-production is often fragmented across multiple tools and manual processes.

Filmmakers typically move between:

* Screenplay documents
* Storyboard software
* Shot lists
* Camera planning notes
* Production spreadsheets
* Visual references

This creates a workflow bottleneck where significant time is spent translating written scenes into actionable visual planning assets.

Questions frequently arise such as:

* Which scenes require the most coverage?
* How does pacing evolve throughout the story?
* What camera configurations are planned?
* How many shots exist within a sequence?
* How should scenes be organized during pre-production?

CineForma addresses these challenges by providing a structured visual workspace that converts screenplay information into an interactive production planning environment.

---

# 💡 Why CineForma?

Traditional screenplay tools focus primarily on writing.

Production planning tools focus on execution.

CineForma bridges both worlds by introducing a visual planning layer that helps creators analyze and organize cinematic structure before production begins.

The goal is not to replace creative decision-making but to accelerate the transition from written script to visual production planning.

---

# 🔄 Creative Workflow

CineForma follows a structured screenplay-to-canvas workflow:

```text
Screenplay Input
        │
        ▼
 Script Parsing
        │
        ▼
 Scene Analysis
        │
        ▼
 Shot Planning
        │
        ▼
 Storyboard Workspace
        │
        ▼
 Pacing Visualization
        │
        ▼
 Production Preparation
```

This workflow allows creators to quickly move from narrative structure to production-ready planning artifacts.

---

# 🎬 Core Features

## 1. Parser & Analysis Pipeline

The screenplay parser processes script content and extracts production-relevant metadata.

### Extracted Information

* Scene identifiers
* Interior / exterior markers
* Environmental descriptions
* Structural screenplay components
* Sequence organization

### Diagnostic Trace Logs

The application also generates diagnostic pipeline traces that help visualize parsing behavior and processing stages.

These logs provide visibility into how screenplay content is transformed into planning data.

---

## 2. Cinematic Viewport Grid

The viewport workspace serves as the primary planning canvas.

Each shot is represented as an interactive storyboard card containing production-focused metadata.

### Capabilities

* Visual shot organization
* Sequence-based planning
* Interactive scene management
* Production-oriented layout controls

### Camera Configuration Controls

Creators can define:

* Camera angles
* Motion styles
* Lens profiles
* Cinematic presets

Example profiles include:

* 24mm Anamorphic
* 50mm Prime
* Wide-angle coverage
* Standard narrative framing

---

## 3. Dynamic Sorting & Organization

Storyboard elements can be reorganized dynamically using multiple views.

### Sorting Modes

* Sequence
* Scene Number
* Duration

This enables flexible planning workflows depending on the stage of production.

---

## 4. Lock Protection System

Storyboard cards can be locked to prevent accidental modifications.

Protected cards remain fixed while surrounding scenes continue to be edited.

This is useful during experimentation and iterative planning.

---

## 5. Batch Management Tools

The workspace includes bulk editing functionality for large projects.

### Features

* Multi-selection controls
* Batch deletion
* Rapid sequence cleanup
* Efficient storyboard management

These tools help creators manage larger productions with many storyboard elements.

---

## 6. Pacing Vitals Dashboard

CineForma includes a dedicated visualization layer for screenplay pacing analysis.

### Visual Metrics

* Scene duration trends
* Emotional pacing indicators
* Sequence progression
* Timeline distribution

The dashboard helps creators evaluate rhythm and structure across the project.

---

# 📊 Creative Planning Insights

The platform provides visibility into production planning through:

### Active Shot Tracking

Displays the number of currently visible storyboard items.

### Duration Aggregation

Calculates cumulative duration metrics across selected sequences.

### Timeline Awareness

Helps creators understand how scenes are distributed throughout a project.

### Visual Planning Metrics

Supports early-stage production decisions through interactive visualizations.

---

# ✨ Key Capabilities

### Screenplay Parsing

Transforms screenplay structure into organized planning data.

### Storyboard Management

Provides an interactive visual workspace for shot planning.

### Camera Metadata Planning

Supports lens, angle, and movement configuration.

### Pacing Analysis

Visualizes screenplay rhythm through interactive charts.

### Production Organization

Enables sorting, grouping, filtering, and management of storyboard elements.

### Creative Workflow Acceleration

Reduces manual overhead associated with screenplay-to-production planning.

---

# 🎨 User Experience Design

CineForma was designed as a high-contrast creative workspace optimized for extended planning sessions.

Key design principles include:

* Clear visual hierarchy
* Fast interactions
* Minimal workflow friction
* Production-focused controls
* Information-dense layouts
* Responsive workspace organization

The interface emphasizes clarity while maintaining the flexibility required during creative exploration.

---

# 🛠 Technology Stack

## Frontend

* React 18
* TypeScript
* Vite

## Styling

* Tailwind CSS
* Custom visual theme

## Data Visualization

* Recharts

## UI Components

* Lucide React

---

# 🏗 Project Structure

### src/App.tsx

Core application workflow including:

* Workspace orchestration
* Sorting systems
* Selection management
* State handling

### src/components/StoryboardCard.tsx

Interactive storyboard viewport component responsible for:

* Camera metadata display
* Lock state controls
* Scene visualization
* User interaction handling

### src/components/PacingVitals.tsx

Visualization module responsible for:

* Pacing analytics
* Timeline charts
* Sequence metrics
* Creative planning insights

---

# 🚀 Local Development

## Install Dependencies

```bash
npm install
```

## Start Development Server

```bash
npm run dev
```

Application runs at:

```text
http://localhost:3000
```

## Production Build

```bash
npm run build
```

---

# 🌟 Why CineForma Matters

The transition from screenplay to production planning remains one of the most time-consuming stages of filmmaking.

CineForma demonstrates how modern creative applications can streamline this process by combining screenplay analysis, storyboard organization, pacing visualization, and production planning into a unified workspace.

By reducing friction between writing and visual planning, CineForma helps creators spend less time managing tools and more time refining their creative vision.

---

# 📸 Product Screens
<img width="1902" height="823" alt="CineForma-S1" src="https://github.com/user-attachments/assets/c28aa5b4-3611-4d2f-b98b-d8bc53e084a7" />
<img width="230" height="822" alt="CineForma-S2" src="https://github.com/user-attachments/assets/5112edc2-5e4e-4d2d-ae18-a2982249cbd0" />
<img width="1257" height="630" alt="CineForma-S3" src="https://github.com/user-attachments/assets/85d5d1c3-ccde-4929-b9a6-0e700f0a9bc8" />
<img width="1910" height="836" alt="CineForma-S4" src="https://github.com/user-attachments/assets/2a32366b-eb53-4fc7-82c2-156dbcbf1f43" />
<img width="1917" height="832" alt="CineForma-S5" src="https://github.com/user-attachments/assets/4145e9ef-f76b-4859-a72f-7e6783169160" />
<img width="1077" height="511" alt="CineForma-S6" src="https://github.com/user-attachments/assets/09672f9c-b490-40f9-9a44-e36507f444dd" />
<img width="602" height="140" alt="CineForma-S7" src="https://github.com/user-attachments/assets/56ada941-ed50-419e-a4f3-9d1a2a660a9f" />

## 🏅 Microsoft Agents League Hackathon 2026

CineForma was created for the **Creative Apps** challenge track during **Microsoft AI Skills Fest 2026**.

The project showcases how thoughtful tooling, interactive visual workflows, and structured screenplay analysis can improve creative production planning while maintaining a streamlined and accessible user experience.
