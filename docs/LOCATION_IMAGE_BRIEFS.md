# The Lurking Horror Notable Location Briefs

This document provides image-friendly location briefs (title + description) for art generation.

Style assumptions for consistency:

- Nighttime, storm-soaked atmosphere
- Retro campus/industrial horror tone
- Texture-forward, hand-drawn or etched look works well
- Keep scenes mostly empty of people to preserve isolation

Literal descriptions below are taken from in-game `look` output in the local story build.

## prompts

Prefix to all prompts: Scratchart with very thin white etched lines on black paper. Dürer, black and white. Portrait or square - whatever works best for the composition.
Prompts are now stored directly under each location entry (`- prompt:`), grouped by source/model section.

Draft prompts for locations that do not yet have a per-location `- prompt:`:

## Done

### Done with Z-image turbo

3. `Computer Center (65)`
   - Title: `Computer Center: Midnight Lab`
   - Literal description: `This is the lobby of the Computer Center. An elevator and call buttons are to the south. Stairs also lead up and down, for the energetic. To the north is Smith Street.`
   - Description: A larger technical space with rows of equipment, reflective floors, and rain-muted light from outside. Emphasize old hardware geometry and a tense, after-hours atmosphere.
   - prompt: Wide interior view of the lobby of a large computer center at night, rendered as a technical after-hours space rather than an ordinary entrance hall. Rows of old computing equipment, machine cabinets, terminals, wall panels, conduit, and hard-edged hardware geometry extend into the background. The floor is smooth and faintly reflective, catching dim light from outside through glass to the north. To the south, an elevator and call buttons; nearby, stairs leading up and down. The scene feels active in structure but deserted in human presence, with rain-muted exterior light, deep shadows, restrained highlights, and a tense late-night science-fiction atmosphere.

4. `Temporary Lab (140)`
   - Title: `Temporary Lab: Improvised Science`
   - Literal description: `This is a laboratory of some sort. It takes up most of the building on this level, all the interior walls having been knocked down. (One reason these temporary buildings are still here is their flexibility: no one cares if they get more or less destroyed.) A stairway leads down, and a door leads north.`
   - Description: A makeshift research room with benches, scattered instruments, taped labels, and unfinished setups. It should feel active but abandoned in a hurry.
   - prompt: Improvised laboratory occupying a gutted temporary building floor where interior walls were removed, leaving open bays, scattered benches, and ad hoc research setups. Make it functional yet unstable, with makeshift order, abandoned urgency, and cold night lighting.

5. `Infinite Corridor (218/214/210/208/206)`
   - Title: `Infinite Corridor: Vanishing Point`
   - Literal description: `The so-called infinite corridor runs from east to west in the main campus building. This is the west end. Side corridors lead north and south, and a set of doors leads west into the howling blizzard.`
   - Description: A long corridor with repeating lights and doors receding into darkness. Strong perspective lines and slight visual distortion should suggest unnatural depth.
   - prompt: Long central campus corridor stretching east-west with repeating doors, office fronts, and perspective lines that push toward a vanishing point. The mood should be geometric and uncanny, with slight visual repetition and oppressive institutional symmetry.

7. `Roof (127)`
   - Title: `Roof: Storm Exposure`
   - Literal description: `This is the roof of the Computer Center. A door leads to the stairway. The roof is covered with tarred pea gravel and drifted snow. The wind howls around your ears. To the south and southeast you can dimly see the looming shapes of the Great Dome and the Brown Building.`
   - Description: Open rooftop at night with rain, wind, and distant city glow. Surfaces are slick and reflective, with strong contrast between darkness and lightning highlights.
   - prompt: Wide rooftop night scene in severe weather, open and exposed, with tarred pea gravel, drifted snow, slick wet patches, and a single door leading back to the stairway structure. Strong wind, rain, and storm motion are visible in the linework. To the south and southeast, the dim looming silhouettes of the Great Dome and the Brown Building appear through weather and darkness. Surfaces are reflective and uneven, with sharp lightning-struck highlights against deep black shadow. The composition should emphasize isolation, exposure, and open air rather than rooftop clutter.

8. `Great Dome (249)`
   - Title: `Great Dome: Hollow Monument`
   - Literal description: `Here a walkway circles the base of a huge ornate dome. Below is the Infinite Corridor. From stories of Tech Exploring trips, you recall that there is supposed to be a ladder here. On the other hand, there is a shiny rope-like thing hanging near where the ladder used to be, and leading upward.`
   - Description: A large interior dome chamber where scale is the main emotion. Use towering curvature, sparse light, and deep shadow to imply hidden vertical space.
   - prompt: Vast interior base of an ornate dome with a circular walkway high above the main corridor and dramatic vertical scale fading into darkness. Emphasize monumental architecture, sparse highlights on curved structure, and a suspended rope-like element where a ladder should be.

9. `On the Great Dome (145)`
   - Title: `On the Great Dome: High and Unstable`
   - Literal description: `This is the very top of the Great Dome, a favorite place for Tech fraternities to install cows, Volkswagen Beetles, giant birthday candles, and other bizarre objects. The top is flat, round, and about five feet in diameter. It's very windy, which has kept the snow from accumulating here. The only way off is down.`
   - Description: Exterior high point over the campus in severe weather. The image should communicate height, exposure, and danger, with thin footing and wide voids.
   - prompt: Extreme high exterior viewpoint from the very top of the Great Dome at night, in violent weather. The standing area is small, flat, round, and precariously narrow, only a few feet across, with the vast drop falling away immediately in every direction. Wind lashes across the surface; no snow has accumulated here. The campus below is distant, dim, and unstable in the storm, with broad darkness and scattered city glow far beneath. The image should communicate height, danger, exposure, and thin footing over immense voids, with a sparse composition, dramatic negative space, and severe contrast.

