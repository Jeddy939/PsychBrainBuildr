// fourD_chess.js (Standalone Version)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Good for standalone testing

// Minigame specific variables
let gameScene, gameCamera, gameRenderer, gameControls; // Now controls are specific to this
let primeBoard, echoBoard1, echoBoard2;
const boards = [];
const pieces = [];
let selectedPiece = null;

const SQUARE_SIZE = 1;
const BOARD_SIZE = 8;
const BOARD_OFFSET = 0.05;

const pieceMaterials = {
    white: new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0.2 }),
    black: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.2 }),
    selected: new THREE.MeshPhongMaterial({ color: 0x00ff00, emissive: 0x003300 })
};

function createPawnGeometry() { return new THREE.SphereGeometry(SQUARE_SIZE * 0.3, 16, 12); }
function createRookGeometry() { return new THREE.CylinderGeometry(SQUARE_SIZE * 0.35, SQUARE_SIZE * 0.35, SQUARE_SIZE * 0.7, 16); }
function createKnightGeometry() { 
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(SQUARE_SIZE*0.3, SQUARE_SIZE*0.7, SQUARE_SIZE*0.3);
    const headGeo = new THREE.BoxGeometry(SQUARE_SIZE*0.5, SQUARE_SIZE*0.3, SQUARE_SIZE*0.3);
    const body = new THREE.Mesh(bodyGeo); 
    const head = new THREE.Mesh(headGeo);
    head.position.set(SQUARE_SIZE*0.1, SQUARE_SIZE*0.35, 0);
    group.add(body);
    group.add(head);
    return group; 
}
function createBishopGeometry() { return new THREE.ConeGeometry(SQUARE_SIZE * 0.35, SQUARE_SIZE * 0.8, 16); }
function createQueenGeometry() {
    const group = new THREE.Group(); 
    const body = new THREE.Mesh(new THREE.SphereGeometry(SQUARE_SIZE * 0.4, 20, 16));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(SQUARE_SIZE * 0.35, SQUARE_SIZE * 0.08, 8, 30));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = SQUARE_SIZE * 0.05;
    group.add(body);
    group.add(ring);
    return group;
}
function createKingGeometry() {
    const group = new THREE.Group(); 
    const body = new THREE.Mesh(new THREE.CylinderGeometry(SQUARE_SIZE * 0.3, SQUARE_SIZE * 0.3, SQUARE_SIZE * 0.9, 16));
    const crossBar1 = new THREE.Mesh(new THREE.BoxGeometry(SQUARE_SIZE*0.1, SQUARE_SIZE*0.3, SQUARE_SIZE*0.1));
    crossBar1.position.y = SQUARE_SIZE * 0.55;
    const crossBar2 = new THREE.Mesh(new THREE.BoxGeometry(SQUARE_SIZE*0.3, SQUARE_SIZE*0.1, SQUARE_SIZE*0.1));
    crossBar2.position.y = SQUARE_SIZE * 0.55;
    group.add(body);
    group.add(crossBar1);
    group.add(crossBar2);
    return group;
}

const pieceGeometries = { // No longer needed if we create meshes directly with materials
    pawn: createPawnGeometry(),
    rook: createRookGeometry(),
    // knight: null, // Will call createKnightGeometry() directly
    bishop: createBishopGeometry(),
    // queen: null, 
    // king: null
};


function createBoard(boardIndex, materialEven, materialOdd) {
    const boardGroup = new THREE.Group();
    boardGroup.userData = { id: `board-${boardIndex}`, type: 'chessBoard' };
    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            const squareGeo = new THREE.PlaneGeometry(SQUARE_SIZE, SQUARE_SIZE);
            const material = (x + y) % 2 === 0 ? materialEven : materialOdd;
            const squareMesh = new THREE.Mesh(squareGeo, material.clone()); // Clone material for squares
            squareMesh.position.set(
                (x - BOARD_SIZE / 2 + 0.5) * (SQUARE_SIZE + BOARD_OFFSET),0,
                (y - BOARD_SIZE / 2 + 0.5) * (SQUARE_SIZE + BOARD_OFFSET)
            );
            squareMesh.rotation.x = -Math.PI / 2; 
            squareMesh.userData = { boardIndex, x, y, type: 'boardSquare' };
            boardGroup.add(squareMesh);
        }
    }
    boards[boardIndex] = boardGroup;
    return boardGroup;
}

