export const LanguageManager = {
  phrases: {
    addNeurons: ["Add Neurons", "Grow Neurons", "Engineer Neurons", "Forge Neurons"],
    testYourKnowledge: ["Test Your Knowledge", "Challenge Your Mind", "Probe Your Psyche", "Master The Mind"],
    neuroGames: ["NeuroGames", "Mind Games", "Cognitive Games", "Psyche Arcade"],
    yourBrain: ["Your Brain", "Your Mind", "Your Cortex", "Your Consciousness"],
    coreUpgrades: ["Core Upgrades", "Brain Upgrades", "Neural Enhancements", "Cognitive Enhancements"],
    proliferationFactories: ["Proliferation Factories", "Neuron Forges", "Synapse Labs", "Cerebral Foundries"],
    buyFactory: ["Buy Proliferation Factory", "Buy Neuron Forge", "Buy Synapse Lab", "Buy Cerebral Foundry"],
    neuronProliferation: ["Neuron Proliferation", "Neuron Expansion", "Synapse Expansion", "Cerebral Multiplication"],
    neurofuel: ["NeuroFuel", "NeuroFuel", "Cognitive Fuel", "Psyche Fuel"],
    buyFood: ["Buy Food", "Purchase Fuel", "Acquire Nourishment", "Procure Sustenance"],
    projects: ["Projects", "Initiatives", "Research Projects", "Grand Experiments"],
    hypothalamusControls: ["Hypothalamus Controls", "Hypothalamus Interface", "Limbic Controls", "Autonomic Interface"],
    dopamine: ["Dopamine:", "Dopamine:", "Dopamine:", "Dopamine:"],
    gaba: ["GABA:", "GABA:", "GABA:", "GABA:"]
  },
  apply(level = 0) {
    document.querySelectorAll('[data-lang-key]').forEach(el => {
      const key = el.getAttribute('data-lang-key');
      const variants = this.phrases[key];
      if (variants) {
        el.textContent = variants[level] || variants[0];
      }
    });
  }
};
