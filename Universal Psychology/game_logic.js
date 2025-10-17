// game_logic.js

import { LanguageManager } from './language_manager.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. GAME STATE OBJECT ---
    const gameState = {
        neurons: 0,
        psychbucks: 0,
        neuronsPerClick: 1,
        currentBrainLevel: 0,
        passiveNeuronsPerSecond: 0,
        totalNeuronsGenerated: 0,
        neuronsSpentOnBrainUpgrades: 0,
        dopamineLevel: 0,
        gabaLevel: 0,
        factoryCount: 0,
        factoryCost: 10,
        passiveNeuroFuelMultiplier: 1,
        manualFuelMultiplier: 1,
        neuroFuel: 10,
        neuroFuelCost: 1,
        mindOps: 0,
        purchasedProjects: [],
        // anxietyMeter, timeAtHighDopamine, isAnxietyAttackActive are now in AnxietySystem
        questionsActuallyUnlocked: false,
        upgradesAreaUnlocked: false,
        // isAmygdalaActive is effectively AnxietySystem.isAmygdalaFunctioning()
        unlockedGames: {
            neurosnake: false,
            brainTetris: false,
            flappyFreud: false,
            feedSundgren: false
        }
    };

    function calculateNextNeuroFuelCost(){
        const level = Math.max(gameState.currentBrainLevel, 1);
        let max = 4;
        if(level >= 3) max = 16;
        else if(level >= 2) max = 8;
        return Math.floor(Math.random() * max) + 1;
    }

    gameState.neuroFuelCost = calculateNextNeuroFuelCost();

    // --- 9. PROJECT SYSTEM MODULE ---
    const ProjectSystem = {
        projects: [],
        init(projectData) { this.projects = projectData.map(p => ({...p})); },
        renderProjects() {
            if(!projectsListDOM) return;
            projectsListDOM.textContent = '';
            const fragment = document.createDocumentFragment();
            this.projects.filter(p => !p.purchased && (!p.trigger || p.trigger())).forEach(p => {
                const container = document.createElement('div');
                container.className = 'project-item';
                const titleEl = document.createElement('h3');
                titleEl.textContent = p.title;
                const descEl = document.createElement('p');
                descEl.textContent = p.description;
                const btn = document.createElement('button');
                btn.textContent = `Start (${p.cost} Ops)`;
                btn.disabled = gameState.mindOps < p.cost;
                btn.dataset.projectId = p.id;
                btn.addEventListener('click', () => this.purchaseProject(p.id));
                container.appendChild(titleEl);
                container.appendChild(descEl);
                container.appendChild(btn);
                fragment.appendChild(container);
            });
            projectsListDOM.appendChild(fragment);
        },
        updateProjectButtons(){
            if(!projectsListDOM) return;
            const projectMap = new Map(this.projects.map(project => [String(project.id), project]));
            projectsListDOM.querySelectorAll('button[data-project-id]').forEach(btn => {
                const project = projectMap.get(btn.dataset.projectId);
                if(!project){
                    btn.disabled = true;
                    return;
                }
                const available = !project.purchased && (!project.trigger || project.trigger());
                btn.disabled = !available || gameState.mindOps < project.cost;
            });
        },
        purchaseProject(id){
            const p = this.projects.find(pr => pr.id === id);
            if(!p || p.purchased || gameState.mindOps < p.cost) return;
            gameState.mindOps -= p.cost;
            if(typeof p.effect === 'function') p.effect.call(p);
            p.purchased = true;
            gameState.purchasedProjects.push(id);
            UIManager.logMessage(`Project completed: ${p.title}`, 'log-upgrade');
            this.renderProjects();
            UIManager.updateAllDisplays();
        },
        loadFromSave(saved){
            if(!saved) return;
            this.projects.forEach(p => {
                if(saved.includes(p.id)) {
                    p.purchased = true;
                    if(typeof p.effect === 'function') p.effect.call(p);
                }
            });
        }
    };

    // --- 2. CONSTANTS ---
    const ANXIETY_THRESHOLD = 70; const ANXIETY_SUSTAINED_THRESHOLD = 60; const ANXIETY_TIME_LIMIT = 20; const MAX_ANXIETY = 100;
    const SCARY_STIMULI_INTERVAL_MS = 120000; const BASE_IQ = 80; const IQ_SCALE_FACTOR = 15; const MAX_LOG_MESSAGES = 20; const FACTORY_PRODUCTION_RATE = 0.5;
    const OPS_PER_NEURON = 0.01; const AUTO_SAVE_INTERVAL = 10000; const QUESTION_RELOAD_DELAY_MS = 0;
    const FOOD_OPTIONS = [
        {emoji: '🍌', name: 'Banana', fuel: 10},
        {emoji: '🥪', name: 'Sandwich', fuel: 20},
        {emoji: '🍎', name: 'Apple', fuel: 15},
        {emoji: '🍪', name: 'Cookie', fuel: 25},
        {emoji: '🍕', name: 'Pizza slice', fuel: 30},
        {emoji: '🍰', name: 'Cake', fuel: 50}
    ];

    // --- 3. DOM ELEMENTS ---
    const neuronsDisplayDOM = document.getElementById('neurons-display');
    const psychbucksDisplayDOM = document.getElementById('psychbucks-display');
    const iqDisplayDOM = document.getElementById('iq-display');
    const opsDisplayDOM = document.getElementById('ops-display');
    const clickButtonDOM = document.getElementById('click-button');
    const contentWrapperDOM = document.querySelector('.content-wrapper');
    const leftColumnDOM = document.querySelector('.left-column');
    const brainVisualAreaDOM = document.getElementById('brain-visual-area');
    const threeContainerDOM = document.getElementById('threejs-canvas-container');
    const brainVizHomeSlotDOM = document.getElementById('brain-viz-home-slot');
    const brainPopupVisualSlotDOM = document.getElementById('brain-popup-visual-slot');
    const questionAreaSectionDOM = document.getElementById('question-area');
    const streakFeedbackAreaDOM = document.getElementById('streak-feedback-area');
    const questionTextElementDOM = document.getElementById('question-text');
    const answerOptionsElementDOM = document.getElementById('answer-options');
    const feedbackAreaDOM = document.getElementById('feedback-area');
    const upgradesAreaDOM = document.getElementById('upgrades-area');
    const upgradesListElementDOM = document.getElementById('upgrades-list');
    const neuronProliferationAreaDOM = document.getElementById('neuron-proliferation-area');
    const neuronProliferationUpgradesListDOM = document.getElementById('neuron-proliferation-upgrades-list');
    const hypothalamusControlsAreaDOM = document.getElementById('hypothalamus-controls-area');
    const dopamineSliderDOM = document.getElementById('dopamine-slider');
    const dopamineLevelDisplayDOM = document.getElementById('dopamine-level-display');
    const gabaSliderDOM = document.getElementById('gaba-slider');
    const gabaLevelDisplayDOM = document.getElementById('gaba-level-display');
    const anxietyStatusDisplayDOM = document.getElementById('anxiety-status');
    const infoBannerDOM = document.getElementById('info-banner');
    const scaryStimuliOverlayDOM = document.getElementById('scary-stimuli-overlay');
    const factoryAreaDOM = document.getElementById('factory-area');
    const factoryCountDOM = document.getElementById('factory-count');
    const factoryCostDOM = document.getElementById('factory-cost');
    const buyFactoryBtnDOM = document.getElementById('buy-factory-btn');
    const neurofuelAreaDOM = document.getElementById('neurofuel-area');
    const projectsAreaDOM = document.getElementById('projects-area');
    const projectsListDOM = document.getElementById('projects-list');
    const neurofuelCountDOM = document.getElementById('neurofuel-count');
    const neurofuelCostDOM = document.getElementById('neurofuel-cost');
    const buyNeurofuelBtnDOM = document.getElementById('buy-neurofuel-btn');
    const infoButtonDOM = document.getElementById('info-button');
    const instructionsOverlayDOM = document.getElementById('instructions-overlay');
    const closeInstructionsBtnDOM = document.getElementById('close-instructions');
    const brainPopupDOM = document.getElementById('brain-popup');
    const closeBrainPopupBtnDOM = document.getElementById('close-brain-popup');
    const brainStatsChartDOM = document.getElementById('brain-stats-chart');
    const manualSaveBtnDOM = document.getElementById('manual-save');
    const manualLoadBtnDOM = document.getElementById('manual-load');
    const newGameBtnDOM = document.getElementById('new-game');
    const saveSlotSelectDOM = document.getElementById('save-slot-select');
    const openNeuroSnakeBtn = document.getElementById('open-neurosnake');
    const openBrainTetrisBtn = document.getElementById('open-braintetris');
    const openFlappyFreudBtn = document.getElementById('open-flappyfreud');
    const openFeedSundgrenBtn = document.getElementById('open-feedsundgren');
    const bodyDOM = document.body;

    LanguageManager.apply(gameState.currentBrainLevel);

    let currentSaveSlot = 1;

    const brainStatsData = { labels: [], neurons: [], fuel: [] };
    let brainChart = null;
    let gameLoopId = null;
    let autoSaveId = null;
    let lastChartUpdateMs = 0;

    function fmtInt(n){
        return Math.floor(n).toLocaleString();
    }

    function clamp(v, min, max){
        return Math.min(Math.max(v, min), max);
    }

    const SAVE_VERSION = 1;

    // Intervals for automatic food purchasing
    let intermittentFastingIntervalId = null;
    let irregularSnacksTimeoutId = null;

    const MINIGAME_UNLOCK_SEQUENCE = ['brainTetris', 'neurosnake', 'flappyFreud', 'feedSundgren'];
    const MINIGAME_DISPLAY_NAMES = {
        brainTetris: 'Brain Tetris',
        neurosnake: 'NeuroSnake',
        flappyFreud: 'Flappy Freud',
        feedSundgren: 'Feed Sundgren'
    };

    function unlockMinigamesForBrainLevel(level) {
        const unlockCount = Math.max(0, Math.min(MINIGAME_UNLOCK_SEQUENCE.length, level - 1));
        const newlyUnlocked = [];
        for (let i = 0; i < unlockCount; i++) {
            const key = MINIGAME_UNLOCK_SEQUENCE[i];
            if (!gameState.unlockedGames[key]) {
                gameState.unlockedGames[key] = true;
                newlyUnlocked.push(key);
            }
        }
        if (newlyUnlocked.length > 0) {
            newlyUnlocked.forEach(key => UIManager.logMessage(`Minigame unlocked: ${MINIGAME_DISPLAY_NAMES[key] || key}`, 'log-unlock'));
            UIManager.updateMinigameButtons();
        }
    }

    function unlockRemainingMinigames(reasonMessage) {
        const newlyUnlocked = MINIGAME_UNLOCK_SEQUENCE.filter(key => !gameState.unlockedGames[key]);
        if (newlyUnlocked.length === 0) return;
        newlyUnlocked.forEach(key => {
            gameState.unlockedGames[key] = true;
        });
        if (reasonMessage) {
            UIManager.logMessage(reasonMessage, 'log-unlock');
        }
        newlyUnlocked.forEach(key => UIManager.logMessage(`Minigame unlocked: ${MINIGAME_DISPLAY_NAMES[key] || key}`, 'log-unlock'));
        UIManager.updateMinigameButtons();
    }

    // --- Upgrade Action Functions ---
    function biggerBrain1Action() {
        UIManager.logMessage("biggerBrain1 ACTION TRIGGERED!", "log-info");
        gameState.currentBrainLevel = 1;
        gameState.neuroFuelCost = calculateNextNeuroFuelCost();
        UIManager.callUpdateBrainVisual();
        LanguageManager.apply(gameState.currentBrainLevel);
        if (brainVisualAreaDOM) brainVisualAreaDOM.style.display = 'block';
        if (leftColumnDOM) leftColumnDOM.style.display = 'block';
        if (neurofuelAreaDOM) neurofuelAreaDOM.style.display = 'block';
        if (projectsAreaDOM) projectsAreaDOM.style.display = 'block';
        QuestionSystem.setOverallUnlockState(true);
        QuestionSystem.unlockDifficultyLevel(0);
        if (neuronProliferationAreaDOM) {
            neuronProliferationAreaDOM.style.display = 'block';
            UpgradeSystem.renderNeuronProliferationUpgrades();
        }
        UIManager.logMessage("Brain Growth I: Easy Qs & Proliferation unlocked.", "log-unlock");
    }

    function biggerBrain2Action() {
        gameState.currentBrainLevel = 2;
        gameState.neuroFuelCost = calculateNextNeuroFuelCost();
        UIManager.callUpdateBrainVisual();
        LanguageManager.apply(gameState.currentBrainLevel);
        QuestionSystem.unlockDifficultyLevel(1);
        if (hypothalamusControlsAreaDOM) hypothalamusControlsAreaDOM.style.display = 'block';
        unlockMinigamesForBrainLevel(gameState.currentBrainLevel);
        UIManager.logMessage("Brain Growth II: Medium Qs & Hypothalamus unlocked.", "log-unlock");
    }

    function biggerBrain3Action() {
        gameState.currentBrainLevel = 3;
        gameState.neuroFuelCost = calculateNextNeuroFuelCost();
        UIManager.callUpdateBrainVisual();
        LanguageManager.apply(gameState.currentBrainLevel);
        QuestionSystem.unlockDifficultyLevel(2);
        startIrregularSnacks();
        unlockMinigamesForBrainLevel(gameState.currentBrainLevel);
        UIManager.logMessage("Brain Growth III: Hard Qs & Amygdala research.", "log-unlock");
        UpgradeSystem.renderCoreUpgrades();
    }

    function amygdalaActivationAction() {
        gameState.passiveNeuronsPerSecond = (gameState.passiveNeuronsPerSecond > 0 ? gameState.passiveNeuronsPerSecond : 0.1) * 2;
        AnxietySystem.activateAmygdala();
        UIManager.logMessage("Amygdala activated! Production boosted.", "log-unlock");
        /* UIManager.updateAllDisplays(); // Called by purchaseUpgrade */
    }

    function nucleusAccumbensAction() {
        unlockRemainingMinigames("Pleasure center engaged! Minigames available.");
    }

    function prolifFactoryAction() {
        if (factoryAreaDOM) {
            factoryAreaDOM.style.display = 'block';
            UIManager.updateFactoryDisplay();
        }
    }

    function metabolicEfficiencyAction() {
        gameState.manualFuelMultiplier *= 0.5;
        gameState.passiveNeuroFuelMultiplier *= 0.5;
    }

    function intermittentFastingAction() {
        startIntermittentFasting();
    }

    function metabolicEfficiency2Action() {
        gameState.manualFuelMultiplier *= 0.5;
        gameState.passiveNeuroFuelMultiplier *= 0.5;
    }

    function getUpgradeLocalization(upgrade) {
        if (!upgrade) {
            return { name: '', desc: '' };
        }
        const localization = LanguageManager.getPhrase(`upgrades.${upgrade.id}`, gameState.currentBrainLevel);
        const fallbackName = upgrade.name || '';
        const fallbackDesc = upgrade.description || '';
        if (localization && typeof localization === 'object') {
            return {
                name: localization.name || fallbackName,
                desc: localization.desc || fallbackDesc
            };
        }
        if (typeof localization === 'string' && localization) {
            return { name: localization, desc: fallbackDesc };
        }
        return { name: fallbackName, desc: fallbackDesc };
    }

    function getNotEnoughMessage(name) {
        const message = LanguageManager.getPhrase('upgrades.notEnough', gameState.currentBrainLevel, { name });
        return typeof message === 'string' && message ? message : `Not enough for ${name}.`;
    }

    // --- 4. RAW DATA ---
    const coreUpgrades_raw_data = [
        { id: "biggerBrain1", name: "Brain Growth: Stage 1", costCurrency: "neurons", cost: 10, description: "Unlocks EASY Qs & Neuron Proliferation.", effectApplied: false, type: 'brain', action: biggerBrain1Action },
        { id: "biggerBrain2", name: "Brain Growth: Stage 2", costCurrency: "neurons", cost: 250, description: "Unlocks MEDIUM Qs & Hypothalamus.", effectApplied: false, dependsOn: "biggerBrain1", type: 'brain', action: biggerBrain2Action },
        { id: "biggerBrain3", name: "Brain Growth: Stage 3", costCurrency: "neurons", cost: 1000, description: "Unlocks HARD Qs & Amygdala research.", effectApplied: false, dependsOn: "biggerBrain2", type: 'brain', action: biggerBrain3Action },
        { id: "amygdalaActivation", name: "Activate Amygdala", costCurrency: "neurons", cost: 5000, psychbuckCost: 200, description: "Doubles passive neuron production. WARNING: Random stimuli.", effectApplied: false, dependsOn: "biggerBrain3", type: 'brain', action: amygdalaActivationAction },
        { id: "nucleusAccumbens", name: "Nucleus Accumbens", costCurrency: "neurons", cost: 2000, description: "Unlocks access to NeuroGames.", effectApplied: false, dependsOn: "biggerBrain3", type: 'brain', action: nucleusAccumbensAction }
    ];
    const neuronProliferationUpgrades_raw_data = [
        { id: "prolifFactory", name: "Neuron Proliferation Factory", description: "Builds a facility for passive neuron growth (+0.5/sec).", costCurrency: "psychbucks", cost: 10, neuronBoost: 0.5, effectApplied: false, type: 'proliferation', action: prolifFactoryAction },
        { id: "dendriticSprouting", name: "Dendritic Sprouting", description: "Increase passive neuron production by 0.1%.", costCurrency: "psychbucks", cost: 25, percentBoost: 0.1, effectApplied: false, dependsOn: "prolifFactory", type: 'proliferation' },
        { id: "myelination", name: "Myelination", description: "Boost production but consumes more fuel and raises anxiety.", costCurrency: "psychbucks", cost: 60, percentBoost: 20, extraFuel: 0.2, anxietyBoost: 5, effectApplied: false, dependsOn: "dendriticSprouting", type: 'proliferation' },
        { id: "metabolicEfficiency", name: "Metabolic Efficiency", description: "Cuts Neurofuel consumption by 50%.", costCurrency: "psychbucks", cost: 80, effectApplied: false, factoryRequirement: 4, type: 'proliferation', action: metabolicEfficiencyAction },
        { id: "intermittentFasting", name: "Intermittent Fasting", description: "Automatically purchase fuel every 10 seconds.", costCurrency: "psychbucks", cost: 120, effectApplied: false, dependsOn: "metabolicEfficiency", type: 'proliferation', action: intermittentFastingAction },
        { id: "metabolicEfficiency2", name: "Metabolic Efficiency II", description: "Further cuts fuel use by 50%.", costCurrency: "psychbucks", cost: 200, effectApplied: false, dependsOn: "metabolicEfficiency", brainRequirement: 3, type: 'proliferation', action: metabolicEfficiency2Action },
    ];

    const projectData = [
        {
            id: 'efficiency',
            title: 'Neural Efficiency',
            description: 'Increase passive neuron production by 10%.',
            cost: 100,
            trigger: () => gameState.factoryCount >= 1,
            effect: function(){ gameState.passiveNeuronsPerSecond *= 1.1; }
        },
        {
            id: 'automation',
            title: 'Autonomy Research',
            description: 'Clicks automatically once per second.',
            cost: 250,
            trigger: () => gameState.currentBrainLevel >= 1,
            effect: function(){
                if(this.intervalId) return;
                this.intervalId = setInterval(handleManualGeneration, 1000);
            }
        }
    ];

    // --- 5. UI MANAGER OBJECT ---
    const UIManager = {
        logMessage(message, type = 'log-info') {
            if (!infoBannerDOM) return;
            const now = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
            const el = document.createElement('p');
            el.textContent = `[${now}] ${message}`;
            el.className = type;
            infoBannerDOM.prepend(el);
            while (infoBannerDOM.childElementCount > MAX_LOG_MESSAGES) {
                if (infoBannerDOM.lastElementChild) {
                    infoBannerDOM.lastElementChild.remove();
                }
            }
            infoBannerDOM.scrollTop = 0;
        },
        updateNeuronDisplay() {
            if (neuronsDisplayDOM) {
                neuronsDisplayDOM.textContent = LanguageManager.getPhrase('stats.neurons', gameState.currentBrainLevel, {
                    value: fmtInt(gameState.neurons)
                });
            }
        },
        updatePsychbuckDisplay(rate) {
            if (psychbucksDisplayDOM) {
                psychbucksDisplayDOM.textContent = LanguageManager.getPhrase('stats.psychbucks', gameState.currentBrainLevel, {
                    value: fmtInt(gameState.psychbucks),
                    rate: rate.toFixed(1)
                });
            }
        },
        updateOpsDisplay() {
            if (opsDisplayDOM) {
                opsDisplayDOM.textContent = LanguageManager.getPhrase('stats.ops', gameState.currentBrainLevel, {
                    value: fmtInt(gameState.mindOps)
                });
            }
        },
        updateIQDisplay() {
            if (iqDisplayDOM) {
                const act = gameState.totalNeuronsGenerated + gameState.neuronsSpentOnBrainUpgrades + 1;
                const iq = BASE_IQ + Math.log10(act) * IQ_SCALE_FACTOR;
                iqDisplayDOM.textContent = LanguageManager.getPhrase('stats.iq', gameState.currentBrainLevel, {
                    value: Math.floor(iq)
                });
            }
        },
        updateNeuroFuelDisplay() {
            if (neurofuelCountDOM && neurofuelCostDOM) {
                neurofuelCountDOM.textContent = fmtInt(gameState.neuroFuel);
                neurofuelCostDOM.textContent = fmtInt(Math.ceil(gameState.neuroFuelCost));
            }
            if (buyNeurofuelBtnDOM) buyNeurofuelBtnDOM.disabled = gameState.psychbucks < gameState.neuroFuelCost;
            const fuelDisplayDOM = document.getElementById('neurofuel-display');
            if (fuelDisplayDOM) {
                fuelDisplayDOM.textContent = LanguageManager.getPhrase('stats.fuel', gameState.currentBrainLevel, {
                    value: fmtInt(gameState.neuroFuel)
                });
            }
        },
        updateAnxietyDisplay() { if (!anxietyStatusDisplayDOM) return; const ax = AnxietySystem.getAnxietyInfo(); const meter = clamp(ax.meter, 0, 100); let txt = `Anxiety: Normal (${meter.toFixed(0)}%)`, clr = "green"; if (ax.isAttackActive){txt="Status: ANXIETY ATTACK!";clr="red";} else if (ax.activeStimuliCount>0 && ax.isAmygdalaSystemActive){txt=`Anxiety: Stimuli! (${meter.toFixed(0)}%)`;clr="purple";} else if (meter>ANXIETY_SUSTAINED_THRESHOLD){txt=`Anxiety: CRITICAL (${meter.toFixed(0)}%)`;clr="orange";} else if (meter>ANXIETY_SUSTAINED_THRESHOLD/2){txt=`Anxiety: Elevated (${meter.toFixed(0)}%)`;clr="#CCCC00";} else if (meter>0){txt=`Anxiety: Moderate (${meter.toFixed(0)}%)`;clr="yellowgreen";} anxietyStatusDisplayDOM.textContent=txt; anxietyStatusDisplayDOM.style.color=clr;},
        updateQuestionAreaUIVisibility() { if (!questionAreaSectionDOM) {this.logMessage("Q Area DOM missing!","log-warning"); return;} if(gameState.questionsActuallyUnlocked){questionAreaSectionDOM.style.display='';this.logMessage("Q area VISIBLE.","log-info"); if(QuestionSystem.getCurrentQuestionIndex()===-1){this.logMessage("UIManager: Triggering QS loadNextQ.","log-info");QuestionSystem.loadNextQuestion();}}else{questionAreaSectionDOM.style.display='none';if(questionTextElementDOM)questionTextElementDOM.textContent="Upgrade brain for Qs.";if(answerOptionsElementDOM)answerOptionsElementDOM.innerHTML='';this.clearFeedbackAreas();this.logMessage("Q area HIDDEN.","log-info");}},
        displayQuestion(qData) {
            if(questionTextElementDOM) questionTextElementDOM.textContent = qData.text;
            if(answerOptionsElementDOM) answerOptionsElementDOM.innerHTML = '';
            const shuffled = qData.options.map((opt,idx)=>({opt,idx})).sort(()=>Math.random()-0.5);
            shuffled.forEach(item=>{const btn=document.createElement('button');btn.textContent=item.opt;btn.onclick=()=>QuestionSystem.handleAnswer(item.idx);if(answerOptionsElementDOM) answerOptionsElementDOM.appendChild(btn);});
        },
        displayFeedback(msg,type){if(type==='correct'||type==='incorrect'){if(feedbackAreaDOM){feedbackAreaDOM.textContent=msg;feedbackAreaDOM.style.color=type==='correct'?'green':'red';}}else if(type==='streak-bonus'||type==='streak-broken'){if(streakFeedbackAreaDOM){streakFeedbackAreaDOM.textContent=msg;streakFeedbackAreaDOM.className=type==='streak-bonus'?'streak-bonus-text':'streak-broken-text';}}},
        clearFeedbackAreas() { if(feedbackAreaDOM)feedbackAreaDOM.textContent=''; if(streakFeedbackAreaDOM){streakFeedbackAreaDOM.textContent='';streakFeedbackAreaDOM.className='';}},
        updateAllDisplays() {
            let effRate = gameState.passiveNeuronsPerSecond;
            if (AnxietySystem.isAttackCurrentlyActive()) {
                effRate = 0;
            } else if (gameState.currentBrainLevel >= 2) {
                effRate *= (1 + (gameState.dopamineLevel / 100) * 0.2) * (1 - (gameState.gabaLevel / 100) * 0.2);
                effRate = Math.max(0, effRate);
            }
            const manager = UIManager;
            manager.updateNeuronDisplay();
            manager.updatePsychbuckDisplay(effRate);
            manager.updateIQDisplay();
            manager.updateOpsDisplay();
            manager.updateNeuroFuelDisplay();
            manager.updateAnxietyDisplay();
            manager.updateFactoryDisplay();
            manager.updateMinigameButtons();
            UpgradeSystem.updateUpgradeButtons();
            ProjectSystem.updateProjectButtons();
        },
        callUpdateBrainVisual() { if(window.GameVisuals && typeof window.GameVisuals.updateBrainVisual === 'function'){window.GameVisuals.updateBrainVisual({level:gameState.currentBrainLevel,dopamine:gameState.dopamineLevel,gaba:gameState.gabaLevel});}},
        renderUpgradeList(upgsToRender,listElDOM,upgTypeStr){if(!listElDOM)return;listElDOM.innerHTML="";upgsToRender.forEach(upg=>{const itm=document.createElement('div');itm.classList.add('upgrade-item');const {name:localizedName,desc:localizedDesc}=getUpgradeLocalization(upg);if(upg.effectApplied){itm.classList.add('purchased');let sTxt="(Purchased)";if(upg.id==="amygdalaActivation"&&AnxietySystem.isAmygdalaFunctioning())sTxt="(Active)";itm.innerHTML=`<h3>${localizedName} ${sTxt}</h3><p>${localizedDesc}</p>`;}else{let cTxt=`${upg.cost} ${upg.costCurrency}`;if(upg.psychbuckCost)cTxt+=` & ${upg.psychbuckCost} Psychbucks`;itm.innerHTML=`<h3>${localizedName}</h3><p>${localizedDesc}</p><p>Cost: ${cTxt}</p><button data-upgrade-id="${upg.id}" data-upgrade-type="${upgTypeStr}">Purchase</button>`;const btn=itm.querySelector('button');if(btn)btn.onclick=(e)=>UpgradeSystem.purchaseUpgrade(e.target.dataset.upgradeId,e.target.dataset.upgradeType);}listElDOM.appendChild(itm);});},
        updateFactoryDisplay(){
            if(!factoryAreaDOM) return;
            if(factoryCountDOM) factoryCountDOM.textContent = gameState.factoryCount;
            if(factoryCostDOM) factoryCostDOM.textContent = Math.ceil(gameState.factoryCost);
            if(buyFactoryBtnDOM) buyFactoryBtnDOM.disabled = gameState.psychbucks < gameState.factoryCost;
        },
        updateMinigameButtons(){
            if(openNeuroSnakeBtn) openNeuroSnakeBtn.style.display = gameState.unlockedGames.neurosnake ? '' : 'none';
            if(openBrainTetrisBtn) openBrainTetrisBtn.style.display = gameState.unlockedGames.brainTetris ? '' : 'none';
            if(openFlappyFreudBtn) openFlappyFreudBtn.style.display = gameState.unlockedGames.flappyFreud ? '' : 'none';
            if(openFeedSundgrenBtn) openFeedSundgrenBtn.style.display = gameState.unlockedGames.feedSundgren ? '' : 'none';
        },
        updateSingleUpgradeButton(btnEl,canAfford){if(btnEl)btnEl.disabled=!canAfford;},
        // Path to the brain upgrade image is relative to index.html, which is
        // inside the "Universal Psychology" folder. The image file resides in
        // this folder's "images" directory, so no parent navigation is needed.
        playBrainUpgradeAnimation(imgSrc="images/brain-upgrade.png"){
            const overlay=document.getElementById("upgrade-animation-overlay");
            if(!overlay) return;
            overlay.innerHTML="";
            const img=document.createElement("img");
            img.className="upgrade-spin-image";
            img.src=imgSrc;
            overlay.appendChild(img);
            for(let i=0;i<30;i++){
                const p=document.createElement("div");
                p.className="upgrade-particle";
                overlay.appendChild(p);
                const dx=(Math.random()-0.5)*300;
                const dy=(Math.random()-0.5)*300;
                requestAnimationFrame(()=>{p.style.transform=`translate(${dx}px, ${dy}px)`;p.style.opacity="0";});
            }
            setTimeout(()=>{overlay.innerHTML="";},2000);
        },
    };

    // --- 6. QUESTION SYSTEM MODULE OBJECT ---
    const QuestionSystem = {
        allQuestionsData: [],
        // Base rewards represent the psychbuck payout for each question
        // difficulty at brain level 1. Rewards scale up with further
        // brain upgrades.
        baseRewardsByDifficultyValue: { 0: 4, 1: 6, 2: 8 },
        currentQuestionIndex: -1,
        difficultyUnlocked: -1,
        currentStreakCount: 0,
        currentStreakBonus: 0,
        init(questionsSourceArray) { this.allQuestionsData = questionsSourceArray || []; this.currentQuestionIndex = -1; this.difficultyUnlocked = -1; this.currentStreakCount = 0; this.currentStreakBonus = 0; UIManager.logMessage("QuestionSystem Initialized (" + this.allQuestionsData.length + " Qs).", "log-info"); if (this.allQuestionsData.length === 0 && questionsSourceArray && questionsSourceArray.length > 0) { UIManager.logMessage("QS WARNING: questionsSourceArray had items, but allQuestionsData is empty post-assignment!", "log-warning"); } else if (this.allQuestionsData.length === 0) { UIManager.logMessage("QS WARNING: Initialized with an empty questions array!", "log-warning"); } },
        getCurrentQuestionIndex() { return this.currentQuestionIndex; },
        setOverallUnlockState(isUnlocked) { gameState.questionsActuallyUnlocked = isUnlocked; UIManager.updateQuestionAreaUIVisibility(); },
        unlockDifficultyLevel(level) { this.difficultyUnlocked = Math.max(this.difficultyUnlocked, level); UIManager.logMessage(`${level === 0 ? 'Easy' : level === 1 ? 'Medium' : 'Hard'} questions available.`, 'log-info'); if (gameState.questionsActuallyUnlocked && this.currentQuestionIndex === -1) this.loadNextQuestion(); },
        loadNextQuestion() {
            if (!gameState.questionsActuallyUnlocked) { UIManager.updateQuestionAreaUIVisibility(); return; }
            const filteredQuestions = this.allQuestionsData.filter(q => q.difficulty <= this.difficultyUnlocked && (this.currentQuestionIndex === -1 || q.id !== this.allQuestionsData[this.currentQuestionIndex]?.id));
            if (filteredQuestions.length === 0) {
                if(questionTextElementDOM) questionTextElementDOM.textContent = (this.difficultyUnlocked < 2) ? "More questions at higher brain levels." : "All questions answered for this difficulty!";
                if(answerOptionsElementDOM) answerOptionsElementDOM.innerHTML = ''; UIManager.clearFeedbackAreas(); this.currentQuestionIndex = -1; UIManager.logMessage("QS: No suitable questions found.", "log-info"); return;
            }
            const randomIndex = Math.floor(Math.random() * filteredQuestions.length); const nextQuestionData = filteredQuestions[randomIndex];
            this.currentQuestionIndex = this.allQuestionsData.findIndex(q => q.id === nextQuestionData.id);
            if (this.currentQuestionIndex === -1) { console.error("QS Error finding Q by ID: ", nextQuestionData); UIManager.logMessage("CRIT QS: Error find Q by ID.", "log-warning"); if(questionTextElementDOM) questionTextElementDOM.textContent = "Error loading Q data."; if(answerOptionsElementDOM) answerOptionsElementDOM.innerHTML = ''; return; }
            UIManager.displayQuestion(this.allQuestionsData[this.currentQuestionIndex]); UIManager.clearFeedbackAreas(); UIManager.logMessage(`QS Loaded Q ID ${this.allQuestionsData[this.currentQuestionIndex].id}`, "log-info");
        },
        handleAnswer(selectedIndex) {
            if (!gameState.questionsActuallyUnlocked || this.currentQuestionIndex === -1 || !this.allQuestionsData[this.currentQuestionIndex]) return;
            const question = this.allQuestionsData[this.currentQuestionIndex]; const isCorrect = selectedIndex === question.correctAnswerIndex;
            if (isCorrect) {
                const baseReward = this.baseRewardsByDifficultyValue[question.difficulty] || 1;
                const levelMultiplier = Math.pow(2, Math.max(gameState.currentBrainLevel - 1, 0));
                const rewardWithScaling = baseReward * levelMultiplier;
                const actualPsychbucksEarned = rewardWithScaling + this.currentStreakBonus;
                gameState.psychbucks += actualPsychbucksEarned;
                UIManager.displayFeedback(`Correct!`, 'correct'); this.currentStreakCount++;
                UIManager.displayFeedback(this.currentStreakCount > 1 ? `Streak: ${this.currentStreakCount}! +${this.currentStreakBonus} bonus. Total: ${actualPsychbucksEarned} PB!` : `Streak Started! Total: ${actualPsychbucksEarned} PB!`, 'streak-bonus');
                UIManager.logMessage(`Correct: +${actualPsychbucksEarned} PB (Streak: ${this.currentStreakCount})`, 'log-info'); this.currentStreakBonus += baseReward;
            } else {
                UIManager.displayFeedback(`Incorrect. Correct was: ${question.options[question.correctAnswerIndex]}`, 'incorrect');
                UIManager.displayFeedback(this.currentStreakCount > 0 ? `Streak Broken! (Was ${this.currentStreakCount})` : "", 'streak-broken');
                if(this.currentStreakCount > 0) UIManager.logMessage(`Incorrect. Streak of ${this.currentStreakCount} broken.`, 'log-warning'); else UIManager.logMessage(`Incorrect.`, 'log-warning');
                this.currentStreakCount = 0; this.currentStreakBonus = 0;
                if (gameState.currentBrainLevel >= 2 && !AnxietySystem.isAttackCurrentlyActive()) {
                    let anxietyIncrease = 5 + (question.difficulty === 2 ? 5 : (question.difficulty === 1 ? 2 : 0));
                    AnxietySystem.increaseMeter(anxietyIncrease);
                }
            }
            this.currentQuestionIndex = -1; setTimeout(() => { this.loadNextQuestion(); UIManager.updateAllDisplays(); }, QUESTION_RELOAD_DELAY_MS);
        }
    };

    // --- 7. UPGRADE SYSTEM MODULE ---
    const UpgradeSystem = {
        coreUpgrades: [], neuronProliferationUpgrades: [],
        init(coreData, proliferationData) { this.coreUpgrades = coreData.map(u => ({ ...u, effectApplied: u.effectApplied || false })); this.neuronProliferationUpgrades = proliferationData.map(u => ({ ...u, effectApplied: u.effectApplied || false })); UIManager.logMessage("UpgradeSystem Initialized. Core: " + this.coreUpgrades.length + ", Prolif: " + this.neuronProliferationUpgrades.length, "log-info"); },
        getFilteredUpgrades(type) {
            const source = type === "core" ? this.coreUpgrades : this.neuronProliferationUpgrades;
            return source.filter(upg => {
                if (upg.dependsOn) {
                    const dep = this.coreUpgrades.find(u => u.id === upg.dependsOn) || this.neuronProliferationUpgrades.find(u => u.id === upg.dependsOn);
                    if (!dep || !dep.effectApplied) return false;
                }
                if (typeof upg.factoryRequirement === 'number' && gameState.factoryCount < upg.factoryRequirement) return false;
                if (typeof upg.brainRequirement === 'number' && gameState.currentBrainLevel < upg.brainRequirement) return false;
                return true;
            });
        },
        renderCoreUpgrades() { UIManager.logMessage("[UpgradeSystem] renderCoreUpgrades called.", "log-info"); const upgs = this.getFilteredUpgrades("core"); if (!upgradesListElementDOM) { UIManager.logMessage("[UpgradeSystem] ERROR: upgradesListElementDOM is null!", "log-warning"); return; } UIManager.renderUpgradeList(upgs, upgradesListElementDOM, "core"); this.updateUpgradeButtons(); },
        renderNeuronProliferationUpgrades() { UIManager.logMessage("[UpgradeSystem] renderNeuronProliferationUpgrades called.", "log-info"); if (neuronProliferationAreaDOM && neuronProliferationAreaDOM.style.display !== 'none') { const upgs = this.getFilteredUpgrades("proliferation"); if (!neuronProliferationUpgradesListDOM) { UIManager.logMessage("[UpgradeSystem] ERROR: neuronProliferationUpgradesListDOM is null!", "log-warning"); return; } UIManager.renderUpgradeList(upgs, neuronProliferationUpgradesListDOM, "proliferation"); this.updateUpgradeButtons(); } else { UIManager.logMessage("[UpgradeSystem] Neuron prolif area hidden, not rendering.", "log-info"); } },
        purchaseUpgrade(upgradeId, upgradeType) {
            let upg; const srcArr = upgradeType === "core" ? this.coreUpgrades : this.neuronProliferationUpgrades; upg = srcArr.find(u => u.id === upgradeId);
            if (!upg) { UIManager.logMessage(`Upg Err: "${upgradeId}" not found.`, "log-warning"); return; }
            const { name: localizedNameBefore } = getUpgradeLocalization(upg);
            if (upg.effectApplied) { UIManager.logMessage(`${localizedNameBefore} already purchased.`, "log-info"); return; }
            let canAfford = (upg.costCurrency === "neurons" && gameState.neurons >= upg.cost && (!upg.psychbuckCost || gameState.psychbucks >= upg.psychbuckCost)) || (upg.costCurrency === "psychbucks" && gameState.psychbucks >= upg.cost);
            if (canAfford) {
                const prevBrainLvl = gameState.currentBrainLevel;
                if(upg.costCurrency==="neurons")gameState.neurons-=upg.cost; if(upg.costCurrency==="psychbucks")gameState.psychbucks-=upg.cost; if(upg.psychbuckCost)gameState.psychbucks-=upg.psychbuckCost;
                if(upg.type==='brain')gameState.neuronsSpentOnBrainUpgrades+=upg.cost; upg.effectApplied=true;
                if(upgradeType==="proliferation"){
                    if(typeof upg.neuronBoost==='number'){
                        gameState.passiveNeuronsPerSecond+=upg.neuronBoost;
                    }
                    if(typeof upg.percentBoost==='number'){ 
                        gameState.passiveNeuronsPerSecond*=1+(upg.percentBoost/100); 
                    }
                    if(typeof upg.extraFuel==='number'){ 
                        gameState.passiveNeuroFuelMultiplier*=1+upg.extraFuel; 
                    }
                    if(typeof upg.anxietyBoost==='number'){ 
                        AnxietySystem.increaseMeter(upg.anxietyBoost); 
                    }
                    gameState.passiveNeuronsPerSecond=parseFloat(gameState.passiveNeuronsPerSecond.toFixed(2));
                }
                const origUpgData=(upgradeType==="core"?coreUpgrades_raw_data:neuronProliferationUpgrades_raw_data).find(u=>u.id===upgradeId);
                if(origUpgData&&typeof origUpgData.action==='function'){origUpgData.action();}
                if(prevBrainLvl!==gameState.currentBrainLevel) ProjectSystem.renderProjects();
                const { name: localizedNameAfter } = getUpgradeLocalization(upg);
                UIManager.logMessage(`Upgrade: ${localizedNameAfter} acquired.`, 'log-upgrade'); UIManager.updateAllDisplays();
                if(upg.type=="brain") UIManager.playBrainUpgradeAnimation();
                if(upgradeType==="core")this.renderCoreUpgrades();else this.renderNeuronProliferationUpgrades();
            } else { UIManager.logMessage(getNotEnoughMessage(localizedNameBefore), "log-warning"); }
        },
        getUpgradeData(type, brainLevelToFind) { const source = type === "core" ? this.coreUpgrades : this.neuronProliferationUpgrades; return source.find(upg => upg.type === 'brain' && (upg.id.match(/biggerBrain(\d+)/) && parseInt(upg.id.match(/biggerBrain(\d+)/)[1]) === brainLevelToFind)); },
        markUpgradeNotApplied(upgradeId, upgradeType) { const source = upgradeType === "core" ? this.coreUpgrades : this.neuronProliferationUpgrades; const upg = source.find(u => u.id === upgradeId); if (upg) { upg.effectApplied = false; const { name: localizedName } = getUpgradeLocalization(upg); UIManager.logMessage(`Reverted purchase status for ${localizedName}.`, "log-info"); } },
        updateUpgradeButtons() { const allBtns=document.querySelectorAll('#upgrades-list button[data-upgrade-id],#neuron-proliferation-upgrades-list button[data-upgrade-id]');allBtns.forEach(btn=>{const uid=btn.dataset.upgradeId;const utype=btn.dataset.upgradeType;let upg=utype==="core"?this.coreUpgrades.find(u=>u.id===uid):this.neuronProliferationUpgrades.find(u=>u.id===uid);if(upg&&!upg.effectApplied){let canAfford=(upg.costCurrency==="neurons"&&gameState.neurons>=upg.cost&&(!upg.psychbuckCost||gameState.psychbucks>=upg.psychbuckCost))||(upg.costCurrency==="psychbucks"&&gameState.psychbucks>=upg.cost);UIManager.updateSingleUpgradeButton(btn,canAfford);}else if(upg&&upg.effectApplied){UIManager.updateSingleUpgradeButton(btn,false);}else{UIManager.updateSingleUpgradeButton(btn,false);}}); }
    };

    // --- 8. ANXIETY SYSTEM MODULE ---
    const AnxietySystem = {
        meter: 0, timeAtHighDopamine: 0, isAttackActive: false, isAmygdalaOnline: false, scaryStimuliIntervalId: null, activeStimuliDOMElements: [],
        BASE_ANXIETY_INCREASE_FACTOR: 0.1, BASE_ANXIETY_DECREASE_FACTOR: 0.5,
        init() {this.meter=0;this.timeAtHighDopamine=0;this.isAttackActive=false;this.isAmygdalaOnline=false;if(this.scaryStimuliIntervalId)clearInterval(this.scaryStimuliIntervalId);this.scaryStimuliIntervalId=null;this.activeStimuliDOMElements.forEach(el=>el.remove());this.activeStimuliDOMElements=[];UIManager.logMessage("AnxietySystem Initialized.","log-info");},
        getAnxietyInfo(){return{meter:this.meter,isAttackActive:this.isAttackActive,activeStimuliCount:this.activeStimuliDOMElements.length,isAmygdalaSystemActive:this.isAmygdalaOnline};},
        isAttackCurrentlyActive(){return this.isAttackActive;},
        isAmygdalaFunctioning(){return this.isAmygdalaOnline;}, // Changed from isAmygdalaSystemActive to isAmygdalaOnline
        activateAmygdala(){if(this.isAmygdalaOnline)return;this.isAmygdalaOnline=true;this._startScaryStimuliTimer();UIManager.logMessage("AnxietySystem: Amygdala online.","log-info");},
        increaseMeter(amount){if(!this.isAttackActive){this.meter=Math.min(MAX_ANXIETY,this.meter+amount);UIManager.logMessage(`Anxiety meter stress: +${amount}.`,'log-info');}},
        update(){if(this.isAttackActive){if(gameState.gabaLevel>0){this.meter=Math.max(0,this.meter-(gameState.gabaLevel/20));if(this.meter<=0){this.isAttackActive=false;this.timeAtHighDopamine=0;UIManager.logMessage("Anxiety subsided.","log-info");}}return;}let currentAnxietyChange=0;if(gameState.currentBrainLevel>=2&&gameState.dopamineLevel>ANXIETY_THRESHOLD&&(gameState.gabaLevel<gameState.dopamineLevel*0.4||gameState.gabaLevel<20)){this.timeAtHighDopamine++;currentAnxietyChange=(gameState.dopamineLevel/25)*this.BASE_ANXIETY_INCREASE_FACTOR;if(this.isAmygdalaOnline&&this.activeStimuliDOMElements.length>0){currentAnxietyChange*=2;}}else{this.timeAtHighDopamine=Math.max(0,this.timeAtHighDopamine-1);currentAnxietyChange=-(this.BASE_ANXIETY_DECREASE_FACTOR+(gameState.gabaLevel/15));}this.meter=Math.min(MAX_ANXIETY,Math.max(0,this.meter+currentAnxietyChange));if(this.timeAtHighDopamine>=ANXIETY_TIME_LIMIT&&this.meter>ANXIETY_SUSTAINED_THRESHOLD&&!this.isAttackActive){this._triggerAttack();}},
        _triggerAttack(){if(this.isAttackActive)return;this.isAttackActive=true;this.timeAtHighDopamine=0;UIManager.logMessage("ANXIETY ATTACK! Production halted. Stability compromised!","log-warning");gameState.neurons=Math.floor(gameState.neurons*0.8);let prevBrainLvl=gameState.currentBrainLevel;gameState.currentBrainLevel=Math.max(0,gameState.currentBrainLevel-1);if(prevBrainLvl>gameState.currentBrainLevel){const downgradedUpg=UpgradeSystem.getUpgradeData("core",prevBrainLvl);if(downgradedUpg){UpgradeSystem.markUpgradeNotApplied(downgradedUpg.id,"core");UIManager.logMessage(`Stability lost. ${downgradedUpg.name} requires reinforcement.`,"log-warning");}}UIManager.callUpdateBrainVisual();LanguageManager.apply(gameState.currentBrainLevel);UpgradeSystem.renderCoreUpgrades();UIManager.updateAnxietyDisplay();UIManager.updateAllDisplays();if(prevBrainLvl>gameState.currentBrainLevel)ProjectSystem.renderProjects();},
        _startScaryStimuliTimer(){if(this.scaryStimuliIntervalId)clearInterval(this.scaryStimuliIntervalId);this.scaryStimuliIntervalId=setInterval(()=>this._triggerScaryStimuliBatch(),SCARY_STIMULI_INTERVAL_MS);UIManager.logMessage("Amygdala awareness protocol initiated.","log-warning");},
        _triggerScaryStimuliBatch(){if(!this.isAmygdalaOnline||document.hidden)return;this.activeStimuliDOMElements.forEach(sD=>sD.remove());this.activeStimuliDOMElements=[];const numS=Math.floor(Math.random()*3)+3;UIManager.logMessage(`Awareness: ${numS} abrupt stimuli!`,"log-warning");for(let i=0;i<numS;i++)setTimeout(()=>this._createScaryStimulus(),i*150);},
        _createScaryStimulus(){if(!scaryStimuliOverlayDOM)return;const sD=document.createElement('div');const sT=["DANGER!","FEAR!","WATCH OUT!","PANIC!","THREAT!","ALERT!","INTRUSION!"];sD.textContent=sT[Math.floor(Math.random()*sT.length)];sD.className='scary-stimulus-popup';const oW=scaryStimuliOverlayDOM.offsetWidth,oH=scaryStimuliOverlayDOM.offsetHeight,pW=150,pH=60;sD.style.left=`${Math.random()*Math.max(0,oW-pW)}px`;sD.style.top=`${Math.random()*Math.max(0,oH-pH)}px`;sD.style.opacity='0';sD.style.transform='scale(0.5)';sD.onclick=()=>this._dismissScaryStimulus(sD);this.activeStimuliDOMElements.push(sD);scaryStimuliOverlayDOM.appendChild(sD);setTimeout(()=>{sD.style.opacity='1';sD.style.transform='scale(1)';},50);},
        _dismissScaryStimulus(sD){sD.style.opacity='0';sD.style.transform='scale(0.7)';setTimeout(()=>{try{sD.remove();this.activeStimuliDOMElements=this.activeStimuliDOMElements.filter(s=>s!==sD);if(this.activeStimuliDOMElements.length===0)UIManager.logMessage("Stimuli cleared. Focus returning.","log-info");}catch(e){console.error("Err dismiss stimulus:",e);}},300);}
    };

    // =======================================================================
    // 9. HELPER FUNCTIONS (Event Handlers, etc. - DEFINED BEFORE attachEventListeners and initGame)
    // =======================================================================
    function handleManualGeneration() {
        if (AnxietySystem.isAttackCurrentlyActive()) { UIManager.logMessage("Brain recovering... clicking disabled (Anxiety Active).", "log-warning"); return; }
        const possible = Math.min(gameState.neuronsPerClick, gameState.neuroFuel / gameState.manualFuelMultiplier);
        if(possible <= 0){ UIManager.logMessage('Out of NeuroFuel!', 'log-warning'); return; }
        let neuronsBeforeClick = gameState.neurons; gameState.neurons += possible; gameState.totalNeuronsGenerated += possible;
        gameState.mindOps += possible * OPS_PER_NEURON;
        gameState.neuroFuel -= possible * gameState.manualFuelMultiplier;
        UIManager.logMessage(`Neuron click: ${neuronsBeforeClick} -> ${gameState.neurons}`, "log-info");
        UIManager.updateAllDisplays();
        if(!gameState.upgradesAreaUnlocked && gameState.neurons >= 10){
            if(contentWrapperDOM) contentWrapperDOM.style.display = 'flex';
            if(upgradesAreaDOM) upgradesAreaDOM.style.display = 'block';
            UpgradeSystem.renderCoreUpgrades();
            gameState.upgradesAreaUnlocked = true;
        }
    }
    function handleBuyProliferationFactory(){
        if(gameState.psychbucks >= gameState.factoryCost){
            gameState.psychbucks -= gameState.factoryCost;
            gameState.factoryCount += 1;
            gameState.passiveNeuronsPerSecond += FACTORY_PRODUCTION_RATE;
            gameState.factoryCost *= 1.15;
            UIManager.logMessage(`Proliferation Factory purchased! Total: ${gameState.factoryCount}`, 'log-upgrade');
            ProjectSystem.renderProjects();
        } else {
            UIManager.logMessage('Not enough Psychbucks for factory.', 'log-warning');
        }
        UIManager.updateAllDisplays();
        UpgradeSystem.renderNeuronProliferationUpgrades();
    }

    function handleBuyNeurofuel(){
        if(gameState.psychbucks >= gameState.neuroFuelCost){
            gameState.psychbucks -= gameState.neuroFuelCost;
            const item = FOOD_OPTIONS[Math.floor(Math.random()*FOOD_OPTIONS.length)];
            gameState.neuroFuel += item.fuel;
            UIManager.logMessage(`Purchased ${item.emoji} ${item.name}! (+${item.fuel} Fuel)`, 'log-upgrade');
            gameState.neuroFuelCost = calculateNextNeuroFuelCost();
        } else {
            UIManager.logMessage('Not enough Psychbucks for food.', 'log-warning');
        }
        UIManager.updateAllDisplays();
    }

    function startIntermittentFasting(){
        if(intermittentFastingIntervalId) return;
        intermittentFastingIntervalId = setInterval(handleBuyNeurofuel, 10000);
        UIManager.logMessage('Intermittent Fasting activated: auto-buy every 10s.', 'log-info');
    }

    function stopIntermittentFasting(){
        if(!intermittentFastingIntervalId) return;
        clearInterval(intermittentFastingIntervalId);
        intermittentFastingIntervalId = null;
        UIManager.logMessage('Intermittent Fasting stopped.', 'log-info');
    }

    function startIrregularSnacks(){
        if(irregularSnacksTimeoutId) return;
        const schedule = () => {
            const delay = Math.random() * 9000 + 1000;
            irregularSnacksTimeoutId = setTimeout(() => {
                handleBuyNeurofuel();
                schedule();
            }, delay);
        };
        schedule();
        UIManager.logMessage('Irregular Snacks activated.', 'log-info');
    }

    function stopIrregularSnacks(){
        if(!irregularSnacksTimeoutId) return;
        clearTimeout(irregularSnacksTimeoutId);
        irregularSnacksTimeoutId = null;
        UIManager.logMessage('Irregular Snacks stopped.', 'log-info');
    }
    function handleDopamineSlider(event) { gameState.dopamineLevel = parseInt(event.target.value); if(dopamineLevelDisplayDOM) dopamineLevelDisplayDOM.textContent = gameState.dopamineLevel; UIManager.callUpdateBrainVisual(); UIManager.updateAllDisplays(); }
    function handleGabaSlider(event) { gameState.gabaLevel = parseInt(event.target.value); if(gabaLevelDisplayDOM) gabaLevelDisplayDOM.textContent = gameState.gabaLevel; UIManager.callUpdateBrainVisual(); UIManager.updateAllDisplays(); }

    function scheduleRendererResize(){
        setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
    }

    function openBrainPopup(){
        if(!brainPopupDOM) return;
        if(bodyDOM) bodyDOM.classList.add('brain-popup-open');
        if(threeContainerDOM && brainPopupVisualSlotDOM && threeContainerDOM.parentElement !== brainPopupVisualSlotDOM){
            brainPopupVisualSlotDOM.appendChild(threeContainerDOM);
            threeContainerDOM.classList.add('enlarged');
        }
        if(!brainChart && brainStatsChartDOM && window.Chart){
            const ctx = brainStatsChartDOM.getContext('2d');
            brainStatsChartDOM.width = 280;
            brainStatsChartDOM.height = 180;
            brainChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: brainStatsData.labels,
                    datasets: [
                        { label: 'Neurons', data: brainStatsData.neurons, borderColor: 'blue', fill: false },
                        { label: 'Fuel', data: brainStatsData.fuel, borderColor: 'orange', fill: false }
                    ]
                },
                options: {
                    animation: false,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                boxWidth: 12,
                                font: { size: 10 }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { font: { size: 10 } }
                        },
                        y: {
                            ticks: { font: { size: 10 } }
                        }
                    }
                }
            });
            lastChartUpdateMs = performance.now();
        }
        brainPopupDOM.style.display = 'flex';
        scheduleRendererResize();
    }

    function closeBrainPopup(){
        if(bodyDOM) bodyDOM.classList.remove('brain-popup-open');
        if(threeContainerDOM){
            threeContainerDOM.classList.remove('enlarged');
            if(brainVizHomeSlotDOM && threeContainerDOM.parentElement !== brainVizHomeSlotDOM){
                brainVizHomeSlotDOM.appendChild(threeContainerDOM);
            }
        }
        if(brainPopupDOM) brainPopupDOM.style.display = 'none';
        scheduleRendererResize();
    }

    function saveGame(slot = currentSaveSlot) {
        const save = {
            gameState: { ...gameState },
            coreUpgrades: UpgradeSystem.coreUpgrades,
            proliferationUpgrades: UpgradeSystem.neuronProliferationUpgrades,
            purchasedProjects: gameState.purchasedProjects,
            version: SAVE_VERSION
        };
        localStorage.setItem(`up_save_${slot}`, JSON.stringify(save));
    }

    function applyLoadedUpgradeEffects() {
        QuestionSystem.setOverallUnlockState(gameState.questionsActuallyUnlocked);
        if(gameState.upgradesAreaUnlocked){
            if(contentWrapperDOM) contentWrapperDOM.style.display = 'flex';
            if(upgradesAreaDOM) upgradesAreaDOM.style.display = 'block';
        }
        UpgradeSystem.coreUpgrades.forEach(upg => {
            if(!upg.effectApplied) return;
            if(upg.id === 'biggerBrain1') {
                if(brainVisualAreaDOM) brainVisualAreaDOM.style.display = 'block';
                if(leftColumnDOM) leftColumnDOM.style.display = 'block';
                if(neurofuelAreaDOM) neurofuelAreaDOM.style.display = 'block';
                if(projectsAreaDOM) projectsAreaDOM.style.display = 'block';
                if(neuronProliferationAreaDOM) neuronProliferationAreaDOM.style.display = 'block';
                QuestionSystem.unlockDifficultyLevel(0);
            } else if(upg.id === 'biggerBrain2') {
                if(hypothalamusControlsAreaDOM) hypothalamusControlsAreaDOM.style.display = 'block';
                QuestionSystem.unlockDifficultyLevel(1);
            } else if(upg.id === 'biggerBrain3') {
                QuestionSystem.unlockDifficultyLevel(2);
                startIrregularSnacks();
            } else if(upg.id === 'amygdalaActivation') {
                if(!AnxietySystem.isAmygdalaFunctioning()) AnxietySystem.activateAmygdala();
            } else if(upg.id === 'nucleusAccumbens') {
                unlockRemainingMinigames();
            }
        });
        unlockMinigamesForBrainLevel(gameState.currentBrainLevel);
        UpgradeSystem.neuronProliferationUpgrades.forEach(upg => {
            if(!upg.effectApplied) return;
            if(upg.id === 'prolifFactory') {
                if(factoryAreaDOM) factoryAreaDOM.style.display = 'block';
            } else if(upg.id === 'intermittentFasting') {
                startIntermittentFasting();
            }
        });
        UIManager.updateQuestionAreaUIVisibility();
        if(gameState.upgradesAreaUnlocked) UpgradeSystem.renderCoreUpgrades();
        if(neuronProliferationAreaDOM && neuronProliferationAreaDOM.style.display !== 'none') UpgradeSystem.renderNeuronProliferationUpgrades();
        UIManager.updateFactoryDisplay();
        UIManager.updateMinigameButtons();
        UIManager.callUpdateBrainVisual();LanguageManager.apply(gameState.currentBrainLevel);
    }

    function loadGame(slot = currentSaveSlot) {
        stopIntermittentFasting();
        stopIrregularSnacks();
        const raw = localStorage.getItem(`up_save_${slot}`);
        if(!raw){ ProjectSystem.renderProjects(); return; }
        try {
            const data = JSON.parse(raw);
            const savedState = data.gameState || {};
            Object.assign(gameState, savedState);
            if (typeof savedState.neuroFuelCost !== 'number') {
                gameState.neuroFuelCost = calculateNextNeuroFuelCost();
            }
            if(Array.isArray(data.coreUpgrades)) {
                data.coreUpgrades.forEach(saved => {
                    const existing = UpgradeSystem.coreUpgrades.find(u => u.id === saved.id);
                    if(existing) Object.assign(existing, saved);
                });
            }
            if(Array.isArray(data.proliferationUpgrades)) {
                data.proliferationUpgrades.forEach(saved => {
                    const existing = UpgradeSystem.neuronProliferationUpgrades.find(u => u.id === saved.id);
                    if(existing) Object.assign(existing, saved);
                });
            }
            ProjectSystem.loadFromSave(data.purchasedProjects);
            applyLoadedUpgradeEffects();
            ProjectSystem.renderProjects();
            LanguageManager.apply(gameState.currentBrainLevel);
        } catch(e) { console.error('Load failed', e); }
    }

    function resetGame(slot = currentSaveSlot) {
        stopIntermittentFasting();
        stopIrregularSnacks();
        localStorage.removeItem(`up_save_${slot}`);
        location.reload();
    }

    // =======================================================================
    // 10. GAME LOOP
    // =======================================================================
    function gameLoop() {
        AnxietySystem.update(); // AnxietySystem now accesses gameState directly for dopamine, gaba, currentBrainLevel
        let calculatedPassiveRateThisTick = gameState.passiveNeuronsPerSecond;
        if (AnxietySystem.isAttackCurrentlyActive()) { calculatedPassiveRateThisTick = 0; }
        else if (gameState.currentBrainLevel >= 2) {
            let dMultiplier = 1 + (gameState.dopamineLevel / 100) * 0.20;
            let gMultiplier = 1 - (gameState.gabaLevel / 100) * 0.20;
            calculatedPassiveRateThisTick *= dMultiplier * gMultiplier;
            calculatedPassiveRateThisTick = Math.max(0, calculatedPassiveRateThisTick);
        }
        if(gameState.neuroFuel > 0){
            const maxPossible = gameState.neuroFuel / gameState.passiveNeuroFuelMultiplier;
            const possible = Math.min(calculatedPassiveRateThisTick, maxPossible);
            gameState.neurons += possible;
            gameState.totalNeuronsGenerated += possible;
            gameState.mindOps += possible * OPS_PER_NEURON;
            gameState.neuroFuel -= possible * gameState.passiveNeuroFuelMultiplier;
            gameState.neuroFuel = Math.max(0, gameState.neuroFuel);
        }
        UIManager.updateAllDisplays();
        brainStatsData.labels.push('');
        brainStatsData.neurons.push(gameState.neurons);
        brainStatsData.fuel.push(gameState.neuroFuel);
        if(brainStatsData.labels.length > 50){
            brainStatsData.labels.shift();
            brainStatsData.neurons.shift();
            brainStatsData.fuel.shift();
        }
        if(brainChart){
            const now = performance.now();
            if(now - lastChartUpdateMs >= 1000){
                brainChart.update();
                lastChartUpdateMs = now;
            }
        }
    }

    // =======================================================================
    // 11. EVENT LISTENERS ATTACHMENT
    // =======================================================================
    function attachEventListeners() {
        if (clickButtonDOM) { clickButtonDOM.addEventListener('click', handleManualGeneration); UIManager.logMessage("Click listener ready.", "log-info"); }
        else { console.error("clickButtonDOM is null."); UIManager.logMessage("ERR: Click button not found!", "log-warning"); }
        if (dopamineSliderDOM) dopamineSliderDOM.addEventListener('input', handleDopamineSlider); else console.warn("Dopamine slider not found.");
        if (gabaSliderDOM) gabaSliderDOM.addEventListener('input', handleGabaSlider); else console.warn("GABA slider not found.");
        if (buyFactoryBtnDOM) buyFactoryBtnDOM.addEventListener('click', handleBuyProliferationFactory);
        if (buyNeurofuelBtnDOM) buyNeurofuelBtnDOM.addEventListener('click', handleBuyNeurofuel);
        if (saveSlotSelectDOM) {
            currentSaveSlot = parseInt(saveSlotSelectDOM.value) || 1;
            saveSlotSelectDOM.addEventListener('change', () => {
                currentSaveSlot = parseInt(saveSlotSelectDOM.value) || 1;
            });
        }
        if (manualSaveBtnDOM) manualSaveBtnDOM.addEventListener('click', () => saveGame(currentSaveSlot));
        if (manualLoadBtnDOM) manualLoadBtnDOM.addEventListener('click', () => {
            loadGame(currentSaveSlot);
            UIManager.updateAllDisplays();
        });
        if (newGameBtnDOM) newGameBtnDOM.addEventListener('click', () => resetGame(currentSaveSlot));
        if (threeContainerDOM) threeContainerDOM.addEventListener('click', openBrainPopup);
        if (closeBrainPopupBtnDOM) closeBrainPopupBtnDOM.addEventListener('click', closeBrainPopup);
        if (infoButtonDOM) infoButtonDOM.addEventListener('click', () => {
            if (instructionsOverlayDOM) instructionsOverlayDOM.style.display = 'flex';
        });
        if (closeInstructionsBtnDOM) closeInstructionsBtnDOM.addEventListener('click', () => {
            if (instructionsOverlayDOM) instructionsOverlayDOM.style.display = 'none';
        });
    }

    // =======================================================================
    // 12. INIT GAME FUNCTION
    // =======================================================================
    async function initGame() {
        UIManager.logMessage("Initializing Game...", "log-info");
        try {
            UIManager.logMessage("Fetching questions...", "log-info");
            const response = await fetch('questions.json');
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status} fetching questions.json`); }
            const fetchedQuestions = await response.json();
            QuestionSystem.init(fetchedQuestions);
            UIManager.logMessage(`Fetched ${fetchedQuestions.length} questions.`, "log-info");
        } catch (error) {
            console.error("Failed to load questions.json:", error);
            UIManager.logMessage("CRITICAL ERROR: Failed to load questions. Questions will not work.", "log-warning");
            QuestionSystem.init([]);
        }
        UpgradeSystem.init(coreUpgrades_raw_data, neuronProliferationUpgrades_raw_data);
        ProjectSystem.init(projectData);
        AnxietySystem.init();
        loadGame(currentSaveSlot);
        attachEventListeners();
        UIManager.updateFactoryDisplay();
        UIManager.updateNeuroFuelDisplay();
        UIManager.updateAllDisplays();
        if (instructionsOverlayDOM) instructionsOverlayDOM.style.display = 'flex';
        UIManager.logMessage("Welcome to Universal Psychology!", "log-info");
        startGameTimers();
    }

    function startGameTimers(){
        if(gameLoopId === null){
            gameLoopId = setInterval(gameLoop, 1000);
        }
        if(autoSaveId === null){
            autoSaveId = setInterval(() => saveGame(currentSaveSlot), AUTO_SAVE_INTERVAL);
        }
    }

    function stopGameTimers(){
        if(gameLoopId !== null){
            clearInterval(gameLoopId);
            gameLoopId = null;
        }
        if(autoSaveId !== null){
            clearInterval(autoSaveId);
            autoSaveId = null;
        }
    }

    document.addEventListener('visibilitychange', () => {
        if(document.hidden){
            stopGameTimers();
        } else {
            startGameTimers();
        }
    });

    // Expose limited API for external modules like minigames
    window.GameAPI = {
        getGameState: () => gameState,
        updateDisplays: () => UIManager.updateAllDisplays(),
        logMessage: (...args) => UIManager.logMessage(...args)
    };

    // =======================================================================
    // 13. START THE GAME
    // =======================================================================
    initGame();
});