10. `Steam Tunnel (66/78/138/221/227)`
    - Title: `Steam Tunnel: Heat Under Stone`
    - Literal description: `This dank and grimy tunnel is largely filled with an imperfectly insulated steam pipe. The tunnel is uncomfortably hot and damp. A thick bundle of coaxial cable runs east to west along the ceiling.`
    - Description: Utility tunnels with pipes, periodic steam, and claustrophobic industrial decay. Treat the pressure valve as specific to `Steam Tunnel (66)`, not as a shared feature of all steam-tunnel locations.
    - prompt: Hot, damp utility tunnel dominated by a large insulated steam pipe and bundled coaxial cable overhead, with mold, condensation, and industrial decay throughout. The tunnel should feel pressurized and claustrophobic, with wet surfaces and heavy texture.

13. `Steam Tunnel (78)`
   - Title: `Steam Tunnel (78)`
   - Literal description: `The steam tunnel is narrow here, and its construction is more archaic. It's now mostly brick, although the floor is concrete. The steam pipe and coaxial cable continue along their appointed paths. The tunnel is damp and even a little muddy.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: The steam tunnel is narrow here, and its construction is more archaic.
   - prompt: Narrow archaic steam tunnel section with brick walls, concrete floor, persistent steam pipe and cable run, and muddy damp footing. Stress the older construction style and compressed width compared to other tunnel segments.

22. `Steam Tunnel (138)`
   - Title: `Steam Tunnel (138)`
   - Literal description: `The steam pipe and coaxial cable turn upwards and disappear into the ceiling here. The tunnel itself comes to an end in a grimy, damp, and dripping triad of crumbling brick walls. The south wall looks particularly decrepit.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: The steam pipe and coaxial cable turn upwards and disappear into the ceiling here.
   - prompt: Dead-end steam tunnel where pipe and cable turn upward into the ceiling, terminating at crumbling brick walls and a notably decrepit south wall. Compose it as a trapped endpoint with damp drips, grime, and structural exhaustion.

45. `Steam Tunnel (221)`
   - Title: `Steam Tunnel (221)`
   - Literal description: `This dank and grimy tunnel is largely filled with an imperfectly insulated steam pipe. The tunnel is uncomfortably hot and damp. A bundle of coaxial cable runs along the ceiling, festooned with damp mold and cobwebs. The tunnel continues west.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This dank and grimy tunnel is largely filled with an imperfectly insulated steam pipe.
   - prompt: Dank tunnel segment with steam pipe, overhead cable draped in mold and cobwebs, and moisture-stained surfaces leading west. Keep the scene tight, gritty, and oppressive with dense wall texture and low headroom.

47. `Steam Tunnel (227)`
   - Title: `Steam Tunnel (227)`
   - Literal description: `This dank and grimy tunnel is largely filled with an imperfectly insulated steam pipe. The tunnel is uncomfortably hot and damp. You have gone from the arctic to the tropics. The concrete tunnel has odd molds and fungi growing on its walls and ceiling, and the floor is squishy. Torn clots of insulation litter the floor. Along the ceiling runs a thick tangle of coaxial cable. The tunnel heads east and west. A rusty metal ladder leads up.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This dank and grimy tunnel is largely filled with an imperfectly insulated steam pipe.
   - prompt: Oppressively hot steam tunnel with torn insulation on a squishy floor, heavy cable tangle on the ceiling, and fungi-coated concrete walls. Include a rusty ladder upward as the key navigational landmark in an otherwise horizontal passage.

16. `Basalt Bowl (134)`
    - Title: `Basalt Bowl: Black Stone Basin`
    - Literal description: `You are at the bottom of a deeply cut, smooth basalt bowl. Dimly seen shapes crowd you on all sides. Ahead, in the focus of the movement, is a rock platform.`
    - Description: A dreamlike volcanic basin of smooth dark rock with unnatural stillness. Keep it stark and symbolic, with minimal clutter and strong silhouette shapes.
    - prompt: Deeply cut smooth black basalt basin viewed from the bottom, ringed by looming shapes and converging movement toward a rock platform ahead. Keep the space dreamlike and symbolic, with stark forms and minimal visual noise.

17. `Place (152)`
    - Title: `Place: Dream Threshold`
    - Literal description: `This is a place. Things move about on a broken, rocky surface. Harsh sounds split the air. Something sticky grabs at your feet. There is no color, everything is drained of brightness, dull and lifeless. A path descends into a shallow bowl of black basalt.`
    - Description: Transitional dream-space that feels less physical than other rooms. Forms can be simplified and spatial logic slightly unstable, while staying readable.
    - prompt: Surreal dream-threshold landscape with broken rocky ground, color-drained atmosphere, harsh fractured sound implied through jagged forms, and a path descending into a basalt bowl. Visual logic may be slightly unstable but still readable.

18. `At Platform (21)`
    - Title: `At Platform: Edge of Departure`
    - Literal description: `You stand before a low rock platform, more like an afterthought of piled rocks or a glacial moraine than a work of artifice. You are pushed against the pile by the crowd around you.`
    - Description: A liminal platform space with implied movement and uncertain destination. Use directional composition and negative space to suggest a one-way threshold.
    - prompt: Crude low rock platform like piled moraine stones amid pressure from an unseen crowd, suggesting forced movement and ritual procession. Use directional composition and compressed space to evoke tension and inevitability.

### Done with ChatGPT

1. `Terminal Room (176)`
   - Title: `Terminal Room: Green Cursor in the Dark`
   - Literal description: `This is a large room crammed with computer terminals, small computers, and printers. An exit leads south. Banners, posters, and signs festoon the walls. Most of the tables are covered with waste paper, old pizza boxes, and empty Coke cans. There are usually a lot of people here, but tonight it's almost deserted.`
   - Description: A cramped, old computing room lit by weak monitor glow. The terminal is the focal point, with cables, dust, and hard shadows. The room should feel like a safe point that still carries unease.
   - prompt: Please make an image of a cramped, old computing room lit by weak monitor glow. The terminal is the focal point, with cables, dust, and hard shadows. The room should feel like a safe point that still carries unease. Scratch art, int he style of Dürer. It's a large cluttered computer room at night with old terminals, printers, cables, pizza boxes, and waste paper under weak monitor glow. Banners, posters, and signs festoon the walls. Most of the tables are covered with waste paper, old pizza boxes, and empty Coke cans. The space should feel like a temporary refuge that still carries unease, with dense technical clutter in foreground and deep shadow toward the edges.

