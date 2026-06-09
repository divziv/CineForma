/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ScreenplayPreset {
  id: string;
  name: string;
  genre: string;
  author: string;
  text: string;
}

export const SCREENPLAY_PRESETS: ScreenplayPreset[] = [
  {
    id: "neon-noir",
    name: "Terminal Echoes (Neo-Noir)",
    genre: "Neo-Noir / Cyberpunk",
    author: "Elena Vance",
    text: `EXT. RAIN-SLICKED ALLEYWAYS - NIGHT

Rain falls in heavy, rhythmic sheets, beating against metallic fire escapes. Neon pink and electric teal signs sputter, casting chromatic reflections across the wet asphalt pavement.

KAI (20s), clad in a drenched synthetic trench coat, presses back against a soot-covered brick wall. He breathes heavily. His eyes dart down the labyrinthine dark corridor.

A heavy mechanical shadow slides across the opposite wall. The low, resonant thrum of a drone motor vibrates through the narrow space.

KAI
(low whisper, frantic)
They've localized the trace. We have under two minutes.

KAI glances at his forearm console. A flickering hologram of an audio wavelength spikes erratically.

INT. DECAYING SAFE HOUSE - NIGHT

A stark contrast. Dust motes float lazily through streams of flickering neon-amber light cutting through vertical metal blinds. Tech equipment litters a makeshift wooden table.

AUNTY JIA (60s), wearing thick magnifying welding goggles, is carefully soldering a delicate fiber array. She doesn't look up, but her hands are trembling.

AUNTY JIA
The wavelengths don't lie, Kai. If that echo reaches the central grid, they won't just erase the files. They'll erase the memory of us.

KAI bursts through the door, his boots squeaking against rotten floorboards. He slammed the deadlock shut.

KAI
We're out of time. They're on the block. Ready the terminal.`
  },
  {
    id: "stellar-horizon",
    name: "Stellar Horizon (Sci-Fi Drama)",
    genre: "Space Realism / Drama",
    author: "Marcus Thorne",
    text: `INT. COMPARTMENT DELTA (OUTER ORBIT) - DAY

Sunlight pours through the circular fused-silica window, casting a blinding white glare across cold aluminum flight panels. Earth rotates slowly in the background, a silent blue marble.

COMMANDER CHEN (40s) floats near the attitude thruster panel. His face is pale and drawn. He holds a hand-written letter, its edges curled under negative gravity.

He takes a slow, deliberate breath. The life support unit beats with a rhythmic, machine-like hiss.

CHEN
(into radio headset)
Houston, fuel indicators are stabilizing... but pressure in the third coil is drop-line. I'm looking at terminal depletion.

An electronic crackle filters back of the comms loop.

FLIGHT DIRECTOR (V.O.)
(static heavy)
Chen, we're calculating an exterior EVA backup bypass. It's high-risk. Pacing is critical.

EXT. COLD VACUUM - DAY

Chen emerges from the safety airlock. The sun strikes his gold specular visor with intense flares. Universal silence. The thrusters vent cold nitrogen bursts like steam.

He carefully tethers his harness to the magnetic guide-rail. A single bolt comes loose, spinning away into the deep black abyss.`
  },
  {
    id: "vintage-tension",
    name: "The Last Hand (Vintage Thiller)",
    genre: "Suspense / Historical",
    author: "Silas Vance",
    text: `INT. SMOKE-FILLED PARLOR - NIGHT

A green velvet felt card table sits under a single low-hanging brass dome light lamp. Clouds of blue cigar smoke hang like heavy low fog.

THOMAS (50s), wearing an elegant wool waistcoat, taps a vintage ivory poker chip against a pile of gold coins. His face is completely stone-cold, but sweat beads at his temple.

Across the green table, REBECCA (30s) slowly twirls a long-stemmed champagne glass. She smiles, eyes analytical and cold.

THOMAS
You're playing on a dry well, Rebecca. The bank already foreclosed your father's estate.

REBECCA
(deliberate, cold)
My father didn't understand the mathematics of risk, Thomas. I do.

She gently flips over her cards. Double Aces.

THOMAS's fingers tighten around his cigar. His gaze locks onto her pile. The mechanical grandfather clock in the corner chimed twelve midnight.`
  }
];
