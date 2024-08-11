import { getDateBasedOnScope } from '../getDateBasedOnScope';

describe('getDateBasedOnScope', () => {
  const originalDate = global.Date;

  beforeEach(() => {
    const mockDate = new Date('2023-08-11T00:00:00Z');
    global.Date = class extends originalDate {
      constructor() {
        super();
        return mockDate;
      }
    } as DateConstructor;
  });

  afterEach(() => {
    // Restore the original Date after each test
    global.Date = originalDate;
  });

  const testCases = [
    { scope: 'week', quantity: undefined, expected: '2023-08-04' }, // 7 days back from 2023-08-11
    { scope: 'month', quantity: undefined, expected: '2023-07-11' }, // 1 month back from 2023-08-11
    { scope: 'week', quantity: 3, expected: '2023-07-21' }, // 21 days (3 weeks) back from 2023-08-11
    { scope: 'month', quantity: 2, expected: '2023-06-11' }, // 2 months back from 2023-08-11
  ];

  test.each(testCases)(
    'should return the correct date for $scope scope with quantity $quantity',
    ({ scope, quantity, expected }) => {
      let result;
      if (quantity) {
        result = getDateBasedOnScope(scope as 'week' | 'month', quantity);
      } else {
        result = getDateBasedOnScope(scope as 'week' | 'month');
      }

      expect(result).toBe(expected);
    },
  );

  it('should throw an error for invalid scope', () => {
    expect(() => {
      getDateBasedOnScope('invalid_scope' as any, 1);
    }).toThrow("Invalid scope. Use 'week' or 'month'.");
  });
});