function addPieceToBoard(type, color, boardIndex, x, y) {
    const material = pieceMaterials[color].clone(); // Clone for individual piece later changes
    let pieceMesh;

    if (type === 'knight') pieceMesh = createKnightGeometry();
    else if (type === 'queen') pieceMesh = createQueenGeometry();
    else if (type === 'king') pieceMesh = createKingGeometry();
    else {
        const geometry = pieceGeometries[type];
        if (!geometry) { console.error("Unknown piece type for geometry:", type); return; }
        pieceMesh = new THREE.Mesh(geometry, material);
    }
    
    // Apply material to all sub-meshes if it's a group
    if (pieceMesh.isGroup) {
        pieceMesh.traverse(child => { if (child.isMesh) child.material = material; });
    }


    const board = boards[boardIndex];
    if (!board) { console.error("Board not found for index:", boardIndex); return; }

    pieceMesh.position.set(
        (x - BOARD_SIZE / 2 + 0.5) * (SQUARE_SIZE + BOARD_OFFSET),
        SQUARE_SIZE * 0.45, 
        (y - BOARD_SIZE / 2 + 0.5) * (SQUARE_SIZE + BOARD_OFFSET)
    );
    pieceMesh.userData = { type, color, boardIndex, x, y, originalMaterial: material };
    board.add(pieceMesh); 
    pieces.push({ mesh: pieceMesh, boardIndex, x, y, type, color });
}

function setupInitialPieces() {
    const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let i = 0; i < 8; i++) {
        addPieceToBoard('pawn', 'white', 0, i, 1);
        addPieceToBoard(backRank[i], 'white', 0, i, 0);
        addPieceToBoard('pawn', 'black', 0, i, 6);
        addPieceToBoard(backRank[i], 'black', 0, i, 7);
    }
    addPieceToBoard('pawn', 'white', 1, 3, 1);
    addPieceToBoard('rook', 'white', 1, 0, 0);
    addPieceToBoard('pawn', 'black', 1, 4, 6);
    addPieceToBoard('bishop', 'black', 1, 7, 7);
    addPieceToBoard('knight', 'white', 2, 1, 0);
    addPieceToBoard('queen', 'black', 2, 4, 7);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
    if (!gameCamera || !gameScene || !gameRenderer) return; 

    const canvasBounds = gameRenderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
    mouse.y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

    raycaster.setFromCamera(mouse, gameCamera);
    const intersects = raycaster.intersectObjects(gameScene.children, true);

    let clickedOnPiece = false;
    for (let i = 0; i < intersects.length; i++) {
        let object = intersects[i].object;
        while(object.parent && !object.userData.type) {
            if (object.parent === gameScene) break; 
            object = object.parent;
        }

        if (object.userData.type && ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'].includes(object.userData.type)) {
            const pieceData = pieces.find(p => p.mesh === object);
            if (pieceData) {
                if (selectedPiece) { 
                    selectedPiece.mesh.traverse(child => { 
                        if (child.isMesh) child.material = selectedPiece.userData.originalMaterial;
                    });
                }
                selectedPiece = object; 
                selectedPiece.mesh = object; 
                selectedPiece.userData = object.userData; 

                selectedPiece.mesh.traverse(child => {
                    if (child.isMesh) child.material = pieceMaterials.selected.clone(); // Clone selected material
                });
                console.log("Selected piece:", selectedPiece.userData);
                clickedOnPiece = true;
            }
            break; 
        } else if (object.userData.type === 'boardSquare' && selectedPiece) {
            console.log("Clicked on square:", object.userData, "while piece selected:", selectedPiece.userData);
            const targetBoard = boards[object.userData.boardIndex];
            const pieceObject = pieces.find(p => p.mesh === selectedPiece);

            if (pieceObject && targetBoard) {
                const newX = (object.userData.x - BOARD_SIZE / 2 + 0.5) * (SQUARE_SIZE + BOARD_OFFSET);
                const newY = SQUARE_SIZE * 0.45; 
                const newZ = (object.userData.y - BOARD_SIZE / 2 + 0.5) * (SQUARE_SIZE + BOARD_OFFSET);

                if (pieceObject.boardIndex !== object.userData.boardIndex) {
                    const oldBoard = boards[pieceObject.boardIndex];
                    oldBoard.remove(selectedPiece); 
                    targetBoard.add(selectedPiece);  
                }
                selectedPiece.position.set(newX, newY, newZ);
                
                pieceObject.boardIndex = object.userData.boardIndex;
                pieceObject.x = object.userData.x;
                pieceObject.y = object.userData.y;
                selectedPiece.userData.boardIndex = object.userData.boardIndex;
                selectedPiece.userData.x = object.userData.x;
                selectedPiece.userData.y = object.userData.y;

                selectedPiece.traverse(child => { 
                    if (child.isMesh) child.material = selectedPiece.userData.originalMaterial;
                });
                selectedPiece = null;
                clickedOnPiece = true;
            }
            break;
        }
    }

    if (!clickedOnPiece && selectedPiece) { 
        selectedPiece.mesh.traverse(child => {
            if (child.isMesh) child.material = selectedPiece.userData.originalMaterial;
        });
        selectedPiece = null;
        console.log("Deselected piece.");
    }
}