2. `Second Floor (137)`
   - Title: `Second Floor: Fluorescent Silence`
   - Literal description: `This is the second floor of the Computer Center. An elevator and call buttons are on the south side of the hallway. A large, noisy room is to the north. Stairs also lead up and down, for the energetic. To the west a corridor leads into a smaller room.`
   - Description: A dim institutional hallway with worn tiles, muted signage, and flat fluorescent light. The space feels ordinary at first glance, but too empty and too quiet.
   - prompt: Institutional second-floor hallway in a computer center, with elevator doors and call buttons on the south wall, stairs up and down, and a noisy room visible to the north. Fluorescent lighting should feel flat and sterile, emphasizing emptiness and after-hours silence.

4. `Basement (27)`
   - Title: `Basement (27)`
   - Literal description: `Bare concrete walls line a wide corridor leading east and west. An elevator and call button are to the south. Stairs also lead up, for the energetic. From floor to ceiling run wire channels and steam pipes.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: Bare concrete walls line a wide corridor leading east and west.
   - prompt: Broad concrete basement corridor with wire channels and steam pipes running floor to ceiling, plus elevator and stair access points. Present it as functional infrastructure space with harsh lighting and industrial monotony.

5. `Kitchen (33)`
   - Title: `Kitchen (33)`
   - Literal description: `This is a filthy kitchen. The exit is to the east. On the wall near a counter are a refrigerator and a microwave.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is a filthy kitchen.
   - prompt: Filthy staff kitchen with stained surfaces, neglected appliances, and stale grime baked into every corner. Keep the composition tight and unpleasant, with a refrigerator and microwave as clear landmarks and harsh contrast on dirty textures.

6. `Aero Lobby (136)`
   - Title: `Aero Lobby: Cold Marble Echo`
   - Literal description: `This is the lobby of the Aeronautical Engineering Building. Stairs lead down and a corridor heads south towards the main building.`
   - Description: A broad lobby with hard surfaces, sparse fixtures, and dead air. The scene should feel formally designed but emotionally vacant.
   - prompt: Broad, spacious lobby interior in an aeronautical engineering building, with hard polished surfaces, sparse fixtures, and a formally planned architectural layout. Wide floor planes, stone or marble wall sections, clean lines, minimal furniture, and a corridor receding south toward the main building. Stairs descend out of view. The room should feel institutional, expensive, and emotionally vacant, with dead air, wide negative space, faint reflections, and austere lighting. Dramatic contrast, but restrained detail density, so the emptiness dominates.

11. `Muddy Tunnel (39)`
    - Title: `Muddy Tunnel: Wet Descent`
    - Literal description: `The tunnel you came through continues down, barely large enough to enter. It is made of sticky gelatinous mud that's been pushed by something into a semblance of a passage.`
    - Description: Narrow earthen passage with pooled water, slick mud, and uneven walls. Light should be minimal and absorbed, with heavy texture detail.
    - prompt: Narrow, claustrophobic earthen tunnel descending into darkness, barely large enough to crawl through. The passage is formed from sticky gelatinous mud pushed into an unnatural tunnel shape, with pooled water, slick surfaces, and irregular walls pressing close from all sides. Light is minimal and swallowed by wet earth, producing soft absorbed darkness rather than open shadow. Emphasize heavy texture, thickness of mud, cramped scale, and the feeling that the tunnel was forced open by something rather than excavated cleanly. Horror atmosphere, oppressive and intimate.

12. `Renovated Cave (201)`
    - Title: `Renovated Cave: Wrong Improvements`
    - Literal description: `You are in a huge, cave-like construction. A path leads down to a floor partly covered with rough concrete. The walls and ceiling are high and reinforced with beams of wood, iron, and steel. In the center of the floor you can see a large, flat slab of granite. The only exit is behind you to the south.`
    - Description: A natural cave partly altered by human construction. Mix raw stone with awkward modern additions so the location feels both ancient and tampered with.
    - prompt: Wide interior view of a huge cave-like chamber partially altered by human construction. High stone walls and ceiling rise into darkness, reinforced awkwardly with beams of wood, iron, and steel, as though multiple eras of repair were forced together without harmony. A rough path descends to a floor partly covered in crude concrete. In the center lies a large flat granite slab. The space should feel ancient, natural, and wrongfully modernized, with raw stone textures colliding with intrusive structural additions. Spacious composition, strong vertical scale, deep shadow, restrained but precise highlights.

13. `Before the Altar (149)`
    - Title: `Before the Altar: Ritual Geometry`
    - Literal description: `You are at the bottom of the cave. The huge slab of granite in the center is a sort of altar. It is carved with strange and disturbing symbols, the largest of which looks very familiar. Some of the symbols are obscured by rusty red stains. Nearby is an iron plate set in the concrete of the floor.`
    - Description: A ceremonial-feeling chamber centered on a stark altar form. Use hard symmetry, shadow framing, and restrained highlights for ominous focus.
    - prompt: Symmetrical ceremonial chamber composition, centered on a large flat granite altar slab at the bottom of the cave. The altar is carved with strange disturbing symbols, one much larger than the others, some partly obscured by dark rusty stains. Nearby sits an iron plate embedded in the concrete floor. Use hard symmetry, frontal composition, and shadow framing so the altar becomes the unavoidable focus. The lighting should be sparse and controlled, with restrained highlights along edges and carvings, and heavy darkness around the perimeter. Ominous, ritualistic, precise, and still.

