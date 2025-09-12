const LanguageManager = (() => {
  let level = 2; // default normal tone
  const templates = {
    projectCompleted: [
      'Rock done! {title}',
      'We finished the thing! {title}',
      'Project completed: {title}',
      'Our endeavor has reached fruition: {title}'
    ],
    notEnoughPsychbucks: [
      "Broke: can't pay for {item}.",
      "We can't afford {item}.",
      "Not enough Psychbucks for {item}.",
      "Our coffers are insufficient for {item}."
    ],
    outOfNeuroFuel: [
      'Bone dry on NeuroFuel!',
      'Fuel tanks empty!',
      'Out of NeuroFuel!',
      'Our reserves of NeuroFuel have been depleted.'
    ],
    neuroSnakeFinished: [
      'Snake score! +{score} PB!',
      'Serpent success nets {score} bucks!',
      'NeuroSnake finished: +{score} Psychbucks!',
      'Our serpent crusade yields {score} Psychbucks.'
    ]
  };
  const replaceParams = (str, params = {}) => str.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
  return {
    setLevel: l => { level = Math.max(0, Math.min(3, l)); },
    log: (key, params = {}, fallback = '') => {
      const entry = templates[key];
      if (entry) return replaceParams(entry[Math.min(level, entry.length - 1)], params);
      return replaceParams(fallback || key, params);
    }
  };
})();
export default LanguageManager;
