/**
 * indiaParticlesServices.js - Free-floating India particle map (Service Page Version)
 * Right-side placement, Pune hub-and-spoke network, high-definition styling.
 */
import * as THREE from 'three';

(function () {
  'use strict';

  const CANVAS_ID = 'india-3d-canvas';
  const LABELS_ID = 'india-city-labels';
  const PARTICLE_CNT = 12000;
  const SCALE = 0.90; // Further increased scale
  const GREEN = 0x07923a;
  const GREEN_BRIGHT = 0x18f55a;
  const CITY_R = 0.008; // Increased node size

  // Outline traced directly from reference map image
  const INDIA_RAW = [
    [75.47, 38.24], [74.9, 37.93], [74.57, 38.05], [74.73, 37.8], [74.02, 37.78],
    [73.93, 37.53], [73.57, 37.27], [73.52, 36.86], [74.03, 36.81], [74.18, 36.53],
    [74.64, 36.4], [74.58, 36.06], [74.95, 35.94], [74.87, 35.67], [74.33, 35.26],
    [74.51, 33.61], [75.18, 33.24], [75.46, 33.3], [75.46, 32.94], [75.79, 32.94],
    [76.07, 32.66], [75.39, 32.28], [75.3, 31.42], [75.46, 31.37], [74.74, 30.59],
    [74.81, 30.4], [74.29, 30.13], [73.9, 29.15], [73.38, 28.85], [72.94, 27.98],
    [71.99, 27.71], [71.77, 28.04], [71.57, 28.04], [70.85, 27.14], [70.77, 26.7],
    [71.38, 26.46], [71.31, 25.82], [71.49, 25.57], [71.82, 25.57], [71.83, 25.24],
    [72.21, 24.51], [72.13, 24.26], [72.23, 24.22], [71.85, 24.03], [71.74, 24.24],
    [71.25, 23.98], [70.13, 24.12], [70.1, 23.78], [69.75, 23.78], [69.51, 23.43],
    [70.56, 22.57], [70.98, 22.55], [71.28, 22.67], [71.52, 22.97], [71.87, 22.95],
    [71.34, 22.31], [70.52, 21.97], [70.38, 22.22], [70.26, 22.05], [71.27, 20.86],
    [71.91, 20.42], [72.28, 20.46], [73.13, 20.9], [73.33, 21.36], [73.21, 21.54],
    [73.38, 22.04], [73.76, 21.97], [73.57, 21.96], [73.49, 21.7], [73.6, 21.65],
    [73.51, 21.41], [73.73, 21.39], [73.58, 21.32], [73.59, 20.82], [73.85, 20.3],
    [73.63, 19.53], [74.35, 15.77], [75.18, 14.2], [75.91, 11.83], [76.41, 11.17],
    [77.14, 8.82], [77.64, 8.22], [78.06, 8.02], [78.53, 8.32], [78.62, 8.81],
    [78.82, 9.01], [79.64, 9.15], [79.28, 9.36], [79.62, 10.1], [80.17, 10.18],
    [80.06, 11.44], [80.4, 12.21], [80.59, 13.05], [80.32, 14.78], [80.53, 15.41],
    [80.85, 15.59], [81.12, 15.43], [81.46, 16.02], [81.83, 16.01], [82.35, 16.26],
    [82.36, 16.75], [83.98, 17.98], [84.71, 18.95], [85.13, 19.3], [86.05, 19.67],
    [86.65, 20.42], [86.45, 20.87], [86.72, 21.22], [87.32, 21.42], [87.67, 21.84],
    [87.71, 21.28], [87.78, 21.58], [88.16, 21.74], [88.48, 21.34], [88.35, 21.52],
    [88.47, 21.68], [88.28, 22.77], [88.35, 22.98], [88.16, 23.03], [88.19, 23.25],
    [88.01, 23.44], [88.16, 23.7], [88.16, 24.1], [87.62, 24.33], [87.53, 24.51],
    [87.66, 24.78], [87.8, 24.7], [87.92, 25.04], [88.41, 25.11], [88.22, 25.39],
    [87.99, 25.38], [87.6, 25.7], [87.66, 26.03], [87.96, 26.28], [87.84, 26.51],
    [88.24, 26.13], [88.43, 26.13], [88.33, 26.3], [88.46, 26.3], [88.71, 25.89],
    [88.92, 25.85], [88.99, 26.11], [89.17, 25.81], [89.17, 25.13], [89.68, 24.98],
    [91.17, 25.02], [91.48, 24.86], [91.54, 24.71], [91.32, 24.74], [91.31, 24.36],
    [91.03, 24.15], [91.02, 23.96], [90.87, 24.06], [90.71, 23.88], [90.54, 23.91],
    [90.34, 23.37], [90.51, 22.86], [90.6, 23.02], [90.77, 22.7], [90.95, 22.84],
    [90.9, 23.07], [91.1, 23.27], [91.06, 23.47], [91.35, 23.48], [91.64, 21.74],
    [91.76, 21.87], [91.94, 21.71], [92.2, 21.99], [92.13, 22.79], [92.27, 22.76],
    [92.37, 22.9], [92.32, 23.86], [93.06, 23.63], [93.59, 24.86], [93.44, 25.07],
    [93.49, 25.24], [93.86, 25.6], [93.99, 25.96], [93.96, 26.53], [94.92, 27.23],
    [95.42, 27.31], [95.5, 27.13], [95.74, 27.05], [95.54, 27.59], [95.98, 28.06],
    [95.97, 28.25], [95.72, 28.41], [94.98, 28.46], [95.28, 28.86], [95.19, 29.18],
    [94.87, 29.02], [95.09, 29.37], [94.94, 29.36], [94.81, 29.59], [94.36, 29.38],
    [94.22, 29.14], [93.65, 29.29], [93.48, 29.48], [93.1, 29.19], [92.84, 28.75],
    [92.31, 28.7], [92.2, 28.38], [91.73, 28.16], [91.76, 28.0], [91.6, 27.83],
    [91.32, 27.88], [91.0, 27.73], [90.71, 27.87], [90.74, 27.5], [91.15, 27.37],
    [91.16, 26.79], [89.93, 26.71], [89.65, 26.86], [89.09, 26.63], [88.73, 26.8],
    [88.52, 26.75], [88.2, 27.11], [88.32, 27.26], [88.2, 27.55], [88.3, 27.9],
    [88.04, 28.13], [87.6, 27.94], [87.66, 27.79], [87.49, 27.1], [87.66, 26.7],
    [87.56, 26.35], [86.89, 26.27], [86.66, 26.52], [86.34, 26.35], [85.97, 26.55],
    [85.57, 26.51], [85.39, 26.79], [84.98, 26.7], [84.47, 27.01], [84.44, 27.32],
    [83.99, 27.5], [83.75, 27.34], [83.35, 27.47], [83.26, 27.31], [82.76, 27.49],
    [82.71, 27.72], [82.48, 27.68], [82.14, 27.94], [81.98, 27.87], [81.48, 28.18],
    [81.36, 28.41], [80.34, 28.93], [80.52, 29.26], [80.61, 29.91], [81.21, 30.46],
    [80.48, 30.82], [80.5, 31.01], [80.16, 31.26], [79.76, 31.32], [79.5, 31.77],
    [79.16, 31.66], [79.17, 32.38], [78.9, 32.69], [78.84, 32.98], [79.13, 33.14],
    [79.35, 32.77], [79.93, 33.2], [79.69, 33.52], [79.78, 33.82], [79.31, 34.0],
    [79.29, 34.21], [79.46, 34.26], [79.28, 34.62], [79.72, 34.69], [79.9, 34.94],
    [79.84, 35.18], [80.08, 35.2], [80.07, 35.36], [80.34, 35.47], [80.54, 36.51],
    [80.27, 36.78], [80.04, 36.74], [79.57, 36.96], [79.46, 36.78], [78.84, 36.72],
    [78.57, 36.44], [77.92, 36.36], [77.89, 36.64], [77.4, 36.79], [77.29, 37.13],
    [76.44, 37.66], [76.07, 38.22], [75.67, 38.06]
  ];

  function norm(lon, lat) { return [(lon - 82.75) / 15.5, (lat - 23.25) / 15.5]; }
  const OUTLINE = INDIA_RAW.map(([lo, la]) => norm(lo, la));

  // Cities nodes (Pune hub-and-spoke)
  const CITIES = [
    { name: '', lon: 77.36, lat: 27.88 }, // 0 New Delhi
    { name: '', lon: 77.20, lat: 27.74 }, // 1 Gurgaon
    { name: '', lon: 73.28, lat: 22.96 }, // 2 Ahmedabad
    { name: '', lon: 73.82, lat: 22.32 }, // 3 Vadodara
    { name: '', lon: 74.29, lat: 19.48, isHub: true }, // 4 Mumbai
    { name: 'PUNE (HQ)', lon: 74.41, lat: 19.00, isMainHub: true }, // 5 Pune (HQ)
    { name: '', lon: 77.70, lat: 14.11, isHub: true }, // 6 Bangalore
    { name: '', lon: 78.48, lat: 17.99, isHub: true }, // 7 Hyderabad
    { name: '', lon: 80.06, lat: 14.21, isHub: true }, // 8 Chennai
    { name: '', lon: 87.13, lat: 22.56, isHub: true }, // 9 Kolkata
    { name: '', lon: 76.11, lat: 26.38, isHub: true }, // 10 Jaipur
    { name: '', lon: 80.65, lat: 26.32, isHub: true }, // 11 Lucknow
    { name: '', lon: 77.54, lat: 23.16 }, // 12 Bhopal
    { name: '', lon: 84.33, lat: 25.22 }, // 13 Patna
    { name: '', lon: 76.98, lat: 29.74 }, // 14 Chandigarh
    { name: '', lon: 79.01, lat: 21.30 }, // 15 Nagpur
    { name: '', lon: 77.01, lat: 11.44 }, // 16 Kochi
    { name: '', lon: 90.14, lat: 25.70 }, // 17 Guwahati
    { name: '', lon: 75.75, lat: 30.53 }, // 18 Amritsar
    { name: '', lon: 85.28, lat: 22.76 }, // 19 Jamshedpur
    { name: '', lon: 82.73, lat: 18.26, isHub: true }, // 20 Vizag
  ].map(c => { const [nx, ny] = norm(c.lon, c.lat); return { ...c, nx: nx * SCALE, ny: ny * SCALE }; });

  const CONNECTIONS = [
    // Primary Pune Hub-and-Spoke
    [5, 4], [5, 2], [5, 0], [5, 1], [5, 6], [5, 7], [5, 8], [5, 15], [5, 12], [5, 9], [5, 10], [5, 11], [5, 13], [5, 14], [5, 17],
    // Secondary Network Lines
    [2, 3], [3, 4], [6, 8], [7, 8], [9, 19], [19, 13], [13, 11], [11, 0],
    [10, 12], [12, 15], [15, 7], [15, 9], [6, 16], [8, 20], [20, 9], [14, 18], [0, 14], [0, 1]
  ];

  function pip(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  function buildTarget(n) {
    const pos = new Float32Array(n * 3);
    let filled = 0, tries = 0;
    const innerCount = n * 0.10;
    while (filled < innerCount && tries < n * 40) {
      tries++;
      const px = -1.1 + Math.random() * 2.2, py = -1.1 + Math.random() * 2.2;
      if (pip(px, py, OUTLINE)) {
        pos[filled * 3] = px * SCALE; pos[filled * 3 + 1] = py * SCALE;
        pos[filled * 3 + 2] = (Math.random() - 0.5) * 0.20; filled++;
      }
    }
    let totalLength = 0;
    const segmentLengths = [];
    for (let i = 0; i < OUTLINE.length; i++) {
      const j = (i + 1) % OUTLINE.length;
      const dx = OUTLINE[j][0] - OUTLINE[i][0], dy = OUTLINE[j][1] - OUTLINE[i][1];
      const len = Math.sqrt(dx * dx + dy * dy);
      segmentLengths.push(len); totalLength += len;
    }
    while (filled < n) {
      let r = Math.random() * totalLength, i = 0;
      while (r > segmentLengths[i] && i < segmentLengths.length - 1) { r -= segmentLengths[i]; i++; }
      const j = (i + 1) % OUTLINE.length;
      const f = segmentLengths[i] > 0 ? r / segmentLengths[i] : 0;
      pos[filled * 3] = (OUTLINE[i][0] + (OUTLINE[j][0] - OUTLINE[i][0]) * f) * SCALE + (Math.random() - 0.5) * 0.001;
      pos[filled * 3 + 1] = (OUTLINE[i][1] + (OUTLINE[j][1] - OUTLINE[i][1]) * f) * SCALE + (Math.random() - 0.5) * 0.001;
      pos[filled * 3 + 2] = (Math.random() - 0.5) * 0.005; filled++;
    }
    return pos;
  }

  function buildScatter(n) {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2, r = Math.random() * 7.0;
      pos[i * 3] = Math.cos(th) * r; pos[i * 3 + 1] = Math.sin(th) * r;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12.0;
    }
    return pos;
  }

  let scene, camera, renderer, particleGeo, particleMat, particleMesh;
  let cityMeshes = [], lineMeshes = [], flowDots = [], labelEls = [];
  let targetPos, scatterPos, targetEl = null;
  let assembly = 0, targetAssembly = 0, glowIntensity = 0, networkProgress = 0;
  let idleTime = 0, inited = false, canvasW = 0, canvasH = 0;
  let lockAssembly = false, stickyWait = false, scrollYAtFormation = 0, lastOffset = 0;
  let mapOffsetX = 0, mapOffsetY = 0.05; // Moved down slightly
  let mouse = new THREE.Vector2(-999, -999), targetMouse = new THREE.Vector2(-999, -999);

  function init() {
    const wrapper = document.getElementById(CANVAS_ID);
    if (!wrapper || inited) return;
    const parent = wrapper.parentElement;
    canvasW = parent ? parent.clientWidth : wrapper.clientWidth;
    canvasH = parent ? parent.clientHeight : wrapper.clientHeight;
    if (canvasW < 10) { setTimeout(init, 350); return; }
    inited = true;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, canvasW / canvasH, 0.1, 100);
    camera.position.z = 2.8;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvasW, canvasH);
    renderer.setClearColor(0x000000, 0);
    wrapper.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'display:block;position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:auto;';

    const eventTarget = document.getElementById('network');
    if (eventTarget) {
      eventTarget.addEventListener('mousemove', onMouseMove);
      eventTarget.addEventListener('mouseleave', onMouseLeave);
      eventTarget.addEventListener('touchstart', onTouchMove, { passive: false });
      eventTarget.addEventListener('touchmove', onTouchMove, { passive: false });
      eventTarget.addEventListener('touchend', onMouseLeave);
    }

    targetPos = buildTarget(PARTICLE_CNT);
    scatterPos = buildScatter(PARTICLE_CNT);
    createParticles(); createCities(); createNetwork(); createLabels();
    window.addEventListener('resize', onResize);
    setupScroll(); loop();
  }

  function onMouseMove(e) {
    const wrapper = document.getElementById(CANVAS_ID);
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    targetMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    targetMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }
  function onTouchMove(e) {
    if (e.touches.length > 0) {
      const rect = renderer.domElement.getBoundingClientRect();
      targetMouse.x = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
      targetMouse.y = -((e.touches[0].clientY - rect.top) / rect.height) * 2 + 1;
    }
  }
  function onMouseLeave() { targetMouse.set(-999, -999); }

  function createParticles() {
    particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(scatterPos), 3));
    const sz = new Float32Array(PARTICLE_CNT);
    for (let i = 0; i < PARTICLE_CNT; i++) sz[i] = 0.012 + Math.random() * 0.016;
    particleGeo.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    particleMat = new THREE.ShaderMaterial({
      uniforms: { uGlow: { value: 0 }, uColor: { value: new THREE.Color(GREEN) }, uBright: { value: new THREE.Color(GREEN_BRIGHT) } },
      vertexShader: `
        attribute float size; uniform float uGlow; varying float vGlow, vEdgeFade;
        void main(){
          vGlow=uGlow; vec4 mv=modelViewMatrix*vec4(position,1.0); vec4 clipPos=projectionMatrix*mv;
          vec2 screenPos = clipPos.xy / clipPos.w; float maxDist = max(abs(screenPos.x), abs(screenPos.y));
          vEdgeFade = smoothstep(1.05, 0.98, maxDist);
          gl_PointSize=size*(300.0/-mv.z)*(0.7+uGlow*0.6); gl_Position=clipPos;
        }`,
      fragmentShader: `
        uniform vec3 uColor, uBright; uniform float uGlow; varying float vGlow, vEdgeFade;
        void main(){
          float d=length(gl_PointCoord-vec2(0.5)); if(d>0.5)discard;
          float core=smoothstep(0.5,0.0,d), halo=smoothstep(0.5,0.1,d)*0.4*vGlow;
          float a=(core+halo)*(0.4+vGlow*0.6) * vEdgeFade;
          gl_FragColor=vec4(mix(uColor,uBright,vGlow*0.75),a);
        }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    particleMesh = new THREE.Points(particleGeo, particleMat);
    scene.add(particleMesh);
  }

  function createCities() {
    const gNode = new THREE.SphereGeometry(CITY_R, 12, 12);
    const gRing = new THREE.RingGeometry(CITY_R * 3.0, CITY_R * 4.5, 24);
    CITIES.forEach((c) => {
      const isMainHub = c.isMainHub, isHub = c.isHub || isMainHub;
      const hubScale = isMainHub ? 3.2 : (isHub ? 2.4 : 1.8); // Scaled up all nodes
      const mat = new THREE.MeshBasicMaterial({ color: isMainHub ? 0xffffff : GREEN_BRIGHT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const mesh = new THREE.Mesh(gNode, mat); mesh.scale.setScalar(hubScale);
      const rMat = new THREE.MeshBasicMaterial({ color: GREEN_BRIGHT, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
      const ring = new THREE.Mesh(gRing, rMat); ring.scale.setScalar(isHub ? hubScale : 0.001);
      scene.add(mesh); scene.add(ring);
      cityMeshes.push({ mesh, ring, mat, rMat, phase: Math.random() * Math.PI * 2, isHub, nx: c.nx, ny: c.ny });
    });
  }

  function createNetwork() {
    CONNECTIONS.forEach(([a, b], idx) => {
      const ca = CITIES[a], cb = CITIES[b];
      const p1 = new THREE.Vector3(ca.nx, ca.ny, 0.03), p2 = new THREE.Vector3(cb.nx, cb.ny, 0.03);
      let isOutside = false;
      for (let i = 1; i <= 5; i++) {
        const testP = p1.clone().lerp(p2, i / 6);
        if (!pip(testP.x / SCALE, testP.y / SCALE, OUTLINE)) { isOutside = true; break; }
      }
      let curve = isOutside ? new THREE.QuadraticBezierCurve3(p1, p1.clone().add(p2).multiplyScalar(0.5).lerp(new THREE.Vector3(norm(82.8, 23.2)[0] * SCALE, norm(82.8, 23.2)[1] * SCALE, 0.03), 0.6), p2) : new THREE.LineCurve3(p1, p2);
      const points = curve.getPoints(24), geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const line = new THREE.Line(geo, mat); scene.add(line);
      lineMeshes.push({ line, mat, revealAt: (idx / CONNECTIONS.length) * 0.8, points });
      const dMat = new THREE.MeshBasicMaterial({ color: GREEN_BRIGHT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), dMat); scene.add(dot);
      flowDots.push({ dot, dMat, curve, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.3 });
    });
  }

  function createLabels() {
    const container = document.getElementById(LABELS_ID);
    if (!container) return;
    CITIES.forEach(c => {
      if (c.name !== 'PUNE (HQ)') return;
      const el = document.createElement('div'); el.className = 'india-city-label'; el.textContent = c.name;
      container.appendChild(el); labelEls.push({ el, ox: c.ox || 0, oy: c.oy || 0, nodeIdx: CITIES.indexOf(c) });
    });
  }

  function updateLabels() {
    if (!labelEls.length || !camera || !renderer) return;
    const canvas = renderer.domElement, W = canvas.clientWidth, H = canvas.clientHeight;
    labelEls.forEach(label => {
      const c = CITIES[label.nodeIdx], v = new THREE.Vector3(c.nx + mapOffsetX, c.ny + mapOffsetY, 0.06);
      v.project(camera); label.el.style.left = (v.x * 0.5 + 0.5) * W + label.ox + 'px';
      label.el.style.top = (-v.y * 0.5 + 0.5) * H + label.oy + 'px'; label.el.style.opacity = networkProgress;
    });
  }

  function setupScroll() { targetEl = document.querySelector('.india-network-grid'); }

  let _particleLastTime = 0;
  function loop(time) {
    requestAnimationFrame(loop);
    const isMob = window.innerWidth <= 768;
    if (isMob && time - _particleLastTime < 42) return; // ~24fps on mobile
    _particleLastTime = time;
    idleTime += 0.016;
    if (camera) camera.position.z = isMob ? 4.2 : 2.8;
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect(), vh = window.innerHeight, offset = (rect.top + rect.height / 2) - (vh / 2);
      const plateau = 100, spreadLimit = rect.height * 0.75;
      const naturalTarget = Math.max(0, 1 - (Math.abs(offset) - plateau) / (spreadLimit - plateau));
      if (Math.abs(offset) <= plateau) { targetAssembly = 1.0; lockAssembly = true; scrollYAtFormation = window.scrollY; stickyWait = false; }
      else if (stickyWait) { targetAssembly = 1.0; if (Math.abs(window.scrollY - scrollYAtFormation) > 10) stickyWait = false; }
      else { targetAssembly = naturalTarget; }
      if (lockAssembly) { targetAssembly = 1.0; if (assembly > 0.99) { lockAssembly = false; stickyWait = true; scrollYAtFormation = window.scrollY; } }
    }
    assembly += (targetAssembly - assembly) * 0.18; glowIntensity += (targetAssembly - glowIntensity) * 0.12;
    networkProgress = Math.max(0, (assembly - 0.90) / 0.10);
    const ease = 0.5 * (1 - Math.cos(Math.PI * assembly));
    if (targetMouse.x > -1.1) { if (mouse.x < -1.1) mouse.copy(targetMouse); else mouse.lerp(targetMouse, 0.65); } else { mouse.copy(targetMouse); }
    let posAtZ0 = new THREE.Vector3(0, 0, 0); const mouseActive = mouse.x > -1.1;
    if (mouseActive) {
      const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5); vector.unproject(camera);
      const dir = vector.sub(camera.position).normalize();
      posAtZ0 = camera.position.clone().add(dir.multiplyScalar(-camera.position.z / dir.z));
    }
    const targetBox = document.querySelector('.india-map-visual');
    const container = document.querySelector('.india-network-grid');
    if (targetBox && renderer) {
      const rect = targetBox.getBoundingClientRect();
      const canvasRect = renderer.domElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const canvasCenterX = canvasRect.left + canvasRect.width / 2;
      const offsetPixels = centerX - canvasCenterX;
      const viewWidthAtZ0 = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * 2 * camera.aspect;
      mapOffsetX = (offsetPixels / (canvasRect.width || 1)) * viewWidthAtZ0 + 0.20;
    } else if (container && renderer) {
      const containerW = container.clientWidth, canvasW = renderer.domElement.clientWidth;
      const viewWidthAtZ0 = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * 2 * camera.aspect;
      mapOffsetX = 0.32 * (containerW / (canvasW || 1)) * viewWidthAtZ0;
    }
    const pos = particleGeo.attributes.position.array;
    for (let i = 0; i < PARTICLE_CNT; i++) {
      const i3 = i * 3, tx = (scatterPos[i3] + (targetPos[i3] - scatterPos[i3]) * ease) + mapOffsetX;
      const ty = (scatterPos[i3 + 1] + (targetPos[i3 + 1] - scatterPos[i3 + 1]) * ease) + mapOffsetY;
      const tz = scatterPos[i3 + 2] + (targetPos[i3 + 2] - scatterPos[i3 + 2]) * ease;
      const fx = Math.sin(idleTime * 0.36 + i * 0.013) * 0.007 * ease, fy = Math.cos(idleTime * 0.28 + i * 0.017) * 0.009 * ease;
      let ix = 0, iy = 0;
      if (mouseActive && ease > 0.7) {
        const dx = tx - posAtZ0.x, dy = ty - posAtZ0.y, distSq = dx * dx + dy * dy, radius = 0.08;
        if (distSq < radius * radius) {
          const force = Math.pow(1.0 - Math.sqrt(distSq) / radius, 3.0) * 0.08;
          ix = (dx / (Math.sqrt(distSq) + 0.001)) * force; iy = (dy / (Math.sqrt(distSq) + 0.001)) * force;
        }
      }
      pos[i3] = tx + fx + ix; pos[i3 + 1] = ty + fy + iy; pos[i3 + 2] = tz + Math.sin(idleTime * 0.49 + i * 0.023) * 0.012 * ease;
    }
    particleGeo.attributes.position.needsUpdate = true; particleMat.uniforms.uGlow.value = glowIntensity;
    cityMeshes.forEach(({ mesh, ring, mat, rMat, phase, isHub, nx, ny }) => {
      const p = 0.65 + 0.35 * Math.sin(idleTime * (isHub ? 3.5 : 2.2) + phase), actualNx = nx + mapOffsetX, actualNy = ny + mapOffsetY;
      mat.opacity = networkProgress * p; rMat.opacity = networkProgress * 0.18 * p;
      ring.scale.setScalar((isHub ? 1.4 : 1) + 0.18 * Math.sin(idleTime * 2.2 + phase));
      if (mouseActive && networkProgress > 0.7) {
        const dx = actualNx - posAtZ0.x, dy = actualNy - posAtZ0.y, distSq = dx * dx + dy * dy, radius = 0.08;
        if (distSq < radius * radius) {
          const force = Math.pow(1.0 - Math.sqrt(distSq) / radius, 3.0) * 0.08;
          mesh.position.set(actualNx + (dx / (Math.sqrt(distSq) + 0.001)) * force, actualNy + (dy / (Math.sqrt(distSq) + 0.001)) * force, 0.06);
          ring.position.set(actualNx + (dx / (Math.sqrt(distSq) + 0.001)) * force, actualNy + (dy / (Math.sqrt(distSq) + 0.001)) * force, 0.04);
        } else { mesh.position.set(actualNx, actualNy, 0.06); ring.position.set(actualNx, actualNy, 0.04); }
      } else { mesh.position.set(actualNx, actualNy, 0.06); ring.position.set(actualNx, actualNy, 0.04); }
    });
    lineMeshes.forEach(({ line, mat, revealAt, points }) => {
      mat.opacity = Math.min(Math.max(0, (networkProgress - revealAt) / 0.2), 0.45);
      const linePos = line.geometry.attributes.position.array;
      for (let i = 0; i < points.length; i++) {
        let px = points[i].x + mapOffsetX, py = points[i].y + mapOffsetY;
        if (mouseActive && networkProgress > 0.1) {
          const dx = px - posAtZ0.x, dy = py - posAtZ0.y, distSq = dx * dx + dy * dy, radius = 0.20;
          if (distSq < radius * radius) {
            const force = Math.pow(1.0 - Math.sqrt(distSq) / radius, 1.5) * 0.1;
            px += (dx / (Math.sqrt(distSq) + 0.001)) * force; py += (dy / (Math.sqrt(distSq) + 0.001)) * force;
          }
        }
        linePos[i * 3] = px; linePos[i * 3 + 1] = py;
      }
      line.geometry.attributes.position.needsUpdate = true;
    });
    flowDots.forEach(({ dot, dMat, curve, phase, speed }) => {
      const t2 = ((idleTime * speed + phase) % (Math.PI * 2)) / (Math.PI * 2), bP = curve.getPoint(t2);
      const aX = bP.x + mapOffsetX, aY = bP.y + mapOffsetY;
      if (mouseActive && networkProgress > 0.5) {
        const dx = aX - posAtZ0.x, dy = aY - posAtZ0.y, distSq = dx * dx + dy * dy, radius = 0.35;
        if (distSq < radius * radius) {
          const force = Math.pow(1.0 - Math.sqrt(distSq) / radius, 1.5) * 0.07;
          dot.position.set(aX + (dx / (Math.sqrt(distSq) + 0.001)) * force, aY + (dy / (Math.sqrt(distSq) + 0.001)) * force, 0.035);
        } else { dot.position.set(aX, aY, 0.035); }
      } else { dot.position.set(aX, aY, 0.035); }
      dMat.opacity = networkProgress * Math.sin(t2 * Math.PI) * 0.85;
    });
    updateLabels(); renderer.render(scene, camera);
  }

  function onResize() {
    const wrapper = document.getElementById(CANVAS_ID); if (!wrapper || !renderer) return;
    const P = wrapper.parentElement, W = (P ? P.clientWidth : wrapper.clientWidth) || 620, H = (P ? P.clientHeight : wrapper.clientHeight) || 640;
    camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 450));
  else setTimeout(init, 450);
})();
