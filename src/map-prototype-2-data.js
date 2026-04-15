/* Shared map-prototype-2 data for browser + node tests. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MapPrototype2Data = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MAP_ROOMS = [
          // Section C
          { id: "roof", label: "Roof", section: "C", layer: "L+2", x: 2520, y: 150, edges: [{ to: "third", label: "down" }] },
          {
            id: "third",
            label: "Third Floor",
            section: "C",
            layer: "L+1",
            x: 2520,
            y: 410,
            edges: [
              { to: "second", label: "down" },
              { to: "elev_l2", label: "south/enter", type: "enter" }
            ]
          },
          { id: "elev_l2", label: "Elevator", section: "C", layer: "L+1", x: 2300, y: 470, edges: [] },
          {
            id: "second",
            label: "Second Floor",
            section: "C",
            layer: "L+1",
            x: 2520,
            y: 500,
            edges: [
              { to: "computer", label: "down" },
              { to: "terminal", label: "north" },
              { to: "elev_l1", label: "south/enter", type: "enter" }
            ]
          },
          { id: "kitchen", label: "Kitchen", section: "C", layer: "L+1", x: 2240, y: 500, edges: [{ to: "second", label: "east" }] },
          { id: "terminal", label: "Terminal Room", section: "C", layer: "L+1", x: 2520, y: 370, edges: [] },
          { id: "elev_l1", label: "Elevator", section: "C", layer: "L+1", x: 2300, y: 560, edges: [] },
          {
            id: "computer",
            label: "Computer Center",
            section: "C",
            layer: "L0",
            x: 2520,
            y: 760,
            edges: [
              { to: "base", label: "down" },
              { to: "smith1", label: "north" },
              { to: "elev_l0", label: "south/enter", type: "enter" }
            ]
          },
          { id: "smith1", label: "Smith Street [W]", section: "C", layer: "L0", x: 2520, y: 670, edges: [{ to: "smith2", label: "east" }] },
          { id: "smith2", label: "Smith Street [E]", section: "C", layer: "L0", x: 2840, y: 670, edges: [{ to: "temp_lab", label: "south" }] },
          { id: "temp_lab", label: "Temporary Lab", section: "C", layer: "L0", x: 2840, y: 820, edges: [] },
          { id: "elev_l0", label: "Elevator", section: "C", layer: "L0", x: 2300, y: 820, edges: [] },
          {
            id: "aero_b",
            label: "Aero Basement",
            section: "C",
            layer: "L-1",
            x: 1080,
            y: 1080,
            edges: [
              { to: "base", label: "east" },
              { to: "stair", label: "west" }
            ]
          },
          {
            id: "base",
            label: "Basement",
            section: "C",
            layer: "L-1",
            x: 2520,
            y: 1080,
            edges: [
              { to: "temp_b", label: "east" },
              { to: "elev_lm1", label: "south/enter", type: "enter" }
            ]
          },
          {
            id: "temp_b",
            label: "Temporary Basement",
            section: "C",
            layer: "L-1",
            x: 2840,
            y: 1080,
            edges: [
              { to: "dead", label: "east" },
              { to: "temp_lab", label: "up" }
            ]
          },
          { id: "dead", label: "Dead Storage", section: "C", layer: "L-1", x: 3100, y: 1080, edges: [{ to: "ancient", label: "east" }] },
          { id: "ancient", label: "Ancient Storage", section: "C", layer: "L-1", x: 3370, y: 1080, edges: [{ to: "brick", label: "down" }] },
          {
            id: "elev_lm1",
            label: "Elevator",
            section: "C",
            layer: "L-1",
            x: 2300,
            y: 1170,
            edges: [{ to: "concrete_box", label: "puzzle", type: "puzzle" }]
          },
          { id: "stair", label: "Stairway", section: "C", layer: "L-1", x: 680, y: 1080, edges: [{ to: "aero_lobby", label: "up" }] },
          {
            id: "brick",
            label: "Brick Tunnel",
            section: "C",
            layer: "L-2",
            x: 3370,
            y: 1460,
            edges: [
              { to: "reno", label: "north" },
              { to: "cinder", label: "south" }
            ]
          },
          { id: "reno", label: "Renovated Cave", section: "C", layer: "L-2", x: 3370, y: 1360, edges: [{ to: "altar", label: "down" }] },
          { id: "cinder", label: "Cinderblock Tunnel", section: "C", layer: "L-2", x: 3370, y: 1570, edges: [] },
          { id: "altar", label: "Before the Altar [SFX]", section: "C", layer: "L-2", x: 3130, y: 1460, edges: [] },

          // Section B
          { id: "mass", label: "Mass. Ave.", section: "B", layer: "L0", x: 480, y: 760, edges: [{ to: "ic1", label: "east" }] },
          {
            id: "ic1",
            label: "Infinite Corridor [W1]",
            section: "B",
            layer: "L0",
            x: 680,
            y: 760,
            edges: [
              { to: "ic2", label: "east" },
              { to: "aero_lobby", label: "north" },
              { to: "eng", label: "south" }
            ]
          },
          { id: "ic2", label: "Infinite Corridor [W2]", section: "B", layer: "L0", x: 880, y: 760, edges: [{ to: "ic3", label: "east" }] },
          {
            id: "ic3",
            label: "Infinite Corridor [W3]",
            section: "B",
            layer: "L0",
            x: 1080,
            y: 760,
            edges: [
              { to: "ic4", label: "east" },
              { to: "gd", label: "up" },
              { to: "great_court", label: "south" }
            ]
          },
          {
            id: "ic4",
            label: "Infinite Corridor [W4]",
            section: "B",
            layer: "L0",
            x: 1280,
            y: 760,
            edges: [{ to: "ic5", label: "east" }]
          },
          {
            id: "ic5",
            label: "Infinite Corridor [W5]",
            section: "B",
            layer: "L0",
            x: 1480,
            y: 760,
            edges: [
              { to: "chem", label: "south" },
              { to: "fn", label: "north", type: "puzzle" }
            ]
          },
          { id: "aero_lobby", label: "Aero Lobby", section: "B", layer: "L0", x: 680, y: 660, edges: [{ to: "ic1", label: "south" }] },
          { id: "eng", label: "Engineering Building", section: "B", layer: "L0", x: 680, y: 860, edges: [{ to: "ic1", label: "north" }] },
          { id: "gd", label: "Great Dome", section: "B", layer: "L+1", x: 1080, y: 480, edges: [{ to: "td", label: "up" }] },
          { id: "td", label: "Top of Dome", section: "B", layer: "L+1", x: 1080, y: 390, edges: [{ to: "rgd", label: "up" }] },
          { id: "rgd", label: "Roof of Great Dome", section: "B", layer: "L+2", x: 1080, y: 180, edges: [{ to: "ogd", label: "up" }] },
          { id: "ogd", label: "On the Great Dome", section: "B", layer: "L+2", x: 1280, y: 180, edges: [{ to: "rgd", label: "down" }] },
          { id: "great_court", label: "Great Court", section: "B", layer: "L0", x: 1080, y: 860, edges: [] },
          { id: "chem", label: "Chemistry Building", section: "B", layer: "L0", x: 1480, y: 860, edges: [{ to: "alc", label: "south" }] },
          { id: "alc", label: "Dept. of Alchemy", section: "B", layer: "L0", x: 1480, y: 1000, edges: [{ to: "lab", label: "south" }] },
          {
            id: "lab",
            label: "Lab",
            section: "B",
            layer: "L0",
            x: 1480,
            y: 1140,
            edges: []
          },
          { id: "fn", label: "Fruits and Nuts", section: "B", layer: "L0", x: 1480, y: 670, edges: [{ to: "cp", label: "east" }] },
          { id: "cp", label: "Cluttered Passage", section: "R", layer: "L-1", x: 1940, y: 670, edges: [{ to: "brown_b", label: "southeast" }] },
          {
            id: "brown",
            label: "Brown Building",
            section: "R",
            layer: "L0",
            x: 1760,
            y: 860,
            edges: [
              { to: "brown_b", label: "down" },
              { to: "top_floor", label: "up" },
              { to: "small_court", label: "south" }
            ]
          },
          {
            id: "brown_b",
            label: "Brown Basement",
            section: "R",
            layer: "L-1",
            x: 1760,
            y: 1140,
            edges: [{ to: "cp", label: "northwest" }]
          },
          { id: "top_floor", label: "Top Floor", section: "R", layer: "L+1", x: 1760, y: 520, edges: [{ to: "sky_roof", label: "up" }] },
          { id: "sky_roof", label: "Skyscraper Roof", section: "R", layer: "L+2", x: 1760, y: 240, edges: [{ to: "inside_dome", label: "up" }] },
          { id: "inside_dome", label: "Inside Dome", section: "R", layer: "L+2", x: 1980, y: 240, edges: [] },
          { id: "small_court", label: "Small Courtyard", section: "R", layer: "L0", x: 1760, y: 980, edges: [] },

          // Section D
          {
            id: "muddy",
            label: "Muddy Tunnel",
            section: "D",
            layer: "L-2",
            x: 3660,
            y: 1460,
            edges: [
              { to: "tunnel_entry", label: "east" },
              { to: "large_chamber", label: "down" }
            ]
          },
          { id: "tunnel_entry", label: "Tunnel Entrance", section: "D", layer: "L-2", x: 3890, y: 1460, edges: [{ to: "steam1", label: "east" }] },
          {
            id: "steam1",
            label: "Steam Tunnel [S1]",
            section: "D",
            layer: "L-2",
            x: 4120,
            y: 1460,
            edges: [
              { to: "tunnel_entry", label: "west/puzzle", type: "puzzle" },
              { to: "steam2", label: "east" }
            ]
          },
          {
            id: "steam2",
            label: "Steam Tunnel [S2]",
            section: "D",
            layer: "L-2",
            x: 4180,
            y: 1460,
            edges: [
              { to: "steam1", label: "west" },
              { to: "steam3", label: "east" },
              { to: "tomb", label: "puzzle", type: "puzzle" }
            ]
          },
          { id: "steam3", label: "Steam Tunnel [S3]", section: "D", layer: "L-2", x: 4700, y: 1460, edges: [{ to: "steam4", label: "east" }] },
          { id: "steam4", label: "Steam Tunnel [S4]", section: "D", layer: "L-2", x: 5400, y: 1460, edges: [{ to: "steam5", label: "east" }] },
          {
            id: "steam5",
            label: "Steam Tunnel [S5]",
            section: "D",
            layer: "L-2",
            x: 6100,
            y: 1460,
            edges: [{ to: "concrete_box", label: "puzzle/down?", type: "puzzle" }]
          },
          { id: "concrete_box", label: "Concrete Box", section: "D", layer: "L-3", x: 5880, y: 1760, edges: [] },
          {
            id: "sub",
            label: "Subbasement",
            section: "D",
            layer: "L-2",
            x: 4260,
            y: 1360,
            edges: [
              { to: "stair", label: "up" },
              { to: "tomb", label: "northwest", type: "restricted" }
            ]
          },
          {
            id: "tomb",
            label: "Tomb",
            section: "D",
            layer: "L-2",
            x: 4180,
            y: 1260,
            edges: [
              { to: "sub", label: "southeast", type: "restricted" },
              { to: "steam2", label: "down/puzzle", type: "puzzle" }
            ]
          },
          {
            id: "large_chamber",
            label: "Large Chamber",
            section: "D",
            layer: "L-3",
            x: 3500,
            y: 1760,
            edges: [{ to: "wet1", label: "down" }]
          },
          { id: "inner_lair", label: "Inner Lair", section: "D", layer: "L-3", x: 4920, y: 2360, edges: [] },
          {
            id: "wet_lair_link",
            label: "Wet Tunnel [Outer]",
            section: "D",
            layer: "L-3",
            x: 4720,
            y: 2360,
            edges: [{ to: "inner_lair", label: "east" }]
          },

          // Section F
          { id: "wet1", label: "Wet Tunnel [Inset 1]", section: "F", layer: "L-3", x: 3500, y: 2160, edges: [{ to: "wet2", label: "passage" }] },
          {
            id: "wet2",
            label: "Wet Tunnel [Inset 2]",
            section: "F",
            layer: "L-3",
            x: 3750,
            y: 2160,
            edges: [
              { to: "wet3", label: "passage" },
              { to: "wet6", label: "passage" },
              { to: "wet7", label: "passage" },
              { to: "wet8", label: "passage" }
            ]
          },
          {
            id: "wet3",
            label: "Wet Tunnel [Inset 3]",
            section: "F",
            layer: "L-3",
            x: 4000,
            y: 2160,
            edges: [
              { to: "wet4", label: "passage" },
              { to: "wet7", label: "passage" }
            ]
          },
          { id: "wet4", label: "Wet Tunnel [Inset 4]", section: "F", layer: "L-3", x: 4250, y: 2160, edges: [{ to: "wet5", label: "passage" }] },
          {
            id: "wet5",
            label: "Wet Tunnel [Inset 5]",
            section: "F",
            layer: "L-3",
            x: 4500,
            y: 2160,
            edges: [
              { to: "wet11", label: "passage" },
              { to: "wet_lair_link", label: "down" }
            ]
          },
          {
            id: "wet6",
            label: "Wet Tunnel [Inset 6]",
            section: "F",
            layer: "L-3",
            x: 3750,
            y: 2340,
            edges: [
              { to: "wet8", label: "passage" },
              { to: "wet9", label: "puzzle", type: "puzzle" }
            ]
          },
          { id: "wet7", label: "Wet Tunnel [Inset 7]", section: "F", layer: "L-3", x: 4000, y: 2340, edges: [] },
          { id: "wet8", label: "Wet Tunnel [Inset 8]", section: "F", layer: "L-3", x: 3500, y: 2430, edges: [{ to: "wet9", label: "passage" }] },
          { id: "wet9", label: "Wet Tunnel [Inset 9]", section: "F", layer: "L-3", x: 3750, y: 2520, edges: [{ to: "wet11", label: "passage" }] },
          { id: "wet10", label: "Wet Tunnel [Inset 10]", section: "F", layer: "L-3", x: 4250, y: 2520, edges: [] },
          { id: "wet11", label: "Wet Tunnel [Inset 11]", section: "F", layer: "L-3", x: 4500, y: 2520, edges: [] },

          // Section E
          { id: "place", label: "Place", section: "E", layer: "L+2", x: 220, y: 120, edges: [{ to: "basalt", label: "down" }] },
          { id: "basalt", label: "Basalt Bowl [SFX]", section: "E", layer: "L+2", x: 220, y: 220, edges: [{ to: "platform", label: "down" }] },
          { id: "platform", label: "At Platform [SFX]", section: "E", layer: "L+2", x: 220, y: 320, edges: [] }
        ];

  const LOCATION_ID_BY_NODE_ID = {
        roof: 127,
        third: 110,
        elev_l2: 124,
        second: 137,
        kitchen: 33,
        terminal: 176,
        elev_l1: 124,
        computer: 65,
        smith1: 185,
        smith2: 98,
        temp_lab: 140,
        elev_l0: 124,
        aero_b: 158,
        base: 27,
        temp_b: 202,
        dead: 47,
        ancient: 171,
        elev_lm1: 124,
        stair: 35,
        brick: 25,
        reno: 201,
        cinder: 17,
        altar: 149,
        mass: 190,
        ic1: 218,
        ic2: 214,
        ic3: 210,
        ic4: 208,
        ic5: 206,
        aero_lobby: 136,
        eng: 38,
        gd: 249,
        td: 213,
        rgd: 121,
        ogd: 145,
        great_court: 180,
        chem: 248,
        alc: 174,
        lab: 42,
        fn: 150,
        cp: 179,
        brown: 240,
        brown_b: 200,
        top_floor: 195,
        sky_roof: 222,
        inside_dome: 109,
        small_court: 16,
        muddy: 39,
        tunnel_entry: 34,
        steam1: 66,
        steam2: 78,
        steam3: 138,
        steam4: 221,
        steam5: 227,
        concrete_box: 37,
        sub: 142,
        tomb: 9,
        large_chamber: 99,
        inner_lair: 69,
        wet_lair_link: 181,
        wet1: 187,
        wet2: 164,
        wet3: 15,
        wet4: 131,
        wet5: 234,
        wet6: 117,
        wet7: 87,
        wet8: 51,
        wet9: 232,
        wet10: 161,
        wet11: 184,
        place: 152,
        basalt: 134,
        platform: 21
      };

  const ROOM_LAYOUT = {
        // Dream inset
        place: { building: "central", layer: "L+2", tile: "D11" }, // [152] Place
        basalt: { building: "central", layer: "L+2", tile: "D10" }, // [134] Basalt Bowl
        platform: { building: "central", layer: "L+2", tile: "D9" }, // [21] At Platform

        // Central complex (L0 anchor at 210 = E7)
        mass: { building: "central", layer: "L0", tile: "E6" }, // [190] Mass. Ave.
        ic1: { building: "central", layer: "L0", tile: "F6" }, // [218] Infinite Corridor
        ic2: { building: "central", layer: "L0", tile: "G6" }, // [214] Infinite Corridor
        ic3: { building: "central", layer: "L0", tile: "H6" }, // [210] Infinite Corridor
        ic4: { building: "central", layer: "L0", tile: "I6" }, // [208] Infinite Corridor
        ic5: { building: "central", layer: "L0", tile: "J6" }, // [206] Infinite Corridor
        aero_lobby: { building: "central", layer: "L0", tile: "F7" }, // [136] Aero Lobby
        eng: { building: "central", layer: "L0", tile: "F5" }, // [38] Engineering Building
        gd: { building: "central", layer: "L+1", tile: "H6" }, // [249] Great Dome
        td: { building: "central", layer: "L+2", tile: "H6" }, // [213] Top of Dome
        rgd: { building: "central", layer: "L+3", tile: "H6" }, // [121] Roof of Great Dome
        ogd: { building: "central", layer: "L+4", tile: "H6" }, // [145] On the Great Dome
        great_court: { building: "central", layer: "L0", tile: "H5" }, // [180] Great Court
        chem: { building: "central", layer: "L0", tile: "J5" }, // [248] Chemistry Building
        alc: { building: "central", layer: "L0", tile: "J4" }, // [174] Department of Alchemy
        lab: { building: "central", layer: "L0", tile: "J3" }, // [42] Lab
        fn: { building: "central", layer: "L0", tile: "J7" }, // [150] Fruits and Nuts
        stair: { building: "central", layer: "L-1", tile: "F7" }, // [35] Stairway
        aero_b: { building: "central", layer: "L-1", tile: "G7" }, // [158] Aero Basement

        // Computer center building + Smith Street anchors
        smith1: { building: "computer", layer: "L0", tile: "H11" }, // [185] Smith Street
        smith2: { building: "computer", layer: "L0", tile: "K11" }, // [98] Smith Street
        computer: { building: "computer", layer: "L0", tile: "H9" }, // [65] Computer Center
        kitchen: { building: "computer", layer: "L+1", tile: "G9" }, // [33] Kitchen
        second: { building: "computer", layer: "L+1", tile: "H9" }, // [137] Second Floor
        third: { building: "computer", layer: "L+2", tile: "H9" }, // [110] Third Floor
        terminal: { building: "computer", layer: "L+1", tile: "H10" }, // [176] Terminal Room
        roof: { building: "computer", layer: "L+3", tile: "H9" }, // [127] Roof
        elev_l2: { building: "computer", layer: "L+2", tile: "H8" }, // [124] Elevator
        elev_l1: { building: "computer", layer: "L+1", tile: "H8" }, // [124] Elevator
        elev_l0: { building: "computer", layer: "L0", tile: "H8" }, // [124] Elevator
        base: { building: "computer", layer: "L-1", tile: "H9" }, // [27] Basement
        elev_lm1: { building: "computer", layer: "L-1", tile: "H8" }, // [124] Elevator

        // Temporary lab building
        temp_lab: { building: "temp", layer: "L0", tile: "K9" }, // [140] Temporary Lab
        temp_b: { building: "temp", layer: "L-1", tile: "K9" }, // [202] Temporary Basement
        dead: { building: "temp", layer: "L-1", tile: "L9" }, // [47] Dead Storage
        ancient: { building: "temp", layer: "L-1", tile: "M10" }, // [171] Ancient Storage

        // Brown building cluster
        cp: { building: "brown", layer: "L-1", tile: "M4" }, // [179] Cluttered Passage
        brown: { building: "brown", layer: "L0", tile: "N6" }, // [240] Brown Building
        small_court: { building: "brown", layer: "L0", tile: "N5" }, // [16] Small Courtyard
        brown_b: { building: "brown", layer: "L-1", tile: "N6" }, // [200] Brown Basement
        top_floor: { building: "brown", layer: "L+1", tile: "N6" }, // [195] Top Floor
        sky_roof: { building: "brown", layer: "L+2", tile: "N6" }, // [222] Skyscraper Roof
        inside_dome: { building: "brown", layer: "L+3", tile: "N6" }, // [109] Inside Dome

        // Steam / utility underground
        muddy: { building: "steam", layer: "L-3", tile: "B8" }, // [39] Muddy Tunnel
        tunnel_entry: { building: "steam", layer: "L-3", tile: "C8" }, // [34] Tunnel Entrance
        steam1: { building: "steam", layer: "L-3", tile: "D8" }, // [66] Steam Tunnel
        steam2: { building: "steam", layer: "L-3", tile: "E8" }, // [78] Steam Tunnel
        steam3: { building: "steam", layer: "L-3", tile: "F8" }, // [138] Steam Tunnel
        steam4: { building: "steam", layer: "L-3", tile: "G8" }, // [221] Steam Tunnel
        steam5: { building: "steam", layer: "L-3", tile: "H8" }, // [227] Steam Tunnel
        sub: { building: "steam", layer: "L-2", tile: "F7" }, // [142] Subbasement
        tomb: { building: "steam", layer: "L-2", tile: "E8" }, // [9] Tomb
        large_chamber: { building: "steam", layer: "L-4", tile: "B8" }, // [99] Large Chamber
        concrete_box: { building: "steam", layer: "L-4", tile: "H8" }, // [37] Concrete Box

        // Wet tunnel cluster
        wet1: { building: "wet", layer: "L-5", tile: "B8" }, // [187] Wet Tunnel
        wet2: { building: "wet", layer: "L-5", tile: "B7" }, // [164] Wet Tunnel
        wet3: { building: "wet", layer: "L-5", tile: "B6" }, // [15] Wet Tunnel
        wet4: { building: "wet", layer: "L-5", tile: "B5" }, // [131] Wet Tunnel
        wet5: { building: "wet", layer: "L-5", tile: "B4" }, // [234] Wet Tunnel
        wet6: { building: "wet", layer: "L-5", tile: "A7" }, // [117] Wet Tunnel
        wet7: { building: "wet", layer: "L-5", tile: "C7" }, // [87] Wet Tunnel
        wet8: { building: "wet", layer: "L-5", tile: "A6" }, // [51] Wet Tunnel
        wet9: { building: "wet", layer: "L-5", tile: "A5" }, // [232] Wet Tunnel
        wet10: { building: "wet", layer: "L-5", tile: "C5" }, // [161] Wet Tunnel
        wet11: { building: "wet", layer: "L-5", tile: "A4" }, // [184] Wet Tunnel
        wet_lair_link: { building: "wet", layer: "L-6", tile: "B4" }, // [181] Wet Tunnel
        inner_lair: { building: "wet", layer: "L-6", tile: "C4" }, // [69] Inner Lair

        // Brick/altar branch
        brick: { building: "brick", layer: "L-2", tile: "M10" }, // [25] Brick Tunnel
        reno: { building: "brick", layer: "L-2", tile: "M11" }, // [201] Renovated Cave
        cinder: { building: "brick", layer: "L-2", tile: "M9" }, // [17] Cinderblock Tunnel
        altar: { building: "brick", layer: "L-3", tile: "M11" } // [149] Before the Altar
      };

  function ensureRoomEdge(fromId, toId, label, type) {
    const room = MAP_ROOMS.find((r) => r.id === fromId);
    if (!room) return;
    if (!Array.isArray(room.edges)) room.edges = [];
    const exists = room.edges.some((e) => e && e.to === toId && String(e.label || "") === label);
    if (exists) return;
    const edge = { to: toId, label };
    if (type) edge.type = type;
    room.edges.push(edge);
  }

  // Normalize explicit up/down pairs so layout validation can assert reciprocity.
  // Wet-tunnel non-realistic links are handled via explicit test exceptions below.
  [
    ["third", "roof", "up"],
    ["second", "third", "up"],
    ["computer", "second", "up"],
    ["base", "computer", "up"],
    ["temp_lab", "temp_b", "down"],
    ["brick", "ancient", "up"],
    ["aero_lobby", "stair", "down"],
    ["altar", "reno", "up"],
    ["gd", "ic3", "down"],
    ["td", "gd", "down"],
    ["rgd", "td", "down"],
    ["brown_b", "brown", "up"],
    ["top_floor", "brown", "down"],
    ["sky_roof", "top_floor", "down"],
    ["inside_dome", "sky_roof", "down"],
    ["large_chamber", "muddy", "up"],
    ["concrete_box", "steam5", "up", "puzzle"],
    ["stair", "sub", "down"],
    ["steam2", "tomb", "up", "puzzle"],
    ["wet1", "large_chamber", "up"]
  ].forEach(([fromId, toId, label, type]) => ensureRoomEdge(fromId, toId, label, type));

  const VERTICAL_EDGE_TEST_EXCEPTIONS = {
    // Wet tunnel exceptions agreed during map refinement.
    // Keys are "fromId->toId" using canonical location ids.
    allowUnpairedUp: new Set([
      "181->51"
    ]),
    allowUnpairedDown: new Set([
      "234->181"
    ])
  };

  return {
    MAP_ROOMS,
    LOCATION_ID_BY_NODE_ID,
    ROOM_LAYOUT,
    VERTICAL_EDGE_TEST_EXCEPTIONS
  };
});
