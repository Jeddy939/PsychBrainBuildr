export const LanguageManager = {
  phrases: {
    addNeurons: [
      "Make Brain Bits",
      "Grow Neuron Buds",
      "Add Neurons",
      "Initiate Neuronal Augmentation"
    ],
    testYourKnowledge: [
      "Brain Test",
      "Quiz Time",
      "Test Your Knowledge",
      "Assess Cognitive Aptitude"
    ],
    neuroGames: [
      "Brain Fun",
      "Mind Games",
      "NeuroGames",
      "Cerebral Recreations"
    ],
    yourBrain: [
      "Your Brain",
      "Your Mind",
      "Your Cortex",
      "Your Consciousness"
    ],
    coreUpgrades: [
      "Brain Boosts",
      "Mind Upgrades",
      "Core Upgrades",
      "Cognitive Enhancements"
    ],
    proliferationFactories: [
      "Brain Makers",
      "Neuron Forges",
      "Proliferation Factories",
      "Cerebral Foundries"
    ],
    buyFactory: [
      "Get Brain Maker",
      "Buy Neuron Forge",
      "Buy Proliferation Factory",
      "Procure Cerebral Foundry"
    ],
    neuronProliferation: [
      "More Brain Bits",
      "Neuron Growth",
      "Neuron Proliferation",
      "Cerebral Multiplication"
    ],
    neurofuel: [
      "Brain Fuel",
      "Neuron Juice",
      "NeuroFuel",
      "Cognitive Fuel"
    ],
    buyFood: [
      "Get Food",
      "Buy Snacks",
      "Buy Food",
      "Procure Sustenance"
    ],
    projects: [
      "Brain Plans",
      "Big Projects",
      "Projects",
      "Grand Experiments"
    ],
    hypothalamusControls: [
      "Brain Buttons",
      "Hypothalamus Buttons",
      "Hypothalamus Controls",
      "Autonomic Interface"
    ],
    dopamine: [
      "Happy Juice:",
      "Feel-Good Chemical:",
      "Dopamine:",
      "Dopaminergic Concentration:"
    ],
    gaba: [
      "Calm Juice:",
      "Chill Chemical:",
      "GABA:",
      "Gamma-Aminobutyric Acid:"
    ],
    stats: {
      neurons: [
        "Neurons: {value}",
        "Brain Bits: {value}",
        "Neurons: {value}",
        "Cortical Units: {value}"
      ],
      psychbucks: [
        "Psychbucks: {value} | Passive: {rate}/s",
        "Mind Money: {value} | Passive: {rate}/s",
        "Psychbucks: {value} | Passive: {rate}/s",
        "Cerebral Cash: {value} | Passive: {rate}/s"
      ],
      ops: [
        "Ops: {value}",
        "Mind Ops: {value}",
        "Ops: {value}",
        "Cognitive Ops: {value}"
      ],
      iq: [
        "IQ: {value}",
        "Brain Power: {value}",
        "IQ: {value}",
        "Intellect: {value}"
      ],
      fuel: [
        "Fuel: {value}",
        "Brain Fuel: {value}",
        "Fuel: {value}",
        "Cognitive Fuel: {value}"
      ]
    },
    logs: {
      projectCompleted: "Project completed: {title}",
      biggerBrain1Action: "biggerBrain1 ACTION TRIGGERED!",
      brainGrowth1Unlocked: "Brain Growth I: Easy Qs & Proliferation unlocked.",
      brainGrowth2Unlocked: "Brain Growth II: Medium Qs & Hypothalamus unlocked.",
      brainGrowth3Unlocked: "Brain Growth III: Hard Qs & Amygdala research.",
      amygdalaActivated: "Amygdala activated! Production boosted.",
      pleasureCenterUnlocked: "Pleasure center engaged! Minigames available.",
      questionAreaMissing: "Q Area DOM missing!",
      questionAreaVisible: "Q area VISIBLE.",
      triggeringQuestionLoad: "UIManager: Triggering QS loadNextQ.",
      questionAreaHidden: "Q area HIDDEN.",
      questionSystemInitialized: "QuestionSystem Initialized ({count} Qs).",
      questionsSourceMismatch: "QS WARNING: questionsSourceArray had items, but allQuestionsData is empty post-assignment!",
      questionsEmpty: "QS WARNING: Initialized with an empty questions array!",
      questionsAvailable: "{difficulty} questions available.",
      noSuitableQuestions: "QS: No suitable questions found.",
      questionIdError: "CRIT QS: Error find Q by ID.",
      questionLoaded: "QS Loaded Q ID {id}",
      questionCorrect: "Correct: +{reward} PB (Streak: {streak})",
      questionIncorrectBreak: "Incorrect. Streak of {streak} broken.",
      questionIncorrect: "Incorrect.",
      upgradeSystemInit: "UpgradeSystem Initialized. Core: {coreCount}, Prolif: {prolifCount}",
      renderCoreUpgrades: "[UpgradeSystem] renderCoreUpgrades called.",
      upgradesListMissing: "[UpgradeSystem] ERROR: upgradesListElementDOM is null!",
      renderProliferationUpgrades: "[UpgradeSystem] renderNeuronProliferationUpgrades called.",
      proliferationListMissing: "[UpgradeSystem] ERROR: neuronProliferationUpgradesListDOM is null!",
      proliferationAreaHidden: "[UpgradeSystem] Neuron prolif area hidden, not rendering.",
      upgradeNotFound: "Upg Err: \"{id}\" not found.",
      upgradeAlreadyPurchased: "{name} already purchased.",
      upgradeAcquired: "Upgrade: {name} acquired.",
      upgradeInsufficient: "Not enough for {name}.",
      upgradeReverted: "Reverted purchase status for {name}.",
      anxietyInit: "AnxietySystem Initialized.",
      anxietyAmygdalaOnline: "AnxietySystem: Amygdala online.",
      anxietyStress: "Anxiety meter stress: +{amount}.",
      anxietySubsided: "Anxiety subsided.",
      anxietyAttack: "ANXIETY ATTACK! Production halted. Stability compromised!",
      anxietyStabilityLost: "Stability lost. {name} requires reinforcement.",
      anxietyAwarenessProtocol: "Amygdala awareness protocol initiated.",
      anxietyStimuliBatch: "Awareness: {count} abrupt stimuli!",
      anxietyStimuliCleared: "Stimuli cleared. Focus returning.",
      anxietyClickDisabled: "Brain recovering... clicking disabled (Anxiety Active).",
      outOfFuel: "Out of NeuroFuel!",
      neuronClick: "Neuron click: {before} -> {after}",
      factoryPurchased: "Proliferation Factory purchased! Total: {count}",
      factoryInsufficient: "Not enough Psychbucks for factory.",
      foodPurchased: "Purchased {emoji} {name}! (+{fuel} Fuel)",
      foodInsufficient: "Not enough Psychbucks for food.",
      fastingActivated: "Intermittent Fasting activated: auto-buy every 10s.",
      fastingStopped: "Intermittent Fasting stopped.",
      snacksActivated: "Irregular Snacks activated.",
      snacksStopped: "Irregular Snacks stopped.",
      clickListenerReady: "Click listener ready.",
      clickButtonMissing: "ERR: Click button not found!",
      initializingGame: "Initializing Game...",
      fetchingQuestions: "Fetching questions...",
      questionsFetched: "Fetched {count} questions.",
      questionsFetchFailed: "CRITICAL ERROR: Failed to load questions. Questions will not work.",
      welcome: "Welcome to Universal Psychology!"
    },
    upgrades: {
      brainGrowth1: {
        name: "Brain Growth: Stage 1",
        desc: "Unlocks EASY Qs & Neuron Proliferation."
      },
      brainGrowth2: {
        name: "Brain Growth: Stage 2",
        desc: "Unlocks MEDIUM Qs & Hypothalamus."
      },
      brainGrowth3: {
        name: "Brain Growth: Stage 3",
        desc: "Unlocks HARD Qs & Amygdala research."
      },
      amygdalaActivation: {
        name: [
          "Activate Amygdala",
          "Amygdala Surge",
          "Activate Amygdala",
          "Amygdala Override"
        ],
        desc: [
          "Doubles passive neuron production. WARNING: Random stimuli.",
          "Hypercharges neuron flow; expect heightened emotional stimuli.",
          "Doubles passive neuron production. Brace for unpredictable triggers.",
          "Reroutes limbic output for massive gains with severe volatility."
        ]
      },
      nucleusAccumbens: {
        name: [
          "Nucleus Accumbens",
          "Reward Center Expansion",
          "Nucleus Accumbens",
          "Pleasure Circuit Dominion"
        ],
        desc: [
          "Unlocks access to NeuroGames.",
          "Opens the pleasure hub—NeuroGames now available.",
          "Unlocks access to NeuroGames and new dopamine pathways.",
          "Throws open the reward nexus for advanced NeuroGames."
        ]
      },
      biggerBrain1: {
        name: "Brain Growth: Stage 1",
        desc: "Unlocks EASY Qs & Neuron Proliferation."
      },
      biggerBrain2: {
        name: "Brain Growth: Stage 2",
        desc: "Unlocks MEDIUM Qs & Hypothalamus."
      },
      biggerBrain3: {
        name: "Brain Growth: Stage 3",
        desc: "Unlocks HARD Qs & Amygdala research."
      },
      prolifFactory: {
        name: "Neuron Proliferation Factory",
        desc: "Builds a facility for passive neuron growth (+0.5/sec)."
      },
      dendriticSprouting: {
        name: "Dendritic Sprouting",
        desc: "Increase passive neuron production by 0.1%."
      },
      myelination: {
        name: "Myelination",
        desc: "Boost production but consumes more fuel and raises anxiety."
      },
      metabolicEfficiency: {
        name: "Metabolic Efficiency",
        desc: "Cuts Neurofuel consumption by 50%."
      },
      intermittentFasting: {
        name: "Intermittent Fasting",
        desc: "Automatically purchase fuel every 10 seconds."
      },
      metabolicEfficiency2: {
        name: "Metabolic Efficiency II",
        desc: "Further cuts fuel use by 50%."
      }
    }
  },
  getPhrase(key, level = 2, params = {}) {
    const path = key.split('.');
    let value = this.phrases;

    for (const segment of path) {
      if (value == null || (typeof value !== 'object' && !Array.isArray(value))) {
        value = undefined;
        break;
      }
      value = value[segment];
    }

    if (Array.isArray(value)) {
      const fallbackIndex = Math.min(2, Math.max(0, value.length - 1));
      const phraseCandidate = value[level] ?? value[fallbackIndex] ?? value[value.length - 1] ?? '';
      return typeof phraseCandidate === 'string'
        ? phraseCandidate.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`)
        : '';
    }

    if (typeof value === 'string') {
      return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
    }

    return '';
  },
  apply(level = 2) {
    document.querySelectorAll('[data-lang-key]').forEach(el => {
      const key = el.getAttribute('data-lang-key');
      el.textContent = this.getPhrase(key, level);
    });
    if (window.GameAPI && typeof window.GameAPI.updateDisplays === 'function') {
      window.GameAPI.updateDisplays();
    }
  }
};
