# D3D Wireframe FLUX1 i2i Workflow

This workflow is compatible with the current local ComfyUI setup at `C:\AI\ComfyUI\user`.

## Uses
- `models/diffusion_models/flux1/flux1-schnell-Q8_0.gguf`
- `models/loras/flux/Flux.1 3D Wireframe architecture - 1752544956.safetensors`
- `models/text_encoders/flux/t5xxl_fp8_e4m3fn.safetensors`
- `models/text_encoders/flux/clip_l.safetensors`
- `models/vae/flux/ae.safetensors`

## Notes
- The LoRA metadata indicates it was trained on `flux1-dev-fp8-e5m2.safetensors`.
- You can still run it on `flux1-schnell`, but style fidelity may be lower than on a matching `flux1-dev` base.
- If output is too weak, try `strength_model` in `0.9-1.15` and denoise in `0.72-0.85`.