14. `Wet Tunnel (15/51/87/117/131/161/164/184/187/232/234)`
    - Title: `Wet Tunnels: Numbered Labyrinth`
    - Literal description: `You are lost in narrow, wet tunnels burrowed through the mud. Muddy, oily water covers the floor.`
    - Description: Repeating flooded tunnel segments that are intentionally hard to distinguish. Maintain a consistent visual language while allowing minor landmark variation.
    - prompt: Repeating narrow flooded tunnel segment, one of many almost indistinguishable passages in a wet underground labyrinth. Muddy oily water covers the floor, reflecting dim broken highlights. The walls are slick, irregular, and close, with a consistent visual language from one segment to the next: low ceiling, wet mud, shallow standing water, and swallowed darkness ahead. Include only minor landmark variations such as a slight bend, a cracked wall seam, a small recess, or a hanging strand. Claustrophobic, minimal, and oppressive.

14b. `Wet Tunnel (181)`
   - Title: `Wet Tunnel (181)`
   - Literal description: `You are lost in narrow, wet tunnels burrowed through the mud. Muddy, oily water covers the floor. A curtain of moldy slime covers the south wall.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: You are lost in narrow, wet tunnels burrowed through the mud.
   - prompt: Narrow flooded mud tunnel with oily water over the floor and a distinct curtain of moldy slime draped across the south wall. Keep the same oppressive wet-tunnel visual language (low ceiling, slick close walls, swallowed darkness), but make the slime curtain the key landmark. Emphasize clammy texture, hanging biological mass, and muted highlights in black-and-white etched scratchart style.

15. `Smith Street (98)`
   - Title: `Smith Street (98)`
   - Literal description: `Smith Street runs west towards the computer center here. To the south is a dilapidated grey wooden building. The street is an impassable sea of blowing and drifting snow.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: Smith Street runs west towards the computer center here.
   - prompt: Exterior night scene on Smith Street in severe blizzard conditions, with the road running west toward the Computer Center. To the south stands a dilapidated gray wooden building, weathered and unstable. The street is an impassable sea of blowing and drifting snow, with low visibility, wind streaks, and sparse urban lighting swallowed by the storm. Focus on exposure, cold emptiness, and directional weather movement in stark black-and-white etched linework.

15b. `Smith Street (185)`
   - Title: `Smith Street (185)`
   - Literal description: `Smith Street runs east and west along the north side of the main campus area. At the moment, it is an arctic wasteland of howling wind and drifting snow. On the other side of the street, barely visible, are the lidless eyes of streetlights. The street hasn't been plowed, or if it has been, it did no good.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: Smith Street runs east and west along the north side of the main campus area.
   - Additional location: `Smith Street (98)`
   - prompt: Long east-west campus street during blizzard conditions, with howling wind, drifting snow, and dim streetlights reduced to ghostly points. The scene should feel exposed and hostile, with low visibility and frozen emptiness.

16. `Large Chamber (99)`
    - Title: `Large Chamber: Echoing Void`
    - Literal description: `This is a wide spot in the tunnel, just as wet and muddy as elsewhere. The walls are slimy as well. Numerous slots or indentations about two feet wide and a foot high open here and there. Thin, wire or ropelike growths emerge from a hole further down and enter each of the slots. There is background noise here, almost loud enough to hear clearly.`
    - Description: A broad underground chamber with vertical darkness and unclear boundaries. The scene should feel open yet oppressive, with scale cues fading into black.
    - prompt: Broad underground chamber opening out from narrow tunnels, with wet muddy ground and slimy walls, but with boundaries that fade into vertical darkness. Numerous rectangular slots or indentations interrupt the walls. Thin wire-like or rope-like growths emerge from deeper darkness and feed into the slots. The chamber should feel larger than the viewer can confidently measure, open in footprint yet oppressive in mood, with scale cues disappearing into blackness overhead and beyond. The composition should balance openness with uncertainty, using deep shadow, sparse highlights, and a sense of audible unseen activity.

19. `Inner Lair (69)`
    - Title: `Inner Lair: Hidden Core`
    - Literal description: `The floor here is a stagnant, slime infested pool of water. It feels to your sodden feet to be about six inches deep. Ropes or wires tumble down the slope, where they enter a large whitish mass which takes up much of the chamber. The noise is loud here, and comes from the mass, which undulates in synchrony with the noise. Wan, sourceless light illuminates the chamber.`
    - Description: A concealed interior den with dense shadow and focused highlights on key structures. It should feel like a destination reached only after sustained descent.
    - prompt: Interior lair chamber reached after a long descent, with a stagnant slime-infested pool covering the floor to shallow depth. Ropes or wires tumble down a slope and disappear into a large whitish undulating mass occupying much of the chamber. The mass is the focal point, illuminated by wan sourceless light that reveals only selected surfaces while the rest of the chamber remains in dense shadow. The scene should feel like a hidden destination, enclosed and final, with concentrated detail on the water, cables, and pale living structure, and surrounding darkness that suggests much more beyond view.

20. `Elevator (124)`
   - Title: `Elevator (124)`
   - Literal description: `This is a battered, rather dirty elevator. The fake wood walls are scratched and marred with graffiti. The elevator doors are closed. To the right of the doors is an area with floor buttons (B and 1 through 3), an open button, a close button, a stop switch, and an alarm button. Below these is an access panel which is closed.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is a battered, rather dirty elevator.
   - prompt: Battered dirty elevator interior with fake wood walls scarred by graffiti, old control panel with floor buttons and switches, and a closed access panel. Focus on worn surfaces, tight framing, and claustrophobic utility.

21. `Tomb (9)`
    - Title: `Tomb: Buried Memory`
    - Literal description: `This is a tiny, narrow, ill-fitting room. It appears to have been a left over space from the joining of two preexisting buildings. It is roughly coffin shaped. The walls are covered by decades of overlaid graffiti, but there is one which is painted in huge fluorescent letters that were apparently impossible for later artists to completely deface. On the floor is a rusty access hatch locked with a huge padlock.`
    - Description: Stone burial chamber with age-worn surfaces, dry dust, and severe stillness. Emphasize historical weight and the sense of disturbing something that should remain sealed.
    - prompt: Tiny, narrow, coffin-shaped chamber wedged awkwardly between older structures, with close stone walls and a severely cramped footprint. The surfaces are dry, age-worn, dusty, and heavy with stillness. The walls are layered with decades of graffiti, one message standing out in huge letters that remain legible despite later defacement. On the floor sits a rusty access hatch secured by an enormous padlock. Emphasize historical weight, confinement, and the sense of violating something sealed for a reason, with stark composition, dry texture, silent air, and restrained ominous highlights.

