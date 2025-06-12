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
    const wheelGroups = [];
    const wheelRadius = 1.2;
    const angleStep = (2 * Math.PI) / symbols.length;

    for (let c = 0; c < 3; c++) {
        const group = new THREE.Group();
        group.position.x = (c - 1) * 2.0;
        scene.add(group);
        wheelGroups.push(group);

        const column = [];
        for (let r = 0; r < 3; r++) {
            const mesh = createReelMesh('?');
            mesh.position.y = (1 - r) * 1.2;
            mesh.position.z = wheelRadius;
            group.add(mesh);
            column.push(mesh);
        }
        reelMeshes.push(column);

        // Additional invisible meshes around the wheel for smoother spin
        for (let i = 3; i < symbols.length; i++) {
            const extra = createReelMesh(symbols[i]);
            const angle = (i - 1) * angleStep;
            extra.position.y = Math.sin(angle) * wheelRadius;
            extra.position.z = Math.cos(angle) * wheelRadius;
            extra.rotation.x = angle;
            extra.visible = false;
            group.add(extra);
        }
    }

    function updateReelSymbol(mesh, sym) {
        const tex = createSymbolTexture(sym);
        mesh.material.map.dispose();
        mesh.material.map = tex;
        mesh.material.needsUpdate = true;
    }



    function render() {
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    render();

    // --- Spin Logic ---
    spinBtn.addEventListener('click', async () => {
        const state = getGameState();
        if(state.psychbucks < 1) {
            logMessage('Not enough Psychbucks to spin.', 'log-warning');
            return;
        }
        spinBtn.disabled = true;
        state.psychbucks -= 1;
        const results = [[],[],[]];
        const centerIndexes = [];

        function spinWheel(col, centerIdx) {
            return new Promise(res => {
                const group = wheelGroups[col];
                const startRot = 0;
                const targetRot = -centerIdx * angleStep - Math.PI * 6;
                const duration = 1200 + col * 300;
                const startTime = performance.now();
                function anim(time){
                    const t = Math.min((time - startTime) / duration, 1);
                    group.rotation.x = startRot + (targetRot - startRot) * t;
                    if(t < 1){
                        requestAnimationFrame(anim);
                    } else {
                        group.rotation.x = -centerIdx * angleStep;
                        res();
                    }
                }
                requestAnimationFrame(anim);
            });
        }

        const spinPromises = [];
        for(let c=0; c<3; c++){
            const idx = Math.floor(Math.random()*symbols.length);
            centerIndexes[c] = idx;
            spinPromises.push(spinWheel(c, idx));

            results[0][c] = symbols[(idx - 1 + symbols.length) % symbols.length];
            results[1][c] = symbols[idx];
            results[2][c] = symbols[(idx + 1) % symbols.length];
        }


        const resolveSpin = () => {
            for(let r=0;r<3;r++){
                for(let c=0;c<3;c++){
                    reelsText[r][c].textContent = results[r][c];
                    updateReelSymbol(reelMeshes[c][r], results[r][c]);
                }
            }

            let win = 0;
            const lines = [
                results[0],
                results[1],
                results[2],
                [results[0][0], results[1][1], results[2][2]],
                [results[0][2], results[1][1], results[2][0]]
            ];

            const jackpotLines = lines.filter(l => l[0] === l[1] && l[1] === l[2]);
            jackpotLines.forEach(line => {
                const amt = payouts[line[0]] || 0;
                win += amt;
                logMessage(`Line win! ${line[0]} x3 +${amt} PB`, 'log-unlock');
            });

            if(jackpotLines.length === 0){
                let pairCount = 0;
                lines.forEach(l => { if(l[0] === l[1] || l[1] === l[2] || l[0] === l[2]) pairCount++; });
                if(pairCount>0){
                    win += pairCount*2;
                    logMessage(`Small win! ${pairCount} line(s) +${pairCount*2} PB`, 'log-info');
                } else {
                    logMessage('No win this time.', 'log-warning');
                }
            }

            state.psychbucks += win;
            updateDisplays();
        };

        try {
            await Promise.all(spinPromises);
            resolveSpin();
        } catch (err) {
            console.error('Spin resolution error:', err);
        } finally {
            spinBtn.disabled = false;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if(window.GameAPI) {
        initPokies(window.GameAPI);
    }
});
