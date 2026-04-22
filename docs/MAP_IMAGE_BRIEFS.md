# The Lurking Horror Map Building Overlay Briefs

This document provides image-friendly location briefs (title + description) for art generation specifically for layouts of buildings on the map

Style assumptions for consistency:

View/camera:

- frontal elevation
- only sometimes: orthographic projection (no perspective distortion)
- building centered, readable silhouette, wide negative space
- black background, white monochrome linework only

Style constraints:

- technical blueprint / engraved line aesthetic done in wireframe with white lines on black background
- hand-drafted stroke character, subtle texture
- restrained detail, strong outline hierarchy
- no people, no vehicles, no signage text, no labels, no color accents
- horror mood via emptiness, exposure, and weather, not gore

Prompts are now stored directly under each location entry (`- prompt:`), grouped by source/model section. Draft prompts for locations that do not yet have a per-location `- prompt:`.

## ComfyUI Local Model Inventory

Snapshot date: `2026-04-19`  
Scanned path: `C:\AI\ComfyUI\user\models`

### Checkpoints

- `checkpoints/v1-5-pruned-emaonly-fp16.safetensors`

### LoRAs

- `loras/flux/Flux_2-Turbo-LoRA_comfyui.safetensors`
- `loras/flux/Flux.1 RetroAnimeFluxV1.safetensors`
- `loras/flux/Flux.1 RM_Artistify_v1.0M.safetensors`
- `loras/flux/Flux.2 Klein 9B Lora - NSFW v2 solo girl.safetensors`
- `loras/qwen/Qwen-Image-Edit-2509-Lightning-4steps-V1.0-bf16.safetensors`

### Core Non-Checkpoint Model Files (workflow-critical)

- `unet/flux1-schnell-Q8_0.gguf`
- `diffusion_models/flux1/flux1-schnell-Q8_0.gguf`
- `diffusion_models/flux2/flux2-klein-9b.safetensors`
- `text_encoders/flux/clip_l.safetensors`
- `text_encoders/flux/t5xxl_fp8_e4m3fn.safetensors`
- `text_encoders/flux2/qwen38BFluxKlein9BTE_38b.safetensors`
- `vae/flux/ae.safetensors`
- `vae/flux2/flux2-vae.safetensors`
- `vae/qwen/qwen_image_vae.safetensors`

### Notes

- `loras` appears empty at top level, but contains model files under subfolders (`flux`, `qwen`).
- For map overlay workflows in this project, keep output style aligned with the black-background/white-line blueprint constraints defined in this document.

## Preferred Overlay Workflow Stack

Use these defaults first for map building overlays (Computer Center, Brown Building, Central Complex pass).

### Stack A (Primary, FLUX linework pass)

- Base model: `diffusion_models/flux1/flux1-schnell-Q8_0.gguf` (or `unet/flux1-schnell-Q8_0.gguf`, whichever your FLUX loader expects)
- Text encoders: `text_encoders/flux/clip_l.safetensors` + `text_encoders/flux/t5xxl_fp8_e4m3fn.safetensors`
- VAE: `vae/flux/ae.safetensors`
- Optional LoRA: `loras/flux/Flux_2-Turbo-LoRA_comfyui.safetensors` at low weight (`0.25` - `0.45`)

Recommended use:

- Mode: image-to-image (use existing building overlay as structure reference)
- Denoise strength: `0.30` - `0.45` (preserve silhouette/massing)
- CFG/guidance: low to medium (`2.5` - `4.5`)
- Steps: `12` - `20`
- Resolution target: keep landscape around `1536x960` or `1600x1000`

### Stack B (Fallback, strict structure lock)

- Base checkpoint: `checkpoints/v1-5-pruned-emaonly-fp16.safetensors`
- Use when FLUX outputs become too painterly or drift from building geometry.

Recommended use:

- Mode: image-to-image with lower denoise (`0.22` - `0.35`)
- Steps: `24` - `36`
- CFG: `5.0` - `7.0`
- Keep prompts strict: no color, no people, no signage, white technical linework on black background.

### Quick Selection Rule

