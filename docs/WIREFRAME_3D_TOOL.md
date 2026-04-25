# Wireframe 3D Tool (Parameter Controlled)

This tool creates and edits a 3D wireframe scene through JSON commands, then exports the result as SVG for visual verification.

## Files

- Core: `tools/wireframe3d-core.js`
- CLI: `tools/wireframe3d-cli.js`
- Command schema: `docs/wireframe3d-command.schema.json`
- Asset-source workspace: `asset-sources/wireframe3d/`
- Sample commands: `asset-sources/wireframe3d/commands/wireframe3d-sample-commands.json`
- Test: `tools/test-wireframe3d.js`

## Run

```bash
node tools/wireframe3d-cli.js asset-sources/wireframe3d/commands/wireframe3d-sample-commands.json --scene-out asset-sources/wireframe3d/scenes/sample.scene.json --svg-out asset-sources/wireframe3d/svg/sample.svg
```

Computer Center preset:

```bash
node tools/wireframe3d-cli.js asset-sources/wireframe3d/commands/wireframe3d-computer-center.commands.json --scene-out asset-sources/wireframe3d/scenes/computer-center.scene.json --svg-out asset-sources/wireframe3d/svg/computer-center.svg
```

Computer Center preset (v2, improved massing + facade rhythm):

```bash
node tools/wireframe3d-cli.js asset-sources/wireframe3d/commands/wireframe3d-computer-center-v2.commands.json --scene-out asset-sources/wireframe3d/scenes/computer-center-v2.scene.json --svg-out asset-sources/wireframe3d/svg/computer-center-v2.svg
```

## Command Payload Shape

```json
{
  "$schema": "../../../docs/wireframe3d-command.schema.json",
  "commands": [
    { "op": "create_scene", "overrides": {} },
    { "op": "add_primitive", "id": "p1", "type": "cube", "params": {}, "transform": {}, "style": {}, "occluder": true },
    { "op": "transform_primitive", "id": "p1", "rotateDeg": [15, 30, 0] },
    { "op": "rotate_scene", "rotationDeg": [10, -20, 0] },
    { "op": "export_svg", "options": { "hiddenEdges": "far" } }
  ]
}
```

## Supported Primitive Types

- `cube`
- `rectangle` (cuboid with `width/height/depth`)
- `parallelogram` (box with shear via transform)
- `cylinder`
- `globe` (supports full and partial globe segments)

## Supported Operations

- `create_scene`
- `add_primitive`
- `update_primitive`
- `delete_primitive`
- `transform_primitive`
- `set_style`
- `set_camera`
- `rotate_scene`
- `export_svg`

`add_primitive` also supports:
- `occluder` (default `true`): when `false`, the primitive is still rendered but its faces do not hide other edges.

## Camera Controls

You can control framing and viewpoint through `create_scene.overrides.camera` or `set_camera.camera`.

Common camera fields:

- `projection`: `isometric` or `perspective`
- `width`, `height`: SVG viewport size
- `scale`: zoom level
- `offsetX`, `offsetY`: screen-space framing offset (positive `offsetY` moves the model down)
- `rotationDeg`: global scene rotation in degrees `[x, y, z]`
- `isometric.yawDeg`, `isometric.pitchDeg`: isometric angle tuning
- `perspectiveDistance`: depth factor for perspective mode

## Rotation in Degrees

You can rotate in all directions by degrees:

- Primitive rotation: `transform.rotateDeg` or `transform_primitive.rotateDeg`
- Scene-wide rotation: `rotate_scene.rotationDeg` or `set_camera.camera.rotationDeg`

Rotation format is always:

```json
[xDeg, yDeg, zDeg]
```

Examples:

```json
{ "op": "transform_primitive", "id": "main_block", "rotateDeg": [0, 30, 0] }
```

```json
{ "op": "rotate_scene", "rotationDeg": [8, -14, 0] }
```

Camera framing example:

```json
{
  "op": "set_camera",
  "camera": {
    "scale": 62,
    "offsetX": 0,
    "offsetY": 145,
    "rotationDeg": [0, -15, 0]
  }
}
```

## Notes

- SVG output is deterministic for identical command input.
- Hidden-edge modes:
  - `hiddenEdges: "none"`: draw all edges.
  - `hiddenEdges: "far"`: conservative clipping (only clearly far, fully covered segments).
  - `hiddenEdges: "partial"`: segment-level clipping with a depth-gap threshold.
  - `hiddenEdges: "strict"`: segment-level clipping without that threshold (most aggressive).
- Face debug hatch:
  - Add `faceDebug` under `export_svg.options` to visualize which polygons are treated as faces.
  - Example:
```json
{
  "op": "export_svg",
  "options": {
    "hiddenEdges": "none",
    "faceDebug": {
      "enabled": true,
      "hatchColor": "#79c7ff",
      "hatchOpacity": 0.42,
      "hatchSpacing": 10,
      "hatchStrokeWidth": 0.9,
      "fill": "#79c7ff",
      "fillOpacity": 0.08
    }
  }
}
```
- Numbered debug labels:
  - Add `debugLabels` under `export_svg.options` to print IDs on faces and edges.
  - Useful format: `primitiveId:F<faceIndex>` and `primitiveId:E<edgeIndex>`.
```json
{
  "op": "export_svg",
  "options": {
    "debugLabels": {
      "enabled": true,
      "faces": true,
      "edges": true,
      "color": "#ffd66e",
      "halo": "#071019",
      "fontSize": 11,
      "minEdgeLength": 22,
      "prefixPrimitive": true
    }
  }
}
```
- The tool is intended for blockout/composition workflows and fast wireframe iteration.
- Generated scene JSON and SVG previews live under `asset-sources/wireframe3d/` because they are creative source material for image production, not game runtime assets or documentation pages.
- Occlusion modeling tip:
  - For wire-only architectural details (for example parapets), prefer `occluder: false`.
  - If they still need to hide specific edges (for example beam tops), add separate invisible occluder primitives split into smaller strips instead of one large solid box occluder.