22. `Small Courtyard (16)`
   - Title: `Small Courtyard (16)`
   - Literal description: `This courtyard is a triumph of modern architecture. It is spare, cold, angular, overwhelming in size, and bears a striking resemblance to a wind tunnel whenever the breeze picks up. Right now this is true of the whole campus, though. A huge mass lurks nearby, and an almost featureless skyscraper is to the north.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This courtyard is a triumph of modern architecture.
   - prompt: Massive angular modern courtyard in severe winter wind, spare and cold like an architectural wind tunnel, with looming building mass nearby. Emphasize scale, hard geometry, and hostile weather over decorative detail.

23. `Cinderblock Tunnel (17)`
   - Title: `Cinderblock Tunnel (17)`
   - Literal description: `This is a tunnel whose walls are cinderblock, with a concrete floor and ceiling. A metal ladder leads up to a closed metal plate in the ceiling, and the tunnel continues north, where the cinderblock walls become brick.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is a tunnel whose walls are cinderblock, with a concrete floor and ceiling.
   - prompt: Cinderblock service tunnel with concrete floor and ceiling, metal ladder to a closed ceiling plate, and transition toward older brickwork to the north. Keep it utilitarian, bare, and transit-focused.

24. `Brick Tunnel (25)`
   - Title: `Brick Tunnel (25)`
   - Literal description: `This is an ancient tunnel constructed of roughly mortared bricks and stones. The tunnel continues a long way north and south from here.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is an ancient tunnel constructed of roughly mortared bricks and stones.
   - prompt: Ancient long brick-and-stone passage with rough mortar joints and extended north-south continuity disappearing into dark distance. Stress age, persistence, and heavy subterranean stillness.A black-and-white scratchboard illustration, thin white lines cut into deep black, in the spirit of Dürer and wax-paper scratchart. Landscape orientation, moderately wide framing.
   - ChatGPT: An ancient subterranean tunnel constructed of heavy brick and rough-hewn stone, extending strongly north–south through the composition and disappearing into a deep, lightless distance. The tunnel is long, continuous, and unbroken, with a powerful sense of age and persistence. The walls are composed of irregular brickwork and stone blocks with rough mortar joints, worn edges, and subtle deformation from centuries of pressure and time. The ceiling is slightly arched, supported by thick masonry, with faint irregularities suggesting slow settling. The floor is uneven stone or packed surface, minimally defined, absorbing light rather than reflecting it. Lighting is sparse and indirect—dim, distant, or implied rather than visible—creating long gradients of shadow that swallow the far end of the tunnel. The darkness ahead should feel absolute and impenetrable. Emphasize linear perspective and slow recession into depth, with strong horizontal continuity and no visual interruptions. Avoid modern elements, fixtures, or ornamentation. The mood is heavy, airless, and ancient—silent, unmoving, and buried far below the surface. Stress endurance, mass, and time rather than detail density. Large areas of shadow and negative space should dominate, with texture concentrated in the stone and mortar. Avoid centered or symmetrical composition that feels staged. Prioritize depth, continuity, and the feeling of something that has existed unchanged for centuries.

25. `Tunnel Entrance (34)`
   - Title: `Tunnel Entrance (34)`
   - Literal description: `The tunnel continues west from here, becoming narrow, muddy, and forbidding. The walls no longer seem to be as finished as they were. The steam pipe and coaxial cable disappear into the ceiling at this point. The temperature has dropped considerably, as well.`
   - prompt: Transition point where finished utility space gives way to narrow muddy tunnel; pipes and coax disappear into the ceiling as temperature visibly drops. Compose it as a threshold from engineered order into organic menace.
   - ChatGPT: A black-and-white scratchboard illustration, thin white lines cut into deep black, in the spirit of Dürer and wax-paper scratchart. Landscape orientation, moderately wide framing. A transitional underground passage where a finished institutional utility corridor gives way to a narrow, primitive tunnel continuing west into darkness. The composition emphasizes this threshold: in the near space, the walls are smooth cinderblock and concrete, geometrically regular and engineered. As the eye moves westward, the structure degrades—walls become rough, uneven, and earthen, with exposed stone and collapsing mortar, the passage narrowing and becoming muddy and irregular. Along the ceiling and upper walls, steam pipes and a coaxial cable run cleanly through the finished section, then abruptly vanish into the ceiling or wall at the transition point, leaving the deeper tunnel bare and unsupported. This disappearance should be visually clear and slightly unsettling. The floor shifts from hard, slightly reflective concrete to soft, uneven mud with shallow ruts and dark patches that absorb light. The air appears colder beyond the threshold: breath-like haze, denser darkness, and a subtle visual drop in clarity suggest a sharp temperature change. Lighting is harsh and artificial in the foreground—overhead fixtures casting structured reflections and defined shadows—but fades quickly at the transition into dim, diffuse, and uncertain illumination. The deeper tunnel should feel lightless, swallowing detail. Emphasize contrast between order and decay, geometry and irregularity, infrastructure and abandonment. The space should feel like a boundary between human control and something older and more indifferent. No people, no clutter. Minimal detail outside of textures and structural lines. Strong lateral composition with the transition point slightly off-center. Avoid symmetrical or centered framing. The mood is cold, damp, and increasingly hostile—an engineered space giving way to organic menace.
   - in the distance you should rotate the tunnel along its axis, like a kaleidoscope, and also make it slightly foggy on the ground in the organic part of the tunnel.

26. `Stairway (35)`
   - Title: `Stairway (35)`
   - Literal description: `A dimly lit stairway leads up and down from here. A corridor continues east.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: A dimly lit stairway leads up and down from here.
   - prompt: Dim concrete stair core with vertical movement up and down and a corridor continuing east, lit by weak institutional fixtures. Keep detail minimal and emphasize directional geometry and shadowed corners.
   - ChatGPT: A black-and-white scratchboard illustration, thin white lines cut into deep black, in the spirit of Dürer and wax-paper scratchart. Portrait orientation, tall framing. A dim institutional stair core constructed of bare concrete, with stair flights leading both upward and downward from a central landing. The composition emphasizes vertical movement: stairs ascending into darkness above and descending into deeper shadow below. From the landing, a narrow corridor extends eastward, partially visible, receding into low light. This horizontal passage should feel secondary to the dominant vertical structure, but still clearly present. The architecture is severe and minimal: poured concrete walls, sharp edges, and heavy planar surfaces. Railings are simple metal, thin and functional. No decoration, no signage, no clutter. Lighting is weak and institutional—small overhead fixtures casting limited, uneven illumination. Light falls off quickly, leaving corners and lower sections in deep shadow. The underside of stairs and upper reaches should dissolve into darkness. Emphasize strong geometric relationships: diagonals of stair flights, vertical shafts, and the single horizontal corridor cutting across. Use large areas of black and negative space, with detail concentrated only where light strikes edges and surfaces. Avoid symmetry and avoid centering the landing exactly. The composition should feel slightly off-balance, reinforcing disorientation. The mood is quiet, airless, and transitional—an infrastructural space meant only for movement, not for dwelling.

