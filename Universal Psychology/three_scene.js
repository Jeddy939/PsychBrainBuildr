// three_scene.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

window.GameVisuals = (function() {
    let scene, camera, renderer, controls;
    
    let brainModelGLB; // Store the loaded GLB scene/group
    let modelBrainContainer; // Parent group for the GLB model when it's active

    let proceduralBrainContainer; // Parent group for Level 0 and 1 procedural brains
    
    let backgroundParticleSystem; // THREE.Points object for background
    let bgParticleProps = { // To manage properties of background particles
        count: 0,
        material: null,
        geometry: null,
        velocities: []
    };

    const canvasContainerId = 'threejs-canvas-container';

    // --- Variables for Pulsation & Animation ---
    let currentBaseColorForWireframePulse = new THREE.Color(0x504060);
    let currentFinalEmissiveBase = new THREE.Color(0x000000);
    let pulseTime = 0;
    let activePulseFrequency = 0;
    let activePulseStrength = 0;
    let isWireframeActiveForModel = false; // Specifically for the GLB model if we re-introduce wireframe for it

    function init() {
        const container = document.getElementById(canvasContainerId);
        if (!container) { 
            console.error("Three.js container not found:", canvasContainerId);
            return; 
        }

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111118); // Darker for contrast with particles

        const aspectRatio = container.clientWidth / container.clientHeight;
        camera = new THREE.PerspectiveCamera(50, aspectRatio, 0.1, 1000);
        camera.position.set(0, 1, 7); // Adjusted for better view with particles

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
        keyLight.position.set(-3, 5, 5);
        keyLight.castShadow = true;
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0xffddaa, 0.4);
        fillLight.position.set(3, 2, 3);
        scene.add(fillLight);


        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 0.5, 0); // Adjusted target
        controls.enableZoom = true;
        controls.minDistance = 2;
        controls.maxDistance = 20;

        // Initialize containers for different brain representations
        proceduralBrainContainer = new THREE.Group();
        scene.add(proceduralBrainContainer);
        modelBrainContainer = new THREE.Group();
        modelBrainContainer.visible = false; // Initially hidden
        scene.add(modelBrainContainer);

        loadGLBModel(); // Load the GLB but don't add to scene immediately
        initBackgroundParticleSystem(); // Initialize the particle system object

        updateBrainVisual({ level: 0, dopamine: 0, gaba: 0 }); // Start at level 0
        
        window.addEventListener('resize', onWindowResize, false);
        animate();
    }

    function loadGLBModel() {
        const loader = new GLTFLoader();
        loader.load(
            'models/brain_model.glb',
            function (gltf) {
                brainModelGLB = gltf.scene;
                brainModelGLB.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (!(child.material instanceof THREE.MeshStandardMaterial)) {
                             child.material = new THREE.MeshStandardMaterial({ map: child.material.map || null });
                        }
                        if(child.material.map) child.material.needsUpdate = true;
                    }
                });
                // Don't add to modelBrainContainer here, updateBrainVisual will handle it.
            },
            undefined,
            function (error) {
                console.error('An error happened while loading the brain model:', error);
                // Fallback handled by procedural brains initially.
            }
        );
    }
    
    // --- Procedural Brain Generation ---
    function createLevel0Brain() {
        // "Neural Genesis Cloud" - Simple particle system
        const particleCount = 50;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const baseColor = new THREE.Color(0x605090); // Purplish blue

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.8; // x
            positions[i * 3 + 1] = (Math.random() - 0.5) * 0.8 + 0.5; // y (centered slightly higher)
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8; // z
            
            baseColor.toArray(colors, i*3);
            sizes[i] = Math.random() * 15 + 5; // Particle size for PointsMaterial
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1)); // For custom shader if used
        geometry.velocities = [];
        for (let i=0; i < particleCount; i++){
             geometry.velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 0.002,
                (Math.random() - 0.5) * 0.002,
                (Math.random() - 0.5) * 0.002
            ));
        }


        const material = new THREE.PointsMaterial({
            size: 0.1, // Will be overridden by 'size' attribute if shader is used, or base size here
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false, 
        });

        const points = new THREE.Points(geometry, material);
        points.name = "Level0Cloud";
        proceduralBrainContainer.add(points);
    }

    function createLevel1Brain() {
        // "Proto-Brain Mass" - Lumpy sphere
        const geometry = new THREE.SphereGeometry(0.6, 20, 16); // Radius, widthSegments, heightSegments
        
        // Add some rudimentary displacement (lumpiness)
        const positionAttribute = geometry.attributes.position;
        const noiseFactor = 0.15;
        for (let i = 0; i < positionAttribute.count; i++) {
            const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
            const noise = Math.random() * noiseFactor - (noiseFactor / 2);
            vertex.multiplyScalar(1 + noise);
            positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        geometry.computeVertexNormals(); // Recalculate normals after displacement

        const material = new THREE.MeshStandardMaterial({
            color: 0x706060, // Dull brownish-grey
            roughness: 0.85,
            metalness: 0.1,
            emissive: 0x100505, // Faint internal glow
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.name = "Level1Mass";
        sphere.position.y = 0.5; // Center it slightly
        proceduralBrainContainer.add(sphere);
    }

    // --- Background Particle System ---
    function initBackgroundParticleSystem() {
        bgParticleProps.material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.5,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending 
        });
        // The actual particle system will be created/updated in updateBackgroundParticleSystem
    }
    
    function updateBackgroundParticleSystem(level) {
        let targetParticleCount;
        let particleColor1 = new THREE.Color(0x404080); // Blue
        let particleColor2 = new THREE.Color(0x804040); // Reddish
        let particleSpeedFactor = 0.001;

        switch (level) {
            case 0:
                targetParticleCount = 200;
                particleColor1.setHex(0x302050); // Dim purple
                particleColor2.setHex(0x203050); // Dim blue
                bgParticleProps.material.opacity = 0.3;
                bgParticleProps.material.size = 0.03;
                particleSpeedFactor = 0.0005;
                break;
            case 1:
                targetParticleCount = 500;
                particleColor1.setHex(0x603070); // Brighter Purple
                particleColor2.setHex(0x704030); // Dull Red
                bgParticleProps.material.opacity = 0.4;
                bgParticleProps.material.size = 0.04;
                particleSpeedFactor = 0.0008;
                break;
            case 2:
                targetParticleCount = 1500;
                particleColor1.setHex(0x9050A0); // Pinkish-Purple
                particleColor2.setHex(0xA06050); // Orange-Red
                bgParticleProps.material.opacity = 0.5;
                bgParticleProps.material.size = 0.05;
                particleSpeedFactor = 0.0012;
                break;
            case 3:
                targetParticleCount = 3000;
                particleColor1.setHex(0xFF70B0); // Bright Pink
                particleColor2.setHex(0xFFAA70); // Bright Orange
                bgParticleProps.material.opacity = 0.6;
                bgParticleProps.material.size = 0.06;
                particleSpeedFactor = 0.002;
                break;
            default: // Covers any potential higher levels initially
                targetParticleCount = 3000;
                particleColor1.setHex(0xFFFFFF); 
                particleColor2.setHex(0xFFFFDD); 
                bgParticleProps.material.opacity = 0.7;
                bgParticleProps.material.size = 0.07;
                particleSpeedFactor = 0.0025;
                break;
        }

        // Recreate particles if count changed significantly or first time
        if (backgroundParticleSystem) scene.remove(backgroundParticleSystem); // Clean up old

        const positions = new Float32Array(targetParticleCount * 3);
        const colors = new Float32Array(targetParticleCount * 3);
        bgParticleProps.velocities = []; // Reset velocities

        for (let i = 0; i < targetParticleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 15;     // x spread
            positions[i * 3 + 1] = (Math.random() - 0.5) * 10 + 0.5; // y spread, centered
            positions[i * 3 + 2] = (Math.random() - 0.5) * 15;     // z spread
            
            const mixedColor = Math.random() > 0.5 ? particleColor1.clone() : particleColor2.clone();
            mixedColor.lerp(Math.random() > 0.5 ? particleColor1 : particleColor2, Math.random()*0.5); // Blend them slightly
            mixedColor.toArray(colors, i * 3);

            bgParticleProps.velocities.push(
                new THREE.Vector3(
                    (Math.random() - 0.5) * particleSpeedFactor,
                    (Math.random() - 0.5) * particleSpeedFactor,
                    (Math.random() - 0.5) * particleSpeedFactor
                )
            );
        }

        if (bgParticleProps.geometry) bgParticleProps.geometry.dispose();
        bgParticleProps.geometry = new THREE.BufferGeometry();
        bgParticleProps.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        bgParticleProps.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        backgroundParticleSystem = new THREE.Points(bgParticleProps.geometry, bgParticleProps.material);
        backgroundParticleSystem.name = "BackgroundParticles";
        scene.add(backgroundParticleSystem);
        bgParticleProps.count = targetParticleCount;
    }


    function animate() { 
        requestAnimationFrame(animate);
        pulseTime += 0.05; 
        if (controls) controls.update();

        // Animate Procedural Brains if visible
        if (proceduralBrainContainer.visible) {
            const level0Cloud = proceduralBrainContainer.getObjectByName("Level0Cloud");
            if (level0Cloud) {
                const positions = level0Cloud.geometry.attributes.position;
                const velocities = level0Cloud.geometry.velocities; // Assumes velocities stored on geometry
                for (let i=0; i<positions.count; i++){
                    positions.setX(i, positions.getX(i) + velocities[i].x);
                    positions.setY(i, positions.getY(i) + velocities[i].y);
                    positions.setZ(i, positions.getZ(i) + velocities[i].z);

                    // Simple bounds check for the cloud particles
                    if (Math.abs(positions.getX(i)) > 0.6) velocities[i].x *= -1;
                    if (Math.abs(positions.getY(i)-0.5) > 0.6) velocities[i].y *= -1;
                    if (Math.abs(positions.getZ(i)) > 0.6) velocities[i].z *= -1;
                }
                positions.needsUpdate = true;
                // Optionally pulse level 0 cloud opacity
                level0Cloud.material.opacity = 0.5 + Math.sin(pulseTime * 1.5) * 0.2;
            }
            const level1Mass = proceduralBrainContainer.getObjectByName("Level1Mass");
            if(level1Mass){
                level1Mass.rotation.y += 0.003;
                level1Mass.material.emissiveIntensity = 0.5 + Math.sin(pulseTime * 0.8) * 0.3;
            }
        }

        // Animate Loaded GLB Model if visible
        if (modelBrainContainer.visible && brainModelGLB) {
            brainModelGLB.rotation.y += 0.005; // Continuous rotation

            if (activePulseFrequency > 0) {
                const pulseFactor = (Math.sin(pulseTime * activePulseFrequency) + 1) / 2; 
                brainModelGLB.traverse(function (child) {
                    if (child.isMesh && child.material) {
                        if (isWireframeActiveForModel) {
                            // Pulsing logic for wireframe if re-added later for GLB model
                        } else { 
                            const pulsedEmissive = new THREE.Color().copy(currentFinalEmissiveBase);
                            pulsedEmissive.multiplyScalar(1 + pulseFactor * activePulseStrength); 
                            child.material.emissive.copy(pulsedEmissive);
                        }
                    }
                });
            }
        }
        
        // Animate Background Particles
        if (backgroundParticleSystem && bgParticleProps.geometry) {
            const positions = bgParticleProps.geometry.attributes.position;
            for (let i = 0; i < bgParticleProps.count; i++) {
                positions.setX(i, positions.getX(i) + bgParticleProps.velocities[i].x);
                positions.setY(i, positions.getY(i) + bgParticleProps.velocities[i].y);
                positions.setZ(i, positions.getZ(i) + bgParticleProps.velocities[i].z);

                // Wrap particles around
                if (positions.getX(i) > 7.5 || positions.getX(i) < -7.5) bgParticleProps.velocities[i].x *= -0.99; //positions.setX(i, -positions.getX(i) *0.99); // Dampen and reverse
                if (positions.getY(i) > 5.5 || positions.getY(i) < -4.5) bgParticleProps.velocities[i].y *= -0.99; //positions.setY(i, -positions.getY(i)*0.99 + 0.5);
                if (positions.getZ(i) > 7.5 || positions.getZ(i) < -7.5) bgParticleProps.velocities[i].z *= -0.99; //positions.setZ(i, -positions.getZ(i)*0.99);
            }
            positions.needsUpdate = true;
            // Optional: slowly rotate the entire particle system for a cosmic feel
            backgroundParticleSystem.rotation.y += 0.0001;
        }

        if (renderer && scene && camera) renderer.render(scene, camera);
    }
    
    function onWindowResize() { 
        const container = document.getElementById(canvasContainerId);
        if (container && renderer) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    }

    // This function now orchestrates which brain is shown and updates its specific visuals
    function updateBrainVisual(params) {
        const level = params.level !== undefined ? params.level : 0; // Default to level 0 if undefined
        const dopamine = params.dopamine || 0; 
        const gaba = params.gaba || 0;

        // Clean up previous procedural brain
        while (proceduralBrainContainer.children.length > 0) {
            let obj = proceduralBrainContainer.children[0];
            proceduralBrainContainer.remove(obj);
            if(obj.geometry) obj.geometry.dispose();
            if(obj.material) obj.material.dispose();
        }

        // Manage visibility and content of brain containers
        if (level < 2) {
            proceduralBrainContainer.visible = true;
            modelBrainContainer.visible = false;
            if (level === 0) {
                createLevel0Brain();
            } else if (level === 1) {
                createLevel1Brain();
            }
        } else { // Level 2 and above use the GLB model
            proceduralBrainContainer.visible = false;
            modelBrainContainer.visible = true;
            if (brainModelGLB) {
                if (modelBrainContainer.children.length === 0) { // Add GLB if not already
                    modelBrainContainer.add(brainModelGLB);
                }
                // Apply visual updates to the GLB model
                updateLoadedBrainModelVisuals(level, dopamine, gaba); 
            } else {
                // Fallback: If GLB still hasn't loaded, maybe show Level 1 procedural brain temporarily
                console.warn("GLB model not available for level " + level + ". Showing Level 1 as fallback.");
                proceduralBrainContainer.visible = true; // Show procedural
                createLevel1Brain(); // Create Level 1 as a fallback
            }
        }
        updateBackgroundParticleSystem(level); // Update background particles for all levels
    }

    // Specific visual updates for the loaded GLB model (Levels 2+)
    function updateLoadedBrainModelVisuals(level, dopamine, gaba) {
        if (!brainModelGLB) return;

        let targetScale = 1.0; // Base scale for GLB model, can adjust
        let baseColor = new THREE.Color(0x705050); 
        let targetEmissive = new THREE.Color(0x000000);
        let targetRoughness = 0.95;
        let targetMetalness = 0.05;
        
        activePulseFrequency = 0;
        activePulseStrength = 0;
        isWireframeActiveForModel = false; 

        // Using existing level 2 & 3 logic from previous code for GLB model
        switch (level) {
            // Note: Level 0 and 1 are now procedural, this switch is for GLB (level 2+)
            case 2: 
                targetScale = 1.75; // Original scale for this level
                brainModelGLB.position.y = 0.2; // Adjust y-position for GLB model if needed
                baseColor.setHex(0xB07070); 
                targetEmissive.setHex(0x200808);
                targetRoughness = 0.65;
                targetMetalness = 0.15;
                activePulseFrequency = 0.7; 
                activePulseStrength = 0.4;
                break;
            case 3: 
                targetScale = 2.5; // Original scale for this level
                brainModelGLB.position.y = 0.2;
                baseColor.setHex(0xD08080); 
                targetEmissive.setHex(0x441505); 
                targetRoughness = 0.5;  
                targetMetalness = 0.2;
                activePulseFrequency = 1.2; 
                activePulseStrength = 0.6;
                break;
            // Add more cases for future GLB model variations if any (level 4, 5 etc.)
            default: // If game_logic sends higher levels before visuals are defined
                targetScale = 2.5; 
                brainModelGLB.position.y = 0.2;
                baseColor.setHex(0xD08080); 
                targetEmissive.setHex(0x441505);
                targetRoughness = 0.5;  
                targetMetalness = 0.2;
                break;
        }

        brainModelGLB.scale.set(targetScale, targetScale, targetScale);
        
        let finalColor = new THREE.Color().copy(baseColor);
        let finalEmissive = new THREE.Color().copy(targetEmissive);

        if (dopamine > 0 || gaba > 0) {
            const orangeColor = new THREE.Color(0xFFA500); 
            const blueColor = new THREE.Color(0x87CEEB);   
            let dFactor = Math.min(dopamine / 100, 1.0) * 0.6; 
            let gFactor = Math.min(gaba / 100, 1.0) * 0.6;   
            let dEmissiveFactor = Math.min(dopamine / 100, 1.0) * 0.8;
            finalColor.lerp(orangeColor, dFactor);
            finalColor.lerp(blueColor, gFactor * (1.0-dFactor)); 
            const dopamineEmissive = new THREE.Color(0x552200); 
            finalEmissive.lerp(dopamineEmissive, dEmissiveFactor);
        }
        currentFinalEmissiveBase.copy(finalEmissive); // For pulsing in animate()

        brainModelGLB.traverse(function (child) {
            if (child.isMesh) {
                if (!(child.material instanceof THREE.MeshStandardMaterial)) {
                    const oldMaterial = child.material;
                    child.material = new THREE.MeshStandardMaterial({ map: oldMaterial.map || null });
                }
                child.material.wireframe = isWireframeActiveForModel; 
                child.material.color.copy(finalColor);
                child.material.emissive.copy(currentFinalEmissiveBase);
                child.material.roughness = targetRoughness;
                child.material.metalness = targetMetalness;
                child.material.needsUpdate = true;
            }
        });
    }

    return {
        init: init,
        updateBrainVisual: updateBrainVisual // game_logic.js calls this
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', GameVisuals.init);
} else {
    GameVisuals.init();
}