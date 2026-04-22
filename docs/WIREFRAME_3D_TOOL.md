# Wireframe 3D Tool (Parameter Controlled)

This tool creates and edits a 3D wireframe scene through JSON commands, then exports the result as SVG for visual verification.

## Files

- Core: `tools/wireframe3d-core.js`
- CLI: `tools/wireframe3d-cli.js`
- Sample commands: `tools/wireframe3d-sample-commands.json`
- Test: `tools/test-wireframe3d.js`

## Run

```bash
node tools/wireframe3d-cli.js tools/wireframe3d-sample-commands.json --scene-out docs/wireframe3d/sample.scene.json --svg-out docs/wireframe3d/sample.svg
```

Computer Center preset:

```bash
node tools/wireframe3d-cli.js tools/wireframe3d-computer-center.commands.json --scene-out docs/wireframe3d/computer-center.scene.json --svg-out docs/wireframe3d/computer-center.svg
```

Computer Center preset (v2, improved massing + facade rhythm):

```bash
node tools/wireframe3d-cli.js tools/wireframe3d-computer-center-v2.commands.json --scene-out docs/wireframe3d/computer-center-v2.scene.json --svg-out docs/wireframe3d/computer-center-v2.svg
```

## Command Payload Shape

```json
{
  "commands": [
    { "op": "create_scene", "overrides": {} },
    { "op": "add_primitive", "id": "p1", "type": "cube", "params": {}, "transform": {}, "style": {} },
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
- Hidden-edge suppression currently uses a simple depth heuristic (`hiddenEdges: "far"`).
- The tool is intended for blockout/composition workflows and fast wireframe iteration.
