(function (root) {
  "use strict";

  function normalizeDiscoveryState(state) {
    const input = state || {};
    const asStringSet = (values) => new Set((Array.isArray(values) ? values : []).map((value) => String(value)));
    const asNumberSet = (values) => new Set((Array.isArray(values) ? values : []).map((value) => Number(value)).filter((value) => Number.isFinite(value)));
    return {
      version: 1,
      currentRoomId: Number.isFinite(Number(input.currentRoomId)) ? Number(input.currentRoomId) : 0,
      currentNodeId: input.currentNodeId ? String(input.currentNodeId) : "",
      visitedNodeIds: asStringSet(input.visitedNodeIds),
      visitedRoomIds: asNumberSet(input.visitedRoomIds),
      knownLinks: Array.isArray(input.knownLinks) ? input.knownLinks.map(normalizeDiscoveryLink).filter(Boolean) : [],
      traversedLinks: Array.isArray(input.traversedLinks) ? input.traversedLinks.map(normalizeDiscoveryLink).filter(Boolean) : []
    };
  }

  function normalizeDiscoveryLink(link) {
    if (!link) return null;
    const fromNodeId = link.fromNodeId ? String(link.fromNodeId) : "";
    const toNodeId = link.toNodeId ? String(link.toNodeId) : "";
    if (!fromNodeId || !toNodeId) return null;
    return {
      fromNodeId,
      toNodeId,
      command: String(link.command || ""),
      type: String(link.type || ""),
      oneWay: !!link.oneWay
    };
  }

  function create(options) {
      const ROOM_W = 190;
      const ROOM_H = 56;
      const WORLD_W = 5900;
      const WORLD_H = 4200;
      const opts = options || {};
      const documentRef = opts.document || root.document;
      const LhMapData = opts.data || root.LhMapData;
      const mapSnowLayer = opts.mapSnowLayer || root.MapSnowLayer;
      const svg = opts.svg || (documentRef ? documentRef.getElementById("map") : null);
      const snowCanvas = opts.snowCanvas || (documentRef ? documentRef.getElementById("map-snow") : null);
      const snowLayer = opts.snowLayer || (mapSnowLayer && typeof mapSnowLayer.create === "function" && snowCanvas
        ? mapSnowLayer.create(snowCanvas)
        : { setEnabled() {}, setDensityMultiplier() {}, resize() {} });
      const externalFloorSelect = opts.floorSelect || null;
      if (!svg) throw new Error("LhMapRenderer requires an SVG element");
      if (!LhMapData) throw new Error("LhMapRenderer requires map data");
      let rendererMode = opts.mode === "ingame" ? "ingame" : "prototype";
      let discoveryState = normalizeDiscoveryState(opts.discoveryState);
      let legendParts = normalizeLegendParts(opts.legendParts);
      let viewport = null;
      let uiLayer = null;
      let legendLayer = null;
      let svgDefs = null;
      let buildingArtworkVisible = true;
      let tileGridVisible = false;
      let playerPingUntil = 0;
      let inGameFloorFilter = "";
      const PLAYER_ROOM_ID = "terminal";
      const panZoom = {
        scale: 0.42,
        tx: 20,
        ty: 20,
        minScale: 0.08,
        maxScale: 3.5,
        dragging: false,
        lastX: 0,
        lastY: 0,
        hasUserMoved: false,
        hasInitializedView: false
      };
      const floorDrag = {
        active: false,
        lastY: 0,
        carryY: 0
      };
      const FLOOR_DRAG_STEP_PX = 30;

      function getControl(id) {
        return documentRef ? documentRef.getElementById(id) : null;
      }

      function getFloorSelect() {
        return externalFloorSelect || getControl("floor-filter");
      }

      function getControlChecked(id, fallback) {
        const control = getControl(id);
        if (!control || typeof control.checked !== "boolean") return !!fallback;
        return !!control.checked;
      }

      function getControlValue(id, fallback) {
        const control = getControl(id);
        if (!control || control.value == null) return fallback;
        return control.value;
      }

      function addControlListener(id, type, handler, options) {
        const control = getControl(id);
        if (!control || typeof control.addEventListener !== "function") return;
        control.addEventListener(type, handler, options);
      }

      function currentPlayerNodeId() {
        if (rendererMode === "ingame") return discoveryState.currentNodeId || "";
        return PLAYER_ROOM_ID;
      }

      function currentPlayerLayer() {
        const layout = LhMapData.ROOM_LAYOUT[currentPlayerNodeId()];
        return layout && layout.layer ? layout.layer : "L0";
      }

      function currentMapLayer() {
        const floorSelect = getFloorSelect();
        if (rendererMode === "ingame") return inGameFloorFilter || (floorSelect && floorSelect.value) || currentPlayerLayer();
        return floorSelect && floorSelect.value ? floorSelect.value : getControlValue("floor-filter", "L0");
      }

      function setCurrentMapLayer(layerId) {
        const value = String(layerId || "L0");
        const floorSelect = getFloorSelect();
        if (rendererMode === "ingame") {
          inGameFloorFilter = value;
        }
        if (floorSelect && floorSelect.value !== value) {
          floorSelect.value = value;
        }
      }

      function isInGameMode() {
        return rendererMode === "ingame";
      }

      function normalizeLegendParts(parts) {
        const input = parts || {};
        return {
          main: input.main !== false,
          tile: input.tile !== false
        };
      }

      function shouldDrawMainLegend(showLegend) {
        return !!showLegend && legendParts.main;
      }

      function shouldDrawTileLegend(showLegend, showGrid) {
        return !!((showGrid || showLegend) && legendParts.tile);
      }

      function isRoomRevealed(room) {
        if (!isInGameMode()) return true;
        return !!room && discoveryState.visitedNodeIds.has(String(room.id));
      }

      function discoveryLinkKey(fromNodeId, toNodeId) {
        return String(fromNodeId || "") + "->" + String(toNodeId || "");
      }

      // Prototype model: room id + section + layer + x/y + edges.
      const MAP_MODEL = {
        sections: [
          { id: "C", label: "Section C - Main Interior + Basement" },
          { id: "B", label: "Section B - Upper Campus + Building Wings" },
          { id: "R", label: "Section R - Brown Building Cluster" },
          { id: "D", label: "Section D - Utility Underground" },
          { id: "F", label: "Section F - Wet Tunnels Inset" },
          { id: "E", label: "Section E - Dream Inset" },
          { id: "U", label: "Section U - Unknown Locations" }
        ],
        layers: [
          { id: "L+2", y: 40, h: 220 },
          { id: "L+1", y: 330, h: 220 },
          { id: "L0", y: 620, h: 260 },
          { id: "L-1", y: 950, h: 280 },
          { id: "L-2", y: 1300, h: 320 },
          { id: "L-3", y: 1690, h: 1220 }
        ],
        rooms: LhMapData.MAP_ROOMS.map((room) => ({ ...room, edges: (room.edges || []).map((edge) => ({ ...edge })) }))
      };

      const CANONICAL_LOCATIONS = [
        { id: 9, name: "Tomb" },
        { id: 15, name: "Wet Tunnel" },
        { id: 16, name: "Small Courtyard" },
        { id: 17, name: "Cinderblock Tunnel" },
        { id: 21, name: "At Platform" },
        { id: 25, name: "Brick Tunnel" },
        { id: 27, name: "Basement" },
        { id: 33, name: "Kitchen" },
        { id: 34, name: "Tunnel Entrance" },
        { id: 35, name: "Stairway" },
        { id: 37, name: "Concrete Box" },
        { id: 38, name: "Engineering Building" },
        { id: 39, name: "Muddy Tunnel" },
        { id: 42, name: "Lab" },
        { id: 47, name: "Dead Storage" },
        { id: 51, name: "Wet Tunnel" },
        { id: 65, name: "Computer Center" },
        { id: 66, name: "Steam Tunnel" },
        { id: 69, name: "Inner Lair" },
        { id: 78, name: "Steam Tunnel" },
        { id: 87, name: "Wet Tunnel" },
        { id: 98, name: "Smith Street" },
        { id: 99, name: "Large Chamber" },
        { id: 109, name: "Inside Dome" },
        { id: 110, name: "Third Floor" },
        { id: 117, name: "Wet Tunnel" },
        { id: 121, name: "Roof of Great Dome" },
        { id: 124, name: "Elevator" },
        { id: 127, name: "Roof" },
        { id: 131, name: "Wet Tunnel" },
        { id: 134, name: "Basalt Bowl" },
        { id: 136, name: "Aero Lobby" },
        { id: 137, name: "Second Floor" },
        { id: 138, name: "Steam Tunnel" },
        { id: 140, name: "Temporary Lab" },
        { id: 142, name: "Subbasement" },
        { id: 145, name: "On the Great Dome" },
        { id: 149, name: "Before the Altar" },
        { id: 150, name: "Fruits and Nuts" },
        { id: 152, name: "Place" },
        { id: 158, name: "Aero Basement" },
        { id: 161, name: "Wet Tunnel" },
        { id: 164, name: "Wet Tunnel" },
        { id: 171, name: "Ancient Storage" },
        { id: 174, name: "Department of Alchemy" },
        { id: 176, name: "Terminal Room" },
        { id: 179, name: "Cluttered Passage" },
        { id: 180, name: "Great Court" },
        { id: 181, name: "Wet Tunnel" },
        { id: 184, name: "Wet Tunnel" },
        { id: 185, name: "Smith Street" },
        { id: 187, name: "Wet Tunnel" },
        { id: 190, name: "Mass. Ave." },
        { id: 195, name: "Top Floor" },
        { id: 200, name: "Brown Basement" },
        { id: 201, name: "Renovated Cave" },
        { id: 202, name: "Temporary Basement" },
        { id: 206, name: "Infinite Corridor" },
        { id: 208, name: "Infinite Corridor" },
        { id: 210, name: "Infinite Corridor" },
        { id: 213, name: "Top of Dome" },
        { id: 214, name: "Infinite Corridor" },
        { id: 218, name: "Infinite Corridor" },
        { id: 221, name: "Steam Tunnel" },
        { id: 222, name: "Skyscraper Roof" },
        { id: 227, name: "Steam Tunnel" },
        { id: 232, name: "Wet Tunnel" },
        { id: 234, name: "Wet Tunnel" },
        { id: 240, name: "Brown Building" },
        { id: 248, name: "Chemistry Building" },
        { id: 249, name: "Great Dome" }
      ];

      const LOCATION_ID_BY_NODE_ID = { ...LhMapData.LOCATION_ID_BY_NODE_ID };

      // Wet-tunnel inset numbering is now mapped to concrete engine ids in this prototype.
      const PRESERVE_CUSTOM_LABEL_IDS = new Set([66, 78, 98, 138, 185, 206, 208, 210, 214, 218, 221, 227]);

      const CANONICAL_NAME_BY_ID = new Map(CANONICAL_LOCATIONS.map((location) => [location.id, location.name]));

      for (const room of MAP_MODEL.rooms) {
        const locationId = LOCATION_ID_BY_NODE_ID[room.id];
        if (typeof locationId === "number") {
          room.locationId = locationId;
          const canonicalName = CANONICAL_NAME_BY_ID.get(locationId);
          if (canonicalName && !PRESERVE_CUSTOM_LABEL_IDS.has(locationId)) {
            room.label = canonicalName;
          }
        }
      }

      // NOTE:
      // Unknown-location parking was removed for prototype-v2.
      // All map entities are now placed through explicit mapped room ids.

      // Align Subbasement (Section D) directly under Stairway and move linked lower sections with it.
      const sectionShiftX = {
        D: -3580,
        F: -3580,
        U: -3580
      };
      for (const room of MAP_MODEL.rooms) {
        const shiftX = sectionShiftX[room.section];
        if (typeof shiftX === "number") {
          room.x += shiftX;
        }
      }

      // Fine-tune wet-tunnel block placement independently from Section D anchors.
      const sectionFineTuneX = {
        F: -140,
        U: -140
      };
      for (const room of MAP_MODEL.rooms) {
        const shiftX = sectionFineTuneX[room.section];
        if (typeof shiftX === "number") {
          room.x += shiftX;
        }
      }

      // Expand vertical layer space with extra headroom for L+1 so the upper interior stack can breathe.
      const LAYER_STRETCH_FACTOR = {
        "L+2": 1.5,
        "L+1": 2.0,
        L0: 1.5,
        "L-1": 1.5,
        "L-2": 1.5
      };
      const oldLayerById = new Map(
        MAP_MODEL.layers.map((layer) => [
          layer.id,
          {
            y: layer.y,
            h: layer.h
          }
        ])
      );
      const layerGap = 70;
      let nextLayerY = MAP_MODEL.layers[0].y;
      for (const layer of MAP_MODEL.layers) {
        const old = oldLayerById.get(layer.id);
        if (!old) continue;
        layer.y = nextLayerY;
        const factor = LAYER_STRETCH_FACTOR[layer.id];
        layer.h = typeof factor === "number" ? Math.round(old.h * factor) : old.h;
        nextLayerY += layer.h + layerGap;
      }
      const newLayerById = new Map(
        MAP_MODEL.layers.map((layer) => [
          layer.id,
          {
            y: layer.y,
            h: layer.h
          }
        ])
      );
      for (const room of MAP_MODEL.rooms) {
        // Keep unknown-location parking grid fixed for manual triage.
        if (room.section === "U") continue;
        const oldLayer = oldLayerById.get(room.layer);
        const newLayer = newLayerById.get(room.layer);
        if (!oldLayer || !newLayer) continue;
        const ratio = (room.y - oldLayer.y) / oldLayer.h;
        room.y = newLayer.y + ratio * newLayer.h;
      }

      // Keep Terminal Room visually higher in the expanded L+1 band.
      const secondFloor = MAP_MODEL.rooms.find((room) => room.id === "second");
      const thirdFloor = MAP_MODEL.rooms.find((room) => room.id === "third");
      const terminalRoom = MAP_MODEL.rooms.find((room) => room.id === "terminal");
      const upperElevator = MAP_MODEL.rooms.find((room) => room.id === "elev_l2");
      if (secondFloor && thirdFloor && terminalRoom) {
        // Keep the core L+1 stack readable: terminal above third above second.
        thirdFloor.y = secondFloor.y - 190;
        terminalRoom.y = thirdFloor.y - 120;
      }
      if (thirdFloor && upperElevator) {
        // Keep elevator entry visually tied to third-floor level.
        upperElevator.y = thirdFloor.y + 45;
      }

      // Shift all elevator rooms one room to the right, and everything to their right with them.
      const ELEVATOR_SHIFT_X = ROOM_W + 30;
      const elevatorRoomIds = new Set(["elev_l2", "elev_l1", "elev_l0", "elev_lm1"]);
      const elevatorRooms = MAP_MODEL.rooms.filter((room) => elevatorRoomIds.has(room.id));
      const elevatorCutoffX =
        elevatorRooms.length > 0 ? Math.min(...elevatorRooms.map((room) => room.x)) : Number.POSITIVE_INFINITY;
      for (const room of MAP_MODEL.rooms) {
        if (room.section === "U") continue;
        if (room.x >= elevatorCutoffX) {
          room.x += ELEVATOR_SHIFT_X;
        }
      }

      // Final targeted adjustment:
      // move only 39/34/66 and the wet-tunnel node reached from 99 down.
      // Keep 34 exactly above 99, keep wet1 exactly below 99, and place 39/66 with fixed offsets.
      const muddyTunnel = MAP_MODEL.rooms.find((room) => room.id === "muddy");
      const tunnelEntrance = MAP_MODEL.rooms.find((room) => room.id === "tunnel_entry");
      const steamS1 = MAP_MODEL.rooms.find((room) => room.id === "steam1");
      const largeChamber = MAP_MODEL.rooms.find((room) => room.id === "large_chamber");
      const wetTunnel1 = MAP_MODEL.rooms.find((room) => room.id === "wet1");
      if (muddyTunnel && tunnelEntrance && steamS1 && largeChamber && wetTunnel1) {
        const neighborOffset = Math.round(ROOM_W * 0.6);
        tunnelEntrance.x = largeChamber.x;
        wetTunnel1.x = largeChamber.x;
        muddyTunnel.x = tunnelEntrance.x - neighborOffset;
        steamS1.x = tunnelEntrance.x + neighborOffset;
      }

      // Final deterministic room positions per room id.
      // This is the single source of truth for prototype calibration and avoids chained side-effects.
      const DETERMINISTIC_ROOM_POSITIONS = {
        aero_b: { x: 1080, y: 1605 },
        aero_lobby: { x: 680, y: 1010 },
        alc: { x: 1480, y: 1485 },
        altar: { x: 3350, y: 2140 },
        ancient: { x: 3590, y: 1605 },
        basalt: { x: 220, y: 310 },
        base: { x: 2740, y: 1605 },
        brick: { x: 3590, y: 2140 },
        brown: { x: 1760, y: 1310 },
        brown_b: { x: 1760, y: 1695 },
        chem: { x: 1480, y: 1310 },
        cinder: { x: 3590, y: 2305 },
        computer: { x: 2740, y: 1160 },
        concrete_box: { x: 2520, y: 2520 },
        cp: { x: 1940, y: 1025 },
        dead: { x: 3320, y: 1605 },
        elev_l0: { x: 2520, y: 1250 },
        elev_l1: { x: 2520, y: 900 },
        elev_l2: { x: 2520, y: 635 },
        elev_lm1: { x: 2520, y: 1740 },
        eng: { x: 680, y: 1310 },
        fn: { x: 1480, y: 1025 },
        gd: { x: 1080, y: 740 },
        great_court: { x: 1080, y: 1310 },
        ic1: { x: 680, y: 1160 },
        ic2: { x: 880, y: 1160 },
        ic3: { x: 1080, y: 1160 },
        ic4: { x: 1280, y: 1160 },
        ic5: { x: 1480, y: 1160 },
        inner_lair: { x: 1340, y: 3120 },
        inside_dome: { x: 1980, y: 340 },
        kitchen: { x: 2240, y: 780 },
        lab: { x: 1480, y: 1695 },
        large_chamber: { x: -270, y: 2520 },
        mass: { x: 480, y: 1160 },
        muddy: { x: -270, y: 2140 },
        ogd: { x: 1280, y: 250 },
        place: { x: 220, y: 160 },
        platform: { x: 220, y: 460 },
        reno: { x: 3590, y: 1990 },
        rgd: { x: 1080, y: 250 },
        roof: { x: 2740, y: 205 },
        second: { x: 2740, y: 780 },
        sky_roof: { x: 1760, y: 340 },
        small_court: { x: 1760, y: 1490 },
        smith1: { x: 2740, y: 1025 },
        smith2: { x: 3060, y: 1025 },
        stair: { x: 680, y: 1605 },
        steam1: { x: 290, y: 2140 },
        steam2: { x: 600, y: 2140 },
        steam3: { x: 1120, y: 2140 },
        steam4: { x: 1820, y: 2140 },
        steam5: { x: 2740, y: 2140 },
        sub: { x: 680, y: 1990 },
        td: { x: 1080, y: 560 },
        temp_b: { x: 3060, y: 1605 },
        temp_lab: { x: 3060, y: 1250 },
        terminal: { x: 2740, y: 470 },
        third: { x: 2740, y: 590 },
        tomb: { x: 600, y: 1840 },
        top_floor: { x: 1760, y: 820 },
        tunnel_entry: { x: 0, y: 2140 },
        wet_lair_link: { x: 1140, y: 3120 },
        wet1: { x: -270, y: 2920 },
        wet10: { x: 530, y: 3280 },
        wet11: { x: 780, y: 3280 },
        wet2: { x: 30, y: 2920 },
        wet3: { x: 280, y: 2920 },
        wet4: { x: 530, y: 2920 },
        wet5: { x: 780, y: 2920 },
        wet6: { x: 30, y: 3100 },
        wet7: { x: 280, y: 3100 },
        wet8: { x: -220, y: 3190 },
        wet9: { x: 30, y: 3280 }
      };
      for (const room of MAP_MODEL.rooms) {
        const fixed = DETERMINISTIC_ROOM_POSITIONS[room.id];
        if (fixed) {
          room.x = fixed.x;
          room.y = fixed.y;
        }
      }

      // Global horizontal realignment:
      // shift map content right relative to the layer bands;
      // keep Dream inset shifted less than the main map for readability.
      const FINAL_SECTION_SHIFT_X = {
        B: 360,
        C: 360,
        D: 360,
        F: 360,
        R: 360,
        U: 360,
        E: 220
      };
      for (const room of MAP_MODEL.rooms) {
        const shiftX = FINAL_SECTION_SHIFT_X[room.section];
        if (typeof shiftX === "number") {
          room.x += shiftX;
        }
      }

      const roomById = new Map(MAP_MODEL.rooms.map((room) => [room.id, room]));
      const layerIds = new Set(MAP_MODEL.layers.map((layer) => layer.id));
      const sectionIds = new Set(MAP_MODEL.sections.map((section) => section.id));

      for (const room of MAP_MODEL.rooms) {
        if (!layerIds.has(room.layer)) {
          throw new Error("Unknown layer '" + room.layer + "' for room '" + room.id + "'.");
        }
        if (!sectionIds.has(room.section)) {
          throw new Error("Unknown section '" + room.section + "' for room '" + room.id + "'.");
        }
        for (const edge of room.edges) {
          if (!roomById.has(edge.to)) {
            throw new Error("Unknown room id in edge " + room.id + " -> " + edge.to + ".");
          }
        }
      }

      function add(tag, attrs, text, target) {
        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, String(v)));
        if (text != null) el.textContent = text;
        (target || viewport || svg).appendChild(el);
        return el;
      }

      function hashString32(input) {
        let h = 2166136261 >>> 0;
        const s = String(input || "");
        for (let i = 0; i < s.length; i += 1) {
          h ^= s.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      }

      function createSeededRandom(seedInput) {
        let seed = (Number(seedInput) || 0) >>> 0;
        return () => {
          seed = (seed + 0x6d2b79f5) >>> 0;
          let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
          t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }

      function polygonSignedArea(points) {
        if (!Array.isArray(points) || points.length < 3) return 0;
        let area2 = 0;
        for (let i = 0; i < points.length; i += 1) {
          const a = points[i];
          const b = points[(i + 1) % points.length];
          area2 += a.x * b.y - b.x * a.y;
        }
        return area2 * 0.5;
      }

      function lineIntersectionInfinite(a, b, c, d) {
        const r = { x: b.x - a.x, y: b.y - a.y };
        const s = { x: d.x - c.x, y: d.y - c.y };
        const denom = r.x * s.y - r.y * s.x;
        if (Math.abs(denom) < 1e-6) return null;
        const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denom;
        return { x: a.x + t * r.x, y: a.y + t * r.y };
      }

      function intersectConvexPolygons(subjectPoly, clipPoly) {
        if (!Array.isArray(subjectPoly) || !Array.isArray(clipPoly) || subjectPoly.length < 3 || clipPoly.length < 3) {
          return [];
        }
        let outputList = subjectPoly.slice();
        const clipOrientation = polygonSignedArea(clipPoly);
        const isInside = (p, a, b) => {
          const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
          return clipOrientation >= 0 ? cross >= -1e-6 : cross <= 1e-6;
        };

        for (let i = 0; i < clipPoly.length; i += 1) {
          const cp1 = clipPoly[i];
          const cp2 = clipPoly[(i + 1) % clipPoly.length];
          const inputList = outputList.slice();
          outputList = [];
          if (!inputList.length) break;
          let s = inputList[inputList.length - 1];
          for (const e of inputList) {
            const eInside = isInside(e, cp1, cp2);
            const sInside = isInside(s, cp1, cp2);
            if (eInside) {
              if (!sInside) {
                const hit = lineIntersectionInfinite(s, e, cp1, cp2);
                if (hit) outputList.push(hit);
              }
              outputList.push(e);
            } else if (sInside) {
              const hit = lineIntersectionInfinite(s, e, cp1, cp2);
              if (hit) outputList.push(hit);
            }
            s = e;
          }
        }
        return outputList;
      }

      function drawRoadJunctionPatch(roadPolygons, roadOpacityScale) {
        const smith = roadPolygons && roadPolygons.smith;
        const mass = roadPolygons && roadPolygons.mass;
        if (!smith || !mass) return;
        const overlap = intersectConvexPolygons(smith, mass);
        if (!overlap || overlap.length < 3) return;
        const points = overlap.map((p) => p.x + "," + p.y).join(" ");
        const opacity = Math.max(0.2, Math.min(1, roadOpacityScale || 1));
        const junctionBaseOpacity = Math.max(0.12, 0.22 * opacity);
        add("polygon", { class: "campus-road-junction", points, style: "opacity:" + junctionBaseOpacity.toFixed(3) + ";" });
        add("polygon", {
          class: "campus-road-junction-grain",
          points,
          style: "opacity:" + Math.max(0.08, 0.16 * opacity).toFixed(3) + ";"
        });

        if (svgDefs) {
          const vA = { x: smith[1].x - smith[0].x, y: smith[1].y - smith[0].y };
          const vB = { x: smith[3].x - smith[0].x, y: smith[3].y - smith[0].y };
          const lenA = Math.hypot(vA.x, vA.y) || 1;
          const lenB = Math.hypot(vB.x, vB.y) || 1;
          const along = lenA >= lenB ? vA : vB;
          const shortLen = Math.min(lenA, lenB);
          const roadAngleDeg = (Math.atan2(along.y, along.x) * 180) / Math.PI;
          const center = overlap.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
          center.x /= overlap.length;
          center.y /= overlap.length;

          const srcW = 2307;
          const srcH = 240;
          const texScale = 1.7;
          const texW = srcW * texScale;
          const texH = shortLen * 0.9;
          const seed = hashString32("junction:smith-mass");
          const phaseX = (seed % 997) * 0.37;
          const patternId = "road-junction-pattern-" + seed.toString(16);

          const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
          pattern.setAttribute("id", patternId);
          pattern.setAttribute("patternUnits", "userSpaceOnUse");
          pattern.setAttribute("x", (center.x - texW * 0.5 - phaseX).toFixed(2));
          pattern.setAttribute("y", (center.y - texH * 0.5).toFixed(2));
          pattern.setAttribute("width", texW.toFixed(2));
          pattern.setAttribute("height", texH.toFixed(2));
          pattern.setAttribute(
            "patternTransform",
            "rotate(" + roadAngleDeg.toFixed(2) + " " + center.x.toFixed(2) + " " + center.y.toFixed(2) + ")"
          );
          const patternImage = document.createElementNS("http://www.w3.org/2000/svg", "image");
          patternImage.setAttribute("href", "assets/gfx/maps/texture_road_3.png");
          patternImage.setAttribute("x", "0");
          patternImage.setAttribute("y", "0");
          patternImage.setAttribute("width", texW.toFixed(2));
          patternImage.setAttribute("height", (srcH * (texH / 240)).toFixed(2));
          patternImage.setAttribute("preserveAspectRatio", "none");
          pattern.appendChild(patternImage);
          svgDefs.appendChild(pattern);

          add("polygon", {
            class: "campus-road-photo-texture",
            points,
            fill: "url(#" + patternId + ")",
            style: "opacity:" + Math.max(0.12, 0.24 * opacity).toFixed(3) + ";"
          });
        }
      }

      function drawStyledRoadBlock(block, pts, roadOpacityScale) {
        if (!pts || pts.length !== 4) return;
        const p0 = pts[0];
        const p1 = pts[1];
        const p2 = pts[2];
        const p3 = pts[3];
        const vec = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
        const len = (v) => Math.hypot(v.x, v.y) || 1;
        const norm = (v) => {
          const d = len(v);
          return { x: v.x / d, y: v.y / d };
        };
        const addv = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
        const mul = (v, s) => ({ x: v.x * s, y: v.y * s });
        const midpoint = (a, b) => ({ x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 });

        const vA = vec(p0, p1);
        const vB = vec(p0, p3);
        const lenA = len(vA);
        const lenB = len(vB);
        const alongA = lenA >= lenB;
        const axisVec = alongA ? vA : vB;
        const crossVec = alongA ? vB : vA;
        const u = norm(axisVec);
        const n = norm(crossVec);
        const longLen = Math.max(lenA, lenB);
        const shortLen = Math.min(lenA, lenB);
        const extendLen = Math.max(90, Math.min(260, longLen * 0.1));
        const ext = mul(u, extendLen);

        // Extend road geometry slightly so ends can fade into the distance.
        const rp0 = alongA ? addv(p0, mul(ext, -1)) : addv(p0, mul(ext, -1));
        const rp1 = alongA ? addv(p1, ext) : addv(p1, mul(ext, -1));
        const rp2 = alongA ? addv(p2, ext) : addv(p2, ext);
        const rp3 = alongA ? addv(p3, mul(ext, -1)) : addv(p3, ext);

        const center = {
          x: (rp0.x + rp1.x + rp2.x + rp3.x) * 0.25,
          y: (rp0.y + rp1.y + rp2.y + rp3.y) * 0.25
        };

        const sideA0 = alongA ? rp0 : rp0;
        const sideA1 = alongA ? rp1 : rp3;
        const sideB0 = alongA ? rp3 : rp1;
        const sideB1 = alongA ? rp2 : rp2;
        const centerStart = alongA ? midpoint(rp0, rp3) : midpoint(rp0, rp1);
        const centerEnd = alongA ? midpoint(rp1, rp2) : midpoint(rp3, rp2);
        const seed = hashString32("road:" + String(block.id || ""));
        const rnd = createSeededRandom(seed);
        const points = [rp0, rp1, rp2, rp3].map((p) => p.x + "," + p.y).join(" ");

        const opacity = Math.max(0.28, Math.min(1, roadOpacityScale || 1));
        let fadeMaskRef = null;
        if (svgDefs) {
          const gradientId = "road-fade-grad-" + String(block.id || "road") + "-" + seed.toString(16);
          const maskId = "road-fade-mask-" + String(block.id || "road") + "-" + seed.toString(16);
          const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
          grad.setAttribute("id", gradientId);
          grad.setAttribute("gradientUnits", "userSpaceOnUse");
          grad.setAttribute("x1", centerStart.x.toFixed(2));
          grad.setAttribute("y1", centerStart.y.toFixed(2));
          grad.setAttribute("x2", centerEnd.x.toFixed(2));
          grad.setAttribute("y2", centerEnd.y.toFixed(2));
          const mkStop = (offset, color, opacityVal) => {
            const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop.setAttribute("offset", offset);
            stop.setAttribute("stop-color", color);
            stop.setAttribute("stop-opacity", opacityVal);
            grad.appendChild(stop);
          };
          mkStop("0%", "#ffffff", "0");
          mkStop("12%", "#ffffff", "1");
          mkStop("88%", "#ffffff", "1");
          mkStop("100%", "#ffffff", "0");
          svgDefs.appendChild(grad);

          const mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
          mask.setAttribute("id", maskId);
          const maskPoly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
          maskPoly.setAttribute("points", points);
          maskPoly.setAttribute("fill", "url(#" + gradientId + ")");
          mask.appendChild(maskPoly);
          svgDefs.appendChild(mask);
          fadeMaskRef = "url(#" + maskId + ")";
        }
        const roadGroup = add("g", {
          class: "campus-road-styled",
          "data-road-id": String(block.id || ""),
          style: "opacity:" + opacity.toFixed(3) + ";"
        });
        if (fadeMaskRef) {
          roadGroup.setAttribute("mask", fadeMaskRef);
        }
        add("polygon", { class: "campus-road-base", points }, null, roadGroup);
        if (svgDefs) {
          const patternId = "road-texture-pattern-" + String(block.id || "road") + "-" + seed.toString(16);
          const roadAngleDeg = (Math.atan2(u.y, u.x) * 180) / Math.PI;
          const texScale = 1.7;
          // Use only the central asphalt strip from the source texture so
          // source-side road edges/markings don't fight our vector road edges.
          const srcW = 2307;
          const srcH = 240;
          const cropTopPx = 0;
          const cropHeightPx = 240;
          const texW = srcW * texScale;
          const texH = shortLen * 0.9;
          const phaseX = (seed % 997) * 0.37;

          const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
          pattern.setAttribute("id", patternId);
          pattern.setAttribute("patternUnits", "userSpaceOnUse");
          pattern.setAttribute("x", (center.x - texW * 0.5 - phaseX).toFixed(2));
          pattern.setAttribute("y", (center.y - texH * 0.5).toFixed(2));
          pattern.setAttribute("width", texW.toFixed(2));
          pattern.setAttribute("height", texH.toFixed(2));
          pattern.setAttribute(
            "patternTransform",
            "rotate(" + roadAngleDeg.toFixed(2) + " " + center.x.toFixed(2) + " " + center.y.toFixed(2) + ")"
          );
          const patternImage = document.createElementNS("http://www.w3.org/2000/svg", "image");
          patternImage.setAttribute("href", "assets/gfx/maps/texture_road_3.png");
          patternImage.setAttribute("x", "0");
          patternImage.setAttribute("y", (-cropTopPx * (texH / cropHeightPx)).toFixed(2));
          patternImage.setAttribute("width", texW.toFixed(2));
          patternImage.setAttribute("height", (srcH * (texH / cropHeightPx)).toFixed(2));
          patternImage.setAttribute("preserveAspectRatio", "none");
          pattern.appendChild(patternImage);
          svgDefs.appendChild(pattern);

          add("polygon", { class: "campus-road-photo-texture", points, fill: "url(#" + patternId + ")" }, null, roadGroup);
        }
        add("polygon", { class: "campus-road-grain", points }, null, roadGroup);

        const halfLong = longLen * 0.5;
        const halfShort = shortLen * 0.5;
        const scratchCount = Math.max(12, Math.round(longLen / 22));
        const longMargin = Math.max(20, longLen * 0.065);
        const shortMargin = Math.max(7, shortLen * 0.18);

        for (let i = 0; i < scratchCount; i += 1) {
          const along = (rnd() * 2 - 1) * Math.max(8, halfLong - longMargin);
          const across = (rnd() * 2 - 1) * Math.max(2, halfShort - shortMargin);
          const segmentLen = 10 + rnd() * 30;
          const normalJitter = (rnd() * 2 - 1) * 1.4;
          const base = addv(addv(center, mul(u, along)), mul(n, across));
          const s0 = addv(addv(base, mul(u, -segmentLen * 0.5)), mul(n, normalJitter));
          const s1 = addv(addv(base, mul(u, segmentLen * 0.5)), mul(n, normalJitter));
          const alpha = 0.08 + rnd() * 0.12;
          add(
            "line",
            {
              class: "campus-road-scratch-line",
              x1: s0.x.toFixed(2),
              y1: s0.y.toFixed(2),
              x2: s1.x.toFixed(2),
              y2: s1.y.toFixed(2),
              style: "stroke-opacity:" + alpha.toFixed(3) + ";"
            },
            null,
            roadGroup
          );
        }

        // SVG road side-edge strokes disabled for texture evaluation pass.

        // SVG centerline disabled for texture-evaluation pass.
      }

      const CAMPUS_BLOCKS = [
        // Every block is defined by inclusive tile bounds:
        // top-left (tl) and bottom-right (br), using grid coordinates (c/rank).
        // A1 is bottom-left.
        { id: "mass", type: "road-v", label: "Mass. Ave.", bounds: { tl: { c: 3, rank: 11 }, br: { c: 3, rank: 1 } } },
        { id: "smith", type: "road-h", label: "Smith Street", bounds: { tl: { c: 3, rank: 11 }, br: { c: 16, rank: 11 } } },
        { id: "computer", type: "building", label: "Computer Center", sub: "start area", bounds: { tl: { c: 6, rank: 10 }, br: { c: 8, rank: 8 } } },
        { id: "temp", type: "building", label: "Temporary Lab", sub: "separate wing", bounds: { tl: { c: 9, rank: 9 }, br: { c: 10, rank: 9 } } },
        {
          id: "central",
          type: "building-central",
          label: "Central Complex",
          sub: "Great Dome + Aero + Engineering + Chemistry",
          bounds: { tl: { c: 5, rank: 6 }, br: { c: 9, rank: 2 } }
        },
        { id: "brown", type: "building", label: "Brown Building", sub: "18-floor skyscraper", bounds: { tl: { c: 13, rank: 5 }, br: { c: 13, rank: 5 } } },
        // Hidden placement zones for underground grouping.
        { id: "steam", type: "placement-zone", hidden: true, bounds: { tl: { c: 4, rank: 3 }, br: { c: 10, rank: 2 } } },
        { id: "wet", type: "placement-zone", hidden: true, bounds: { tl: { c: 4, rank: 1 }, br: { c: 10, rank: 1 } } },
        { id: "brick", type: "placement-zone", hidden: true, bounds: { tl: { c: 9, rank: 9 }, br: { c: 11, rank: 8 } } }
      ];

      // Booklet-inspired placement grid:
      // - orthogonal cardinals as the primary placement axis
      // - diagonals as combined horizontal/vertical tile deltas
      // - up/down as level deltas (separate from planar compass movement)
      const TILE_GRID = {
        originX: 1120,
        originY: 500,
        cellW: 220,
        axisStep: 180,
        northTiltFromVerticalDeg: 30,
        levelY: 260,
        cols: 17,
        rows: 11
      };

      // Keep road spans tied to current grid dimensions.
      // - Vertical road: full rank span (1..rows)
      // - Horizontal road: full file span (A..last column)
      const massRoad = CAMPUS_BLOCKS.find((b) => b.id === "mass");
      if (massRoad) {
        massRoad.bounds = { tl: { c: 3, rank: TILE_GRID.rows }, br: { c: 3, rank: 1 } };
      }
      const smithRoad = CAMPUS_BLOCKS.find((b) => b.id === "smith");
      if (smithRoad) {
        smithRoad.bounds = { tl: { c: 3, rank: 11 }, br: { c: TILE_GRID.cols - 1, rank: 11 } };
      }

      const northTiltRad = (TILE_GRID.northTiltFromVerticalDeg * Math.PI) / 180;
      const axisDx = Math.sin(northTiltRad) * TILE_GRID.axisStep;
      const axisDy = Math.cos(northTiltRad) * TILE_GRID.axisStep;

      // Parallelogram tile basis:
      // - E axis: horizontal tile top/bottom
      // - S axis: down-right vector so side edges go up-left (booklet-like)
      const ISO_BASIS_E = { dx: TILE_GRID.cellW, dy: 0 };
      const ISO_BASIS_S = { dx: axisDx, dy: axisDy };

      // Half-tile free space on each side of every tile.
      // Effective center-to-center spacing becomes exactly one full tile in both basis directions.
      const TILE_GUTTER_SIDE = 0.5;
      const TILE_STEP_FACTOR = 1 + TILE_GUTTER_SIDE * 2;
      const STEP_E = {
        dx: ISO_BASIS_E.dx * TILE_STEP_FACTOR,
        dy: ISO_BASIS_E.dy * TILE_STEP_FACTOR
      };
      const STEP_S = {
        dx: ISO_BASIS_S.dx * TILE_STEP_FACTOR,
        dy: ISO_BASIS_S.dy * TILE_STEP_FACTOR
      };

      // Compass is derived from the same isometric lattice vectors as the grid.
      // This keeps direction arrows and tile placement orientation perfectly aligned.
      const COMPASS_SCALE = 1.1;
      const N_BASE = { dx: -ISO_BASIS_S.dx * COMPASS_SCALE, dy: -ISO_BASIS_S.dy * COMPASS_SCALE };
      const E_BASE = { dx: ISO_BASIS_E.dx * COMPASS_SCALE, dy: ISO_BASIS_E.dy * COMPASS_SCALE };

      const DIRECTION_VECTORS = {
        N: { dx: N_BASE.dx, dy: N_BASE.dy },
        S: { dx: -N_BASE.dx, dy: -N_BASE.dy },
        E: { dx: E_BASE.dx, dy: E_BASE.dy },
        W: { dx: -E_BASE.dx, dy: -E_BASE.dy },
        NE: { dx: (N_BASE.dx + E_BASE.dx) * 0.72, dy: (N_BASE.dy + E_BASE.dy) * 0.72 },
        SE: { dx: (-N_BASE.dx + E_BASE.dx) * 0.72, dy: (-N_BASE.dy + E_BASE.dy) * 0.72 },
        SW: { dx: (-N_BASE.dx - E_BASE.dx) * 0.72, dy: (-N_BASE.dy - E_BASE.dy) * 0.72 },
        NW: { dx: (N_BASE.dx - E_BASE.dx) * 0.72, dy: (N_BASE.dy - E_BASE.dy) * 0.72 },
        UP: { dx: 0, dy: -TILE_GRID.levelY },
        DOWN: { dx: 0, dy: TILE_GRID.levelY }
      };

      function anchorAtTile(c, rank) {
        const r = TILE_GRID.rows - rank;
        return {
          x: TILE_GRID.originX + c * STEP_E.dx + r * STEP_S.dx,
          y: TILE_GRID.originY + c * STEP_E.dy + r * STEP_S.dy
        };
      }

      function gridAnchor(c, rFromTop) {
        return {
          x: TILE_GRID.originX + c * STEP_E.dx + rFromTop * STEP_S.dx,
          y: TILE_GRID.originY + c * STEP_E.dy + rFromTop * STEP_S.dy
        };
      }

      function tileLegendFrame() {
        const gridCorners = [
          gridAnchor(0, 0),
          gridAnchor(TILE_GRID.cols, 0),
          gridAnchor(0, TILE_GRID.rows),
          gridAnchor(TILE_GRID.cols, TILE_GRID.rows)
        ];
        const gridMinX = Math.min(...gridCorners.map((p) => p.x));
        const a1Anchor = anchorAtTile(0, 1);
        const a1P1 = { x: a1Anchor.x + ISO_BASIS_E.dx, y: a1Anchor.y + ISO_BASIS_E.dy };
        const a1P3 = { x: a1Anchor.x + ISO_BASIS_S.dx, y: a1Anchor.y + ISO_BASIS_S.dy };
        const a1P2 = { x: a1P1.x + ISO_BASIS_S.dx, y: a1P1.y + ISO_BASIS_S.dy };
        const a1BottomY = Math.max(a1Anchor.y, a1P1.y, a1P2.y, a1P3.y);

        const w = 1170;
        const h = 520;
        const x = Math.max(30, gridMinX - 120);
        const y = a1BottomY - h;
        return { x, y, w, h };
      }

      function colToLetters(index) {
        let n = index + 1;
        let s = "";
        while (n > 0) {
          const rem = (n - 1) % 26;
          s = String.fromCharCode(65 + rem) + s;
          n = Math.floor((n - 1) / 26);
        }
        return s;
      }

      function lettersToCol(letters) {
        let n = 0;
        const s = String(letters || "").toUpperCase();
        for (let i = 0; i < s.length; i += 1) {
          const code = s.charCodeAt(i);
          if (code < 65 || code > 90) continue;
          n = n * 26 + (code - 64);
        }
        return Math.max(0, n - 1);
      }

      function parseTileLabel(tileLabel) {
        const m = /^([A-Za-z]+)(\d+)$/.exec(String(tileLabel || "").trim());
        if (!m) return null;
        const c = lettersToCol(m[1]);
        const rank = Number(m[2]);
        if (!Number.isFinite(rank)) return null;
        return { c, rank };
      }

      function tileCenter(c, rank) {
        const p0 = anchorAtTile(c, rank);
        return {
          x: p0.x + (ISO_BASIS_E.dx + ISO_BASIS_S.dx) * 0.5,
          y: p0.y + (ISO_BASIS_E.dy + ISO_BASIS_S.dy) * 0.5
        };
      }

      function tileCorners(c, rank) {
        const p0 = anchorAtTile(c, rank);
        const p1 = { x: p0.x + ISO_BASIS_E.dx, y: p0.y + ISO_BASIS_E.dy };
        const p3 = { x: p0.x + ISO_BASIS_S.dx, y: p0.y + ISO_BASIS_S.dy };
        const p2 = { x: p1.x + ISO_BASIS_S.dx, y: p1.y + ISO_BASIS_S.dy };
        return { p0, p1, p2, p3 };
      }

      function polygonPointsWithOffset(p0, p1, p2, p3, offsetY) {
        return (
          p0.x +
          "," +
          (p0.y + offsetY) +
          " " +
          p1.x +
          "," +
          (p1.y + offsetY) +
          " " +
          p2.x +
          "," +
          (p2.y + offsetY) +
          " " +
          p3.x +
          "," +
          (p3.y + offsetY)
        );
      }

      function shiftedPoint(point, offsetY) {
        return { x: point.x, y: point.y + offsetY };
      }

      function jitteredSketchLinePath(a, b, rng, options = {}) {
        const segments = options.segments || 5;
        const normalAmp = options.normalAmp || 1.2;
        const tangentAmp = options.tangentAmp || 0.55;
        const startOvershoot = options.startOvershoot || 0;
        const endOvershoot = options.endOvershoot || 0;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const nx = -uy;
        const ny = ux;
        const points = [];
        for (let i = 0; i <= segments; i += 1) {
          const t = i / segments;
          const endpointEase = Math.sin(Math.PI * t);
          const overshoot = i === 0 ? -startOvershoot : i === segments ? endOvershoot : 0;
          const normalJitter = (rng() - 0.5) * 2 * normalAmp * (0.45 + endpointEase * 0.55);
          const tangentJitter = (rng() - 0.5) * 2 * tangentAmp * endpointEase;
          points.push({
            x: a.x + dx * t + ux * (overshoot + tangentJitter) + nx * normalJitter,
            y: a.y + dy * t + uy * (overshoot + tangentJitter) + ny * normalJitter
          });
        }
        return points
          .map((point, index) =>
            (index === 0 ? "M " : "L ") + point.x.toFixed(2) + " " + point.y.toFixed(2)
          )
          .join(" ");
      }

      function pointAlongSegment(a, b, t) {
        return {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t
        };
      }

      function edgeNormalTowardPoint(a, b, point) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const mid = pointAlongSegment(a, b, 0.5);
        const toward = { x: point.x - mid.x, y: point.y - mid.y };
        const dot = nx * toward.x + ny * toward.y;
        return dot >= 0 ? { x: nx, y: ny } : { x: -nx, y: -ny };
      }

      function offsetPointByVector(point, vector, distance) {
        return {
          x: point.x + vector.x * distance,
          y: point.y + vector.y * distance
        };
      }

      function contourClassSuffix(relativeLevel) {
        if (relativeLevel > 0) return "above";
        if (relativeLevel < 0) return "below";
        return "focus";
      }

      function tileSketchProfile(room) {
        const seed = hashString32("tile-sketch-profile:" + room.id + ":" + room.tile.key);
        const roughVariant = seed % 5 === 0;
        return roughVariant
          ? {
              family: "rough-b",
              ampScale: 1.22,
              overshootScale: 1.18,
              passBoost: 0,
              breakBoost: 1,
              scratchBoost: 1
            }
          : {
              family: "main",
              ampScale: 1,
              overshootScale: 1,
              passBoost: 0,
              breakBoost: 0,
              scratchBoost: 0
            };
      }

      function drawSketchTileContours(room, p0, p1, p2, p3, offsetY, relativeLevel) {
        const corners = [p0, p1, p2, p3].map((point) => shiftedPoint(point, offsetY));
        const edges = [
          [corners[0], corners[1]],
          [corners[1], corners[2]],
          [corners[2], corners[3]],
          [corners[3], corners[0]]
        ];
        const suffix = contourClassSuffix(relativeLevel);
        const profile = tileSketchProfile(room);
        const rng = createSeededRandom(hashString32("tile-contour:" + profile.family + ":" + room.id + ":" + room.tile.key));
        const mainAmp = (relativeLevel === 0 ? 2.35 : relativeLevel > 0 ? 1.45 : 1.25) * profile.ampScale;
        const passCount = 2 + profile.passBoost;

        for (let pass = 0; pass < passCount; pass += 1) {
          const variant = pass === 0 ? "main" : "echo";
          const amp = pass === 0 ? mainAmp : mainAmp * (0.58 + pass * 0.12);
          const overshoot = (pass === 0 ? 5.8 : 3.4 + pass) * profile.overshootScale;
          for (const [a, b] of edges) {
            add("path", {
              class: "tile-room-contour tile-room-contour-" + suffix + "-" + variant,
              d: jitteredSketchLinePath(a, b, rng, {
                segments: 5,
                normalAmp: amp,
                tangentAmp: 0.9,
                startOvershoot: overshoot * (0.75 + rng() * 0.5),
                endOvershoot: overshoot * (0.75 + rng() * 0.5)
              })
            });
          }
        }

        const breakCount = (relativeLevel === 0 ? 5 : 3) + profile.breakBoost;
        for (let i = 0; i < breakCount; i += 1) {
          const edge = edges[Math.floor(rng() * edges.length)];
          const startT = 0.1 + rng() * 0.7;
          const lengthT = 0.08 + rng() * 0.12;
          const a = pointAlongSegment(edge[0], edge[1], startT);
          const b = pointAlongSegment(edge[0], edge[1], Math.min(0.94, startT + lengthT));
          add("path", {
            class: "tile-room-contour tile-room-contour-" + suffix + "-break",
            d: jitteredSketchLinePath(a, b, rng, {
              segments: 2,
              normalAmp: mainAmp * 1.35,
              tangentAmp: 0.45,
              startOvershoot: 1.4,
              endOvershoot: 1.8
            })
          });
        }

        const tileCenterPoint = {
          x: (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4,
          y: (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4
        };
        const scratchCount = 2;
        for (let i = 0; i < scratchCount; i += 1) {
          const edge = edges[Math.floor(rng() * edges.length)];
          const lengthT = 0.5 + rng() * 0.25;
          const startT = 0.06 + rng() * (0.88 - lengthT);
          const inward = edgeNormalTowardPoint(edge[0], edge[1], tileCenterPoint);
          const side = rng() < 0.5 ? 1 : -1;
          const distance = 1.45 + rng() * 2.4;
          const aBase = pointAlongSegment(edge[0], edge[1], startT);
          const bBase = pointAlongSegment(edge[0], edge[1], Math.min(0.9, startT + lengthT));
          const a = offsetPointByVector(aBase, inward, side * distance);
          const b = offsetPointByVector(bBase, inward, side * (distance + (rng() - 0.5) * 0.8));
          add("path", {
            class: "tile-room-contour tile-room-contour-" + suffix + "-scratch",
            d: jitteredSketchLinePath(a, b, rng, {
              segments: 5,
              normalAmp: mainAmp * 0.74,
              tangentAmp: 0.34,
              startOvershoot: 0.25,
              endOvershoot: 0.5
            })
          });
        }
      }

      function insetTileCorners(p0, p1, p2, p3, insetFactor) {
        const center = {
          x: (p0.x + p1.x + p2.x + p3.x) / 4,
          y: (p0.y + p1.y + p2.y + p3.y) / 4
        };
        const moveTowardCenter = (p) => ({
          x: p.x + (center.x - p.x) * insetFactor,
          y: p.y + (center.y - p.y) * insetFactor
        });
        return {
          p0: moveTowardCenter(p0),
          p1: moveTowardCenter(p1),
          p2: moveTowardCenter(p2),
          p3: moveTowardCenter(p3)
        };
      }

      function drawCornerVerticalHints(p0, p1, p2, p3, offsetY, directionSign, hintColors) {
        const total = Math.max(12, Math.abs(ISO_BASIS_S.dy) * 0.18);
        const solid = total * 0.5;
        const broken = total * 0.32;
        const fade = total * 0.18;
        const gap1 = 1.8;
        const gap2 = 1.4;
        const corners = [p0, p1, p2, p3];
        for (const c of corners) {
          const x = c.x;
          const y0 = c.y + offsetY;
          const y1 = y0 + directionSign * solid;
          const y2a = y1 + directionSign * gap1;
          const y2b = y2a + directionSign * broken;
          const y3a = y2b + directionSign * gap2;
          const y3b = y3a + directionSign * fade;
          add("line", {
            class: "tile-corner-hint tile-corner-hint-solid",
            x1: x,
            y1: y0,
            x2: x,
            y2: y1,
            style: "stroke:" + hintColors.solid + ";"
          });
          add("line", {
            class: "tile-corner-hint tile-corner-hint-broken",
            x1: x,
            y1: y2a,
            x2: x,
            y2: y2b,
            style: "stroke:" + hintColors.broken + ";"
          });
          add("line", {
            class: "tile-corner-hint tile-corner-hint-fade",
            x1: x,
            y1: y3a,
            x2: x,
            y2: y3b,
            style: "stroke:" + hintColors.fade + ";"
          });
        }
      }

      function splitTileTitleLines(label, maxCharsPerLine) {
        const text = String(label || "").trim();
        if (!text) return [""];
        const maxChars = Number.isFinite(maxCharsPerLine) ? maxCharsPerLine : 16;
        if (text.length <= maxChars) return [text];

        const words = text.split(/\s+/).filter(Boolean);
        if (words.length <= 1) {
          const mid = Math.ceil(text.length / 2);
          return [text.slice(0, mid).trim(), text.slice(mid).trim()].filter(Boolean);
        }

        let bestIdx = 1;
        let bestScore = Number.POSITIVE_INFINITY;
        for (let i = 1; i < words.length; i += 1) {
          const left = words.slice(0, i).join(" ");
          const right = words.slice(i).join(" ");
          const score = Math.abs(left.length - right.length);
          if (score < bestScore) {
            bestScore = score;
            bestIdx = i;
          }
        }
        const line1 = words.slice(0, bestIdx).join(" ").trim();
        const line2 = words.slice(bestIdx).join(" ").trim();
        return [line1, line2].filter(Boolean);
      }

      function tilesInBounds(bounds) {
        const c0 = Math.min(bounds.tl.c, bounds.br.c);
        const c1 = Math.max(bounds.tl.c, bounds.br.c);
        const rankBottom = Math.min(bounds.tl.rank, bounds.br.rank);
        const rankTop = Math.max(bounds.tl.rank, bounds.br.rank);
        const tiles = [];
        for (let rank = rankTop; rank >= rankBottom; rank -= 1) {
          for (let c = c0; c <= c1; c += 1) {
            tiles.push({ c, rank });
          }
        }
        return tiles;
      }

      // Draft deterministic room layout for manual review.
      // This is the only source for room->tile assignment in prototype-v2.
      // Core rule (authoritative): L0 tiles are leading for planar position.
      // - Cardinal directions (N/E/S/W + diagonals) move across tiles.
      // - Up/Down only changes layer and keeps the same tile.
      const ROOM_LAYOUT = { ...LhMapData.ROOM_LAYOUT };

      const ROOM_LAYOUT_UNKNOWN = {};

      // Engine-derived edges snapshot (location-map-discovery.json), embedded for visual diffing.
      // Keep command-level uniqueness so multiple edges between the same rooms can still be rendered.
      const ENGINE_EDGE_SNAPSHOT = [
        { from: 9, to: 142, command: "exit" },
        { from: 9, to: 142, command: "southeast" },
        { from: 15, to: 131, command: "west" },
        { from: 15, to: 184, command: "down" },
        { from: 15, to: 187, command: "east" },
        { from: 16, to: 240, command: "enter" },
        { from: 16, to: 240, command: "north" },
        { from: 17, to: 25, command: "north" },
        { from: 25, to: 17, command: "south" },
        { from: 25, to: 201, command: "north" },
        { from: 27, to: 65, command: "up" },
        { from: 27, to: 158, command: "west" },
        { from: 27, to: 202, command: "east" },
        { from: 33, to: 137, command: "east" },
        { from: 34, to: 39, command: "down" },
        { from: 34, to: 39, command: "enter" },
        { from: 34, to: 39, command: "west" },
        { from: 34, to: 221, command: "east" },
        { from: 35, to: 136, command: "up" },
        { from: 35, to: 142, command: "down" },
        { from: 35, to: 158, command: "east" },
        { from: 38, to: 218, command: "north" },
        { from: 39, to: 34, command: "east" },
        { from: 39, to: 34, command: "up" },
        { from: 39, to: 99, command: "down" },
        { from: 47, to: 202, command: "west" },
        { from: 51, to: 87, command: "north" },
        { from: 51, to: 131, command: "west" },
        { from: 51, to: 181, command: "down" },
        { from: 51, to: 232, command: "east" },
        { from: 65, to: 27, command: "down" },
        { from: 65, to: 137, command: "up" },
        { from: 65, to: 185, command: "north" },
        { from: 66, to: 34, command: "west" },
        { from: 66, to: 78, command: "east" },
        { from: 78, to: 138, command: "east" },
        { from: 87, to: 51, command: "south" },
        { from: 87, to: 117, command: "down" },
        { from: 87, to: 117, command: "east" },
        { from: 87, to: 131, command: "up" },
        { from: 87, to: 232, command: "west" },
        { from: 98, to: 140, command: "enter" },
        { from: 98, to: 140, command: "south" },
        { from: 98, to: 185, command: "west" },
        { from: 99, to: 39, command: "up" },
        { from: 110, to: 127, command: "exit" },
        { from: 110, to: 127, command: "up" },
        { from: 110, to: 137, command: "down" },
        { from: 117, to: 161, command: "up" },
        { from: 117, to: 234, command: "west" },
        { from: 121, to: 145, command: "up" },
        { from: 127, to: 110, command: "down" },
        { from: 127, to: 110, command: "enter" },
        { from: 131, to: 15, command: "north" },
        { from: 131, to: 87, command: "south" },
        { from: 131, to: 164, command: "east" },
        { from: 131, to: 234, command: "west" },
        { from: 134, to: 21, command: "down" },
        { from: 134, to: 21, command: "enter" },
        { from: 134, to: 152, command: "up" },
        { from: 136, to: 35, command: "down" },
        { from: 136, to: 218, command: "south" },
        { from: 137, to: 33, command: "west" },
        { from: 137, to: 65, command: "down" },
        { from: 137, to: 110, command: "up" },
        { from: 137, to: 176, command: "north" },
        { from: 140, to: 98, command: "exit" },
        { from: 140, to: 98, command: "north" },
        { from: 140, to: 202, command: "down" },
        { from: 142, to: 9, command: "northwest" },
        { from: 142, to: 35, command: "up" },
        { from: 145, to: 121, command: "down" },
        { from: 149, to: 201, command: "up" },
        { from: 150, to: 179, command: "down" },
        { from: 150, to: 206, command: "south" },
        { from: 152, to: 134, command: "down" },
        { from: 158, to: 27, command: "east" },
        { from: 158, to: 35, command: "west" },
        { from: 161, to: 15, command: "north" },
        { from: 161, to: 117, command: "down" },
        { from: 161, to: 164, command: "up" },
        { from: 161, to: 184, command: "east" },
        { from: 164, to: 131, command: "down" },
        { from: 164, to: 184, command: "up" },
        { from: 164, to: 187, command: "east" },
        { from: 164, to: 234, command: "west" },
        { from: 171, to: 47, command: "west" },
        { from: 176, to: 137, command: "exit" },
        { from: 176, to: 137, command: "south" },
        { from: 179, to: 150, command: "up" },
        { from: 179, to: 200, command: "southeast" },
        { from: 181, to: 51, command: "up" },
        { from: 184, to: 15, command: "up" },
        { from: 184, to: 161, command: "down" },
        { from: 184, to: 164, command: "east" },
        { from: 185, to: 65, command: "enter" },
        { from: 185, to: 65, command: "south" },
        { from: 185, to: 98, command: "east" },
        { from: 187, to: 15, command: "south" },
        { from: 187, to: 99, command: "up" },
        { from: 187, to: 164, command: "north" },
        { from: 190, to: 218, command: "east" },
        { from: 190, to: 218, command: "enter" },
        { from: 195, to: 240, command: "down" },
        { from: 200, to: 179, command: "northwest" },
        { from: 200, to: 240, command: "up" },
        { from: 201, to: 25, command: "south" },
        { from: 201, to: 149, command: "down" },
        { from: 202, to: 27, command: "west" },
        { from: 202, to: 47, command: "east" },
        { from: 202, to: 140, command: "up" },
        { from: 206, to: 208, command: "west" },
        { from: 208, to: 210, command: "west" },
        { from: 210, to: 214, command: "west" },
        { from: 210, to: 249, command: "up" },
        { from: 214, to: 218, command: "west" },
        { from: 218, to: 38, command: "south" },
        { from: 218, to: 136, command: "north" },
        { from: 218, to: 190, command: "exit" },
        { from: 218, to: 190, command: "west" },
        { from: 218, to: 214, command: "east" },
        { from: 221, to: 227, command: "east" },
        { from: 222, to: 109, command: "up" },
        { from: 232, to: 161, command: "east" },
        { from: 234, to: 117, command: "up" },
        { from: 234, to: 131, command: "east" },
        { from: 234, to: 164, command: "south" },
        { from: 234, to: 187, command: "west" },
        { from: 240, to: 16, command: "exit" },
        { from: 240, to: 16, command: "south" },
        { from: 240, to: 195, command: "up" },
        { from: 240, to: 200, command: "down" },
        { from: 248, to: 206, command: "north" },
        { from: 249, to: 210, command: "down" }
      ];

      const ROOM_TILE_METADATA = [];
      const ROOM_LAYOUT_MISSING = [];
      const ROOM_LAYOUT_INVALID = [];
      const MAP_HIDDEN_ROOM_IDS = new Set(["place", "basalt", "platform"]);

      for (const room of MAP_MODEL.rooms) {
        const spec = ROOM_LAYOUT[room.id] || ROOM_LAYOUT_UNKNOWN[room.id];
        if (!spec) {
          ROOM_LAYOUT_MISSING.push(room.id);
          continue;
        }
        const tile = parseTileLabel(spec.tile);
        if (!tile) {
          ROOM_LAYOUT_INVALID.push({ id: room.id, tile: spec.tile });
          continue;
        }
        ROOM_TILE_METADATA.push({
          id: room.id,
          label: room.label,
          locationId: room.locationId,
          building: spec.building || "unknown",
          layer: spec.layer || room.layer,
          tile,
          tileLabel: String(spec.tile).toUpperCase()
        });
      }

      window.ROOM_TILE_METADATA = ROOM_TILE_METADATA;
      window.ROOM_LAYOUT_MISSING = ROOM_LAYOUT_MISSING;
      window.ROOM_LAYOUT_INVALID = ROOM_LAYOUT_INVALID;

      // Validation: up/down edges must keep the same tile (layer-only movement).
      const LAYOUT_RULE_VIOLATIONS = [];
      const LAYOUT_LAYER_RULE_VIOLATIONS = [];
      const layerToLevel = (layerId) => {
        if (layerId === "L0") return 0;
        const m = /^L([+-])(\d+)$/.exec(String(layerId || ""));
        if (!m) return null;
        return (m[1] === "+" ? 1 : -1) * Number(m[2] || 0);
      };
      for (const room of MAP_MODEL.rooms) {
        const fromSpec = ROOM_LAYOUT[room.id] || ROOM_LAYOUT_UNKNOWN[room.id];
        if (!fromSpec || !fromSpec.tile) continue;
        const fromTile = String(fromSpec.tile).toUpperCase();
        const fromLevel = layerToLevel(fromSpec.layer);
        for (const edge of room.edges || []) {
          const label = String(edge.label || "").toLowerCase();
          if (!label.includes("up") && !label.includes("down")) continue;
          const toSpec = ROOM_LAYOUT[edge.to] || ROOM_LAYOUT_UNKNOWN[edge.to];
          if (!toSpec || !toSpec.tile) continue;
          const toTile = String(toSpec.tile).toUpperCase();
          const toLevel = layerToLevel(toSpec.layer);
          if (fromTile !== toTile) {
            LAYOUT_RULE_VIOLATIONS.push({
              from: room.id,
              to: edge.to,
              label: edge.label,
              fromTile,
              toTile
            });
          }
          if (fromLevel != null && toLevel != null) {
            const expectedDelta = label.includes("up") && !label.includes("down") ? 1 : label.includes("down") ? -1 : null;
            if (expectedDelta != null && toLevel - fromLevel !== expectedDelta) {
              LAYOUT_LAYER_RULE_VIOLATIONS.push({
                from: room.id,
                to: edge.to,
                label: edge.label,
                fromLayer: fromSpec.layer,
                toLayer: toSpec.layer
              });
            }
          }
        }
      }
      window.LAYOUT_RULE_VIOLATIONS = LAYOUT_RULE_VIOLATIONS;
      window.LAYOUT_LAYER_RULE_VIOLATIONS = LAYOUT_LAYER_RULE_VIOLATIONS;

      function buildLayerRenderContext(layerFilter) {
        const verticalEdgeLength = Math.hypot(STEP_E.dx, STEP_E.dy);
        const layerStep = verticalEdgeLength * 0.4875;
        const isVerticalCommand = (command) => {
          const s = String(command || "").toLowerCase();
          return (s.includes("up") && !s.includes("down")) || s.includes("down");
        };
        const isCrossLayerEdgeCompanion = (room, focusLevel) => {
          if (!room || !Number.isFinite(focusLevel)) return false;
          const roomLevel = layerToLevel(room.layer);
          if (!Number.isFinite(roomLevel)) return false;
          for (const sourceRoom of MAP_MODEL.rooms) {
            const sourceLayout = ROOM_LAYOUT[sourceRoom.id];
            const sourceLevel = layerToLevel(sourceLayout && sourceLayout.layer);
            if (!Number.isFinite(sourceLevel)) continue;
            for (const edge of sourceRoom.edges || []) {
              const targetLayout = ROOM_LAYOUT[edge.to];
              const targetLevel = layerToLevel(targetLayout && targetLayout.layer);
              if (!Number.isFinite(targetLevel) || Math.abs(sourceLevel - targetLevel) <= 1) continue;
              const isCrossLayerPuzzle = edge.type === "puzzle" && !isVerticalCommand(edge.label);
              const isCrossLayerVertical = isVerticalCommand(edge.label);
              if (!isCrossLayerPuzzle && !isCrossLayerVertical) continue;
              const sourceNearFocus = Math.abs(sourceLevel - focusLevel) <= 1;
              const targetNearFocus = Math.abs(targetLevel - focusLevel) <= 1;
              if (room.id === sourceRoom.id && targetNearFocus) return true;
              if (room.id === edge.to && sourceNearFocus) return true;
            }
          }
          return false;
        };
        if (layerFilter === "all") {
          return {
            focusLevel: null,
            layerStep,
            includeRoom: () => true,
            layerOffsetY: () => 0,
            relativeLevel: () => 0
          };
        }
        const focusLevel = layerToLevel(layerFilter);
        if (focusLevel == null) {
          return {
            focusLevel: null,
            layerStep,
            includeRoom: (room) => room.layer === layerFilter,
            layerOffsetY: () => 0,
            relativeLevel: () => 0
          };
        }
        return {
          focusLevel,
          layerStep,
          includeRoom: (room) => {
            const roomLevel = layerToLevel(room.layer);
            if (roomLevel == null) return false;
            return Math.abs(roomLevel - focusLevel) <= 1 || isCrossLayerEdgeCompanion(room, focusLevel);
          },
          layerOffsetY: (room) => {
            const roomLevel = layerToLevel(room.layer);
            if (roomLevel == null) return 0;
            return (focusLevel - roomLevel) * layerStep;
          },
          relativeLevel: (room) => {
            const roomLevel = layerToLevel(room.layer);
            if (roomLevel == null) return 0;
            return roomLevel - focusLevel;
          }
        };
      }

      function roomLayerVisual(relativeLevel) {
        if (relativeLevel > 0) {
          return {
            tileClass: "tile-room-above",
            shadowClass: "tile-room-shadow-above",
            rimClass: "tile-room-rim-above",
            rimDepth: 7,
            hatchClass: "tile-room-hatch-above",
            insetClass: "tile-room-inset-above",
            titleFill: "rgba(218, 222, 226, 0.86)",
            levelFill: "rgba(212, 218, 224, 0.9)",
            levelBadgeFill: "rgba(44, 46, 50, 0.66)",
            levelBadgeStroke: "rgba(186, 190, 196, 0.72)",
            cornerHint: {
              solid: "rgba(206, 210, 214, 0.9)",
              broken: "rgba(206, 210, 214, 0.72)",
              fade: "rgba(206, 210, 214, 0.48)"
            }
          };
        }
        if (relativeLevel < 0) {
          return {
            tileClass: "tile-room-below",
            shadowClass: "tile-room-shadow-below",
            rimClass: "tile-room-rim-below",
            rimDepth: 5,
            hatchClass: "tile-room-hatch-below",
            insetClass: "tile-room-inset-below",
            titleFill: "rgba(190, 196, 202, 0.82)",
            levelFill: "rgba(196, 202, 208, 0.88)",
            levelBadgeFill: "rgba(36, 38, 42, 0.62)",
            levelBadgeStroke: "rgba(156, 162, 170, 0.72)",
            cornerHint: {
              solid: "rgba(170, 176, 182, 0.88)",
              broken: "rgba(170, 176, 182, 0.7)",
              fade: "rgba(170, 176, 182, 0.46)"
            }
          };
        }
        return {
          tileClass: "tile-room-focus",
          shadowClass: "tile-room-shadow-focus",
          rimClass: "tile-room-rim-focus",
          rimDepth: 8,
          hatchClass: "tile-room-hatch-focus",
          insetClass: "tile-room-inset-focus",
          titleFill: "rgba(248, 250, 252, 0.99)",
          levelFill: "rgba(234, 238, 244, 0.94)",
          levelBadgeFill: "rgba(46, 50, 56, 0.72)",
          levelBadgeStroke: "rgba(196, 202, 210, 0.82)",
          cornerHint: {
            solid: "rgba(232, 236, 240, 0.92)",
            broken: "rgba(232, 236, 240, 0.74)",
            fade: "rgba(232, 236, 240, 0.5)"
          }
        };
      }

      function drawCampusGroundOverlay(showRoads, layerFilter, showBuildingArtwork = true) {
        const drawAllCampusLabels = () => {
          const normalize = (v) => {
            const d = Math.hypot(v.x, v.y) || 1;
            return { x: v.x / d, y: v.y / d };
          };
          const expandParallelogram = (pts, pad) => {
            if (!pts || pts.length !== 4) return pts;
            const p0 = pts[0];
            const p1 = pts[1];
            const p2 = pts[2];
            const p3 = pts[3];
            const u = normalize({ x: p1.x - p0.x, y: p1.y - p0.y });
            const v = normalize({ x: p3.x - p0.x, y: p3.y - p0.y });
            return [
              { x: p0.x - u.x * pad - v.x * pad, y: p0.y - u.y * pad - v.y * pad },
              { x: p1.x + u.x * pad - v.x * pad, y: p1.y + u.y * pad - v.y * pad },
              { x: p2.x + u.x * pad + v.x * pad, y: p2.y + u.y * pad + v.y * pad },
              { x: p3.x - u.x * pad + v.x * pad, y: p3.y - u.y * pad + v.y * pad }
            ];
          };

          const drawBlockSideLabel = (pts, label, sub, placement) => {
            if (!label) return;
            const a = pts[0];
            const b = pts[3];
            const center = {
              x: (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4,
              y: (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4
            };
            const edgeMid = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
            const edgeDir = normalize({ x: b.x - a.x, y: b.y - a.y });
            const inward = normalize({ x: center.x - edgeMid.x, y: center.y - edgeMid.y });
            const placeOutside = placement === "outside";
            const depth = placeOutside ? -34 : 36;

            let angle = (Math.atan2(edgeDir.y, edgeDir.x) * 180) / Math.PI;
            if (angle > 90) angle -= 180;
            if (angle < -90) angle += 180;

            const labelPos = {
              x: edgeMid.x + inward.x * depth,
              y: edgeMid.y + inward.y * depth
            };

            add(
              "text",
              {
                class: "campus-label-side",
                x: labelPos.x,
                y: labelPos.y,
                transform: "rotate(" + angle + " " + labelPos.x + " " + labelPos.y + ")"
              },
              label
            );

            if (sub) {
              const subPos = {
                x: labelPos.x + inward.x * 54,
                y: labelPos.y + inward.y * 54
              };
              add(
                "text",
                {
                  class: "campus-sub-side",
                  x: subPos.x,
                  y: subPos.y,
                  transform: "rotate(" + angle + " " + subPos.x + " " + subPos.y + ")"
                },
                sub
              );
            }
          };
          const drawBuildingBottomLabel = (pts, label, xShiftPx, placeInside) => {
            if (!label) return;
            const bottomLeft = pts[3];
            const edgeMid = { x: (pts[3].x + pts[2].x) * 0.5, y: (pts[3].y + pts[2].y) * 0.5 };
            const center = {
              x: (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4,
              y: (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4
            };
            const outward = normalize({ x: edgeMid.x - center.x, y: edgeMid.y - center.y });
            const inward = { x: -outward.x, y: -outward.y };
            const xShift = Number.isFinite(xShiftPx) ? xShiftPx : 0;
            const inside = placeInside === true;
            const yBase = inside ? Math.max(pts[3].y, pts[2].y) - 22 : Math.max(pts[3].y, pts[2].y) + 14;
            const inset = inside ? 30 : 12;
            const shiftVec = inside ? inward : outward;
            const labelPos = {
              x: bottomLeft.x + 4 + shiftVec.x * inset + xShift,
              y: yBase + shiftVec.y * inset
            };
            add("text", { class: "campus-label-bottom", x: labelPos.x, y: labelPos.y }, label);
            return labelPos;
          };
          const drawCentralSubtitleInside = (pts, sub, titlePos) => {
            if (!sub) return;
            const bottomMid = { x: (pts[3].x + pts[2].x) * 0.5, y: (pts[3].y + pts[2].y) * 0.5 };
            const center = {
              x: (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4,
              y: (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4
            };
            const inward = normalize({ x: center.x - bottomMid.x, y: center.y - bottomMid.y });
            const subPos = {
              x: titlePos && Number.isFinite(titlePos.x) ? titlePos.x : pts[3].x + 8,
              y: Math.max(pts[3].y, pts[2].y) - 18 + inward.y * 8
            };
            add("text", { class: "campus-sub-inside", x: subPos.x, y: subPos.y }, sub);
          };

          const layerRenderLocal = buildLayerRenderContext(layerFilter);
          const groundFloorOffsetY =
            layerRenderLocal.focusLevel == null ? 0 : layerRenderLocal.focusLevel * layerRenderLocal.layerStep;
          const buildingPad = TILE_GRID.cellW * 0.1;
          for (const block of CAMPUS_BLOCKS) {
            if (block.hidden) continue;
            if (block.type !== "building" && block.type !== "building-central" && block.type !== "road-h" && block.type !== "road-v") {
              continue;
            }
            if ((block.type === "road-h" || block.type === "road-v") && !showRoads) continue;
            const basePts = blockPoints(block).map((p) => ({ x: p.x, y: p.y + groundFloorOffsetY }));
            const pts =
              block.type === "building" || block.type === "building-central"
                ? expandParallelogram(basePts, buildingPad)
                : basePts;
            if (!pts || pts.length !== 4) continue;

            if (block.type === "road-h" || block.type === "road-v") {
              if (block.id === "smith") {
                drawBuildingBottomLabel(pts, block.label, ISO_BASIS_E.dx * 2, true);
              } else {
                drawBlockSideLabel(pts, block.label, null, "inside");
              }
              continue;
            }

            if (block.id === "brown") {
              drawBlockSideLabel(pts, block.label, null, "outside");
            } else {
              const titlePos = drawBuildingBottomLabel(pts, block.label, 0);
              if (block.type === "building-central") {
                drawCentralSubtitleInside(pts, block.sub, titlePos);
              }
            }
          }
        };
        const layerRender = buildLayerRenderContext(layerFilter);
        const groundFloorOffsetY = layerRender.focusLevel == null ? 0 : layerRender.focusLevel * layerRender.layerStep;
        const focusLevel = Number.isFinite(layerRender.focusLevel) ? layerRender.focusLevel : 0;
        const depth = Math.abs(focusLevel);
        const roadOpacityScale = layerRender.focusLevel == null ? 1 : Math.max(0.3, 1 - depth * 0.27);
        const roadPolygons = {};
        for (const block of CAMPUS_BLOCKS) {
          if (block.hidden) continue;
          if (block.type !== "road-h" && block.type !== "road-v") continue;
          if (!showRoads) continue;
          const basePts = blockPoints(block).map((p) => ({ x: p.x, y: p.y + groundFloorOffsetY }));
          roadPolygons[block.id] = basePts;
          drawStyledRoadBlock(block, basePts, roadOpacityScale);
        }
        if (showRoads) {
          drawRoadJunctionPatch(roadPolygons, roadOpacityScale);
        }

        if (showBuildingArtwork) {
          drawCentralBuildingIllustration(layerFilter);
          /*
          // Legacy split central-building overlays; kept here for quick comparison.
          drawCentralCoreIllustration(layerFilter);
          drawCentralCoreRightWingIllustration(layerFilter);
          */
          drawComputerCenterIllustration(layerFilter);
          drawBrownBuildingIllustration(layerFilter);
          drawTemporaryLabIllustration(layerFilter);
          drawBuildingOutlineOverlay(layerFilter);
        }
        drawAllCampusLabels();
      }

      function drawCentralCoreIllustration(layerFilter) {
        const layerRender = buildLayerRenderContext(layerFilter);
        const groundFloorOffsetY = layerRender.focusLevel == null ? 0 : layerRender.focusLevel * layerRender.layerStep;

        // Central core overlay placement guide:
        // - This raster is the central dome/core building only, not the full Central Complex
        //   campus footprint. It is anchored to the room-truth core:
        //     G5 = Infinite Corridor W2 / room 214
        //     H5 = Infinite Corridor W3 / room 210
        //     I5 = Infinite Corridor W4 / room 208
        //     row 6 = the north/upper row behind that corridor axis.
        //   Use `parseTileLabel()` for anchors instead of numeric columns; internal columns are
        //   zero-based (`G` is c=6), while map labels are human-readable (`G6`).
        // - The image-box top-left corner is hard-anchored to the top-right corner (`p1`) of
        //   tile G6, after the active floor-focus vertical offset has been applied.
        //   This is easier to inspect than guessing the visible dome axis inside the raster:
        //   if the PNG is tightly cropped, its west edge should start where the G7 tile starts.
        // - The raster footprint intentionally covers only columns G-I and ranks 5-6. The left
        //   front side should sit over G5, and the right front side should sit over I5.
        // - `overlayTileOffsetE` and `overlayTileOffsetS` use the same isometric tile vectors
        //   as room placement. Positive E moves east/right; negative E moves west/left.
        //   Positive S moves south/down-right. Tune these fractions before changing scale.
        // - `imgW` follows the G-I core footprint width. If the source image crop changes,
        //   update `imgRatio` from the PNG dimensions and then retune only the tile offsets.
        const coreFootprint = {
          bounds: { tl: parseTileLabel("G6"), br: parseTileLabel("I5") }
        };
        const pts = blockPoints(coreFootprint).map((p) => ({ x: p.x, y: p.y + groundFloorOffsetY }));
        if (!pts || pts.length !== 4) return;

        const p0 = pts[0];
        const p1 = pts[1];
        const topLen = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;

        // TUNING: move the central core overlay here.
        // - `overlayTileOffsetE`: east/west in whole or fractional tiles.
        //   Positive moves east/right; negative moves west/left.
        // - `overlayTileOffsetS`: south/north in whole or fractional tiles.
        //   Positive moves south/down-right; negative moves north/up-left.
        // Current anchor: image-box top-left is attached to G6's top-right corner (`p1`),
        // then these offsets are applied.
        const overlayTileOffsetE = -7 / 16;
        const overlayTileOffsetS = -3 / 8;

        const overlayOffset = {
          x: ISO_BASIS_E.dx * overlayTileOffsetE + ISO_BASIS_S.dx * overlayTileOffsetS,
          y: ISO_BASIS_E.dy * overlayTileOffsetE + ISO_BASIS_S.dy * overlayTileOffsetS
        };
        const g7Tile = parseTileLabel("G6");
        if (!g7Tile) return;
        const g7 = tileCorners(g7Tile.c, g7Tile.rank);
        const baseAnchor = {
          x: g7.p1.x + overlayOffset.x,
          y: g7.p1.y + groundFloorOffsetY + overlayOffset.y
        };

        // TUNING: if the source image crop changes, update this ratio from the PNG dimensions and then retune only the tile offsets.
        // - here you can scale the image footprint by changing `imgW`. The height `imgH` will follow from the source aspect ratio defined by `imgRatio`.
        const imgRatio = 1466 / 2800;
        const imgW = topLen * 1.25;
        const imgH = imgW * imgRatio;

        const focusLevel = Number.isFinite(layerRender.focusLevel) ? layerRender.focusLevel : 0;
        const depth = Math.abs(focusLevel);
        const overlayOpacity = layerRender.focusLevel == null ? 0.74 : Math.max(0.3, 0.74 - depth * 0.12);

        add("image", {
          href: "assets/gfx/maps/central_core_overlay.png",
          x: baseAnchor.x.toFixed(2),
          y: baseAnchor.y.toFixed(2),
          width: imgW.toFixed(2),
          height: imgH.toFixed(2),
          preserveAspectRatio: "xMidYMid meet",
          style: "opacity:" + overlayOpacity.toFixed(3) + ";pointer-events:none;"
        });
      }

      function drawCentralCoreRightWingIllustration(layerFilter) {
        const layerRender = buildLayerRenderContext(layerFilter);
        const groundFloorOffsetY = layerRender.focusLevel == null ? 0 : layerRender.focusLevel * layerRender.layerStep;

        // Right wing overlay placement guide:
        // - Footprint target is the J column from J6 through J2.
        // - The image-box top-left is anchored to the upper-left corner of J6.
        // - `overlayTileOffsetE` and `overlayTileOffsetS` use the same tile basis as other overlays.
        const wingFootprint = {
          bounds: { tl: parseTileLabel("J6"), br: parseTileLabel("J2") }
        };
        const pts = blockPoints(wingFootprint).map((p) => ({ x: p.x, y: p.y + groundFloorOffsetY }));
        if (!pts || pts.length !== 4) return;

        const topLeft = pts[0];
        const bottomLeft = pts[3];
        const footprintH = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y) || 1;

        // TUNING: move the central core right wing overlay here.
        // - `overlayTileOffsetE`: east/west in whole or fractional tiles.
        //   Positive moves east/right; negative moves west/left.
        // - `overlayTileOffsetS`: south/north in whole or fractional tiles.
        //   Positive moves south/down-right; negative moves north/up-left.
        // Current anchor: image-box top-left is attached to G7's top-right corner (`p1`),
        const overlayTileOffsetE = -1/4;
        const overlayTileOffsetS = -5/4;
        const overlayOffset = {
          x: ISO_BASIS_E.dx * overlayTileOffsetE + ISO_BASIS_S.dx * overlayTileOffsetS,
          y: ISO_BASIS_E.dy * overlayTileOffsetE + ISO_BASIS_S.dy * overlayTileOffsetS
        };

        // Source PNG: central_core_right_wing_overlay.png, 871x1028.
        const imgRatio = 1121 / 853;
        const imgH = footprintH * 0.8;
        const imgW = imgH / imgRatio;

        const focusLevel = Number.isFinite(layerRender.focusLevel) ? layerRender.focusLevel : 0;
        const depth = Math.abs(focusLevel);
        const overlayOpacity = layerRender.focusLevel == null ? 0.74 : Math.max(0.3, 0.74 - depth * 0.12);

        add("image", {
          href: "assets/gfx/maps/central_core_right_wing_overlay.png",
          x: (topLeft.x + overlayOffset.x).toFixed(2),
          y: (topLeft.y + overlayOffset.y).toFixed(2),
          width: imgW.toFixed(2),
          height: imgH.toFixed(2),
          preserveAspectRatio: "xMidYMid meet",
          style: "opacity:" + overlayOpacity.toFixed(3) + ";pointer-events:none;"
        });
      }

      function drawCentralBuildingIllustration(layerFilter) {
        const layerRender = buildLayerRenderContext(layerFilter);
        const groundFloorOffsetY = layerRender.focusLevel == null ? 0 : layerRender.focusLevel * layerRender.layerStep;

        // Full Central Complex overlay placement guide:
        // - Replaces the legacy split central-core / wing overlays above.
        // - Footprint target is the map-prototype-2 central building plate: F6 through J2.
        // - The image-box top-left is anchored to the upper-left corner of F6, then tile offsets
        //   are applied for crop tuning.
        const centralFootprint = {
          bounds: { tl: parseTileLabel("F6"), br: parseTileLabel("J2") }
        };
        const pts = blockPoints(centralFootprint).map((p) => ({ x: p.x, y: p.y + groundFloorOffsetY }));
        if (!pts || pts.length !== 4) return;

        const topLeft = pts[0];
        const topRight = pts[1];
        const topLen = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y) || 1;

        // TUNING: move the full central building overlay here.
        // Positive E moves east/right; positive S moves south/down-right.
        const overlayTileOffsetE = 20 / 16;
        const overlayTileOffsetS = -28 / 8;
        const overlayOffset = {
          x: ISO_BASIS_E.dx * overlayTileOffsetE + ISO_BASIS_S.dx * overlayTileOffsetS,
          y: ISO_BASIS_E.dy * overlayTileOffsetE + ISO_BASIS_S.dy * overlayTileOffsetS
        };

        // Source PNG: central_building_overlay.png, 1454x930.
        const imgRatio = 869 / 1454;
        const imgW = topLen * 1.41;
        const imgH = imgW * imgRatio * 1.2;

        const focusLevel = Number.isFinite(layerRender.focusLevel) ? layerRender.focusLevel : 0;
        const depth = Math.abs(focusLevel);
        const overlayOpacity = layerRender.focusLevel == null ? 0.76 : Math.max(0.3, 0.76 - depth * 0.12);

        add("image", {
          href: "assets/gfx/maps/central_building_overlay.png",
          x: (topLeft.x + overlayOffset.x).toFixed(2),
          y: (topLeft.y + overlayOffset.y).toFixed(2),
          width: imgW.toFixed(2),
          height: imgH.toFixed(2),
          preserveAspectRatio: "xMidYMid meet",
          style: "opacity:" + overlayOpacity.toFixed(3) + ";pointer-events:none;"
        });
      }

      function drawComputerCenterIllustration(layerFilter) {
        const computer = CAMPUS_BLOCKS.find((b) => b.id === "computer");
        if (!computer) return;
        const layerRender = buildLayerRenderContext(layerFilter);
        const groundFloorOffsetY = layerRender.focusLevel == null ? 0 : layerRender.focusLevel * layerRender.layerStep;
        const pts = blockPoints(computer).map((p) => ({ x: p.x, y: p.y + groundFloorOffsetY }));
        if (!pts || pts.length !== 4) return;

        const p0 = pts[0];
        const p1 = pts[1];
        const p2 = pts[2];
        const p3 = pts[3];
        const topLen = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
        const center = {
          x: (p0.x + p1.x + p2.x + p3.x) * 0.25,
          y: (p0.y + p1.y + p2.y + p3.y) * 0.25
        };
        const bottomMid = { x: (p2.x + p3.x) * 0.5, y: (p2.y + p3.y) * 0.5 };
        const inward = { x: center.x - bottomMid.x, y: center.y - bottomMid.y };
        const inwardLen = Math.hypot(inward.x, inward.y) || 1;
        const inNorm = { x: inward.x / inwardLen, y: inward.y / inwardLen };

        const baseInsetPx = 18;
        const settleDownPx = -22;
        const baseAnchor = {
          x: center.x,
          y: bottomMid.y + inNorm.y * baseInsetPx + settleDownPx
        };

        const imgRatio = 488 / 784;
        const imgW = Math.max(420, topLen * 0.96);
        const imgH = imgW * imgRatio;

        const focusLevel = Number.isFinite(layerRender.focusLevel) ? layerRender.focusLevel : 0;
        const depth = Math.abs(focusLevel);
        const overlayOpacity = layerRender.focusLevel == null ? 0.78 : Math.max(0.3, 0.78 - depth * 0.12);

        add("image", {
          href: "assets/gfx/maps/computer_center_overlay.png",
          x: (baseAnchor.x - imgW * 0.5).toFixed(2),
          y: (baseAnchor.y - imgH).toFixed(2),
          width: imgW.toFixed(2),
          height: imgH.toFixed(2),
          preserveAspectRatio: "xMidYMid meet",
          style: "opacity:" + overlayOpacity.toFixed(3) + ";pointer-events:none;"
        });
      }

      function drawTemporaryLabIllustration(layerFilter) {
        const temp = CAMPUS_BLOCKS.find((b) => b.id === "temp");
        if (!temp) return;
        const layerRender = buildLayerRenderContext(layerFilter);
        const groundFloorOffsetY = layerRender.focusLevel == null ? 0 : layerRender.focusLevel * layerRender.layerStep;
        const pts = blockPoints(temp).map((p) => ({ x: p.x, y: p.y + groundFloorOffsetY }));
        if (!pts || pts.length !== 4) return;

        const p0 = pts[0];
        const p1 = pts[1];
        const topLen = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
        const j9 = tileCorners(9, 9);
        const anchorCorner = { x: j9.p3.x, y: j9.p3.y + groundFloorOffsetY };

        // Temporary Lab overlay placement guide:
        // - `pts` is the current presentation footprint for the Temporary Lab building block
        //   (currently J9-K9), after any floor-focus vertical offset has been applied.
        // - `anchorCorner` is the lower-left corner (`p3`) of tile J9. The raster overlay's
        //   lower-left image box is anchored to this exact point, so the illustration placement
        //   has an inspectable tile reference instead of a hand-tuned center offset.
        // - `overlayTileOffsetE` and `overlayTileOffsetS` move that image-box anchor along the
        //   same isometric tile vectors used by the map. Positive E moves east/right along the
        //   tile row; negative E moves west/left. Positive S moves south/down-right along tile depth.
        // - The current raster has been cropped tightly to its visible outline. If the source
        //   image box changes again, adjust these fractions rather than switching back to opaque
        //   pixel offsets.
        // - `imgW` controls scale only. Do not shrink the overlay just to fix footprint alignment;
        //   adjust the anchor values above first.
        const overlayTileOffsetE = -1 / 2;
        const overlayTileOffsetS = 1 / 4;
        const overlayOffset = {
          x: ISO_BASIS_E.dx * overlayTileOffsetE + ISO_BASIS_S.dx * overlayTileOffsetS,
          y: ISO_BASIS_E.dy * overlayTileOffsetE + ISO_BASIS_S.dy * overlayTileOffsetS
        };

        const imgRatio = 1024 / 1536;
        const imgW = Math.max(735, topLen * 0.9);
        const imgH = imgW * imgRatio;

        const focusLevel = Number.isFinite(layerRender.focusLevel) ? layerRender.focusLevel : 0;
        const depth = Math.abs(focusLevel);
        const overlayOpacity = layerRender.focusLevel == null ? 0.78 : Math.max(0.32, 0.78 - depth * 0.12);

        add("image", {
          href: "assets/gfx/maps/temporary_lab_overlay.png",
          x: (anchorCorner.x + overlayOffset.x).toFixed(2),
          y: (anchorCorner.y + overlayOffset.y - imgH).toFixed(2),
          width: imgW.toFixed(2),
          height: imgH.toFixed(2),
          preserveAspectRatio: "xMidYMid meet",
          style: "opacity:" + overlayOpacity.toFixed(3) + ";pointer-events:none;"
        });
      }

      function drawBrownBuildingIllustration(layerFilter) {
        const brown = CAMPUS_BLOCKS.find((b) => b.id === "brown");
        if (!brown) return;
        const layerRender = buildLayerRenderContext(layerFilter);
        const groundFloorOffsetY = layerRender.focusLevel == null ? 0 : layerRender.focusLevel * layerRender.layerStep;
        const pts = blockPoints(brown).map((p) => ({ x: p.x, y: p.y + groundFloorOffsetY }));
        if (!pts || pts.length !== 4) return;

        const p0 = pts[0];
        const p1 = pts[1];
        const p2 = pts[2];
        const p3 = pts[3];
        const topLen = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
        const center = {
          x: (p0.x + p1.x + p2.x + p3.x) * 0.25,
          y: (p0.y + p1.y + p2.y + p3.y) * 0.25
        };
        const bottomMid = { x: (p2.x + p3.x) * 0.5, y: (p2.y + p3.y) * 0.5 };
        const inward = { x: center.x - bottomMid.x, y: center.y - bottomMid.y };
        const inwardLen = Math.hypot(inward.x, inward.y) || 1;
        const inNorm = { x: inward.x / inwardLen, y: inward.y / inwardLen };
        const east = { x: p1.x - p0.x, y: p1.y - p0.y };
        const eastLen = Math.hypot(east.x, east.y) || 1;
        const eastNorm = { x: east.x / eastLen, y: east.y / eastLen };
        const baseInsetPx = 8;
        const lateralShiftPx = 10;
        const settleDownPx = 34;
        const baseAnchor = {
          // Keep dome centered over tile 240 by hard-anchoring X to tile center.
          x: center.x,
          y: bottomMid.y + inNorm.y * baseInsetPx + eastNorm.y * lateralShiftPx + settleDownPx
        };

        // TUNING: move the Brown Building overlay here.
        // - `overlayTileOffsetE`: east/west in whole or fractional tiles.
        //   Positive moves east/right; negative moves west/left.
        // - `overlayTileOffsetS`: south/north in whole or fractional tiles.
        //   Positive moves south/down-right; negative moves north/up-left.
        const overlayTileOffsetE = -6/8;
        const overlayTileOffsetS = 10/8;
        const overlayOffset = {
          x: ISO_BASIS_E.dx * overlayTileOffsetE + ISO_BASIS_S.dx * overlayTileOffsetS,
          y: ISO_BASIS_E.dy * overlayTileOffsetE + ISO_BASIS_S.dy * overlayTileOffsetS
        };

        const imgRatio = 1693 / 929;
        const imgW = Math.max(560, topLen * 3.1)  * 1.5;
        const imgH = imgW * imgRatio;

        const focusLevel = Number.isFinite(layerRender.focusLevel) ? layerRender.focusLevel : 0;
        const depth = Math.abs(focusLevel);
        const overlayOpacity = layerRender.focusLevel == null ? 0.82 : Math.max(0.34, 0.82 - depth * 0.12);

        add("image", {
          href: "assets/gfx/maps/brown_building_overlay.png",
          x: (baseAnchor.x + overlayOffset.x - imgW * 0.5).toFixed(2),
          y: (baseAnchor.y + overlayOffset.y - imgH).toFixed(2),
          width: imgW.toFixed(2),
          height: imgH.toFixed(2),
          preserveAspectRatio: "xMidYMid meet",
          style: "opacity:" + overlayOpacity.toFixed(3) + ";pointer-events:none;"
        });
      }

      function drawRoomLayer(layerFilter, showRoads, showBuildingArtwork = true) {

        const layerRender = buildLayerRenderContext(layerFilter);
        const visibleRooms = ROOM_TILE_METADATA
          .filter((room) => !MAP_HIDDEN_ROOM_IDS.has(room.id))
          .filter(isRoomRevealed)
          .filter((room) => layerRender.includeRoom(room))
          .map((room) => ({
            ...room,
            _layerOffsetY: layerRender.layerOffsetY(room),
            _relativeLevel: layerRender.relativeLevel(room),
            _absoluteLevel: layerToLevel(room.layer)
          }))
          // Draw from lower to higher absolute levels so upper floors visually sit on top.
          .sort((a, b) => {
            if (a._absoluteLevel !== b._absoluteLevel) return a._absoluteLevel - b._absoluteLevel;
            return a.tile.rank - b.tile.rank;
          });

        const roomsByLevel = new Map();
        for (const room of visibleRooms) {
          const level = Number.isFinite(room._absoluteLevel) ? room._absoluteLevel : 0;
          if (!roomsByLevel.has(level)) roomsByLevel.set(level, []);
          roomsByLevel.get(level).push(room);
        }
        const visibleLevels = Array.from(roomsByLevel.keys()).sort((a, b) => a - b);

        let groundOverlayDrawn = false;
        for (let i = 0; i < visibleLevels.length; i += 1) {
          const level = visibleLevels[i];
          // Primary insertion point: anchor overlay z-order to the absolute L0 boundary,
          // not the current focus layer.
          if (!groundOverlayDrawn && level >= 0) {
            drawCampusGroundOverlay(showRoads, layerFilter, showBuildingArtwork);
            groundOverlayDrawn = true;
          }
          const roomsAtLevel = roomsByLevel.get(level) || [];
          for (const room of roomsAtLevel) {
          const { p0, p1, p2, p3 } = tileCorners(room.tile.c, room.tile.rank);
          const layerVisual = roomLayerVisual(room._relativeLevel);
          const isoSkewDeg = (Math.atan2(Math.abs(ISO_BASIS_S.dx), Math.abs(ISO_BASIS_S.dy)) * 180) / Math.PI;
          const isoTextTransform = (x, y, scaleX = 1) =>
            "translate(" +
            x.toFixed(2) +
            " " +
            y.toFixed(2) +
            ") skewX(" +
            isoSkewDeg.toFixed(2) +
            ") scale(" +
            scaleX.toFixed(3) +
            " 0.95) translate(" +
            (-x).toFixed(2) +
            " " +
            (-y).toFixed(2) +
            ")";
          const shadowDx = room._relativeLevel > 0 ? 2.1 : room._relativeLevel < 0 ? 1.4 : 2.4;
          const shadowDy = room._relativeLevel > 0 ? 6.6 : room._relativeLevel < 0 ? 4.8 : 7.2;
          const shadowPoints = polygonPointsWithOffset(
            { x: p0.x + shadowDx, y: p0.y + shadowDy },
            { x: p1.x + shadowDx, y: p1.y + shadowDy },
            { x: p2.x + shadowDx, y: p2.y + shadowDy },
            { x: p3.x + shadowDx, y: p3.y + shadowDy },
            room._layerOffsetY
          );
          add("polygon", {
            class: "tile-room-shadow " + layerVisual.shadowClass,
            points: shadowPoints
          });
          const points = polygonPointsWithOffset(p0, p1, p2, p3, room._layerOffsetY);
          add("polygon", {
            class: "tile-room-known " + layerVisual.tileClass,
            points
          });
          add("polygon", {
            class: "tile-room-ghost",
            points,
            transform: "translate(0.8 -0.5)"
          });
          add("polygon", { class: "tile-room-hatch " + layerVisual.hatchClass, points });
          const inset = insetTileCorners(p0, p1, p2, p3, 0.12);
          add("polygon", {
            class: "tile-room-inset " + layerVisual.insetClass,
            points: polygonPointsWithOffset(inset.p0, inset.p1, inset.p2, inset.p3, room._layerOffsetY)
          });
          drawSketchTileContours(room, p0, p1, p2, p3, room._layerOffsetY, room._relativeLevel);
          const verticalHintDir = room._relativeLevel < 0 ? 1 : -1;
          drawCornerVerticalHints(p0, p1, p2, p3, room._layerOffsetY, verticalHintDir, layerVisual.cornerHint);

          // Room title at 25% of tile height/depth, centered horizontally in the tile.
          const titleX = p0.x + ISO_BASIS_E.dx * 0.5 + ISO_BASIS_S.dx * 0.25;
          const titleY = p0.y + room._layerOffsetY + ISO_BASIS_E.dy * 0.5 + ISO_BASIS_S.dy * 0.25;
          const titleLines = splitTileTitleLines(room.label, 16);
          const titleScaleX = 1.08;
          if (titleLines.length > 1) {
            const lineGap = 18;
            const titleBlockTransform = isoTextTransform(titleX, titleY, titleScaleX);
            add(
              "text",
              {
                class: "tile-room-title",
                style: "fill:" + layerVisual.titleFill + ";font-size:18px;",
                x: titleX,
                y: titleY - lineGap * 0.5,
                transform: titleBlockTransform
              },
              titleLines[0]
            );
            add(
              "text",
              {
                class: "tile-room-title",
                style: "fill:" + layerVisual.titleFill + ";font-size:18px;",
                x: titleX,
                y: titleY + lineGap * 0.5,
                transform: titleBlockTransform
              },
              titleLines[1]
            );
          } else {
            add(
              "text",
              {
                class: "tile-room-title",
                style: "fill:" + layerVisual.titleFill + ";",
                x: titleX,
                y: titleY,
                transform: isoTextTransform(titleX, titleY, titleScaleX)
              },
              titleLines[0]
            );
          }
          const levelLabel = String(room.layer || "");
          const idLabel = typeof room.locationId === "number" ? String(room.locationId) : room.id;
          const insetP3 = { x: inset.p3.x, y: inset.p3.y + room._layerOffsetY };
          const insetP2 = { x: inset.p2.x, y: inset.p2.y + room._layerOffsetY };
          const insetCenter = {
            x: (inset.p0.x + inset.p1.x + inset.p2.x + inset.p3.x) / 4,
            y: (inset.p0.y + inset.p1.y + inset.p2.y + inset.p3.y) / 4 + room._layerOffsetY
          };
          const edgeDx = insetP2.x - insetP3.x;
          const edgeDy = insetP2.y - insetP3.y;
          const tLevel = 0.12;
          const tId = 0.88;
          const levelBase = { x: insetP3.x + edgeDx * tLevel, y: insetP3.y + edgeDy * tLevel };
          const idBase = { x: insetP3.x + edgeDx * tId, y: insetP3.y + edgeDy * tId };
          const bottomMid = { x: (insetP3.x + insetP2.x) * 0.5, y: (insetP3.y + insetP2.y) * 0.5 };
          const inwardDx = insetCenter.x - bottomMid.x;
          const inwardDy = insetCenter.y - bottomMid.y;
          const inwardLen = Math.hypot(inwardDx, inwardDy) || 1;
          const inward = { x: inwardDx / inwardLen, y: inwardDy / inwardLen };
          const pushIn = 9;
          const levelX = levelBase.x + inward.x * pushIn;
          const levelY = levelBase.y + inward.y * pushIn;
          const idX = idBase.x + inward.x * pushIn;
          const idY = idBase.y + inward.y * pushIn;
          add(
            "text",
            {
              class: "tile-room-level-inline",
              style: "fill:" + layerVisual.levelFill + ";",
              x: levelX,
              y: levelY,
              transform: isoTextTransform(levelX, levelY)
            },
            levelLabel
          );
          add(
            "text",
            {
              class: "tile-room-id-inline",
              style: "fill:" + layerVisual.titleFill + ";",
              x: idX,
              y: idY,
              transform: isoTextTransform(idX, idY)
            },
            idLabel
          );
          if (room.id === currentPlayerNodeId()) {
            const markerW = 54;
            const markerH = 72;
            const markerX = insetCenter.x - markerW * 0.5;
            const markerY = insetCenter.y - markerH + 14;
            add("image", {
              class: "player-marker",
              id: "player-map-marker",
              href: "assets/gfx/maps/playercharacter.png",
              x: markerX.toFixed(2),
              y: markerY.toFixed(2),
              width: markerW,
              height: markerH,
              preserveAspectRatio: "xMidYMid meet"
            });
            if (Date.now() < playerPingUntil) {
              add("circle", {
                class: "player-marker-ping",
                cx: insetCenter.x.toFixed(2),
                cy: (markerY + markerH * 0.62).toFixed(2),
                r: 58,
                opacity: 1
              });
            }
          }
          }

          drawEdgeComparison(layerFilter, ({ fromLevel, toLevel }) => {
            return Number.isFinite(fromLevel) && Number.isFinite(toLevel) && fromLevel === level && toLevel === level;
          });
          const nextLevel = visibleLevels[i + 1];
          if (Number.isFinite(nextLevel) && nextLevel === level + 1) {
            drawEdgeComparison(layerFilter, ({ fromLevel, toLevel }) => {
              if (!Number.isFinite(fromLevel) || !Number.isFinite(toLevel)) return false;
              return (fromLevel === level && toLevel === nextLevel) || (fromLevel === nextLevel && toLevel === level);
            });
          }
        }
        drawEdgeComparison(layerFilter, ({ edge, fromLevel, toLevel, isVertical }) => {
          if (isVertical || edge.edgeStyle !== "puzzle") return false;
          if (!Number.isFinite(fromLevel) || !Number.isFinite(toLevel)) return false;
          return Math.abs(fromLevel - toLevel) > 1;
        });
        drawEdgeComparison(layerFilter, ({ fromLevel, toLevel, isVertical }) => {
          if (!isVertical) return false;
          if (!Number.isFinite(fromLevel) || !Number.isFinite(toLevel)) return false;
          if (Math.abs(fromLevel - toLevel) <= 1) return false;
          if (!Number.isFinite(layerRender.focusLevel)) return false;
          return fromLevel === layerRender.focusLevel || toLevel === layerRender.focusLevel;
        });
        // Fallback for views where no room crosses the L0 boundary in this pass
        // (for example all-below, all-hidden, or sparse-filtered selections).
        if (!groundOverlayDrawn) {
          drawCampusGroundOverlay(showRoads, layerFilter, showBuildingArtwork);
        }
      }

      function getVisibleCenterByLocationId(layerFilter, options = {}) {
        const layerRender = buildLayerRenderContext(layerFilter);
        const includeUnrevealed = !!options.includeUnrevealed;
        const centerByLocationId = new Map();
        const centerByNodeId = new Map();
        const visibleRooms = ROOM_TILE_METADATA
          .filter((room) => !MAP_HIDDEN_ROOM_IDS.has(room.id))
          .filter((room) => includeUnrevealed || isRoomRevealed(room))
          .filter((room) => layerRender.includeRoom(room));
        for (const room of visibleRooms) {
          const center = tileCenter(room.tile.c, room.tile.rank);
          const layerOffsetY = layerRender.layerOffsetY(room);
          const corners = tileCorners(room.tile.c, room.tile.rank);
          const shiftedCorners = [corners.p0, corners.p1, corners.p2, corners.p3].map((p) => ({
            x: p.x,
            y: p.y + layerOffsetY
          }));
          const centerEntry = {
            x: center.x,
            y: center.y + layerOffsetY,
            layerOffsetY,
            relativeLevel: layerRender.relativeLevel(room),
            absoluteLevel: layerToLevel(room.layer),
            c: room.tile.c,
            rank: room.tile.rank,
            corners: shiftedCorners
          };
          centerByNodeId.set(room.id, centerEntry);
          if (typeof room.locationId === "number") {
            centerByLocationId.set(room.locationId, centerEntry);
          }
        }
        return { centerByLocationId, centerByNodeId };
      }

      function buildEdgeComparisonSet() {
        const presentationEdges = [];
        for (const room of MAP_MODEL.rooms) {
          const fromId = LOCATION_ID_BY_NODE_ID[room.id];
          if (typeof fromId !== "number") continue;
          for (const edge of room.edges || []) {
            const toId = LOCATION_ID_BY_NODE_ID[edge.to];
            if (typeof toId !== "number") continue;
            presentationEdges.push({
              from: fromId,
              to: toId,
              fromNodeId: room.id,
              toNodeId: edge.to,
              command: String(edge.label || ""),
              presentationType: String(edge.type || ""),
              source: "presentation"
            });
          }
        }

        const pairKey = (e) => e.from + "->" + e.to;
        const edgeKey = (e) => e.from + "->" + e.to + "|" + String(e.command || "").toLowerCase() + "|" + e.source;
        const intrinsicOneWay = (edge) => edge.from === 210 && edge.to === 180;
        const discoveredOneWay = (edge) => {
          if (!isInGameMode()) return intrinsicOneWay(edge);
          if (!edge.fromNodeId || !edge.toNodeId) return false;
          const key = discoveryLinkKey(edge.fromNodeId, edge.toNodeId);
          const link = [...discoveryState.knownLinks, ...discoveryState.traversedLinks].find((candidate) =>
            discoveryLinkKey(candidate.fromNodeId, candidate.toNodeId) === key
          );
          return !!(link && link.oneWay);
        };
        const presentationPairSet = new Set(presentationEdges.map(pairKey));
        const enginePairSet = new Set(ENGINE_EDGE_SNAPSHOT.map(pairKey));
        const suppressedEnginePairSet = new Set([
          "34->221"
        ]);
        const wetInsetLocationIds = new Set([15, 51, 87, 117, 131, 161, 164, 181, 184, 187, 232, 234]);
        const isSuppressedEngineEdge = (edge) => {
          if (suppressedEnginePairSet.has(pairKey(edge))) return true;
          const command = String(edge.command || "").toLowerCase();
          const isVerticalAlias = (command.includes("up") && !command.includes("down")) || command.includes("down");
          return isVerticalAlias && wetInsetLocationIds.has(edge.from) && wetInsetLocationIds.has(edge.to);
        };
        const combined = [];
        const seen = new Set();

        for (const edge of presentationEdges) {
          const typed = {
            ...edge,
            type: enginePairSet.has(pairKey(edge)) ? "match" : "presentation-only",
            edgeStyle: edge.presentationType === "puzzle" ? "puzzle" : "solid",
            oneWay: discoveredOneWay(edge)
          };
          const key = edgeKey(typed);
          if (seen.has(key)) continue;
          seen.add(key);
          combined.push(typed);
        }

        for (const edge of ENGINE_EDGE_SNAPSHOT) {
          if (isSuppressedEngineEdge(edge)) continue;
          if (presentationPairSet.has(pairKey(edge))) continue;
          const typed = {
            ...edge,
            source: "engine",
            type: "engine-only",
            edgeStyle: "solid",
            oneWay: discoveredOneWay(edge)
          };
          const key = edgeKey(typed);
          if (seen.has(key)) continue;
          seen.add(key);
          combined.push(typed);
        }

        if (isInGameMode()) {
          const existingNodePairKeys = new Set(combined.map((edge) =>
            edge.fromNodeId && edge.toNodeId ? discoveryLinkKey(edge.fromNodeId, edge.toNodeId) : ""
          ));
          for (const link of [...discoveryState.knownLinks, ...discoveryState.traversedLinks]) {
            const key = discoveryLinkKey(link.fromNodeId, link.toNodeId);
            if (!key || existingNodePairKeys.has(key)) continue;
            const fromLocation = LOCATION_ID_BY_NODE_ID[link.fromNodeId];
            const toLocation = LOCATION_ID_BY_NODE_ID[link.toNodeId];
            if (typeof fromLocation !== "number" || typeof toLocation !== "number") continue;
            existingNodePairKeys.add(key);
            combined.push({
              from: fromLocation,
              to: toLocation,
              fromNodeId: link.fromNodeId,
              toNodeId: link.toNodeId,
              command: link.command,
              presentationType: link.type,
              source: "discovery",
              type: "match",
              edgeStyle: link.type === "puzzle" ? "puzzle" : "solid",
              oneWay: !!link.oneWay
            });
          }
        }

        return combined;
      }

      function edgeDiscoveryStatus(edge) {
        if (!isInGameMode()) return "full";
        if (!edge || !edge.fromNodeId || !edge.toNodeId) return "hidden";
        const fromNodeId = String(edge.fromNodeId);
        const toNodeId = String(edge.toNodeId);
        const key = discoveryLinkKey(fromNodeId, toNodeId);
        const known = discoveryState.knownLinks.some((link) => discoveryLinkKey(link.fromNodeId, link.toNodeId) === key);
        const traversed = discoveryState.traversedLinks.some((link) => discoveryLinkKey(link.fromNodeId, link.toNodeId) === key);
        const fromVisited = discoveryState.visitedNodeIds.has(fromNodeId);
        const toVisited = discoveryState.visitedNodeIds.has(toNodeId);
        if (traversed || (known && fromVisited && toVisited)) return "full";
        if (known && fromVisited) return "stub";
        return "hidden";
      }

      function drawEdgeComparison(layerFilter, edgeLevelPredicate) {
        const layerRender = buildLayerRenderContext(layerFilter);
        const { centerByLocationId, centerByNodeId } = getVisibleCenterByLocationId(layerFilter, {
          includeUnrevealed: isInGameMode()
        });
        const edgeSet = buildEdgeComparisonSet();
        const edgeClassByType = {
          match: "edge-compare edge-match",
          "engine-only": "edge-compare edge-engine-only",
          "presentation-only": "edge-compare edge-presentation-only"
        };
        const edgeVisualClass = (edge, depthClass) => {
          const styleClass = edge.edgeStyle === "puzzle" ? " edge-puzzle" : "";
          return (edgeClassByType[edge.type] || "edge-compare edge-match") + " " + depthClass + styleClass;
        };

        const primaryDir = (command) => {
          const s = String(command || "").toLowerCase();
          if (s.includes("west")) return "west";
          if (s.includes("east")) return "east";
          if (s.includes("north")) return "north";
          if (s.includes("south")) return "south";
          return null;
        };
        const verticalDir = (command) => {
          const s = String(command || "").toLowerCase();
          if (s.includes("up") && !s.includes("down")) return "up";
          if (s.includes("down")) return "down";
          return null;
        };

        const centerAtGrid = (c, rank, layerOffsetY) => {
          const p = tileCenter(c, rank);
          return { x: p.x, y: p.y + (layerOffsetY || 0) };
        };

        // Route bends in tile-space, so corners follow the map's projected grid axes.
        const orthogonalPolyline = (from, to, dir) => {
          const hasGrid = Number.isFinite(from.c) && Number.isFinite(from.rank) && Number.isFinite(to.c) && Number.isFinite(to.rank);
          if (!hasGrid) {
            return [{ x: from.x, y: from.y }, { x: to.x, y: to.y }];
          }

          if ((dir === "west" || dir === "east") && Math.abs(from.rank - to.rank) > 0.001) {
            const midC = (from.c + to.c) / 2;
            const p1 = centerAtGrid(midC, from.rank, from.layerOffsetY);
            const p2 = centerAtGrid(midC, to.rank, to.layerOffsetY);
            return [{ x: from.x, y: from.y }, p1, p2, { x: to.x, y: to.y }];
          }
          if ((dir === "north" || dir === "south") && Math.abs(from.c - to.c) > 0.001) {
            const midR = (from.rank + to.rank) / 2;
            const p1 = centerAtGrid(from.c, midR, from.layerOffsetY);
            const p2 = centerAtGrid(to.c, midR, to.layerOffsetY);
            return [{ x: from.x, y: from.y }, p1, p2, { x: to.x, y: to.y }];
          }
          return [{ x: from.x, y: from.y }, { x: to.x, y: to.y }];
        };
        const polylinePath = (points) =>
          points.map((p, i) => (i === 0 ? "M " : "L ") + p.x + " " + p.y).join(" ");
        const pointAlongPolyline = (points, ratio) => {
          if (!Array.isArray(points) || points.length < 2) return null;
          const clampedRatio = Math.max(0, Math.min(1, ratio));
          let total = 0;
          for (let i = 1; i < points.length; i += 1) {
            total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
          }
          if (total <= 0) return null;
          let target = total * clampedRatio;
          for (let i = 1; i < points.length; i += 1) {
            const a = points[i - 1];
            const b = points[i];
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            if (len <= 0) continue;
            if (target <= len) {
              const t = target / len;
              return {
                point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
                tangent: { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
              };
            }
            target -= len;
          }
          const last = points[points.length - 1];
          const prev = points[points.length - 2];
          const len = Math.hypot(last.x - prev.x, last.y - prev.y) || 1;
          return {
            point: { x: last.x, y: last.y },
            tangent: { x: (last.x - prev.x) / len, y: (last.y - prev.y) / len }
          };
        };
        const drawOneWayBar = (points, edge) => {
          if (!edge.oneWay) return;
          const marker = pointAlongPolyline(points, 0.75);
          if (!marker) return;
          const barHalfLength = 13;
          const nx = -marker.tangent.y;
          const ny = marker.tangent.x;
          add("line", {
            class: "edge-one-way-bar",
            x1: marker.point.x - nx * barHalfLength,
            y1: marker.point.y - ny * barHalfLength,
            x2: marker.point.x + nx * barHalfLength,
            y2: marker.point.y + ny * barHalfLength
          });
        };
        const lineIntersection = (a, b, c, d) => {
          const r = { x: b.x - a.x, y: b.y - a.y };
          const s = { x: d.x - c.x, y: d.y - c.y };
          const denom = r.x * s.y - r.y * s.x;
          if (Math.abs(denom) < 1e-6) return null;
          const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denom;
          const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / denom;
          if (t < 0 || u < 0 || u > 1) return null;
          return { x: a.x + t * r.x, y: a.y + t * r.y, t };
        };
        const edgePointToward = (node, toward) => {
          if (!node || !Array.isArray(node.corners) || node.corners.length < 4) return { x: node.x, y: node.y };
          const center = { x: node.x, y: node.y };
          let best = null;
          for (let i = 0; i < 4; i += 1) {
            const pA = node.corners[i];
            const pB = node.corners[(i + 1) % 4];
            const hit = lineIntersection(center, toward, pA, pB);
            if (!hit) continue;
            if (!best || hit.t < best.t) best = hit;
          }
          return best ? { x: best.x, y: best.y } : center;
        };
        const topMid = (node) =>
          node && node.corners && node.corners[0] && node.corners[1]
            ? { x: (node.corners[0].x + node.corners[1].x) * 0.5, y: (node.corners[0].y + node.corners[1].y) * 0.5 }
            : { x: node.x, y: node.y };
        const bottomMid = (node) =>
          node && node.corners && node.corners[2] && node.corners[3]
            ? { x: (node.corners[2].x + node.corners[3].x) * 0.5, y: (node.corners[2].y + node.corners[3].y) * 0.5 }
            : { x: node.x, y: node.y };
        const centerPoint = (node) => ({ x: node.x, y: node.y });
        const downVisibleLength = (node) => {
          const exit = bottomMid(node);
          const hiddenInside = Math.max(0, exit.y - node.y);
          return Math.max(24, verticalEdgeLength - hiddenInside);
        };

        // Up/down edges are drawn as straight vertical screen lines.
        // Keep length aligned with visible layer separation.
        const verticalEdgeLength = layerRender.layerStep;
        const verticalLoopSlots = new Map();
        const renderedVerticalPairs = new Set();
        const renderedHorizontalPairs = new Set();
        const edgeDepthClass = (from, to) => {
          const fromDepth = Math.abs(Number(from?.relativeLevel || 0));
          const toDepth = Math.abs(Number(to?.relativeLevel || 0));
          if (fromDepth < 0.25 || (to && toDepth < 0.25)) return "edge-depth-focus";
          const depth = to ? (fromDepth + toDepth) * 0.5 : fromDepth;
          if (depth < 0.25) return "edge-depth-focus";
          if (depth < 0.75) return "edge-depth-near";
          return "edge-depth-far";
        };
        const verticalLineLength = (from, to, dir) => {
          const layerDelta =
            to && Number.isFinite(from?.absoluteLevel) && Number.isFinite(to.absoluteLevel)
              ? Math.max(1, Math.abs(to.absoluteLevel - from.absoluteLevel))
              : 1;
          if (dir === "down") {
            return downVisibleLength(from) + Math.max(0, layerDelta - 1) * verticalEdgeLength;
          }
          if (to && Number.isFinite(from?.absoluteLevel) && Number.isFinite(to.absoluteLevel)) {
            return layerDelta * verticalEdgeLength;
          }
          return verticalEdgeLength;
        };
        const curvedVerticalLoopPath = (from, dir, slot) => {
          const band = Math.floor(slot / 2);
          const spread = 26 + band * 8;
          const rise = 44 + band * 10;
          const bias = dir === "up" ? -1 : 1;
          const anchor = dir === "up" ? centerPoint(from) : bottomMid(from);
          const anchorX = centerPoint(from).x;
          const x = anchor.x;
          const y = anchor.y;
          const cx = anchorX;
          const yPeak = y + bias * rise;
          return (
            "M " +
            cx +
            " " +
            y +
            " C " +
            (cx - spread) +
            " " +
            (y + bias * 12) +
            ", " +
            (cx - spread) +
            " " +
            yPeak +
            ", " +
            cx +
            " " +
            yPeak +
            " C " +
            (cx + spread) +
            " " +
            yPeak +
            ", " +
            (cx + spread) +
            " " +
            (y + bias * 12) +
            ", " +
            cx +
            " " +
            y
          );
        };

        for (const edge of edgeSet) {
          const from = edge.fromNodeId ? centerByNodeId.get(edge.fromNodeId) : centerByLocationId.get(edge.from);
          if (!from) continue;
          const vDir = verticalDir(edge.command);
          const to = edge.toNodeId ? centerByNodeId.get(edge.toNodeId) : centerByLocationId.get(edge.to);
          const discoveryStatus = edgeDiscoveryStatus(edge);
          if (discoveryStatus === "hidden") continue;
          const fromLevel = Number.isFinite(from.absoluteLevel) ? from.absoluteLevel : null;
          const toLevel = to && Number.isFinite(to.absoluteLevel) ? to.absoluteLevel : null;
          if (
            typeof edgeLevelPredicate === "function" &&
            !edgeLevelPredicate({
              edge,
              from,
              to,
              fromLevel,
              toLevel,
              isVertical: Boolean(vDir)
            })
          ) {
            continue;
          }
          // Exception: for Tunnel Entrance (34) <-> Muddy Tunnel (39),
          // render only horizontal aliases (east/west) and suppress up/down.
          const isTunnelMuddyPair =
            (edge.from === 34 && edge.to === 39) ||
            (edge.from === 39 && edge.to === 34);
          if (isTunnelMuddyPair && vDir) {
            continue;
          }
          // Manual suppression: Fruits and Nuts (150) <-> Cluttered Passage (179)
          // vertical aliases are noisy here; keep the canonical horizontal link only.
          const isFnCpPair =
            (edge.from === 150 && edge.to === 179) ||
            (edge.from === 179 && edge.to === 150);
          if (isFnCpPair && vDir) {
            continue;
          }
          if (vDir) {
            const verticalPairKey =
              edge.from < edge.to ? edge.from + "<->" + edge.to : edge.to + "<->" + edge.from;
            if (renderedVerticalPairs.has(verticalPairKey)) {
              continue;
            }
            renderedVerticalPairs.add(verticalPairKey);
            const isWet1Up = vDir === "up" && edge.from === 187;
            const isWet5Down = vDir === "down" && edge.from === 234;
            const wetLoopSourceIds = new Set([164, 15, 131, 117, 87, 51, 232, 161, 184]); // wet2..4 + wet6..11
            const isWetLoopVertical = wetLoopSourceIds.has(edge.from);
            if (isWet1Up || isWet5Down) {
              const len = verticalLineLength(from, to, vDir);
              const delta = vDir === "up" ? -len : len;
              const anchor = vDir === "up" ? centerPoint(from) : bottomMid(from);
              const sx = centerPoint(from).x;
              const sy = anchor.y;
              const d = "M " + sx + " " + sy + " L " + sx + " " + (sy + delta);
              const depthClass = edgeDepthClass(from, to);
              add("path", {
                class: edgeVisualClass(edge, depthClass),
                d
              });
              continue;
            }
            if (isWetLoopVertical) {
              const slotKey =
                String(Math.round(from.x)) + ":" + String(Math.round(from.y)) + ":" + vDir;
              const slot = verticalLoopSlots.get(slotKey) || 0;
              verticalLoopSlots.set(slotKey, slot + 1);
              const d = curvedVerticalLoopPath(from, vDir, slot);
              const depthClass = edgeDepthClass(from, null);
              add("path", {
                class: edgeVisualClass(edge, depthClass),
                d
              });
              continue;
            }
            const len = verticalLineLength(from, to, vDir);
            const visibleLen = discoveryStatus === "stub" ? Math.min(len, 96) * 0.62 : len;
            const delta = vDir === "up" ? -visibleLen : visibleLen;
            const anchor = vDir === "up" ? centerPoint(from) : bottomMid(from);
            const sx = centerPoint(from).x;
            const sy = anchor.y;
            const d = "M " + sx + " " + sy + " L " + sx + " " + (sy + delta);
            const depthClass = edgeDepthClass(from, to);
            add("path", {
              class: edgeVisualClass(edge, depthClass),
              d
            });
            continue;
          }
          if (!to) continue;
          const horizontalPairKey = edge.oneWay
            ? edge.from + "->" + edge.to
            : edge.from < edge.to
              ? edge.from + "<->" + edge.to
              : edge.to + "<->" + edge.from;
          if (renderedHorizontalPairs.has(horizontalPairKey)) {
            continue;
          }
          renderedHorizontalPairs.add(horizontalPairKey);
          const points = orthogonalPolyline(from, to, primaryDir(edge.command));
          if (points.length >= 2) {
            points[0] = edgePointToward(from, points[1]);
            points[points.length - 1] = edgePointToward(to, points[points.length - 2]);
          }
          const visiblePoints = discoveryStatus === "stub" ? (() => {
            const stubEnd = pointAlongPolyline(points, 0.34);
            return stubEnd ? [points[0], stubEnd.point] : points.slice(0, 2);
          })() : points;
          const d = polylinePath(visiblePoints);
          const depthClass = edgeDepthClass(from, to);
          add("path", {
            class: edgeVisualClass(edge, depthClass),
            d
          });
          if (discoveryStatus === "full" || discoveryStatus === "stub") drawOneWayBar(visiblePoints, edge);
        }
      }

      function blockPoints(block) {
        if (block.bounds) {
          const c0 = Math.min(block.bounds.tl.c, block.bounds.br.c);
          const c1 = Math.max(block.bounds.tl.c, block.bounds.br.c);
          const rankTop = Math.max(block.bounds.tl.rank, block.bounds.br.rank);
          const rankBottom = Math.min(block.bounds.tl.rank, block.bounds.br.rank);
          const spanCols = c1 - c0;
          const spanRows = rankTop - rankBottom;

          const p0 = anchorAtTile(c0, rankTop);
          // Include both:
          // - tile footprint (ISO_BASIS_*)
          // - gutter spacing between adjacent tile anchors (STEP_*)
          const p1 = {
            x: p0.x + spanCols * STEP_E.dx + ISO_BASIS_E.dx,
            y: p0.y + spanCols * STEP_E.dy + ISO_BASIS_E.dy
          };
          const p3 = {
            x: p0.x + spanRows * STEP_S.dx + ISO_BASIS_S.dx,
            y: p0.y + spanRows * STEP_S.dy + ISO_BASIS_S.dy
          };
          const p2 = {
            x: p1.x + spanRows * STEP_S.dx + ISO_BASIS_S.dx,
            y: p1.y + spanRows * STEP_S.dy + ISO_BASIS_S.dy
          };
          return [p0, p1, p2, p3];
        }

        const len = (v) => Math.hypot(v.dx, v.dy) || 1;
        const UNIT_E = { dx: ISO_BASIS_E.dx / len(ISO_BASIS_E), dy: ISO_BASIS_E.dy / len(ISO_BASIS_E) };
        const N_AXIS = { dx: -ISO_BASIS_S.dx, dy: -ISO_BASIS_S.dy };
        const UNIT_N = { dx: N_AXIS.dx / len(N_AXIS), dy: N_AXIS.dy / len(N_AXIS) };
        if (
          !Number.isFinite(block.x) ||
          !Number.isFinite(block.y) ||
          !Number.isFinite(block.w) ||
          !Number.isFinite(block.h)
        ) {
          return [];
        }
        const u = block.orient === "N" ? UNIT_N : UNIT_E;
        const v = block.orient === "N" ? UNIT_E : UNIT_N;
        const p0 = { x: block.x, y: block.y };
        const p1 = { x: p0.x + u.dx * block.w, y: p0.y + u.dy * block.w };
        const p3 = { x: p0.x + v.dx * block.h, y: p0.y + v.dy * block.h };
        const p2 = { x: p1.x + v.dx * block.h, y: p1.y + v.dy * block.h };
        return [p0, p1, p2, p3];
      }

      function drawCampusLayout(showRoads, layerFilter, suppressGroundOverlay, showBuildingArtwork = true) {
        const normalize = (v) => {
          const d = Math.hypot(v.x, v.y) || 1;
          return { x: v.x / d, y: v.y / d };
        };
        const expandParallelogram = (pts, pad) => {
          if (!pts || pts.length !== 4) return pts;
          const p0 = pts[0];
          const p1 = pts[1];
          const p2 = pts[2];
          const p3 = pts[3];
          const u = normalize({ x: p1.x - p0.x, y: p1.y - p0.y });
          const v = normalize({ x: p3.x - p0.x, y: p3.y - p0.y });
          return [
            { x: p0.x - u.x * pad - v.x * pad, y: p0.y - u.y * pad - v.y * pad },
            { x: p1.x + u.x * pad - v.x * pad, y: p1.y + u.y * pad - v.y * pad },
            { x: p2.x + u.x * pad + v.x * pad, y: p2.y + u.y * pad + v.y * pad },
            { x: p3.x - u.x * pad + v.x * pad, y: p3.y - u.y * pad + v.y * pad }
          ];
        };
        const drawBlockSideLabel = (pts, label, sub, placement) => {
          if (!label) return;
          // Left side of the projected block is p0 -> p3.
          const a = pts[0];
          const b = pts[3];
          const center = {
            x: (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4,
            y: (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4
          };
          const edgeMid = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
          const edgeDir = normalize({ x: b.x - a.x, y: b.y - a.y });
          const inward = normalize({ x: center.x - edgeMid.x, y: center.y - edgeMid.y });
          const placeOutside = placement === "outside";
          const depth = placeOutside ? -34 : 36;

          let angle = (Math.atan2(edgeDir.y, edgeDir.x) * 180) / Math.PI;
          if (angle > 90) angle -= 180;
          if (angle < -90) angle += 180;

          const labelPos = {
            x: edgeMid.x + inward.x * depth,
            y: edgeMid.y + inward.y * depth
          };

          add(
            "text",
            {
              class: "campus-label-side",
              x: labelPos.x,
              y: labelPos.y,
              transform: "rotate(" + angle + " " + labelPos.x + " " + labelPos.y + ")"
            },
            label
          );

          if (sub) {
            const subPos = {
              x: labelPos.x + inward.x * 54,
              y: labelPos.y + inward.y * 54
            };
            add(
              "text",
              {
                class: "campus-sub-side",
                x: subPos.x,
                y: subPos.y,
                transform: "rotate(" + angle + " " + subPos.x + " " + subPos.y + ")"
              },
              sub
            );
          }
        };
        const drawBuildingBottomLabel = (pts, label, xShiftPx, placeInside) => {
          if (!label) return;
          // Bottom edge is p3 -> p2; place label just outside and below that edge.
          const bottomLeft = pts[3];
          const edgeMid = { x: (pts[3].x + pts[2].x) * 0.5, y: (pts[3].y + pts[2].y) * 0.5 };
          const center = {
            x: (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4,
            y: (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4
          };
          const outward = normalize({ x: edgeMid.x - center.x, y: edgeMid.y - center.y });
          const inward = { x: -outward.x, y: -outward.y };
          const xShift = Number.isFinite(xShiftPx) ? xShiftPx : 0;
          const inside = placeInside === true;
          const yBase = inside ? Math.max(pts[3].y, pts[2].y) - 22 : Math.max(pts[3].y, pts[2].y) + 14;
          const inset = inside ? 30 : 12;
          const shiftVec = inside ? inward : outward;
          const labelPos = {
            x: bottomLeft.x + 4 + shiftVec.x * inset + xShift,
            y: yBase + shiftVec.y * inset
          };
          add("text", { class: "campus-label-bottom", x: labelPos.x, y: labelPos.y }, label);
          return labelPos;
        };
        const drawCentralSubtitleInside = (pts, sub, titlePos) => {
          if (!sub) return;
          // Bottom-left inside anchor.
          const bottomMid = { x: (pts[3].x + pts[2].x) * 0.5, y: (pts[3].y + pts[2].y) * 0.5 };
          const center = {
            x: (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4,
            y: (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4
          };
          const inward = normalize({ x: center.x - bottomMid.x, y: center.y - bottomMid.y });
          const subPos = {
            x: titlePos && Number.isFinite(titlePos.x) ? titlePos.x : pts[3].x + 8,
            y: Math.max(pts[3].y, pts[2].y) - 18 + inward.y * 8
          };
          add("text", { class: "campus-sub-inside", x: subPos.x, y: subPos.y }, sub);
        };

        const layerRender = buildLayerRenderContext(layerFilter);
        const groundFloorOffsetY =
          layerRender.focusLevel == null ? 0 : layerRender.focusLevel * layerRender.layerStep;
        const buildingPad = TILE_GRID.cellW * 0.1;
        for (const block of CAMPUS_BLOCKS) {
          if (block.hidden) continue;
          if ((block.type === "road-h" || block.type === "road-v") && !showRoads) continue;
          const basePts = blockPoints(block).map((p) => ({ x: p.x, y: p.y + groundFloorOffsetY }));
          const pts =
            block.type === "building" || block.type === "building-central"
              ? expandParallelogram(basePts, buildingPad)
              : basePts;
          if (!pts.length) continue;
          const points = pts.map((p) => p.x + "," + p.y).join(" ");

          if (block.type === "road-h" || block.type === "road-v") {
            if (!suppressGroundOverlay) {
              add("polygon", { class: "campus-road", points });
              if (block.id === "smith") {
                drawBuildingBottomLabel(pts, block.label, ISO_BASIS_E.dx * 2, true);
              } else {
                drawBlockSideLabel(pts, block.label, null, "inside");
              }
            }
            continue;
          }

          const className =
            block.type === "building-central" ? "campus-building campus-central campus-accent" : "campus-building";
          add("polygon", { class: className, points });
          if (!suppressGroundOverlay) {
            if (block.id === "brown") {
              drawBlockSideLabel(pts, block.label, null, "outside");
            } else {
              const titlePos = drawBuildingBottomLabel(pts, block.label, 0);
              if (block.type === "building-central") {
                drawCentralSubtitleInside(pts, block.sub, titlePos);
              }
            }
          }
        }
        if (!suppressGroundOverlay && showBuildingArtwork) {
          drawBuildingOutlineOverlay(layerFilter);
        }
      }

      function drawBuildingOutlineOverlay(layerFilter) {
        const normalize = (v) => {
          const d = Math.hypot(v.x, v.y) || 1;
          return { x: v.x / d, y: v.y / d };
        };
        const expandParallelogram = (pts, pad) => {
          if (!pts || pts.length !== 4) return pts;
          const p0 = pts[0];
          const p1 = pts[1];
          const p2 = pts[2];
          const p3 = pts[3];
          const u = normalize({ x: p1.x - p0.x, y: p1.y - p0.y });
          const v = normalize({ x: p3.x - p0.x, y: p3.y - p0.y });
          return [
            { x: p0.x - u.x * pad - v.x * pad, y: p0.y - u.y * pad - v.y * pad },
            { x: p1.x + u.x * pad - v.x * pad, y: p1.y + u.y * pad - v.y * pad },
            { x: p2.x + u.x * pad + v.x * pad, y: p2.y + u.y * pad + v.y * pad },
            { x: p3.x - u.x * pad + v.x * pad, y: p3.y - u.y * pad + v.y * pad }
          ];
        };

        const layerRender = buildLayerRenderContext(layerFilter);
        const groundFloorOffsetY =
          layerRender.focusLevel == null ? 0 : layerRender.focusLevel * layerRender.layerStep;
        const buildingPad = TILE_GRID.cellW * 0.1;
        const focusLevel = Number.isFinite(layerRender.focusLevel) ? layerRender.focusLevel : 0;
        const upNorm = focusLevel > 0 ? Math.min(1, focusLevel / 4) : 0;
        const downNorm = focusLevel < 0 ? Math.min(1, Math.abs(focusLevel) / 6) : 0;
        const fadeT = Math.max(upNorm, downNorm);
        const lerp = (a, b, t) => a + (b - a) * t;
        const strokeR = Math.round(lerp(230, 112, fadeT));
        const strokeG = Math.round(lerp(234, 116, fadeT));
        const strokeB = Math.round(lerp(238, 122, fadeT));
        const strokeA = lerp(0.8, 0.62, fadeT);
        const dynamicStroke = "rgba(" + strokeR + "," + strokeG + "," + strokeB + "," + strokeA.toFixed(3) + ")";

        for (const block of CAMPUS_BLOCKS) {
          if (block.hidden) continue;
          if (block.type !== "building" && block.type !== "building-central") continue;
          const basePts = blockPoints(block).map((p) => ({ x: p.x, y: p.y + groundFloorOffsetY }));
          const pts = expandParallelogram(basePts, buildingPad);
          if (!pts || !pts.length) continue;
          const points = pts.map((p) => p.x + "," + p.y).join(" ");
          add("polygon", { class: "campus-building-outline-overlay", points, style: "stroke:" + dynamicStroke + ";" });
        }
      }

      function drawLegend(x, y, target, showBuildingArtwork) {
        const legendW = 520;
        const legendBodyH = 840;
        const extraTop = 60;
        const frameY = y - extraTop;
        const frameH = legendBodyH + extraTop;
        const iconW = 112;
        const iconH = 78;

        addLegendBlurPanel(x, frameY, legendW, frameH, target);
        add("rect", {
          class: "building-frame",
          x,
          y: frameY,
          width: legendW,
          height: frameH
        }, null, target);
        add("text", { class: "legend-title", x: x + 28, y: frameY + 70 }, "Legend", target);

        const buildingItems = [
          { label: "Central Complex", href: "assets/gfx/maps/central_building_overlay.png" },
          { label: "Brown Building", href: "assets/gfx/maps/brown_building_overlay.png" },
          { label: "Computer Center", href: "assets/gfx/maps/computer_center_overlay.png" },
          { label: "Temporary Lab", href: "assets/gfx/maps/temporary_lab_overlay.png" }
        ];
        const rowGap = 104;
        const startY = frameY + 112;
        buildingItems.forEach((item, index) => {
          const iconX = x + 28;
          const iconY = startY + index * rowGap;
          add(
            "rect",
            { class: "legend-building-icon-frame", x: iconX, y: iconY, width: iconW, height: iconH, rx: 8 },
            null,
            target
          );
          add(
            "image",
            {
              class: "legend-building-icon",
              href: item.href,
              x: iconX + 8,
              y: iconY + 8,
              width: iconW - 16,
              height: iconH - 16,
              preserveAspectRatio: "xMidYMid meet"
            },
            null,
            target
          );
          add("text", { class: "legend-building-label", x: iconX + iconW + 24, y: iconY + iconH * 0.5 }, item.label, target);
        });

        const roadY = startY + buildingItems.length * rowGap + 20;
        add("rect", { class: "campus-road", x: x + 28, y: roadY, width: iconW, height: 34, rx: 10 }, null, target);
        add("text", { class: "legend-building-label", x: x + iconW + 52, y: roadY + 18 }, "Street / road", target);

        const playerY = roadY + 82;
        const playerAction = add("g", { class: "legend-action", tabindex: 0, role: "button", "aria-label": "Show current location" }, null, target);
        add("rect", {
          class: "legend-action-hit",
          x: x + 18,
          y: playerY - 10,
          width: legendW - 36,
          height: iconH + 20,
          rx: 8
        }, null, playerAction);
        add("rect", { class: "legend-building-icon-frame", x: x + 28, y: playerY, width: iconW, height: iconH, rx: 8 }, null, playerAction);
        add(
          "image",
          {
            class: "player-marker",
            href: "assets/gfx/maps/playercharacter.png",
            x: x + 28 + iconW * 0.5 - 27,
            y: playerY + iconH * 0.5 - 36,
            width: 54,
            height: 72,
            preserveAspectRatio: "xMidYMid meet"
          },
          null,
          playerAction
        );
        add("text", { class: "legend-building-label", x: x + iconW + 52, y: playerY + iconH * 0.5 }, "Current location", playerAction);
        const targetX = x + legendW - 34;
        const targetY = playerY + iconH * 0.5;
        add("circle", { class: "legend-action-target", cx: targetX, cy: targetY, r: 15 }, null, playerAction);
        add("line", { class: "legend-action-target", x1: targetX - 23, y1: targetY, x2: targetX - 9, y2: targetY }, null, playerAction);
        add("line", { class: "legend-action-target", x1: targetX + 9, y1: targetY, x2: targetX + 23, y2: targetY }, null, playerAction);
        add("line", { class: "legend-action-target", x1: targetX, y1: targetY - 23, x2: targetX, y2: targetY - 9 }, null, playerAction);
        add("line", { class: "legend-action-target", x1: targetX, y1: targetY + 9, x2: targetX, y2: targetY + 23 }, null, playerAction);
        playerAction.addEventListener("click", (event) => {
          event.stopPropagation();
          focusPlayerLocation();
        });
        playerAction.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          focusPlayerLocation();
        });

        const addLegendToggle = (toggleY, text, checked, onChange) => {
          const fo = add(
            "foreignObject",
            {
              x: x + 28,
              y: toggleY,
              width: legendW - 56,
              height: 74,
              "pointer-events": "auto"
            },
            null,
            target
          );
          const label = document.createElementNS("http://www.w3.org/1999/xhtml", "label");
          label.style.display = "flex";
          label.style.alignItems = "center";
          label.style.gap = "18px";
          label.style.height = "100%";
          label.style.color = "rgba(234, 238, 244, 0.9)";
          label.style.font = "34px Georgia, 'Times New Roman', serif";
          label.style.cursor = "pointer";
          label.style.userSelect = "none";
          const input = document.createElementNS("http://www.w3.org/1999/xhtml", "input");
          input.setAttribute("type", "checkbox");
          input.checked = Boolean(checked);
          input.style.width = "34px";
          input.style.height = "34px";
          input.style.accentColor = "#d8cfb3";
          input.addEventListener("change", (event) => {
            onChange(!!event.target.checked);
            draw();
          });
          const span = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
          span.textContent = text;
          label.appendChild(input);
          label.appendChild(span);
          fo.appendChild(label);
        };

        addLegendToggle(playerY + 104, "Show building overlays", showBuildingArtwork, (checked) => {
          buildingArtworkVisible = checked;
        });
        addLegendToggle(playerY + 176, "Show tile grid", tileGridVisible, (checked) => {
          tileGridVisible = checked;
        });
      }

      function drawDirectionArrow(x, y, dx, dy, label, stroke, target) {
        add("line", { class: "dir-line", x1: x, y1: y, x2: x + dx, y2: y + dy, stroke }, null, target);
        add(
          "text",
          { class: "dir-label", x: x + dx + Math.sign(dx || 1) * 18, y: y + dy + (dy < 0 ? -8 : 14) },
          label,
          target
        );
      }

      function addLegendBlurPanel(x, y, w, h, target) {
        const fo = add(
          "foreignObject",
          {
            x,
            y,
            width: w,
            height: h,
            "pointer-events": "none"
          },
          null,
          target
        );
        const div = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.borderRadius = "14px";
        div.style.background = "rgba(18, 18, 18, 0.22)";
        div.style.backdropFilter = "blur(6px)";
        div.style.webkitBackdropFilter = "blur(6px)";
        fo.appendChild(div);
      }

      function drawPlacementGridAndLegend(showGrid, showLegend, x, y, target) {
        const gridX0 = TILE_GRID.originX;
        const gridY0 = TILE_GRID.originY;
        const anchorAt = (c, r) => ({
          x: gridX0 + c * STEP_E.dx + r * STEP_S.dx,
          y: gridY0 + c * STEP_E.dy + r * STEP_S.dy
        });

        if (showGrid) {
          const gridLayer = add("g", { class: "map-fit-ignore tile-grid-layer" });
          for (let c = 0; c < TILE_GRID.cols; c += 1) {
            for (let r = 0; r < TILE_GRID.rows; r += 1) {
              const p0 = anchorAt(c, r);
              const p1 = { x: p0.x + ISO_BASIS_E.dx, y: p0.y + ISO_BASIS_E.dy };
              const p3 = { x: p0.x + ISO_BASIS_S.dx, y: p0.y + ISO_BASIS_S.dy };
              const p2 = { x: p1.x + ISO_BASIS_S.dx, y: p1.y + ISO_BASIS_S.dy };
              const className = "tile-grid-cell";
              add("polygon", {
                class: className,
                points: p0.x + "," + p0.y + " " + p1.x + "," + p1.y + " " + p2.x + "," + p2.y + " " + p3.x + "," + p3.y
              }, null, gridLayer);

              const center = {
                x: p0.x + (ISO_BASIS_E.dx + ISO_BASIS_S.dx) * 0.5,
                y: p0.y + (ISO_BASIS_E.dy + ISO_BASIS_S.dy) * 0.5
              };
              const file = colToLetters(c);
              const rank = TILE_GRID.rows - r; // A1 = bottom-left
              add("text", { class: "tile-grid-coord", x: center.x, y: center.y }, file + rank, gridLayer);
            }
          }
          for (let c = 0; c <= TILE_GRID.cols; c += 1) {
            for (let r = 0; r <= TILE_GRID.rows; r += 1) {
              const p = anchorAt(c, r);
              add("circle", {
                class: "tile-grid-point",
                cx: p.x,
                cy: p.y,
                r: 2.2
              }, null, gridLayer);
            }
          }
        }

        const legendW = 940;
        const legendH = 620;
        const legendX = x;
        const legendY = y;
        const vx = legendX + 300;
        const vy = legendY + 430;

        if (showLegend) {
          addLegendBlurPanel(legendX, legendY, legendW, legendH, target);
          add("rect", { class: "building-frame", x: legendX, y: legendY, width: legendW, height: legendH }, null, target);
          add("text", { class: "legend-title", x: legendX + 20, y: legendY + 72 }, "Tile Direction Grid", target);
          // Intentionally omit technical/debug metadata from the on-screen legend.
          add("circle", { class: "tile-grid-point", cx: vx, cy: vy, r: 4 }, null, target);
          add("text", { class: "grid-meta-label", x: vx + 70, y: vy + 6 }, "origin", target);

          const scale = 0.55;
          drawDirectionArrow(vx, vy, DIRECTION_VECTORS.N.dx * scale, DIRECTION_VECTORS.N.dy * scale, "N", "#8fb9cf", target);
          drawDirectionArrow(vx, vy, DIRECTION_VECTORS.NE.dx * scale, DIRECTION_VECTORS.NE.dy * scale, "NE", "#8fb9cf", target);
          drawDirectionArrow(vx, vy, DIRECTION_VECTORS.E.dx * scale, DIRECTION_VECTORS.E.dy * scale, "E", "#8fb9cf", target);
          drawDirectionArrow(vx, vy, DIRECTION_VECTORS.SE.dx * scale, DIRECTION_VECTORS.SE.dy * scale, "SE", "#8fb9cf", target);
          drawDirectionArrow(vx, vy, DIRECTION_VECTORS.S.dx * scale, DIRECTION_VECTORS.S.dy * scale, "S", "#8fb9cf", target);
          drawDirectionArrow(vx, vy, DIRECTION_VECTORS.SW.dx * scale, DIRECTION_VECTORS.SW.dy * scale, "SW", "#8fb9cf", target);
          drawDirectionArrow(vx, vy, DIRECTION_VECTORS.W.dx * scale, DIRECTION_VECTORS.W.dy * scale, "W", "#8fb9cf", target);
          drawDirectionArrow(vx, vy, DIRECTION_VECTORS.NW.dx * scale, DIRECTION_VECTORS.NW.dy * scale, "NW", "#8fb9cf", target);
          drawDirectionArrow(vx + 240, vy, DIRECTION_VECTORS.UP.dx, DIRECTION_VECTORS.UP.dy * 0.55, "UP", "#d8cfb3", target);
          drawDirectionArrow(vx + 240, vy, DIRECTION_VECTORS.DOWN.dx, DIRECTION_VECTORS.DOWN.dy * 0.55, "DOWN", "#d8cfb3", target);
        }
      }

      function drawLegendParts(options = {}) {
        const showLegend = options.showLegend !== false;
        const showGrid = !!options.showGrid;
        const hudScale = Number.isFinite(options.hudScale) ? options.hudScale : 0.33;
        const hudPadding = Number.isFinite(options.hudPadding) ? options.hudPadding : 20;
        const legendW = 520;
        const legendH = 900;
        const tileLegendW = 940;
        const tileLegendH = 620;
        const hudTotalW = Math.max(legendW, tileLegendW);
        const hudTotalH = legendH + 12 + tileLegendH;
        const viewBoxHeight = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal.height : 980;
        const legendX = hudPadding;
        const legendY = Math.max(hudPadding, viewBoxHeight - hudTotalH * hudScale - hudPadding);
        const tileLegendX = 0;
        const tileLegendY = legendH + 12;
        legendLayer.setAttribute("transform", "translate(" + legendX.toFixed(2) + " " + legendY.toFixed(2) + ") scale(" + hudScale + ")");
        if (shouldDrawMainLegend(showLegend)) {
          drawLegend(0, 0, legendLayer, buildingArtworkVisible);
        }
        if (shouldDrawTileLegend(showLegend, showGrid)) {
          drawPlacementGridAndLegend(showGrid, showLegend, tileLegendX, tileLegendY, legendLayer);
        }
      }

      function draw() {
        svg.innerHTML = "";
        viewport = null;
        uiLayer = null;
        legendLayer = null;
        svgDefs = null;
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        svg.appendChild(defs);
        svgDefs = defs;
        viewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
        viewport.setAttribute("id", "viewport");
        svg.appendChild(viewport);
        uiLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        uiLayer.setAttribute("id", "ui-layer");
        svg.appendChild(uiLayer);
        legendLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        legendLayer.setAttribute("id", "legend-layer");
        uiLayer.appendChild(legendLayer);

        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", "arrow");
        marker.setAttribute("viewBox", "0 0 10 10");
        marker.setAttribute("refX", "9");
        marker.setAttribute("refY", "5");
        marker.setAttribute("markerWidth", "8");
        marker.setAttribute("markerHeight", "8");
        marker.setAttribute("orient", "auto-start-reverse");
        defs.appendChild(marker);
        const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        arrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
        arrowPath.setAttribute("fill", "#d8cfb3");
        marker.appendChild(arrowPath);

        const enterMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        enterMarker.setAttribute("id", "arrow-enter");
        enterMarker.setAttribute("viewBox", "0 0 10 10");
        enterMarker.setAttribute("refX", "9");
        enterMarker.setAttribute("refY", "5");
        enterMarker.setAttribute("markerWidth", "8");
        enterMarker.setAttribute("markerHeight", "8");
        enterMarker.setAttribute("orient", "auto-start-reverse");
        defs.appendChild(enterMarker);
        const enterPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        enterPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
        enterPath.setAttribute("fill", "#93b7ff");
        enterMarker.appendChild(enterPath);

        const gridMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        gridMarker.setAttribute("id", "arrow-grid");
        gridMarker.setAttribute("viewBox", "0 0 10 10");
        gridMarker.setAttribute("refX", "9");
        gridMarker.setAttribute("refY", "5");
        gridMarker.setAttribute("markerWidth", "7");
        gridMarker.setAttribute("markerHeight", "7");
        gridMarker.setAttribute("orient", "auto-start-reverse");
        defs.appendChild(gridMarker);
        const gridPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        gridPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
        gridPath.setAttribute("fill", "#d8cfb3");
        gridMarker.appendChild(gridPath);

        const hatchFocus = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
        hatchFocus.setAttribute("id", "tile-hatch-focus");
        hatchFocus.setAttribute("width", "12");
        hatchFocus.setAttribute("height", "12");
        hatchFocus.setAttribute("patternUnits", "userSpaceOnUse");
        hatchFocus.setAttribute("patternTransform", "rotate(32)");
        defs.appendChild(hatchFocus);
        const hatchFocusPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        hatchFocusPath.setAttribute("d", "M 0 0 L 0 12");
        hatchFocusPath.setAttribute("stroke", "rgba(244, 244, 244, 0.5)");
        hatchFocusPath.setAttribute("stroke-width", "1.1");
        hatchFocus.appendChild(hatchFocusPath);

        const hatchAbove = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
        hatchAbove.setAttribute("id", "tile-hatch-above");
        hatchAbove.setAttribute("width", "14");
        hatchAbove.setAttribute("height", "14");
        hatchAbove.setAttribute("patternUnits", "userSpaceOnUse");
        hatchAbove.setAttribute("patternTransform", "rotate(26)");
        defs.appendChild(hatchAbove);
        const hatchAbovePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        hatchAbovePath.setAttribute("d", "M 0 0 L 0 14");
        hatchAbovePath.setAttribute("stroke", "rgba(236, 236, 236, 0.36)");
        hatchAbovePath.setAttribute("stroke-width", "0.9");
        hatchAbove.appendChild(hatchAbovePath);

        const hatchBelow = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
        hatchBelow.setAttribute("id", "tile-hatch-below");
        hatchBelow.setAttribute("width", "16");
        hatchBelow.setAttribute("height", "16");
        hatchBelow.setAttribute("patternUnits", "userSpaceOnUse");
        hatchBelow.setAttribute("patternTransform", "rotate(18)");
        defs.appendChild(hatchBelow);
        const hatchBelowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        hatchBelowPath.setAttribute("d", "M 0 0 L 0 16");
        hatchBelowPath.setAttribute("stroke", "rgba(196, 196, 196, 0.28)");
        hatchBelowPath.setAttribute("stroke-width", "0.8");
        hatchBelow.appendChild(hatchBelowPath);

        const tileHanddrawn = document.createElementNS("http://www.w3.org/2000/svg", "filter");
        tileHanddrawn.setAttribute("id", "tile-handdrawn");
        tileHanddrawn.setAttribute("x", "-8%");
        tileHanddrawn.setAttribute("y", "-8%");
        tileHanddrawn.setAttribute("width", "116%");
        tileHanddrawn.setAttribute("height", "116%");
        tileHanddrawn.setAttribute("color-interpolation-filters", "sRGB");
        defs.appendChild(tileHanddrawn);
        const tileNoise = document.createElementNS("http://www.w3.org/2000/svg", "feTurbulence");
        tileNoise.setAttribute("type", "fractalNoise");
        tileNoise.setAttribute("baseFrequency", "0.028 0.009");
        tileNoise.setAttribute("numOctaves", "2");
        tileNoise.setAttribute("seed", "7");
        tileNoise.setAttribute("result", "noise");
        tileHanddrawn.appendChild(tileNoise);
        const tileDisplace = document.createElementNS("http://www.w3.org/2000/svg", "feDisplacementMap");
        tileDisplace.setAttribute("in", "SourceGraphic");
        tileDisplace.setAttribute("in2", "noise");
        tileDisplace.setAttribute("scale", "4.8");
        tileDisplace.setAttribute("xChannelSelector", "R");
        tileDisplace.setAttribute("yChannelSelector", "G");
        tileHanddrawn.appendChild(tileDisplace);

        const roadGrainFilter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
        roadGrainFilter.setAttribute("id", "road-grain-filter");
        roadGrainFilter.setAttribute("x", "-20%");
        roadGrainFilter.setAttribute("y", "-20%");
        roadGrainFilter.setAttribute("width", "140%");
        roadGrainFilter.setAttribute("height", "140%");
        const roadNoise = document.createElementNS("http://www.w3.org/2000/svg", "feTurbulence");
        roadNoise.setAttribute("type", "fractalNoise");
        roadNoise.setAttribute("baseFrequency", "0.82 0.36");
        roadNoise.setAttribute("numOctaves", "2");
        roadNoise.setAttribute("seed", "23");
        roadNoise.setAttribute("result", "noise");
        roadGrainFilter.appendChild(roadNoise);
        const roadTint = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix");
        roadTint.setAttribute("in", "noise");
        roadTint.setAttribute("type", "matrix");
        roadTint.setAttribute("values", "0 0 0 0 0.84  0 0 0 0 0.88  0 0 0 0 0.94  0.08 0.08 0.08 0 0");
        roadTint.setAttribute("result", "grainTint");
        roadGrainFilter.appendChild(roadTint);
        const roadClipToShape = document.createElementNS("http://www.w3.org/2000/svg", "feComposite");
        roadClipToShape.setAttribute("in", "grainTint");
        roadClipToShape.setAttribute("in2", "SourceAlpha");
        roadClipToShape.setAttribute("operator", "in");
        roadClipToShape.setAttribute("result", "grainClipped");
        roadGrainFilter.appendChild(roadClipToShape);
        const roadBlend = document.createElementNS("http://www.w3.org/2000/svg", "feBlend");
        roadBlend.setAttribute("in", "SourceGraphic");
        roadBlend.setAttribute("in2", "grainClipped");
        roadBlend.setAttribute("mode", "screen");
        roadGrainFilter.appendChild(roadBlend);
        defs.appendChild(roadGrainFilter);

        add("rect", { class: "world-hitbox", x: 0, y: 0, width: WORLD_W, height: WORLD_H, fill: "transparent" });

        const inGame = isInGameMode();
        const showRoads = inGame ? true : getControlChecked("toggle-roads", true);
        const showLegend = inGame ? true : getControlChecked("toggle-legend", true);
        const showGrid = inGame ? tileGridVisible : getControlChecked("toggle-grid", false);
        const showFloorTiles = inGame ? true : getControlChecked("toggle-floor-tiles", true);
        const floorFilter = currentMapLayer();
        const hudPadding = 20;
        const hudScale = inGame ? 0.28 : 0.33;
        drawCampusLayout(showRoads, floorFilter, showFloorTiles, buildingArtworkVisible);
        if (showFloorTiles) {
          drawRoomLayer(floorFilter, showRoads, buildingArtworkVisible);
        }
        drawLegendParts({ showLegend, showGrid, hudScale, hudPadding });

        if (!panZoom.hasUserMoved) {
          setInitialView();
        } else {
          applyTransform();
        }
      }

      function redrawSoon() {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            draw();
          });
        });
        setTimeout(draw, 0);
      }

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function applyTransform() {
        if (!viewport) return;
        if (!Number.isFinite(panZoom.tx) || !Number.isFinite(panZoom.ty) || !Number.isFinite(panZoom.scale)) return;
        viewport.setAttribute(
          "transform",
          "translate(" + panZoom.tx.toFixed(2) + " " + panZoom.ty.toFixed(2) + ") scale(" + panZoom.scale.toFixed(4) + ")"
        );
      }

      function ensurePlayerMarkerVisible() {
        const marker = document.getElementById("player-map-marker");
        if (!marker) return;
        let box;
        try {
          box = marker.getBBox();
        } catch (error) {
          return;
        }
        if (!box || !Number.isFinite(box.x) || !Number.isFinite(box.y)) return;
        const viewBox = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : { width: 1600, height: 980 };
        const viewportW = Number.isFinite(viewBox.width) && viewBox.width > 0 ? viewBox.width : 1600;
        const viewportH = Number.isFinite(viewBox.height) && viewBox.height > 0 ? viewBox.height : 980;
        const markerScreen = {
          x1: box.x * panZoom.scale + panZoom.tx,
          y1: box.y * panZoom.scale + panZoom.ty,
          x2: (box.x + box.width) * panZoom.scale + panZoom.tx,
          y2: (box.y + box.height) * panZoom.scale + panZoom.ty
        };
        const margin = 54;
        const bounds = {
          left: margin,
          top: margin,
          right: viewportW - margin,
          bottom: viewportH - margin
        };
        let dx = 0;
        let dy = 0;
        if (markerScreen.x1 < bounds.left) dx = bounds.left - markerScreen.x1;
        if (markerScreen.x2 > bounds.right) dx = bounds.right - markerScreen.x2;
        if (markerScreen.y1 < bounds.top) dy = bounds.top - markerScreen.y1;
        if (markerScreen.y2 > bounds.bottom) dy = bounds.bottom - markerScreen.y2;
        if (!dx && !dy) return;
        panZoom.tx += dx;
        panZoom.ty += dy;
        applyTransform();
      }

      function focusPlayerLocation() {
        const playerLayout = LhMapData.ROOM_LAYOUT[currentPlayerNodeId()];
        const floorFilterEl = getControl("floor-filter");
        const floorTilesEl = getControl("toggle-floor-tiles");
        if (floorTilesEl) floorTilesEl.checked = true;
        if (floorFilterEl && playerLayout && playerLayout.layer) floorFilterEl.value = playerLayout.layer;
        if (playerLayout && playerLayout.layer) setCurrentMapLayer(playerLayout.layer);
        playerPingUntil = Date.now() + 950;
        panZoom.hasUserMoved = true;
        draw();
        ensurePlayerMarkerVisible();
        window.setTimeout(() => {
          if (Date.now() >= playerPingUntil) draw();
        }, 1000);
      }

      function setInitialView() {
        const viewBox = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : { width: 1600, height: 980 };
        const viewportW = Number.isFinite(viewBox.width) && viewBox.width > 0 ? viewBox.width : 1600;
        const viewportH = Number.isFinite(viewBox.height) && viewBox.height > 0 ? viewBox.height : 980;
        const contentBoxes = Array.from(viewport.children)
          .filter(
            (el) =>
              !(
                el.classList &&
                (el.classList.contains("world-hitbox") || el.classList.contains("map-fit-ignore"))
              )
          )
          .map((el) => {
            try {
              return el.getBBox();
            } catch (error) {
              return null;
            }
          })
          .filter(
            (box) =>
              box &&
              Number.isFinite(box.x) &&
              Number.isFinite(box.y) &&
              Number.isFinite(box.width) &&
              Number.isFinite(box.height) &&
              (box.width > 0 || box.height > 0)
          );
        let minX;
        let maxX;
        let minY;
        let maxY;
        if (contentBoxes.length) {
          minX = Math.min(...contentBoxes.map((box) => box.x));
          maxX = Math.max(...contentBoxes.map((box) => box.x + box.width));
          minY = Math.min(...contentBoxes.map((box) => box.y));
          maxY = Math.max(...contentBoxes.map((box) => box.y + box.height));
        } else {
          if (!CAMPUS_BLOCKS.length) return;
          const allPoints = CAMPUS_BLOCKS.flatMap((block) => blockPoints(block));
          if (!allPoints.length) return;
          minX = Math.min(...allPoints.map((p) => p.x));
          maxX = Math.max(...allPoints.map((p) => p.x));
          minY = Math.min(...allPoints.map((p) => p.y));
          maxY = Math.max(...allPoints.map((p) => p.y));
        }

        minX -= 24;
        maxX += 84;
        minY -= 18;
        maxY += 84;
        const mapW = Math.max(1, maxX - minX);
        const mapH = Math.max(1, maxY - minY);

        const outerPadX = 24;
        const outerPadTop = 16;
        const outerPadBottom = 20;
        const usableW = Math.max(1, viewportW - outerPadX * 2);
        const usableH = Math.max(1, viewportH - outerPadTop - outerPadBottom);

        const fitScale = Math.min(usableW / mapW, usableH / mapH);
        panZoom.scale = clamp(fitScale, panZoom.minScale, panZoom.maxScale);

        const initialCenterTileOffsetX = STEP_E.dx * panZoom.scale;
        panZoom.tx = outerPadX + (usableW - mapW * panZoom.scale) * 0.5 - minX * panZoom.scale + initialCenterTileOffsetX;
        panZoom.ty = outerPadTop + (usableH - mapH * panZoom.scale) * 0.5 - minY * panZoom.scale;
        panZoom.hasInitializedView = true;
        applyTransform();
      }

      function onPointerDown(event) {
        if (event.button === 0) {
          panZoom.dragging = true;
          panZoom.lastX = event.clientX;
          panZoom.lastY = event.clientY;
          svg.classList.add("dragging");
          return;
        }
        if (event.button === 2) {
          floorDrag.active = true;
          floorDrag.lastY = event.clientY;
          floorDrag.carryY = 0;
          event.preventDefault();
        }
      }

      function stepFloorFilter(step) {
        if (!step) return;
        const floorFilterEl = getFloorSelect();
        const options = floorFilterEl
          ? Array.from(floorFilterEl.options).map((opt) => opt.value).filter((value) => value !== "all")
          : MAP_MODEL.layers.map((layer) => layer.id);
        if (!options.length) return;
        const currentValue = rendererMode === "ingame" ? currentMapLayer() : floorFilterEl.value;
        let currentIndex = options.indexOf(currentValue);
        if (currentIndex < 0) {
          const defaultIndex = options.indexOf("L0");
          currentIndex = defaultIndex >= 0 ? defaultIndex : 0;
        }
        const nextIndex = clamp(currentIndex + step, 0, options.length - 1);
        if (nextIndex === currentIndex) return;
        setCurrentMapLayer(options[nextIndex]);
        draw();
      }

      function onPointerMove(event) {
        if (panZoom.dragging) {
          const dx = event.clientX - panZoom.lastX;
          const dy = event.clientY - panZoom.lastY;
          panZoom.lastX = event.clientX;
          panZoom.lastY = event.clientY;
          panZoom.tx += dx;
          panZoom.ty += dy;
          panZoom.hasUserMoved = true;
          applyTransform();
        }
        if (floorDrag.active) {
          const dy = event.clientY - floorDrag.lastY;
          floorDrag.lastY = event.clientY;
          floorDrag.carryY += dy;
          while (floorDrag.carryY <= -FLOOR_DRAG_STEP_PX) {
            stepFloorFilter(-1);
            floorDrag.carryY += FLOOR_DRAG_STEP_PX;
          }
          while (floorDrag.carryY >= FLOOR_DRAG_STEP_PX) {
            stepFloorFilter(1);
            floorDrag.carryY -= FLOOR_DRAG_STEP_PX;
          }
          panZoom.hasUserMoved = true;
          applyTransform();
          event.preventDefault();
        }
      }

      function onPointerUp() {
        if (panZoom.dragging) {
          panZoom.dragging = false;
          svg.classList.remove("dragging");
        }
        if (floorDrag.active) {
          floorDrag.active = false;
          floorDrag.carryY = 0;
        }
      }

      function onContextMenu(event) {
        event.preventDefault();
      }

      function onWheel(event) {
        event.preventDefault();
        const rect = svg.getBoundingClientRect();
        const sx = event.clientX - rect.left;
        const sy = event.clientY - rect.top;
        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
        const nextScale = clamp(panZoom.scale * zoomFactor, panZoom.minScale, panZoom.maxScale);
        const wx = (sx - panZoom.tx) / panZoom.scale;
        const wy = (sy - panZoom.ty) / panZoom.scale;
        panZoom.scale = nextScale;
        panZoom.tx = sx - wx * panZoom.scale;
        panZoom.ty = sy - wy * panZoom.scale;
        panZoom.hasUserMoved = true;
        applyTransform();
      }

      addControlListener("toggle-roads", "change", draw);
      addControlListener("toggle-legend", "change", draw);
      addControlListener("toggle-grid", "change", draw);
      addControlListener("toggle-floor-tiles", "change", draw);
      addControlListener("toggle-weather", "change", (event) => snowLayer.setEnabled(event.target.checked));
      addControlListener("snow-density", "input", (event) => {
        const value = Number(event.target.value);
        const densityValue = getControl("snow-density-value");
        if (densityValue) densityValue.textContent = "x" + value.toFixed(2);
        snowLayer.setDensityMultiplier(value);
      });
      addControlListener("floor-filter", "change", draw);
      if (externalFloorSelect && typeof externalFloorSelect.addEventListener === "function") {
        externalFloorSelect.addEventListener("change", () => {
          setCurrentMapLayer(externalFloorSelect.value);
          panZoom.hasUserMoved = true;
          draw();
        });
      }
      svg.addEventListener("mousedown", onPointerDown);
      root.addEventListener("mousemove", onPointerMove);
      root.addEventListener("mouseup", onPointerUp);
      svg.addEventListener("mouseleave", onPointerUp);
      svg.addEventListener("contextmenu", onContextMenu);
      svg.addEventListener("wheel", onWheel, { passive: false });
      root.addEventListener("resize", () => {
        draw();
        snowLayer.resize();
      });
      if (documentRef && documentRef.fonts && documentRef.fonts.ready) {
        documentRef.fonts.ready.then(redrawSoon).catch(() => {});
      }
      if (rendererMode === "ingame") {
        setCurrentMapLayer(currentPlayerLayer());
      }
      draw();
      redrawSoon();
      snowLayer.setEnabled(getControlChecked("toggle-weather", rendererMode !== "ingame"));

      return {
        draw,
        focusCurrentLocation: focusPlayerLocation,
        setMode(mode) {
          rendererMode = mode === "ingame" ? "ingame" : "prototype";
          if (rendererMode === "ingame") {
            setCurrentMapLayer(currentPlayerLayer());
          } else {
            inGameFloorFilter = "";
          }
          panZoom.hasUserMoved = false;
          panZoom.hasInitializedView = false;
          draw();
        },
        setDiscoveryState(state) {
          const previousNodeId = discoveryState.currentNodeId || "";
          discoveryState = normalizeDiscoveryState(state);
          const nextNodeId = discoveryState.currentNodeId || "";
          if (rendererMode === "ingame" && (previousNodeId !== nextNodeId || !inGameFloorFilter)) {
            setCurrentMapLayer(currentPlayerLayer());
          }
          const shouldPreserveViewport = panZoom.hasInitializedView && Number.isFinite(panZoom.scale);
          if (previousNodeId !== nextNodeId) {
            panZoom.hasUserMoved = shouldPreserveViewport;
          }
          draw();
          if (rendererMode === "ingame" && previousNodeId !== nextNodeId && shouldPreserveViewport) {
            ensurePlayerMarkerVisible();
          }
        },
        setLegendParts(parts) {
          legendParts = normalizeLegendParts(parts);
          draw();
        },
        destroy() {}
      };  }

  root.LhMapRenderer = { create };
})(typeof globalThis !== "undefined" ? globalThis : window);
