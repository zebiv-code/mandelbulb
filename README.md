# Mandelbulb

Interactive 3D Mandelbulb fractal explorer with real-time GPU ray marching, orbit camera, and adjustable parameters.

**[Live Demo](https://zebiv.com/mandelbulb/)**

## Controls

- **Drag** to orbit
- **Scroll** to zoom
- **Power slider** (2–16) changes the fractal exponent
- **Max Steps** controls ray marching quality
- **4 color schemes**: Warm, Cool, Monochrome, Neon
- **Animate** toggles auto-rotation

## Tech

- WebGL fragment shader ray marching
- Mandelbulb distance estimator with smooth normals
- Soft shadows, ambient occlusion, specular highlights
- Fog and gamma correction
- Native device resolution rendering
- Single HTML file, no build step

## License

MIT — see [LICENSE.md](LICENSE.md)
