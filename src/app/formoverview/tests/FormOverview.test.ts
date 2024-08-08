import * as fs from 'fs';
import path from 'path';
import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
// eslint-disable-next-line import/no-extraneous-dependencies
import { mockClient } from 'aws-sdk-client-mock';
import { FormOverviewApiClient } from '../FormOverviewApiClient';
import { FormOverviewRequestHandler } from '../formoverviewRequestHandler';

let sessionIsLoggedInMock = jest.fn().mockReturnValue(true);
let sessiongetValueMock = jest.fn().mockReturnValueOnce('fakemail@example.com').mockReturnValueOnce(['ADMIN']);

jest.mock('@gemeentenijmegen/session', () => {
  return {
    // Constructor mock
    Session: jest.fn( () => {
      return {
        init: jest.fn().mockResolvedValue({}),
        isLoggedIn: sessionIsLoggedInMock,
        getValue: sessiongetValueMock,
        getCookie: jest.fn().mockReturnValue('cookie'),
      };
    }),
  };
});
beforeAll(() => {
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
});

const mockApiClient = {
  setTimeout: jest.fn(),
  postData: jest.fn(),
  getData: jest.fn().mockResolvedValue([
    {
      fileName: 'FormOverview-1717061499591-aanmeldenSportactiviteit.csv',
      createdDate: '2024-05-30T09:31:39.743Z',
      createdBy: 'default_change_to_api_queryparam',
      formName: 'aanmeldenSportactiviteit',
      formTitle: 'Aanmelden sportactiviteit',
      queryStartDate: '2024-05-24',
      queryEndDate: '2024-05-10',
    },
    {
      fileName: 'FormOverview-1717408626681-aanmeldenSportactiviteit.csv',
      createdDate: '2024-06-03T09:57:06.849Z',
      createdBy: 'default_change_to_api_queryparam',
      formName: 'aanmeldenSportactiviteit',
      formTitle: 'Aanmelden sportactiviteit',
      queryStartDate: '2024-05-31',
      queryEndDate: '2024-05-10',
    },
    {
      fileName: 'FormOverview-1717410959841-aanmeldenSportactiviteit.csv',
      createdDate: '2024-06-03T10:36:00.032Z',
      createdBy: 'default_change_to_api_queryparam',
      formName: 'aanmeldenSportactiviteit',
      formTitle: 'Aanmelden sportactiviteit',
      queryStartDate: '2024-05-31',
      queryEndDate: '2024-05-10',
    },
  ],
  ),
} as any as FormOverviewApiClient;

const ddbMock = mockClient(DynamoDBClient);

beforeEach(() => {
  ddbMock.reset();
  const getItemOutput: Partial<GetItemCommandOutput> = {
    Item: {
      data: {
        M: {
          loggedin: { BOOL: true },
          identifier: { S: '12345678' },
          bsn: { S: '12345678' },
          user_type: { S: 'person' },
          state: { S: '12345' },
          username: { S: 'Jan de Tester' },
        },
      },
    },
  };
  ddbMock.on(GetItemCommand).resolves(getItemOutput);
});

describe('FormOverviewTests', () => {
  test('should render the page for local development', async () => {
    const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
    const handler = new FormOverviewRequestHandler(dynamoDBClient, mockApiClient );
    const result = await handler.handleRequest({ cookies: 'session=12345' });
    fs.writeFile(path.join(__dirname, 'output', 'test.html'), result.body ? result.body.replace( new RegExp('href="/static', 'g'), 'href="../../../static-resources/static') : '', () => { });
  });
});
