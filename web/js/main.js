// ─── Mandelbulb explorer ────────────────────────────────────────
import { VERTEX_SRC, FRAGMENT_SRC } from './shader.js';

const canvas = document.getElementById('c');
const dpr = window.devicePixelRatio || 1;
canvas.width = Math.floor(window.innerWidth * dpr);
canvas.height = Math.floor(window.innerHeight * dpr);

const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
if (!gl) { document.body.textContent = 'WebGL not supported'; }

// Compile shaders
function makeShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
    }
    return s;
}

const prog = gl.createProgram();
gl.attachShader(prog, makeShader(VERTEX_SRC, gl.VERTEX_SHADER));
gl.attachShader(prog, makeShader(FRAGMENT_SRC, gl.FRAGMENT_SHADER));
gl.linkProgram(prog);
gl.useProgram(prog);

// Full-screen quad
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
const aPos = gl.getAttribLocation(prog, 'aPos');
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

// Uniforms
const uResolution = gl.getUniformLocation(prog, 'uResolution');
const uCamPos = gl.getUniformLocation(prog, 'uCamPos');
const uCamRot = gl.getUniformLocation(prog, 'uCamRot');
const uPower = gl.getUniformLocation(prog, 'uPower');
const uMaxSteps = gl.getUniformLocation(prog, 'uMaxSteps');
const uPalette = gl.getUniformLocation(prog, 'uPalette');

// Camera state (spherical orbit)
let camDist = 3.0;
let camTheta = 0.6;  // elevation
let camPhi = 0.8;    // azimuth
let power = 8.0;
let maxSteps = 128;
let palette = 0;
let animating = false;

function getCamPos() {
    return [
        camDist * Math.sin(camTheta) * Math.cos(camPhi),
        camDist * Math.cos(camTheta),
        camDist * Math.sin(camTheta) * Math.sin(camPhi)
    ];
}

function getCamRotation(pos) {
    // Look-at matrix (camera rotation part only)
    const target = [0, 0, 0];
    const up = [0, 1, 0];

    const f = normalize(sub(target, pos));
    const r = normalize(cross(f, up));
    const u = cross(r, f);

    // Column-major mat3 for GLSL (each column is 3 consecutive values)
    return [
        r[0], r[1], r[2],
        u[0], u[1], u[2],
        -f[0], -f[1], -f[2]
    ];
}

function sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function normalize(v) {
    const l = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    return [v[0]/l, v[1]/l, v[2]/l];
}

function render() {
    if (animating) camPhi += 0.003;

    const pos = getCamPos();
    const rot = getCamRotation(pos);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform3f(uCamPos, pos[0], pos[1], pos[2]);
    gl.uniformMatrix3fv(uCamRot, false, rot);
    gl.uniform1f(uPower, power);
    gl.uniform1i(uMaxSteps, maxSteps);
    gl.uniform1i(uPalette, palette);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}

// ─── Interaction ────────────────────────────────────────────────
let dragging = false, lastX, lastY;

canvas.addEventListener('pointerdown', e => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    camPhi += (e.clientX - lastX) * 0.005;
    camTheta -= (e.clientY - lastY) * 0.005;
    camTheta = Math.max(0.1, Math.min(Math.PI - 0.1, camTheta));
    lastX = e.clientX; lastY = e.clientY;
});

canvas.addEventListener('pointerup', () => dragging = false);

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    camDist *= e.deltaY > 0 ? 1.08 : 1 / 1.08;
    camDist = Math.max(1.2, Math.min(10, camDist));
}, { passive: false });

// ─── Controls ───────────────────────────────────────────────────
const powerSlider = document.getElementById('power');
const stepsSlider = document.getElementById('steps');

powerSlider.addEventListener('input', () => {
    power = parseFloat(powerSlider.value);
    document.getElementById('power-val').textContent = power;
});

stepsSlider.addEventListener('input', () => {
    maxSteps = parseInt(stepsSlider.value);
    document.getElementById('steps-val').textContent = maxSteps;
});

document.getElementById('palette').addEventListener('change', e => {
    palette = parseInt(e.target.value);
});

document.getElementById('reset').addEventListener('click', () => {
    camDist = 3.0; camTheta = 0.6; camPhi = 0.8;
    power = 8.0; maxSteps = 128; palette = 0;
    powerSlider.value = 8; document.getElementById('power-val').textContent = '8';
    stepsSlider.value = 128; document.getElementById('steps-val').textContent = '128';
    document.getElementById('palette').value = '0';
});

document.getElementById('animate').addEventListener('click', () => {
    animating = !animating;
    document.getElementById('animate').textContent = `Animate: ${animating ? 'ON' : 'OFF'}`;
});

window.addEventListener('resize', () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
});

render();
