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
    }
  },
  getPhrase(key, level = 2, params = {}) {
    const variants = key.split('.').reduce((obj, k) => (obj && obj[k]) ? obj[k] : undefined, this.phrases);
    let phrase = variants ? (variants[level] ?? variants[2]) : "";
    return phrase.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
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
