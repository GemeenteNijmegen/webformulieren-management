import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SportOverviewApiClient } from '../sportoverviewApiClient';
import { SportOverviewRequestHandler } from '../sportoverviewRequestHandler';

describe('Season sports date', () => {
  const sportOverviewRequestHandler = new SportOverviewRequestHandler({} as any as DynamoDBClient, {} as any as SportOverviewApiClient);

  test.each([
    ['2024-05-10', '2023-08-01'], // before Augus-->Last year's August 1st
    ['2024-08-01', '2024-08-01'], // On August first --> This year's August 1st
    ['2024-10-15', '2024-08-01'], // After August-->This year's August 1st
    ['2025-07-31', '2024-08-01'], // before August of next year--> Last year's August 1st
    ['2025-08-02', '2025-08-01'], // After August first --> Htis year's August 1st
  ])('should return %s when today is %s', (currentDate, expectedSeasonStartDate) => {
    jest.useFakeTimers().setSystemTime(new Date(currentDate)); // Mock systemtime

    const result = sportOverviewRequestHandler.getSeasonStartDate();
    expect(result).toBe(expectedSeasonStartDate);
  });

  afterEach(() => {
    jest.useRealTimers(); //reset timers after tests
  });

});