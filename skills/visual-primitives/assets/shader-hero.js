/**
 * shader-hero.js — animated gradient hero. Raw WebGL, no dependencies, ~4KB.
 *
 *   <div data-shader data-colors="#1a1035,#6b3fa0,#e8a87c" data-speed="0.5">
 *     <canvas></canvas>
 *   </div>
 *   import { mountShader } from "./shader-hero.js";
 *   document.querySelectorAll("[data-shader]").forEach(mountShader);
 *
 * Handles: DPR clamping, offscreen + tab-blur pause, reduced-motion static
 * frame, CSS gradient fallback when WebGL is unavailable.
 */

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;
uniform vec3  u_c1;
uniform vec3  u_c2;
uniform vec3  u_c3;
uniform float u_grain;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                 dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
             mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                 dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res.xy) / min(u_res.x, u_res.y);
  p *= 1.6;
  float t = u_time * 0.05;

  // domain warp — this is what makes it look like fluid rather than clouds
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + 0.20 * u_mouse + t * 0.7),
                fbm(p + 2.0 * q + vec2(8.3, 2.8) - 0.20 * u_mouse));
  float f = fbm(p + 1.8 * r);

  vec3 col = mix(u_c1, u_c2, clamp((f + 0.35) * 1.5, 0.0, 1.0));
  col = mix(col, u_c3, clamp(length(r) * 0.75, 0.0, 1.0));

  float d = length(p);
  col *= 1.0 - 0.22 * d * d;                       // vignette, keeps text legible

  float g = fract(sin(dot(gl_FragCoord.xy + u_time, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * u_grain;

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(n.slice(0, 2), 16) / 255,
    parseInt(n.slice(2, 4), 16) / 255,
    parseInt(n.slice(4, 6), 16) / 255,
  ];
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("[shader-hero]", gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export function mountShader(host, opts = {}) {
  const canvas = host.querySelector("canvas") || host.appendChild(document.createElement("canvas"));
  const colors = (opts.colors || host.dataset.colors || "#141026,#4c3a8f,#e0a37a")
    .split(",").map((c) => hexToRgb(c));
  const speed = parseFloat(opts.speed ?? host.dataset.speed ?? 0.5);
  const grain = parseFloat(opts.grain ?? host.dataset.grain ?? 0.05);

  const fallback = () => {
    canvas.remove();
    const [a, b, c] = (opts.colors || host.dataset.colors || "#141026,#4c3a8f,#e0a37a").split(",");
    host.style.background =
      `radial-gradient(75% 65% at 20% 15%, ${b} 0%, transparent 60%),` +
      `radial-gradient(65% 70% at 85% 30%, ${c} 0%, transparent 55%), ${a}`;
  };

  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return fallback();

  const prog = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return fallback();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return fallback();
  gl.useProgram(prog);

  // one full-screen triangle — cheaper than a quad, no seam
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = (n) => gl.getUniformLocation(prog, n);
  const uRes = U("u_res"), uTime = U("u_time"), uMouse = U("u_mouse"), uGrain = U("u_grain");
  gl.uniform3fv(U("u_c1"), colors[0]);
  gl.uniform3fv(U("u_c2"), colors[1] || colors[0]);
  gl.uniform3fv(U("u_c3"), colors[2] || colors[1] || colors[0]);
  gl.uniform1f(uGrain, grain);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    // cap DPR at 1.5 — a 3x retina phone rendering fbm full-res is a heat problem
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(host.clientWidth * dpr);
    const h = Math.floor(host.clientHeight * dpr);
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
  }

  function draw(t) {
    gl.uniform1f(uTime, t);
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  resize();
  new ResizeObserver(resize).observe(host);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let raf = null, start = performance.now(), visible = true, focused = true;

  const loop = (now) => {
    draw(((now - start) / 1000) * speed);
    raf = requestAnimationFrame(loop);
  };

  function sync() {
    const shouldRun = visible && focused && !reduce.matches;
    if (shouldRun && raf === null) {
      start = performance.now();
      raf = requestAnimationFrame(loop);
    } else if (!shouldRun && raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
      if (reduce.matches) draw(12.0);   // one pleasant static frame
    }
  }

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0 }).observe(host);
  document.addEventListener("visibilitychange", () => { focused = !document.hidden; sync(); });
  reduce.addEventListener("change", sync);

  host.addEventListener("pointermove", (e) => {
    const r = host.getBoundingClientRect();
    mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * -2;
  });

  draw(12.0);   // paint immediately — never show a blank canvas while observers settle
  sync();

  return { destroy: () => { if (raf) cancelAnimationFrame(raf); gl.getExtension("WEBGL_lose_context")?.loseContext(); } };
}