- Choose Stack A for best style quality and controlled blueprint mood.
- Switch to Stack B when facade proportions or roof geometry must stay tighter to the source overlay.

## prompts

1. `Computer Center (65)`
   - Title: `Computer Center: Midnight Lab`
   - Literal description: `This is the lobby of the Computer Center. An elevator and call buttons are to the south. Stairs also lead up and down, for the energetic. To the north is Smith Street.`
   - Description: A larger technical space with rows of equipment, reflective floors, and rain-muted light from outside. Emphasize old hardware geometry and a tense, after-hours atmosphere.
   - prompt: Axonometric architectural engraving of an institutional Computer Center building, shown in a very shallow isometric projection (front-facing but with slight top and side visibility), no perspective distortion, parallel projection only. Style: ultra-detailed architectural copperplate engraving, crisp white linework on a pure black background, no gray tones, no gradients, no texture overlays. Clean, controlled line hierarchy: thick outer silhouette, medium structural lines, very fine interior detail. Subtle engraved character, not sketchy. Building: low-rise rectangular academic computer center (not a tower), three main floors plus basement level implied. Strong horizontal floor divisions visible on the facade. Symmetrical grid of windows. Central recessed main entrance facing Smith Street, with steps descending slightly, clearly defined but not exaggerated. Roof: flat and fully visible due to shallow axonometric angle, tarred surface with light pea-gravel texture indicated through sparse fine linework, subtle snow drift accumulation along edges. Minimal rooftop access structure (small stairwell door housing), simple and functional. Architectural detail: dense facade articulation (window mullions, frames, structural rhythm), precise and evenly spaced. No modern glass curtain wall look — more institutional, utilitarian. Environment: Smith Street runs directly toward the entrance, lightly indicated as a flat plane with minimal linework. Sparse, thin streetlights on either side, barely present. Weather: severe blizzard suggested with restrained directional line strokes only, no heavy texture, no obscuring of the building. Snow accumulation shown primarily on ground edges and roof, not as noise. Composition: building centered, isolated in black space with wide negative margins. Clean diagrammatic readability.Constraints: no people, no vehicles, no signage, no text, no labels, no color, no painterly effects, no perspective convergence. Wireframe, white lines on black background.


14. `Small Courtyard (16)`
   - Title: `Small Courtyard (16)`
   - Literal description: `This courtyard is a triumph of modern architecture. It is spare, cold, angular, overwhelming in size, and bears a striking resemblance to a wind tunnel whenever the breeze picks up. Right now this is true of the whole campus, though. A huge mass lurks nearby, and an almost featureless skyscraper is to the north.`
   - prompt: Massive angular modern courtyard in severe winter wind, spare and cold like an architectural wind tunnel, with looming building mass nearby. Emphasize scale, hard geometry, and hostile weather over decorative detail.

22. `Engineering Building (38)`
   - Title: `Engineering Building (38)`
   - Literal description: `This building extends a long way south from the Infinite Corridor. It too is full of closed, locked offices.`

36. `Temporary Lab (140)`
   - Title: `Temporary Lab: Improvised Science`
   - Literal description: `This is a laboratory of some sort. It takes up most of the building on this level, all the interior walls having been knocked down. (One reason these temporary buildings are still here is their flexibility: no one cares if they get more or less destroyed.) A stairway leads down, and a door leads north.`
   - Description: A makeshift research room with benches, scattered instruments, taped labels, and unfinished setups. It should feel active but abandoned in a hurry.
   - prompt: Improvised laboratory occupying a gutted temporary building floor where interior walls were removed, leaving open bays, scattered benches, and ad hoc research setups. Make it functional yet unstable, with makeshift order, abandoned urgency, and cold night lighting.


39. `Fruits and Nuts (150)`
   - Title: `Fruits and Nuts (150)`
   - Literal description: `This is the central corridor of the Nutrition Building. The main building is south, and a stairway leads down.`
   - prompt: Central corridor of the Nutrition Building with modest institutional finishes, connection south to main building, and stairway down. Make it look mundane at first glance but quietly deserted and tense.

