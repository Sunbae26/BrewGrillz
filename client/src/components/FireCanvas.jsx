import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../motion/gsap'

/*
  Live WebGL flame + smoke (domain-warped fBm noise), coloured in the brand
  palette: charcoal → deep red → BrewGrillz red → amber → white-hot core.
  Renders at reduced resolution for speed, pauses off-screen / in background tabs.
*/
const FRAG = `
// highp is required: Apple-silicon GPUs treat mediump as 16-bit, which breaks the noise
// (the fire renders as flat grey haze instead of flames).
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;

// sin-free hash that stays stable at lower precision (Dave Hoskins)
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++){ v += a*noise(p); p = r*p*2.02; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
  float t = uTime * 0.5;

  // heat drifts toward the cursor a little
  p.x += (uMouse.x - 0.5) * 0.12 * uv.y;

  vec2 q = vec2(fbm(p*2.2 + vec2(0.0, -t*1.7)), fbm(p*2.2 + vec2(4.7, -t*1.4)));
  vec2 w = vec2(fbm(p*3.0 + q*1.8 + vec2(1.7, -t*2.6)), fbm(p*3.0 + q*1.8 + vec2(8.3, -t*2.2)));
  float n = fbm(p*2.6 + w*1.5 + vec2(0.0, -t*3.0));

  // tongues of flame: strongest at the bottom, licking upward
  float base = 1.0 - uv.y;
  float flame = n * 1.55 - uv.y * 1.65 + 0.12 + base*base*0.35;
  flame = clamp(flame, 0.0, 1.0);
  float f = pow(flame, 1.45);

  vec3 col = vec3(0.055, 0.045, 0.04);
  col = mix(col, vec3(0.36, 0.04, 0.03), smoothstep(0.02, 0.22, f));
  col = mix(col, vec3(0.855, 0.22, 0.2), smoothstep(0.18, 0.48, f));
  col = mix(col, vec3(1.0, 0.56, 0.18), smoothstep(0.46, 0.72, f));
  col = mix(col, vec3(1.0, 0.9, 0.7), smoothstep(0.74, 0.98, f));

  // smoke curling above the fire
  float s = fbm(p*1.6 + w*0.9 + vec2(t*0.25, -t*0.75));
  float smoke = smoothstep(0.25, 0.95, uv.y) * smoothstep(0.42, 0.95, s) * 0.42;
  col += vec3(0.42, 0.39, 0.37) * smoke * (1.0 - f);

  // glow + vignette
  col += vec3(0.5, 0.08, 0.05) * pow(base, 3.0) * 0.35;
  // NB: smoothstep with edge0 > edge1 is undefined in GLSL — Apple/Metal GPUs blow it out to grey-white.
  float v = 1.0 - smoothstep(0.25, 1.35, length((uv - vec2(0.5, 0.3)) * vec2(aspect*0.75, 1.0)));
  col *= mix(0.35, 1.0, v);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`

export default function FireCanvas({ className = '', scale = 0.34 }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!gl) {
      canvas.classList.add('fire--fallback')
      return
    }
    const sh = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const uRes = gl.getUniformLocation(prog, 'uRes')
    const uTime = gl.getUniformLocation(prog, 'uTime')
    const uMouse = gl.getUniformLocation(prog, 'uMouse')

    const mouse = { x: 0.5, y: 0.5, tx: 0.5 }
    const onMove = (e) => { mouse.tx = e.clientX / window.innerWidth }
    window.addEventListener('pointermove', onMove, { passive: true })

    const isMobile = window.innerWidth < 760
    const res = isMobile ? scale * 0.8 : scale
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      // cap the internal resolution — the CSS upscale is invisible under the smoke + grain
      const k = Math.min(res, 820 / Math.max(w, 1))
      canvas.width = Math.max(2, Math.floor(w * k))
      canvas.height = Math.max(2, Math.floor(h * k))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    let raf, visible = true, last = 0, start = performance.now()
    const draw = (now) => {
      mouse.x += (mouse.tx - mouse.x) * 0.04
      gl.uniform1f(uTime, ((now - start) / 1000) % 600) // keep the number small for GPU precision
      gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      // ~30fps is plenty for fire and halves the GPU work
      if (!visible || document.hidden || now - last < 32) return
      last = now
      draw(now)
    }
    if (prefersReducedMotion()) draw(start + 4000)
    else raf = requestAnimationFrame(loop)

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 })
    io.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [scale])

  return <canvas ref={ref} className={`fire ${className}`} aria-hidden="true" />
}
