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
    const reelsText = [];
    for (let r = 1; r <= 3; r++) {
        const row = [];
        for (let c = 1; c <= 3; c++) {
            row.push(document.getElementById(`reel${r}${c}`));
        }
        reelsText.push(row);
    }

    const threeContainer = document.getElementById('pokies-threejs-container');
    if(!spinBtn || reelsText.flat().some(r => !r) || !threeContainer) return;

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

    const reelMeshes = [];
    for (let r = 0; r < 3; r++) {
        const row = [];
        for (let c = 0; c < 3; c++) {
            const mesh = createReelMesh('?');
            mesh.position.x = (c - 1) * 1.2;
            mesh.position.y = (1 - r) * 1.2;
            scene.add(mesh);
            row.push(mesh);
        }
        reelMeshes.push(row);
    }

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
        for (let r = 0; r < 3; r++) {
            const row = [];
            for (let c = 0; c < 3; c++) {
                row.push(symbols[Math.floor(Math.random()*symbols.length)]);
            }
            results.push(row);
        }

        reelMeshes.forEach((rowMeshes, r) => {
            rowMeshes.forEach((mesh, c) => {
                const delay = (r * 3 + c) * 100;
                spinReel(mesh, reelsText[r][c], results[r][c], delay);
            });
        });

        setTimeout(() => {
            let win = 0;
            const mid = results[1];
            if(mid[0] === mid[1] && mid[1] === mid[2]) {
                win = payouts[mid[0]] || 0;
                logMessage(`Jackpot! ${mid[0]} x3 +${win} PB`, 'log-unlock');
            } else if (mid[0] === mid[1] || mid[1] === mid[2] || mid[0] === mid[2]) {
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
