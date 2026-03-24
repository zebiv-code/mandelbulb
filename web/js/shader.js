// ─── Mandelbulb ray marching shaders ────────────────────────────

export const VERTEX_SRC = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAGMENT_SRC = `
precision highp float;

uniform vec2 uResolution;
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform float uPower;
uniform int uMaxSteps;
uniform int uPalette;

const float MAX_DIST = 20.0;
const float EPSILON = 0.001;
const int BAILOUT_ITER = 12;

// Mandelbulb distance estimator
vec2 mandelbulbDE(vec3 pos) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    float trap = 1e10;

    for (int i = 0; i < BAILOUT_ITER; i++) {
        r = length(z);
        if (r > 2.0) break;

        // Convert to spherical
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        dr = pow(r, uPower - 1.0) * uPower * dr + 1.0;

        // Scale and rotate
        float zr = pow(r, uPower);
        theta *= uPower;
        phi *= uPower;

        // Back to cartesian
        z = zr * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
        z += pos;

        trap = min(trap, length(z));
    }

    return vec2(0.5 * log(r) * r / dr, trap);
}

// Estimate normal via gradient
vec3 estimateNormal(vec3 p) {
    vec2 e = vec2(EPSILON, 0.0);
    return normalize(vec3(
        mandelbulbDE(p + e.xyy).x - mandelbulbDE(p - e.xyy).x,
        mandelbulbDE(p + e.yxy).x - mandelbulbDE(p - e.yxy).x,
        mandelbulbDE(p + e.yyx).x - mandelbulbDE(p - e.yyx).x
    ));
}

// Soft shadow
float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
    float res = 1.0;
    float t = mint;
    for (int i = 0; i < 32; i++) {
        if (t >= maxt) break;
        float h = mandelbulbDE(ro + rd * t).x;
        if (h < EPSILON) return 0.0;
        res = min(res, k * h / t);
        t += h;
    }
    return clamp(res, 0.0, 1.0);
}

// Ambient occlusion
float ambientOcclusion(vec3 p, vec3 n) {
    float occ = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.12 * float(i);
        float d = mandelbulbDE(p + h * n).x;
        occ += (h - d) * sca;
        sca *= 0.75;
    }
    return clamp(1.0 - 1.5 * occ, 0.0, 1.0);
}

vec3 colorize(float trap, vec3 normal, int pal) {
    vec3 base;
    if (pal == 1) {
        base = vec3(0.15, 0.4, 0.8) + vec3(0.5, 0.4, 0.3) * trap;
    } else if (pal == 2) {
        float v = 0.4 + 0.6 * trap;
        base = vec3(v);
    } else if (pal == 3) {
        base = vec3(
            0.5 + 0.5 * sin(trap * 6.28 + 0.0),
            0.5 + 0.5 * sin(trap * 6.28 + 2.1),
            0.5 + 0.5 * sin(trap * 6.28 + 4.2)
        );
    } else {
        base = vec3(0.7, 0.35, 0.15) + vec3(0.3, 0.45, 0.55) * trap;
    }
    return base;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

    // Ray direction
    vec3 rd = normalize(uCamRot * vec3(uv, -1.5));
    vec3 ro = uCamPos;

    // Ray march
    float t = 0.0;
    float trap = 0.0;
    bool hit = false;

    for (int i = 0; i < 256; i++) {
        if (i >= uMaxSteps) break;
        vec3 p = ro + rd * t;
        vec2 res = mandelbulbDE(p);
        float d = res.x;

        if (d < EPSILON) {
            trap = res.y;
            hit = true;
            break;
        }
        if (t > MAX_DIST) break;
        t += d;
    }

    vec3 col = vec3(0.02, 0.02, 0.04); // background

    if (hit) {
        vec3 p = ro + rd * t;
        vec3 n = estimateNormal(p);

        // Lighting
        vec3 lightDir = normalize(vec3(0.6, 0.8, -0.5));
        float diff = max(dot(n, lightDir), 0.0);
        float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 16.0);
        float shadow = softShadow(p + n * 0.01, lightDir, 0.01, 5.0, 8.0);
        float ao = ambientOcclusion(p, n);

        vec3 baseCol = colorize(trap, n, uPalette);

        col = baseCol * (0.3 + 0.7 * diff * shadow) * ao;
        col += vec3(0.6) * spec * shadow;

        // Fog
        float fog = exp(-0.08 * t * t);
        col = mix(vec3(0.02), col, fog);
    }

    // Gamma
    col = pow(col, vec3(0.4545));

    gl_FragColor = vec4(col, 1.0);
}
`;
