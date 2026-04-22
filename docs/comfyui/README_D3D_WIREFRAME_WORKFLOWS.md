# ComfyUI Import Quick Steps

1. In ComfyUI, use **Load** and select:
   - `d3d_wireframe_architecture_i2i_flux1_dev.workflow.json` after `flux1-dev-fp8-e5m2.safetensors` is downloaded.
   - `d3d_wireframe_architecture_i2i_flux1_schnell.workflow.json` if you want to keep using `flux1-schnell`.
2. In the `LoadImage` node, pick your input overlay/image.
3. Run the graph. Output is saved with prefix:
   - `TLH/map_overlays/d3d_wireframe_architecture_i2i_flux1_dev`

## Important
- The `.workflow.json` files are for ComfyUI UI import.
- The `.api.json` file is only for API `/prompt` usage.
