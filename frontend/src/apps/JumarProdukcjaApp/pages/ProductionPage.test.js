import {
  getPriorityClassName,
  sortProductionOrders,
  sortProductionRolls,
} from './productionPageUtils';

describe('ProductionPage helpers', () => {
  test('sortProductionOrders sorts by priority and then by order number', () => {
    const orders = [
      { NrZp: '2026/003', Priorytet: 1 },
      { NrZp: '2026/002', Priorytet: 0 },
      { NrZp: '2026/004', Priorytet: 2 },
      { NrZp: '2026/001', Priorytet: 0 },
    ];

    expect(sortProductionOrders(orders).map((order) => order.NrZp)).toEqual([
      '2026/001',
      '2026/002',
      '2026/003',
      '2026/004',
    ]);
  });

  test('sortProductionRolls sorts numerically by roll number', () => {
    const rolls = [
      { Rolka: '10' },
      { Rolka: '2' },
      { Rolka: '1' },
    ];

    expect(sortProductionRolls(rolls).map((roll) => roll.Rolka)).toEqual(['1', '2', '10']);
  });

  test('getPriorityClassName maps known priority values to UI classes', () => {
    expect(getPriorityClassName({ Priorytet: 0 })).toBe('is-high-priority');
    expect(getPriorityClassName({ Priorytet: 1 })).toBe('is-medium-priority');
    expect(getPriorityClassName({ Priorytet: 2 })).toBe('is-low-priority');
    expect(getPriorityClassName({ Priorytet: null })).toBe('is-low-priority');
  });
});
