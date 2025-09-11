const { calculateNextNeuroFuelCost } = require('../gameUtils');

describe('calculateNextNeuroFuelCost', () => {
  test('uses higher max value for higher levels', () => {
    const fixed = () => 0.5;
    expect(calculateNextNeuroFuelCost(1, fixed)).toBe(3);
    expect(calculateNextNeuroFuelCost(2, fixed)).toBe(5);
    expect(calculateNextNeuroFuelCost(3, fixed)).toBe(9);
  });
});
