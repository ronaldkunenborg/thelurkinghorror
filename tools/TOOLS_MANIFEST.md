# Tools Manifest

This folder contains local development tools, generated tool data, and focused test harnesses. Paths below are relative to this `tools/` directory.

## Asset and Analysis Tools

| Tool | Description | Documentation |
| --- | --- | --- |
| [`adf_tool.py`](adf_tool.py) | Lists or extracts Amiga ADF disk images through `amitools.tools.xdftool`. | Inline `--help`; related source/context: [`../docs/OPEN_SOURCE_RESEARCH.md`](../docs/OPEN_SOURCE_RESEARCH.md). |
| [`analyze_amiga_sound_speed.py`](analyze_amiga_sound_speed.py) | Reports Amiga sound `.dat` header fields, `.mid` note clues, and candidate playback-rate assumptions. | Inline `--help`; sound behavior context: [`../docs/INTERPRETER_EXTENSIONS.md`](../docs/INTERPRETER_EXTENSIONS.md). |
| [`analyze_sound_opcodes.py`](analyze_sound_opcodes.py) | Performs reachable Z3 opcode analysis focused on `sound_effect` usage. | Z3 opcode/runtime context: [`../docs/Z3_ENGINE_FORMAT_SUMMARY.md`](../docs/Z3_ENGINE_FORMAT_SUMMARY.md); sound context: [`../docs/INTERPRETER_EXTENSIONS.md`](../docs/INTERPRETER_EXTENSIONS.md). |
| [`audio_device_caps.py`](audio_device_caps.py) | Prints PyAudio output-device format, channel, and sample-rate support. | Inline `--help`; sound playback context: [`../docs/INTERPRETER_EXTENSIONS.md`](../docs/INTERPRETER_EXTENSIONS.md). |
| [`convert_amiga_sound_dat.py`](convert_amiga_sound_dat.py) | Converts extracted Amiga `Sound/s*.dat` sample payloads to browser-friendly mono WAV files and optional JSON catalog data. | Inline `--help`; sound asset context: [`../docs/INTERPRETER_EXTENSIONS.md`](../docs/INTERPRETER_EXTENSIONS.md). |
| [`discover_location_map.js`](discover_location_map.js) | Discovers room objects and movement links by parsing/running the bundled Z3 story, then emits map registry data. | [`../docs/LOCATION_MAP.md`](../docs/LOCATION_MAP.md); Z3 runtime context: [`../docs/Z3_ENGINE_FORMAT_SUMMARY.md`](../docs/Z3_ENGINE_FORMAT_SUMMARY.md). |
| [`extract_blorb_sounds.py`](extract_blorb_sounds.py) | Extracts Blorb `Snd` resources, preserving AIFF and converting AIFF payloads to browser-friendly WAV. | Inline `--help`; Blorb sound source context: [`../docs/INTERPRETER_EXTENSIONS.md`](../docs/INTERPRETER_EXTENSIONS.md). |
| [`normalize_sound_pack.py`](normalize_sound_pack.py) | Normalizes and resamples WAV files to browser-safe PCM16 mono 44.1 kHz. | Inline `--help`; sound playback context: [`../docs/INTERPRETER_EXTENSIONS.md`](../docs/INTERPRETER_EXTENSIONS.md). |
| [`wireframe3d-cli.js`](wireframe3d-cli.js) | Runs JSON command batches for the local 3D wireframe scene tool and exports scene JSON and/or SVG previews. | [`../docs/WIREFRAME_3D_TOOL.md`](../docs/WIREFRAME_3D_TOOL.md); schema: [`../docs/wireframe3d-command.schema.json`](../docs/wireframe3d-command.schema.json). |
| [`wireframe3d-core.js`](wireframe3d-core.js) | Core library for the wireframe scene model, primitive transforms, camera projection, occlusion, and SVG rendering. | [`../docs/WIREFRAME_3D_TOOL.md`](../docs/WIREFRAME_3D_TOOL.md); schema: [`../docs/wireframe3d-command.schema.json`](../docs/wireframe3d-command.schema.json). |

## Tool Data

