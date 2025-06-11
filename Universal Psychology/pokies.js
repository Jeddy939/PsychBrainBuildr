// pokies.js - enhanced with Three.js spinning reels
import * as THREE from 'three';

export function initPokies(gameAPI) {
    const { getGameState, updateDisplays, logMessage } = gameAPI;

    const symbols = ['\u{1F352}', '\u{1F514}', '\u{1F34B}', '\u{2B50}', '\u{1F48E}'];
    const payouts = {
        '\u{1F352}': 20, // cherries
        '\u{1F514}': 15, // bell
        '\u{1F34B}': 12, // lemon
        '\u{2B50}': 10, // star
        '\u{1F48E}': 5   // gem
    };

    const spinBtn = document.getElementById('pokies-spin');
    const reelsText = [
        document.getElementById('reel1'),
        document.getElementById('reel2'),
        document.getElementById('reel3')
    ];

    const threeContainer = document.getElementById('pokies-threejs-container');
    if(!spinBtn || reelsText.some(r => !r) || !threeContainer) return;

    // --- Three.js Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, threeContainer.clientWidth / threeContainer.clientHeight, 0.1, 100);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
    threeContainer.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    function createSymbolTexture(sym) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '100px serif';
        ctx.fillText(sym, 64, 64);
        return new THREE.CanvasTexture(canvas);
    }

    function createReelMesh(sym) {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: createSymbolTexture(sym), transparent: true });
        return new THREE.Mesh(geometry, material);
    }

    const reelMeshes = [createReelMesh('?'), createReelMesh('?'), createReelMesh('?')];
    reelMeshes[0].position.x = -1.2;
    reelMeshes[2].position.x = 1.2;
    reelMeshes.forEach(m => scene.add(m));

    function updateReelSymbol(mesh, sym) {
        const tex = createSymbolTexture(sym);
        mesh.material.map.dispose();
        mesh.material.map = tex;
        mesh.material.needsUpdate = true;
    }

    function spinReel(mesh, textEl, symbol, delay) {
        const duration = 800 + delay;
        const startRot = mesh.rotation.x;
        const targetRot = startRot + Math.PI * 4;
        const startTime = performance.now();
        function anim(time) {
            const t = Math.min((time - startTime) / duration, 1);
            mesh.rotation.x = startRot + (targetRot - startRot) * t;
            if (t < 1) {
                requestAnimationFrame(anim);
            } else {
                mesh.rotation.x = 0;
                updateReelSymbol(mesh, symbol);
                textEl.textContent = symbol;
            }
        }
        requestAnimationFrame(anim);
    }

    function render() {
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    render();

    // --- Spin Logic ---
    spinBtn.addEventListener('click', () => {
        const state = getGameState();
        if(state.psychbucks < 1) {
            logMessage('Not enough Psychbucks to spin.', 'log-warning');
            return;
        }
        spinBtn.disabled = true;
        state.psychbucks -= 1;
        const results = [];
        for(let i=0;i<3;i++) {
            results.push(symbols[Math.floor(Math.random()*symbols.length)]);
        }
        spinReel(reelMeshes[0], reelsText[0], results[0], 0);
        spinReel(reelMeshes[1], reelsText[1], results[1], 200);
        spinReel(reelMeshes[2], reelsText[2], results[2], 400);

        setTimeout(() => {
            let win = 0;
            if(results[0] === results[1] && results[1] === results[2]) {
                win = payouts[results[0]] || 0;
                logMessage(`Jackpot! ${results[0]} x3 +${win} PB`, 'log-unlock');
            } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
                win = 2;
                logMessage(`Small win! +${win} PB`, 'log-info');
            } else {
                logMessage('No win this time.', 'log-warning');
            }
            state.psychbucks += win;
            updateDisplays();
            spinBtn.disabled = false;
        }, 1200);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if(window.GameAPI) {
        initPokies(window.GameAPI);
    }
});