let animationFrameId;
function animateMinigame() {
    animationFrameId = requestAnimationFrame(animateMinigame);
    if(gameControls) gameControls.update(); // Update controls if they exist

    if (echoBoard1) echoBoard1.rotation.y += 0.001;
    if (echoBoard2) echoBoard2.rotation.x -= 0.0005;

    if (gameRenderer && gameScene && gameCamera) {
        gameRenderer.render(gameScene, gameCamera);
    }
}

// MODIFIED startFourDChess for standalone use
export function standaloneInitFourDChess(canvasContainerId) {
    console.log("Starting Standalone 4D Chess...");

    const container = document.getElementById(canvasContainerId);
    if (!container) {
        console.error("Canvas container not found for 4D Chess:", canvasContainerId);
        return;
    }

    gameScene = new THREE.Scene();
    gameScene.background = new THREE.Color(0x1a001a); 

    const aspectRatio = container.clientWidth / container.clientHeight;
    gameCamera = new THREE.PerspectiveCamera(60, aspectRatio, 0.1, 1000);
    gameCamera.position.set(0, BOARD_SIZE * 0.9, BOARD_SIZE * 1.3); // Slightly higher, further back
    gameCamera.lookAt(0, 0, 0);

    gameRenderer = new THREE.WebGLRenderer({ antialias: true });
    gameRenderer.setSize(container.clientWidth, container.clientHeight);
    gameRenderer.setPixelRatio(window.devicePixelRatio);
    gameRenderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(gameRenderer.domElement);

    gameControls = new OrbitControls(gameCamera, gameRenderer.domElement); // Add controls
    gameControls.target.set(0,0,0);
    gameControls.enableDamping = true;

    const light1 = new THREE.DirectionalLight(0xffffff, 1.2);
    light1.position.set(5, 10, 7);
    gameScene.add(light1);
    const light2 = new THREE.AmbientLight(0xdddddd, 0.8);
    gameScene.add(light2);

    primeBoard = createBoard(0, 
        new THREE.MeshStandardMaterial({ color: 0xcccccc }), 
        new THREE.MeshStandardMaterial({ color: 0x777777 })
    );
    gameScene.add(primeBoard);

    echoBoard1 = createBoard(1, 
        new THREE.MeshStandardMaterial({ color: 0x6699cc, transparent: true, opacity: 0.75 }), 
        new THREE.MeshStandardMaterial({ color: 0x336699, transparent: true, opacity: 0.75 })
    );
    echoBoard1.position.set(BOARD_SIZE * 1.3, BOARD_SIZE * 0.2, 0); // Adjusted positions
    echoBoard1.rotation.set(0, Math.PI / 7, 0); // Simpler initial rotation
    gameScene.add(echoBoard1);

    echoBoard2 = createBoard(2, 
        new THREE.MeshStandardMaterial({ color: 0xcc6666, transparent: true, opacity: 0.7 }), 
        new THREE.MeshStandardMaterial({ color: 0x993333, transparent: true, opacity: 0.7 })
    );
    echoBoard2.position.set(-BOARD_SIZE * 1.1, -BOARD_SIZE * 0.1, -BOARD_SIZE * 0.3);
    echoBoard2.rotation.set(0, -Math.PI / 9, Math.PI / 20);
    gameScene.add(echoBoard2);

    setupInitialPieces();
    
    container.addEventListener('click', onMouseClick, false); // Add listener to the container
    
    animateMinigame(); // Start its own animation loop

    window.addEventListener('resize', () => { // Handle resize for standalone
        if (gameCamera && gameRenderer && container) {
            gameCamera.aspect = container.clientWidth / container.clientHeight;
            gameCamera.updateProjectionMatrix();
            gameRenderer.setSize(container.clientWidth, container.clientHeight);
        }
    }, false);

    console.log("Standalone 4D Chess Initialized.");
}

// No stopFourDChess needed for this truly standalone version, just close the page.