| File | Description | Documentation |
| --- | --- | --- |
| [`location-map-discovery.json`](location-map-discovery.json) | Machine-readable location, room, and edge registry generated from the Z3 discovery workflow. | [`../docs/LOCATION_MAP.md`](../docs/LOCATION_MAP.md). |

## Test Harnesses

| Tool | Description | Documentation |
| --- | --- | --- |
| [`test-bundled-story.js`](test-bundled-story.js) | Verifies that the browser bundled story asset registers and parses as the expected release/serial. | Bundling and runtime context: [`../docs/PHASE1_FOUNDATION_DESIGN.md`](../docs/PHASE1_FOUNDATION_DESIGN.md); Z3 format details: [`../docs/Z3_ENGINE_FORMAT_SUMMARY.md`](../docs/Z3_ENGINE_FORMAT_SUMMARY.md). |
| [`test-integration.js`](test-integration.js) | Runs the parser, VM, and I/O controller through startup and several real game commands. | [`../docs/PHASE1_FOUNDATION_DESIGN.md`](../docs/PHASE1_FOUNDATION_DESIGN.md); [`../docs/Z3_ENGINE_FORMAT_SUMMARY.md`](../docs/Z3_ENGINE_FORMAT_SUMMARY.md). |
| [`test-io-controller-output.js`](test-io-controller-output.js) | Exercises output buffering, status/topbar behavior, input handling, save/load flows, and interpreter UI commands. | [`../docs/INTERPRETER_EXTENSIONS.md`](../docs/INTERPRETER_EXTENSIONS.md); save storage context: [`../docs/QUETZAL_LOCAL_STORAGE.md`](../docs/QUETZAL_LOCAL_STORAGE.md). |
| [`test-map-prototype-2-layout.js`](test-map-prototype-2-layout.js) | Validates `map-prototype-2` layout rules for vertical edges, tile consistency, and layer deltas. | [`../docs/LOCATION_MAP.md`](../docs/LOCATION_MAP.md); map rendering decisions: [`../docs/ADR-0002-map-direction-alias-rendering.md`](../docs/ADR-0002-map-direction-alias-rendering.md). |
| [`test-parser.js`](test-parser.js) | Verifies Z3 parser metadata, memory layout, dictionary/object-table extraction, and checksum validation. | [`../docs/Z3_ENGINE_FORMAT_SUMMARY.md`](../docs/Z3_ENGINE_FORMAT_SUMMARY.md); [`../docs/PHASE1_FOUNDATION_DESIGN.md`](../docs/PHASE1_FOUNDATION_DESIGN.md). |
| [`test-sound-sequence.js`](test-sound-sequence.js) | Replays a command sequence that reaches sound-producing story behavior and checks emitted sound events. | [`../docs/INTERPRETER_EXTENSIONS.md`](../docs/INTERPRETER_EXTENSIONS.md); Z3 sound opcode context: [`../docs/Z3_ENGINE_FORMAT_SUMMARY.md`](../docs/Z3_ENGINE_FORMAT_SUMMARY.md). |
| [`test-vm-core.js`](test-vm-core.js) | Unit-tests VM instruction decoding and core opcode execution with synthetic Z3 memory images. | [`../docs/Z3_ENGINE_FORMAT_SUMMARY.md`](../docs/Z3_ENGINE_FORMAT_SUMMARY.md); [`../docs/PHASE1_FOUNDATION_DESIGN.md`](../docs/PHASE1_FOUNDATION_DESIGN.md). |
| [`test-vm-io.js`](test-vm-io.js) | Unit-tests VM line-input handling and text/parse-buffer population for `sread`. | [`../docs/Z3_ENGINE_FORMAT_SUMMARY.md`](../docs/Z3_ENGINE_FORMAT_SUMMARY.md); I/O design context: [`../docs/PHASE1_FOUNDATION_DESIGN.md`](../docs/PHASE1_FOUNDATION_DESIGN.md). |
| [`test-wireframe3d.js`](test-wireframe3d.js) | Verifies the wireframe command runner, SVG output, scene rotation, and hidden-edge modes. | [`../docs/WIREFRAME_3D_TOOL.md`](../docs/WIREFRAME_3D_TOOL.md); schema: [`../docs/wireframe3d-command.schema.json`](../docs/wireframe3d-command.schema.json). |