45. `Great Court (180)`
   - Title: `Great Court (180)`
   - Literal description: `In the spring and summer, this cheery green court is a haven from classwork. Right now, the majestic buildings of the main campus are almost invisible in the howling blizzard. A locked door bars your way to the north.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: In the spring and summer, this cheery green court is a haven from classwork.
   - prompt: Majestic campus court in blizzard conditions where architecture is barely visible through wind-driven snow, with a locked door to the north. Convey grandeur suppressed by weather and isolation.
   - A black-and-white scratchboard illustration... Landscape orientation. A grand campus court consumed by a blizzard. Buildings barely visible through dense snow. Wind drives snow in violent horizontal streaks. A locked door to the north stands rigid against the storm. Architecture becomes abstract shapes. The mood is vast and erased - scale overwhelmed by weather.
   - ChatGPT: A black-and-white scratchboard illustration, thin white lines cut into deep black, in the spirit of Albrecht Dürer and wax-paper scratchart. Landscape orientation, wide and open composition. A grand campus court in severe blizzard conditions, intended in warmer seasons to be a welcoming open haven, but now transformed into a hostile, nearly obliterated exterior space. The court is broad and formal, framed by majestic institutional buildings whose classical massing is only barely visible through blowing snow. Architecture should appear in fragments: faint facades, colonnades, windows, and upper masses emerging only intermittently through the storm. The buildings are large and imposing, but the blizzard reduces them to ghostly shapes and partial silhouettes. Wind drives snow across the court in violent, horizontal and diagonal streaks, filling the air so densely that depth becomes uncertain. Drifts gather unevenly across the ground, obscuring paths and flattening the court into a white, shifting surface. To the north, a locked door stands as a rigid, dark interruption in the storm - small compared to the surrounding architecture, but visually decisive. It should feel inaccessible, sealed, and absolute, a single clear boundary in an environment otherwise dissolved by weather. The court itself should retain traces of design beneath the snow: edges of paving, low walls, planters, or formal alignments barely readable under drifts. These remnants suggest that the space was meant to be orderly, social, and calm, making its present condition more unsettling. Lighting is diffuse and storm-muted, with no clear sunlight or source. Contrast comes from the black structure of architecture and doorways against snow-filled air. Visibility is low and unstable; distant surfaces fade quickly into whiteness. Use dense etched linework and crosshatching for the storm, with the snow rendered as cutting directional marks across deep blacks and pale surfaces. Let the architecture emerge only where line density allows it to break through the weather. Avoid human figures, footprints, or any signs of recent activity. The court should feel abandoned, wind-scoured, and emotionally emptied. The mood is grand, erased, and isolating - a place designed for relief and openness, now overwhelmed by weather until its scale and purpose are almost unreadable.

48. `Mass. Ave. (190)`
   - Title: `Mass. Ave. (190)`
   - Literal description: `This is the main entrance to the campus buildings. Blinding snow obscures the stately Grecian columns and rounded dome to the east. You can barely make out the inscription on the pediment (which reads "George Vnderwood Edwards, Fovnder; P. David Lebling, Architect"). West across Massachusetts Avenue are other buildings, but you can't see them.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is the main entrance to the campus buildings.
   - prompt: Main campus entrance at Massachusetts Avenue under blinding snow, with classical columns and dome only faintly readable through storm haze. Compose as a public threshold reduced to silhouettes by weather.



60. `Brown Building (240)`
   - Title: `Brown Building (240)`
   - Literal description: `This is the lobby of the Brown Building, an eighteen-story skyscraper which houses the Meteorology Department and other outposts of the Earth Sciences. The elevator is out of order, but a long stairway leads up to the roof, and another leads down to the basement. A revolving door leads out into the night.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is the lobby of the Brown Building, an eighteen-story skyscraper which houses the Meteorology Department and other outposts of the Earth Sciences.

61. `Chemistry Building (248)`
   - Title: `Chemistry Building (248)`
   - Literal description: `This corridor is lined with closed, dark offices. At the south end of the corridor is a door with a light shining behind it. There is something written on the door.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This corridor is lined with closed, dark offices.