27. `Concrete Box (37)`
   - Title: `Concrete Box (37)`
   - Literal description: `This small room is pretty bare and featureless. The north wall is brick and the other three walls are concrete. The east and west walls are adorned with rails not unlike railroad rails. Above you and out of reach, the shaft is blocked by something.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This small room is pretty bare and featureless.
   - prompt: Small bare chamber with concrete walls on three sides, brick to the north, rail-like metal tracks on east and west, and a blocked shaft above. The room should feel mechanical, constrained, and unfinished.
   - A black-and-white scratchboard illustration, thin white lines cut into deep black, in the spirit of Dürer and wax-paper scratchart. Portrait orientation, tight framing.
   - ChatGPT: A small, bare subterranean chamber with severe, minimal construction. Three walls are poured concrete—flat, cold, and featureless—while the north wall is made of rough, aged brick with visible mortar joints and slight irregularity. The east and west walls each hold a pair of vertical metal rails, resembling railroad tracks or guide rails, bolted directly into the concrete. They run from floor to ceiling, rigid and parallel, suggesting mechanical function but with no visible mechanism attached. Above, a vertical shaft continues upward but is abruptly blocked by a heavy, undefined obstruction—flat, sealed, and unreachable. The ceiling feels close and oppressive, with the blocked shaft clearly visible but offering no access. The floor is plain concrete, slightly worn, with minimal texture and no debris. Lighting is dim and institutional, coming from an unseen source—just enough to define edges and surfaces. Shadows gather heavily in corners and along the upper shaft, emphasizing enclosure and depth. Light should not fully illuminate the blocked opening. Emphasize vertical confinement, hard geometry, and mechanical ambiguity. The rails, walls, and shaft should feel aligned but purposeless, as if part of an unfinished or abandoned system. No objects, no signage, no people. Minimal detail outside of surface texture and structural lines. Use strong negative space and deep blacks to compress the space visually. Avoid symmetry and avoid centering the shaft perfectly; the composition should feel slightly off, reinforcing unease. The mood is constrained, silent, and unresolved—an incomplete mechanical space with no clear function and no exit.

28. `Engineering Building (38)`
   - Title: `Engineering Building (38)`
   - Literal description: `This building extends a long way south from the Infinite Corridor. It too is full of closed, locked offices.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This building extends a long way south from the Infinite Corridor.
   - prompt: Long institutional building wing extending south from the Infinite Corridor, lined with closed locked offices and minimal human trace. Use repeated door rhythm and corridor depth to convey academic austerity.
   - ChatGPT: A black-and-white scratchboard illustration, thin white lines cut into deep black, in the spirit of Dürer and wax-paper scratchart. Landscape orientation, moderately wide framing. A long institutional corridor in an engineering building, extending south from a larger main passage. The corridor recedes deeply into the distance, with a strong vanishing point and pronounced linear perspective. Both sides of the corridor are lined with identical closed office doors, each plain, solid, and locked. The doors repeat in a strict, unbroken rhythm, evenly spaced and nearly indistinguishable from one another. Small details—handles, narrow frames, minimal signage—are present but subdued. The walls are smooth and institutional: painted concrete or plaster, flat and undecorated. The floor is hard and slightly reflective, but dull—absorbing light rather than shining. The ceiling is low and regular, with evenly spaced fluorescent fixtures forming a secondary rhythm overhead. Lighting is cold, even, and impersonal. Each fixture creates a shallow pool of light, but the corridor remains dim overall, with gradual falloff into deeper shadow toward the far end. The distance should feel longer than expected, subtly exaggerated. No people, no movement, no personal items. The offices show no sign of occupancy—no light beneath doors, no sound, no variation. Emphasize repetition, depth, and institutional austerity. The corridor should feel overplanned, quiet, and emotionally vacant. Large areas of negative space should exist between structural elements, with detail concentrated in door edges, floor texture, and ceiling lines. Avoid visual interruptions or focal points. The composition should feel continuous and indifferent, as if the corridor could extend indefinitely. The mood is silent, airless, and academic—an environment defined by structure, routine, and absence.

## Additional locations (remaining 24)

These are the remaining mapped locations, in the same brief format.

