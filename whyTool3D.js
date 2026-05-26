import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const isMob3D = window.matchMedia("(max-width: 768px)").matches;

const container = document.getElementById('why-3d-tool');

if (!container) {
    console.error("❌ Container #why-3d-tool not found");
}

/**
 * 1. Scene & Renderer Setup
 */
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(28, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(0, 15, 55);
camera.lookAt(0, -2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: !isMob3D, alpha: true, powerPreference: "high-performance" });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMob3D ? 1 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
if (isMob3D) renderer.shadowMap.enabled = false;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;
controls.enablePan = false;
controls.enableRotate = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 32.0;

/**
 * 2. Soft Studio Lighting (Balanced Highlights & Shadows)
 */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(10, 15, 10);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-10, 5, 5);
scene.add(fillLight);

const backLight = new THREE.DirectionalLight(0xffffff, 0.7);
backLight.position.set(0, 10, -10);
scene.add(backLight);

// Sharp reflections environment
const envMap = (() => {
    const size = isMob3D ? 256 : 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, size, size);

    // Large white studio softboxes for clean reflections
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(size * 0.45, 0, size * 0.1, size);
    ctx.fillRect(0, size * 0.45, size, size * 0.1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
})();
scene.environment = envMap;

/**
 * 3. Materials - Precise Color Matching
 */
const shankMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc, // Steel silver color
    metalness: 0.95, // Higher metalness for steel look
    roughness: 0.25, // Slight brushed steel roughness
    envMapIntensity: 1.0 // Increased reflection intensity
});

const headMat = new THREE.MeshStandardMaterial({
    color: 0xda917a, // Solid rose gold base
    metalness: 0.85,
    roughness: 0.22,
    envMapIntensity: 0.8,
    side: THREE.DoubleSide
});

/**
 * 4. Geometry Generation
 */
function createReferenceFluteGeometry(radius, height, flutes, twist) {
    const segments = 180;
    const circles = 120;
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];

    const transitionStart = 1.0; // Start fading a bit earlier for a more visible transition
    const neckThreshold = 1.5;   // Original neck height

    for (let j = 0; j <= circles; j++) {
        const yFrac = j / circles;
        const y = yFrac * height;
        const rotation = yFrac * Math.PI * 2 * twist;

        // Taper only at the end
        const taperFrac = Math.max(0, (y - neckThreshold) / (height - neckThreshold));
        const currentTaper = 1.0 - (taperFrac * 0.08);
        const currentRadius = radius * currentTaper;

        // Tight blending logic (shorter fade as requested)
        const blend = Math.min(Math.max((y - transitionStart) / (neckThreshold - transitionStart), 0.0), 1.0);
        const softBlend = 3 * blend * blend - 2 * blend * blend * blend;

        for (let i = 0; i <= segments; i++) {
            const rFrac = i / segments;
            const theta = rFrac * Math.PI * 2;
            const twistedTheta = theta + rotation;

            const localAngle = (rFrac * flutes) % 1.0;
            let r = currentRadius;

            // Helical Flutes (Smoothly fade in)
            if (localAngle < 0.75) {
                const p = localAngle / 0.75;
                const depth = Math.sin(p * Math.PI) * 0.38 * currentRadius * softBlend;
                r -= depth;
            }

            const x = Math.cos(twistedTheta) * r;
            const z = Math.sin(twistedTheta) * r;
            vertices.push(x, y, z);
        }
    }

    for (let j = 0; j < circles; j++) {
        for (let i = 0; i < segments; i++) {
            const base = j * (segments + 1);
            const nextBase = (j + 1) * (segments + 1);
            indices.push(base + i, base + i + 1, nextBase + i);
            indices.push(base + i + 1, nextBase + i + 1, nextBase + i);
        }
    }

    // Add Caps (Bottom & Top) to ensure geometry is "closed"
    const bottomCenterIdx = vertices.length / 3;
    vertices.push(0, 0, 0);
    const topCenterIdx = vertices.length / 3;
    vertices.push(0, height, 0);

    const topOffset = circles * (segments + 1);
    for (let i = 0; i < segments; i++) {
        indices.push(bottomCenterIdx, i + 1, i);
        indices.push(topCenterIdx, topOffset + i, topOffset + i + 1);
    }

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
}

const toolGroup = new THREE.Group();
scene.add(toolGroup);

const shankRadius = 1.4;
const shankHeight = 12;
const coatedAreaHeight = 7.7;

// Shank
const shank = new THREE.Mesh(new THREE.CylinderGeometry(shankRadius, shankRadius, shankHeight, 128), shankMat);
shank.position.y = shankHeight / 2;
toolGroup.add(shank);

// Continuous Coated Surface (Includes Neck + Helical Head)
const headGeo = createReferenceFluteGeometry(shankRadius, coatedAreaHeight, 6, 1.2);
const head = new THREE.Mesh(headGeo, headMat);
head.position.y = shankHeight;
toolGroup.add(head);

// Internal Solid Core
const coreRadiusBase = shankRadius * 0.7;
const headCore = new THREE.Mesh(
    new THREE.CylinderGeometry(coreRadiusBase * 0.95, coreRadiusBase, coatedAreaHeight, 64),
    headMat
);
headCore.position.y = shankHeight + coatedAreaHeight / 2;
toolGroup.add(headCore);

// Positioning and Scaling
const totalHeight = shankHeight + coatedAreaHeight;
toolGroup.position.set(0, (-totalHeight / 2) - 2.0, 0); // Pushed geometry down visually
toolGroup.scale.set(1.08, 1.08, 1.08); // Slightly reduced size per user request
toolGroup.rotation.y = 0;

if (window.gsap && window.ScrollTrigger && !isMob3D) {
    // 1. Spinning pirouette entrance (desktop only)
    window.gsap.fromTo(toolGroup.rotation,
        { y: -Math.PI * 4 },
        {
            y: 0,
            duration: 2.5,
            ease: "power3.out",
            scrollTrigger: {
                trigger: ".why-staton",
                start: "top 70%",
                toggleActions: "play none none reverse"
            }
        }
    );
    // 2. Extra vertical lift inside the 3D scene
    window.gsap.fromTo(toolGroup.position,
        { y: (-totalHeight / 2) - 22.0 },
        {
            y: (-totalHeight / 2) - 2.0,
            duration: 2.0,
            ease: "power3.out",
            scrollTrigger: {
                trigger: ".why-staton",
                start: "top 70%",
                toggleActions: "play none none reverse"
            }
        }
    );
}

/**
 * 5. Animation Loop & Resize
 */
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

let _whyLastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);
    if (isMob3D && time - _whyLastTime < 33) return; // 30fps on mobile
    _whyLastTime = time;
    controls.update();
    renderer.render(scene, camera);
}
animate(0);

