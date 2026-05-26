import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

function initTool(containerId, hasDefects) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isMob3D = window.matchMedia("(max-width: 768px)").matches;

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
     * 2. Soft Studio Lighting
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

    const envMap = (() => {
        const size = isMob3D ? 256 : 1024;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(size * 0.45, 0, size * 0.1, size);
        ctx.fillRect(0, size * 0.45, size, size * 0.1);
        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        return texture;
    })();
    scene.environment = envMap;

    /**
     * 3. Materials
     */
    const shankMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.95,
        roughness: 0.25,
        envMapIntensity: 1.0
    });

    const headMat = new THREE.MeshStandardMaterial({
        color: 0xda917a,
        metalness: 0.85,
        roughness: 0.22,
        envMapIntensity: 0.8,
        side: THREE.DoubleSide
    });

    const defectMat = new THREE.MeshStandardMaterial({
        color: 0xda917a,
        metalness: 0.85,
        roughness: 0.20,
        envMapIntensity: 0.8
    });

    /**
     * 4. Geometry Generation
     */
    function createReferenceFluteGeometry(radius, height, flutes, twist, withDefects) {
        const segments = 300;
        const circles = 200;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];

        const transitionStart = 1.0;
        const neckThreshold = 1.5;

        for (let j = 0; j <= circles; j++) {
            const yFrac = j / circles;
            const y = yFrac * height;
            const rotation = yFrac * Math.PI * 2 * twist;

            const taperFrac = Math.max(0, (y - neckThreshold) / (height - neckThreshold));
            const currentTaper = 1.0 - (taperFrac * 0.08);
            const currentRadius = radius * currentTaper;

            const blend = Math.min(Math.max((y - transitionStart) / (neckThreshold - transitionStart), 0.0), 1.0);
            const softBlend = 3 * blend * blend - 2 * blend * blend * blend;

            for (let i = 0; i <= segments; i++) {
                const rFrac = i / segments;
                const theta = rFrac * Math.PI * 2;
                const twistedTheta = theta + rotation;
                const localAngle = (rFrac * flutes) % 1.0;
                let r = currentRadius;

                if (localAngle < 0.75) {
                    const p = localAngle / 0.75;
                    const depth = Math.sin(p * Math.PI) * 0.38 * currentRadius * softBlend;
                    r -= depth;
                }

                if (withDefects) {
                    const unevenSurface = (Math.sin(theta * 8) * Math.cos(y * 4)) * 0.015;
                    const edgeBias = (localAngle > 0.6 || localAngle < 0.15) ? 2.5 : 0.7;
                    const n1 = (Math.sin(theta * 30) * Math.cos(y * 15)) * 0.02;
                    const n2 = (Math.sin(theta * 80) * Math.cos(y * 40)) * 0.01;
                    const n3 = (Math.sin(theta * 200) * Math.cos(y * 100)) * 0.005;
                    r += (unevenSurface + (n1 + n2 + n3) * edgeBias) * softBlend;
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

    function createCoatingDefects(group, radius, height, flutes, twist, count = 2500) {
        const defectGeo = new THREE.SphereGeometry(1, isMob3D ? 4 : 16, isMob3D ? 4 : 16);
        const transitionStart = 1.0;
        const neckThreshold = 1.5;

        for (let i = 0; i < count; i++) {
            const isClusterLead = Math.random() < 0.15;
            const clusterSize = isClusterLead ? Math.floor(Math.random() * 5) + 2 : 1;
            const baseTheta = Math.random() * Math.PI * 2;
            const baseYFrac = 0.02 + Math.random() * 0.98;

            for (let c = 0; c < clusterSize; c++) {
                const thetaOffset = (Math.random() - 0.5) * 0.15;
                const yOffset = (Math.random() - 0.5) * 0.08;
                const yFrac = Math.max(0, Math.min(1, baseYFrac + yOffset));
                const y = yFrac * height;
                const blend = Math.min(Math.max((y - transitionStart) / (neckThreshold - transitionStart), 0.0), 1.0);
                const softBlend = 3 * blend * blend - 2 * blend * blend * blend;

                if (Math.random() > (1.1 - softBlend)) {
                    const rotation = yFrac * Math.PI * 2 * twist;
                    const taperFrac = Math.max(0, (y - neckThreshold) / (height - neckThreshold));
                    const currentRadius = radius * (1.0 - (taperFrac * 0.08));
                    const theta = baseTheta + thetaOffset;
                    const twistedTheta = theta + rotation;
                    const localAngle = (theta / (Math.PI * 2) * flutes) % 1.0;
                    let r = currentRadius;
                    if (localAngle < 0.75) {
                        const p = localAngle / 0.75;
                        r -= (Math.sin(p * Math.PI) * 0.38 * currentRadius * softBlend * 0.98);
                    }
                    const orangePeel = (Math.sin(theta * 3) * Math.cos(y * 1.5)) * 0.035;
                    const edgeBias = (localAngle > 0.6 || localAngle < 0.15) ? 2.5 : 0.7;
                    const n1 = (Math.sin(theta * 50) * Math.cos(y * 25)) * 0.05;
                    r += (orangePeel + n1 * edgeBias) * softBlend + 0.01;

                    const defect = new THREE.Mesh(defectGeo, defectMat);
                    defect.position.set(Math.cos(twistedTheta) * r, y, Math.sin(twistedTheta) * r);
                    const s = 0.015 + Math.random() * 0.045;
                    defect.scale.set(s, s * (0.8 + Math.random() * 0.5), s);
                    defect.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                    group.add(defect);
                }
            }
        }
    }

    const toolGroup = new THREE.Group();
    scene.add(toolGroup);

    const shankRadius = 1.4;
    const shankHeight = 12;
    const coatedAreaHeight = 7.7;

    // 1. Shank
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(shankRadius, shankRadius, shankHeight, 128), shankMat);
    shank.position.y = shankHeight / 2;
    toolGroup.add(shank);

    // 2. Head Surface
    const headGeo = createReferenceFluteGeometry(shankRadius, coatedAreaHeight, 6, 1.2, hasDefects);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = shankHeight;
    toolGroup.add(head);

    // 3. Coating Defects (if any)
    if (hasDefects) {
        const defectGroup = new THREE.Group();
        defectGroup.position.y = shankHeight;
        createCoatingDefects(defectGroup, shankRadius, coatedAreaHeight, 6, 1.2, isMob3D ? 300 : 3000);
        toolGroup.add(defectGroup);
    }

    // 4. Core
    const coreRadiusBase = shankRadius * 0.7;
    const headCore = new THREE.Mesh(
        new THREE.CylinderGeometry(coreRadiusBase * 0.95, coreRadiusBase, coatedAreaHeight, 64),
        headMat
    );
    headCore.position.y = shankHeight + coatedAreaHeight / 2;
    toolGroup.add(headCore);

    // Center and Scale precisely like Why Staton tool
    const totalHeight = shankHeight + coatedAreaHeight;
    toolGroup.position.set(0, (-totalHeight / 2) - 2.0, 0);
    toolGroup.scale.set(1.08, 1.08, 1.08);

    /**
     * Animation Loop
     */
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    let _fsarcLastTime = 0;
    function animate(time) {
        requestAnimationFrame(animate);
        if (isMob3D && time - _fsarcLastTime < 33) return; // 30fps on mobile
        _fsarcLastTime = time;
        controls.update();
        renderer.render(scene, camera);
    }

    // Use IntersectionObserver to start RAF only when visible
    let animStarted = false;
    const obs = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !animStarted) {
            animStarted = true;
            animate(0);
            obs.disconnect();
        }
    }, { threshold: 0.1 });
    obs.observe(container);
}

// Initialize both tools
initTool('fsarc-3d-tool-rough', true);   // Conventional: with defects
initTool('fsarc-3d-tool-smooth', false); // fsARC: smooth
