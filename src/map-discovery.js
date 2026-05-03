(function (root) {
  "use strict";

  const DREAM_ROOM_IDS = new Set([21, 134, 152]);
  const DREAM_NODE_IDS = new Set(["place", "basalt", "platform"]);

  function normalizeCommand(command) {
    return String(command || "").trim().toLowerCase();
  }

  function commandTokens(label) {
    return String(label || "")
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean);
  }

  function commandMatchesLabel(command, label) {
    const normalized = normalizeCommand(command);
    if (!normalized) return false;
    const tokens = commandTokens(label);
    return tokens.includes(normalized);
  }

  const OPPOSITE_COMMAND = {
    north: "south",
    south: "north",
    east: "west",
    west: "east",
    northeast: "southwest",
    southwest: "northeast",
    northwest: "southeast",
    southeast: "northwest",
    up: "down",
    down: "up",
    enter: "exit",
    exit: "enter"
  };

  function reverseCommandMatchesLabel(command, label) {
    const opposite = OPPOSITE_COMMAND[normalizeCommand(command)];
    return !!opposite && commandMatchesLabel(opposite, label);
  }

  function primaryCommandFromLabel(label) {
    const tokens = commandTokens(label);
    return tokens[0] || normalizeCommand(label);
  }

  function linkKey(link) {
    return [
      String(link && link.fromNodeId ? link.fromNodeId : ""),
      String(link && link.toNodeId ? link.toNodeId : ""),
      normalizeCommand(link && link.command)
    ].join("->");
  }

  class MapDiscoveryTracker {
    constructor(options) {
      const opts = options || {};
      this.mapData = opts.mapData || root.MapPrototype2Data || {};
      this.roomByNodeId = new Map();
      this.nodeIdsByRoomId = new Map();
      this.incomingEdgesByNodeId = new Map();
      this.uniqueRouteEdgesByNodeId = new Map();
      this.reset();
      this._indexMapData();
    }

    _indexMapData() {
      const rooms = Array.isArray(this.mapData.MAP_ROOMS) ? this.mapData.MAP_ROOMS : [];
      const locationByNode = this.mapData.LOCATION_ID_BY_NODE_ID || {};
      for (const room of rooms) {
        if (!room || !room.id || DREAM_NODE_IDS.has(String(room.id))) continue;
        const nodeId = String(room.id);
        const roomId = Number(locationByNode[nodeId]);
        if (!Number.isFinite(roomId) || DREAM_ROOM_IDS.has(roomId)) continue;
        this.roomByNodeId.set(nodeId, room);
        if (!this.nodeIdsByRoomId.has(roomId)) this.nodeIdsByRoomId.set(roomId, []);
        this.nodeIdsByRoomId.get(roomId).push(nodeId);
      }
      for (const room of rooms) {
        if (!room || !room.id || DREAM_NODE_IDS.has(String(room.id)) || !Array.isArray(room.edges)) continue;
        const fromNodeId = String(room.id);
        if (!this.roomByNodeId.has(fromNodeId)) continue;
        for (const edge of room.edges) {
          const toNodeId = edge && edge.to ? String(edge.to) : "";
          if (!toNodeId || !this.roomByNodeId.has(toNodeId)) continue;
          if (!this.incomingEdgesByNodeId.has(toNodeId)) this.incomingEdgesByNodeId.set(toNodeId, []);
          this.incomingEdgesByNodeId.get(toNodeId).push({ fromNodeId, edge });
        }
      }
      this._indexUniqueRouteEdges();
    }

    _indexUniqueRouteEdges() {
      const pairEdges = new Map();
      for (const [fromNodeId, room] of this.roomByNodeId.entries()) {
        if (!room || !Array.isArray(room.edges)) continue;
        for (const edge of room.edges) {
          const toNodeId = edge && edge.to ? String(edge.to) : "";
          if (!toNodeId || !this.roomByNodeId.has(toNodeId) || fromNodeId === toNodeId) continue;
          const pairKey = [fromNodeId, toNodeId].sort().join("|");
          if (!pairEdges.has(pairKey)) pairEdges.set(pairKey, []);
          pairEdges.get(pairKey).push({ fromNodeId, toNodeId, edge });
        }
      }

      for (const edges of pairEdges.values()) {
        if (!edges.length) continue;
        const nodePair = new Set();
        for (const entry of edges) {
          nodePair.add(entry.fromNodeId);
          nodePair.add(entry.toNodeId);
        }
        if (nodePair.size !== 2) continue;
        const [a, b] = Array.from(nodePair);
        const representative = edges[0];
        const routeEdge = {
          a,
          b,
          type: String(representative.edge && representative.edge.type || ""),
          oneWay: representative.fromNodeId === "ic3" && representative.toNodeId === "great_court",
          commandFromA: this._routeCommandBetween(a, b, edges),
          commandFromB: this._routeCommandBetween(b, a, edges)
        };
        if (!this.uniqueRouteEdgesByNodeId.has(a)) this.uniqueRouteEdgesByNodeId.set(a, []);
        if (!this.uniqueRouteEdgesByNodeId.has(b)) this.uniqueRouteEdgesByNodeId.set(b, []);
        this.uniqueRouteEdgesByNodeId.get(a).push(routeEdge);
        this.uniqueRouteEdgesByNodeId.get(b).push(routeEdge);
      }
    }

    _routeCommandBetween(fromNodeId, toNodeId, edges) {
      const direct = edges.find((entry) => entry.fromNodeId === fromNodeId && entry.toNodeId === toNodeId);
      if (direct) return primaryCommandFromLabel(direct.edge && direct.edge.label);
      const reverse = edges.find((entry) => entry.fromNodeId === toNodeId && entry.toNodeId === fromNodeId);
      if (!reverse) return "";
      const command = primaryCommandFromLabel(reverse.edge && reverse.edge.label);
      return OPPOSITE_COMMAND[command] || command;
    }

    reset() {
      this.currentRoomId = 0;
      this.currentNodeId = "";
      this.lastMappedNodeId = "";
      this.visitedNodeIds = new Set();
      this.visitedRoomIds = new Set();
      this.knownLinks = new Map();
      this.traversedLinks = new Map();
    }

    restore(state) {
      this.reset();
      const input = state || {};
      const addNode = (nodeId) => {
        const id = String(nodeId || "");
        if (id && this.roomByNodeId.has(id)) this.visitedNodeIds.add(id);
      };
      const addRoom = (roomId) => {
        const id = Number(roomId);
        if (Number.isFinite(id) && !DREAM_ROOM_IDS.has(id)) this.visitedRoomIds.add(id);
      };
      (Array.isArray(input.visitedNodeIds) ? input.visitedNodeIds : []).forEach(addNode);
      (Array.isArray(input.visitedRoomIds) ? input.visitedRoomIds : []).forEach(addRoom);
      (Array.isArray(input.knownLinks) ? input.knownLinks : []).forEach((link) => this._putLink(this.knownLinks, link));
      (Array.isArray(input.traversedLinks) ? input.traversedLinks : []).forEach((link) => this._putLink(this.traversedLinks, link));
      const currentRoomId = Number(input.currentRoomId);
      const currentNodeId = String(input.currentNodeId || "");
      this.currentRoomId = Number.isFinite(currentRoomId) && !DREAM_ROOM_IDS.has(currentRoomId) ? currentRoomId : 0;
      this.currentNodeId = currentNodeId && this.roomByNodeId.has(currentNodeId) ? currentNodeId : "";
      this.lastMappedNodeId = this.currentNodeId;
    }

    serialize() {
      return {
        version: 1,
        currentRoomId: this.currentRoomId,
        currentNodeId: this.currentNodeId,
        visitedNodeIds: Array.from(this.visitedNodeIds),
        visitedRoomIds: Array.from(this.visitedRoomIds),
        knownLinks: Array.from(this.knownLinks.values()),
        traversedLinks: Array.from(this.traversedLinks.values())
      };
    }

    getMappedRoomIds() {
      return Array.from(this.nodeIdsByRoomId.keys()).sort((a, b) => a - b);
    }

    restoreVisitedRooms(roomIds, options) {
      this.reset();
      const opts = options || {};
      const inputRoomIds = Array.isArray(roomIds) ? roomIds : [];
      for (const roomId of inputRoomIds) {
        const numericRoomId = Number(roomId);
        if (!Number.isFinite(numericRoomId) || DREAM_ROOM_IDS.has(numericRoomId)) continue;
        const nodeIds = this.nodeIdsByRoomId.get(numericRoomId) || [];
        if (!nodeIds.length) continue;
        this.visitedRoomIds.add(numericRoomId);
        for (const nodeId of nodeIds) {
          this.visitedNodeIds.add(nodeId);
        }
      }

      const currentRoomId = Number(opts.currentRoomId);
      if (Number.isFinite(currentRoomId) && !DREAM_ROOM_IDS.has(currentRoomId)) {
        const currentNodeId = this.resolveNodeId(currentRoomId, "", "");
        if (currentNodeId) {
          this.currentRoomId = currentRoomId;
          this.currentNodeId = currentNodeId;
          this.lastMappedNodeId = currentNodeId;
          this.visitedRoomIds.add(currentRoomId);
          this.visitedNodeIds.add(currentNodeId);
        }
      }

      this._inferFallbackRouteLinks();
      return this.serialize();
    }

    _inferFallbackRouteLinks() {
      const startNodeId = this.resolveNodeId(65, "", "");
      if (!startNodeId || !this.visitedNodeIds.has(startNodeId)) return;

      const reached = new Set([startNodeId]);
      const queue = [startNodeId];
      while (queue.length) {
        const fromNodeId = queue.shift();
        const edges = this.uniqueRouteEdgesByNodeId.get(fromNodeId) || [];
        for (const routeEdge of edges) {
          const toNodeId = routeEdge.a === fromNodeId ? routeEdge.b : routeEdge.a;
          if (!this.visitedNodeIds.has(toNodeId) || reached.has(toNodeId)) continue;
          const command = routeEdge.a === fromNodeId ? routeEdge.commandFromA : routeEdge.commandFromB;
          this._putLink(this.knownLinks, {
            fromNodeId,
            toNodeId,
            command,
            type: routeEdge.type,
            oneWay: !!routeEdge.oneWay
          });
          reached.add(toNodeId);
          queue.push(toNodeId);
        }
      }
    }

    observeRoom(roomId, options) {
      const opts = options || {};
      const numericRoomId = Number(roomId);
      if (!Number.isFinite(numericRoomId) || DREAM_ROOM_IDS.has(numericRoomId)) return this.serialize();
      const previousNodeId = this.currentNodeId || this.lastMappedNodeId || "";
      const nodeId = this.resolveNodeId(numericRoomId, previousNodeId, opts.command);
      if (!nodeId) return this.serialize();

      if (previousNodeId && previousNodeId !== nodeId && opts.command) {
        this._recordTraversal(previousNodeId, nodeId, opts.command);
      }

      this.currentRoomId = numericRoomId;
      this.currentNodeId = nodeId;
      this.lastMappedNodeId = nodeId;
      this.visitedRoomIds.add(numericRoomId);
      this.visitedNodeIds.add(nodeId);
      this.recordVisibleExits(nodeId, opts.exits || []);
      return this.serialize();
    }

    recordVisibleExits(nodeId, exits) {
      const id = String(nodeId || "");
      const room = this.roomByNodeId.get(id);
      if (!room || !Array.isArray(room.edges)) return;
      const exitCommands = new Set((Array.isArray(exits) ? exits : []).map(normalizeCommand).filter(Boolean));
      for (const edge of room.edges) {
        if (!edge || !edge.to || DREAM_NODE_IDS.has(String(edge.to))) continue;
        const matchingCommand = Array.from(exitCommands).find((command) => commandMatchesLabel(command, edge.label));
        if (!matchingCommand) continue;
        this._putLink(this.knownLinks, this._edgeToLink(id, edge, matchingCommand));
      }
      const incoming = this.incomingEdgesByNodeId.get(id) || [];
      for (const candidate of incoming) {
        const matchingCommand = Array.from(exitCommands).find((command) => reverseCommandMatchesLabel(command, candidate.edge.label));
        if (!matchingCommand) continue;
        this._putLink(
          this.knownLinks,
          this._edgeToLink(id, { to: candidate.fromNodeId, type: candidate.edge.type }, matchingCommand)
        );
      }
    }

    resolveNodeId(roomId, previousNodeId, command) {
      const candidates = this.nodeIdsByRoomId.get(Number(roomId)) || [];
      if (!candidates.length) return "";
      if (candidates.length === 1) return candidates[0];
      const previous = this.roomByNodeId.get(String(previousNodeId || ""));
      if (previous && Array.isArray(previous.edges)) {
        const matched = previous.edges.find((edge) =>
          candidates.includes(String(edge.to)) && commandMatchesLabel(command, edge.label)
        );
        if (matched) return String(matched.to);
      }
      const currentSameRoom = candidates.find((nodeId) => nodeId === this.currentNodeId);
      if (currentSameRoom) return currentSameRoom;
      return candidates[0];
    }

    _recordTraversal(fromNodeId, toNodeId, command) {
      const from = this.roomByNodeId.get(String(fromNodeId || ""));
      if (!from || !Array.isArray(from.edges)) return;
      const edge = from.edges.find((candidate) =>
        String(candidate.to) === String(toNodeId) && commandMatchesLabel(command, candidate.label)
      );
      const reverseEdge = edge ? null : (this.incomingEdgesByNodeId.get(String(fromNodeId)) || []).find((candidate) =>
        String(candidate.fromNodeId) === String(toNodeId) && reverseCommandMatchesLabel(command, candidate.edge.label)
      );
      if (!edge && !reverseEdge) return;
      const link = edge
        ? this._edgeToLink(String(fromNodeId), edge, command)
        : this._edgeToLink(String(fromNodeId), { to: toNodeId, type: reverseEdge.edge.type }, command);
      this._putLink(this.knownLinks, link);
      this._putLink(this.traversedLinks, link);
    }

    _edgeToLink(fromNodeId, edge, command) {
      return {
        fromNodeId: String(fromNodeId),
        toNodeId: String(edge.to),
        command: normalizeCommand(command || edge.label),
        type: String(edge.type || ""),
        oneWay: fromNodeId === "ic3" && String(edge.to) === "great_court"
      };
    }

    _putLink(target, link) {
      if (!link || !link.fromNodeId || !link.toNodeId) return;
      if (!this.roomByNodeId.has(String(link.fromNodeId)) || !this.roomByNodeId.has(String(link.toNodeId))) return;
      const normalized = {
        fromNodeId: String(link.fromNodeId),
        toNodeId: String(link.toNodeId),
        command: normalizeCommand(link.command),
        type: String(link.type || ""),
        oneWay: !!link.oneWay
      };
      target.set(linkKey(normalized), normalized);
    }
  }

  root.LhMapDiscoveryTracker = MapDiscoveryTracker;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { MapDiscoveryTracker };
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
