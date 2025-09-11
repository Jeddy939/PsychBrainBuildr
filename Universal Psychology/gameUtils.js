function calculateNextNeuroFuelCost(level, rng = Math.random) {
  const lvl = Math.max(level, 1);
  let max = 4;
  if (lvl >= 3) max = 16;
  else if (lvl >= 2) max = 8;
  return Math.floor(rng() * max) + 1;
}

module.exports = { calculateNextNeuroFuelCost };