10. `Lab (42)`
   - Title: `Lab (42)`
   - Literal description: `The lab is an ultramodern, fully equipped chemistry lab. Unfortunately, or perhaps fortunately, you aren't a chemistry major, so the equipment might as well be magical.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: The lab is an ultramodern, fully equipped chemistry lab.
   - prompt: Ultramodern chemistry lab filled with advanced benches and instruments that read as technical but almost arcane to a non-specialist observer. Balance precision equipment silhouettes with uneasy, clinical emptiness.

11. `Dead Storage (47)`
   - Title: `Dead Storage (47)`
   - Literal description: `This is a storage room. It contains an incredible assemblage of discarded junk. Some of it is so old and mouldering that you can't be sure where one bit of junk stops and the next begins. It's piled to the ceiling on ancient, rotting pallets; you can't even see the east wall.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is a storage room.
   - prompt: Overfilled storage room with collapsing layers of ancient junk on rotting pallets stacked to the ceiling, edges blending into one decayed mass. Emphasize mold, dust, and visual overwhelm with almost no clear floor space.

16. `Inside Dome (109)`
   - Title: `Inside Dome (109)`
   - Literal description: `You are inside a large domed area. The dome contains equipment that makes it clear it is a weather observation station. For some reason, it also contains a small peach tree. Wind whistles outside, and snow blasts against the semitransparent material of the dome.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: You are inside a large domed area.
   - prompt: Weather observation dome interior with technical monitoring equipment and a small peach tree, while wind and snow batter the semitransparent shell outside. Contrast scientific intent with strange biological intrusion.

17. `Third Floor (110)`
   - Title: `Third Floor (110)`
   - Literal description: `This is the third floor of the Computer Center. An elevator and call button are on the south side of the hallway. Stairs also lead down, for the energetic. To the north is a glass wall beyond which you can see a computer room crammed with computer equipment. A stairway leads up.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is the third floor of the Computer Center.
   - prompt: Third-floor hallway of the computer center with elevator, stair access, and glass wall revealing a dense machine room beyond. Present it as a controlled vantage point overlooking active technology in a mostly empty building.

19. `Roof of Great Dome (121)`
   - Title: `Roof of Great Dome (121)`
   - Literal description: `You are perched precariously on the roof of the Great Dome. A set of narrow indentations in the dome provides a dangerous route to the very tip-top of the dome.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: You are perched precariously on the roof of the Great Dome.
   - prompt: Precarious exterior position on the great dome roof with narrow indentations leading toward the tip-top, surrounded by storm exposure and height. Keep footing visibly unsafe and composition sharply vertical.

23. `Subbasement (142)`
   - Title: `Subbasement (142)`
   - Literal description: `This is the subbasement of the Aeronautical Engineering Building. A stairway leads up. A narrow crack in the northwest corner of the room opens into a larger space.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is the subbasement of the Aeronautical Engineering Building.
   - prompt: Damp subbasement room beneath aeronautics with stairway up and a narrow crack in the northwest corner opening into larger hidden space. Emphasize concrete weight, moisture, and the unsettling secondary opening.

24. `Fruits and Nuts (150)`
   - Title: `Fruits and Nuts (150)`
   - Literal description: `This is the central corridor of the Nutrition Building. The main building is south, and a stairway leads down.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is the central corridor of the Nutrition Building.
   - prompt: Central corridor of the Nutrition Building with modest institutional finishes, connection south to main building, and stairway down. Make it look mundane at first glance but quietly deserted and tense.

25. `Aero Basement (158)`
   - Title: `Aero Basement (158)`
   - Literal description: `This basement level room is made of smooth, damp-seeming concrete. Fluorescent lights cast harsh shadows. To the west is a stairway, and to the east the basement area continues.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This basement level room is made of smooth, damp-seeming concrete.
   - prompt: Smooth concrete basement room with harsh fluorescent light, damp-seeming walls, and clear east-west continuation toward stair access. Stress polished but cold engineering-space character and hard shadow edges.

28. `Ancient Storage (171)`
   - Title: `Ancient Storage (171)`
   - Literal description: `What's deader than dead storage? That's what's in this room. Most of the contents have collapsed or rusted back to the primordial ooze. There is mold growing on some of the unidentifiable piles. Stagnant puddles of water pollute the floor. You can now believe how old some of these foundations are said to be.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: What's deader than dead storage? That's what's in this room.
   - prompt: Deeply decayed storage chamber where old contents have collapsed into rust, mold, and stagnant puddles, suggesting foundations older than the surrounding complex. The room should feel archaeological and contaminated at once.

29. `Department of Alchemy (174)`
   - Title: `Department of Alchemy (174)`
   - Literal description: `This office is clinically clean, shiny, and modern. It looks like something out of a science fiction movie. A closed door to the north leads back into the corridor and an archway opens to the south.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This office is clinically clean, shiny, and modern.
   - prompt: Clinically clean modern office with glossy surfaces and near science-fiction precision, framed by a closed door north and archway south. Contrast immaculate order with unsettling thematic implication of alchemy.

30. `Cluttered Passage (179)`
   - Title: `Cluttered Passage (179)`
   - Literal description: `This cluttered passage leads southeast. It is full of apparently discarded electronic equipment, old rusty file cabinets, and other detritus. A stairway also leads up.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This cluttered passage leads southeast.
   - prompt: Narrow passage choked with discarded electronic equipment, rusted file cabinets, and mixed debris, with movement squeezed toward southeast and a stairway up. Keep composition crowded and obstructed.

31. `Great Court (180)`
   - Title: `Great Court (180)`
   - Literal description: `In the spring and summer, this cheery green court is a haven from classwork. Right now, the majestic buildings of the main campus are almost invisible in the howling blizzard. A locked door bars your way to the north.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: In the spring and summer, this cheery green court is a haven from classwork.
   - prompt: Majestic campus court in blizzard conditions where architecture is barely visible through wind-driven snow, with a locked door to the north. Convey grandeur suppressed by weather and isolation.

36. `Mass. Ave. (190)`
   - Title: `Mass. Ave. (190)`
   - Literal description: `This is the main entrance to the campus buildings. Blinding snow obscures the stately Grecian columns and rounded dome to the east. You can barely make out the inscription on the pediment (which reads "George Vnderwood Edwards, Fovnder; P. David Lebling, Architect"). West across Massachusetts Avenue are other buildings, but you can't see them.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is the main entrance to the campus buildings.
   - prompt: Main campus entrance at Massachusetts Avenue under blinding snow, with classical columns and dome only faintly readable through storm haze. Compose as a public threshold reduced to silhouettes by weather.

37. `Top Floor (195)`
   - Title: `Top Floor (195)`
   - Literal description: `This is the top of the stairway. A door leads out to the roof here, and you can hear the wind blowing beyond. There is a sign on the door.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is the top of the stairway.
   - prompt: Top of a stairway landing with a single door to the roof, wind audible beyond, and signage on the door indicating transition to exposed exterior. Build tension around the boundary between interior safety and storm outside.

38. `Brown Basement (200)`
   - Title: `Brown Basement (200)`
   - Literal description: `This is a cluttered basement below the Brown Building. Discarded equipment nearly blocks an already narrow hallway that terminates in a stairway leading up. The passage itself continues northwest.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is a cluttered basement below the Brown Building.
   - prompt: Cluttered basement beneath the Brown Building where discarded equipment narrows an already tight hallway leading to stairs and a northwest passage. Emphasize compression, obstructions, and heavy lower-level atmosphere.

39. `Temporary Basement (202)`
   - Title: `Temporary Basement (202)`
   - Literal description: `During the Second World War, some temporary buildings were built to house war-related research. Naturally, these buildings, though flimsy and ugly, are still around. This is the basement of one of them. The basement extends west, a stairway leads up, and a large passage is to the east.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: During the Second World War, some temporary buildings were built to house war-related research.
   - prompt: Basement of a flimsy wartime temporary research building, utilitarian and unfinished, extending west with stair up and broad passage east. Blend institutional function with cheap aging structure.

40. `Infinite Corridor (206)`
   - Title: `Infinite Corridor (206)`
   - Literal description: `The so-called infinite corridor runs from east to west in the main campus building. This is the east end. The corridor branches north and south here.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: The so-called infinite corridor runs from east to west in the main campus building.
   - prompt: East end of the Infinite Corridor where the main east-west axis terminates into north-south branching, lined by dark offices and repetitive architecture. Emphasize terminal geometry and branching choices.

41. `Infinite Corridor (208)`
   - Title: `Infinite Corridor (208)`
   - Literal description: `The so-called infinite corridor runs from east to west in the main campus building. The corridor extends both ways from here. Many closed and locked offices are to the north and south.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: The so-called infinite corridor runs from east to west in the main campus building.
   - prompt: Mid-corridor section with locked offices on both sides and repeating fixtures extending in both directions. Keep perspective strict and oppressive, with subtle distortion to suggest unnatural length.

42. `Infinite Corridor (210)`
   - Title: `Infinite Corridor (210)`
   - Literal description: `The so-called infinite corridor runs from east to west in the main campus building. The corridor extends both ways from here. A stairway leads up, and a door leads out to the Great Court.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: The so-called infinite corridor runs from east to west in the main campus building.
   - prompt: Corridor node where the east-west hall continues, stairway rises, and a door opens toward Great Court. Show it as a functional junction with layered routes and institutional severity.

43. `Top of Dome (213)`
   - Title: `Top of Dome (213)`
   - Literal description: `Inside the great dome, near the top, a metal catwalk is precariously perched. There is no way further up, but a small metal door is set in the side of the dome.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: Inside the great dome, near the top, a metal catwalk is precariously perched.
   - prompt: Interior high catwalk near the top of the great dome, precarious and narrow, with no route higher and a small metal door set into the curved shell. Use steep vertical framing and sparse highlights to stress exposure.

44. `Infinite Corridor (214)`
   - Title: `Infinite Corridor (214)`
   - Literal description: `The so-called infinite corridor runs from east to west in the main campus building. The corridor extends both ways from here. Many closed and locked offices are to the north and south.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: The so-called infinite corridor runs from east to west in the main campus building.
   - prompt: Another repeating corridor segment with locked offices and long bidirectional sightlines, visually close to neighboring sections but not identical. Keep the mood monotonous, uncanny, and quietly threatening.

46. `Skyscraper Roof (222)`
   - Title: `Skyscraper Roof (222)`
   - Literal description: `A low parapet surrounds a small roof here. The air conditioning cooling tower and the small protrusion containing the stairs are dwarfed by a semitransparent dome which towers above you. The blowing snow obscures all detail of the city across the river to the south.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: A low parapet surrounds a small roof here.
   - prompt: Small roof enclosed by low parapet, with cooling tower and stair protrusion overshadowed by a giant semitransparent dome above, while snow obscures distant city detail to the south. Emphasize scale contrast and weather erosion of visibility.

50. `Brown Building (240)`
   - Title: `Brown Building (240)`
   - Literal description: `This is the lobby of the Brown Building, an eighteen-story skyscraper which houses the Meteorology Department and other outposts of the Earth Sciences. The elevator is out of order, but a long stairway leads up to the roof, and another leads down to the basement. A revolving door leads out into the night.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This is the lobby of the Brown Building, an eighteen-story skyscraper which houses the Meteorology Department and other outposts of the Earth Sciences.
   - prompt: Lobby of an eighteen-story meteorology-focused skyscraper with broken elevator, long stairs to roof and basement, and revolving door to the storm outside. Present it as grand but depleted, with vertical ambition and operational decay.

51. `Chemistry Building (248)`
   - Title: `Chemistry Building (248)`
   - Literal description: `This corridor is lined with closed, dark offices. At the south end of the corridor is a door with a light shining behind it. There is something written on the door.`
   - Description: Use the literal room text as the primary layout guide, with emphasis on: This corridor is lined with closed, dark offices.
   - prompt: Dim office-lined corridor in the Chemistry Building, mostly closed and dark, with one lit door at the south end bearing writing. Compose with strong directional pull toward that single illuminated point.
