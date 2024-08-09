import * as fs from 'fs';
import path from 'path';
import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
// eslint-disable-next-line import/no-extraneous-dependencies
import { mockClient } from 'aws-sdk-client-mock';
import { FormOverviewApiClient } from '../FormOverviewApiClient';
import { FormOverviewRequestHandler } from '../formoverviewRequestHandler';

let sessionIsLoggedInMock = jest.fn().mockReturnValue(true);
let errorMessageForMock = `Er is een timeout opgetreden. Dit kan gebeuren wanneer een csv-bestand van grote omvang gemaakt wordt. 
Het bestand wordt op de achtergrond nog steeds aangemaakt. 
Vernieuw de pagina om de nieuwe csv-overzichten te zien. Dit is lange testerror.`;
let sessionGetValueMock = jest.fn((key: string, type: string) => {
  if (key === 'permissions' && type === 'SS') {
    return ['ADMIN'];
  } else if (key === 'email' && type === 'S') {
    return 'fakemail@example.com';
  } else if (key === 'errorMessageFormOverview' && type === 'S') {
    return errorMessageForMock;
  }
  return null;
});
jest.mock('@gemeentenijmegen/session', () => {
  return {
    // Constructor mock
    Session: jest.fn( () => {
      return {
        init: jest.fn().mockResolvedValue({}),
        isLoggedIn: sessionIsLoggedInMock,
        getValue: sessionGetValueMock,
        setValue: jest.fn().mockResolvedValue({}),
        getCookie: jest.fn().mockReturnValue('cookie'),
      };
    }),
  };
});

beforeAll(() => {
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
});


const ddbMock = mockClient(DynamoDBClient);

beforeEach(() => {
  jest.resetModules();
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
  test('should render the page for local development with an error', async () => {
    const dynamoDBClient = new DynamoDBClient();
    const mockApiClient = { getData: jest.fn().mockResolvedValue(mockSuccesApiGetData) } as any as FormOverviewApiClient;
    const handler = new FormOverviewRequestHandler(dynamoDBClient, mockApiClient );
    const result: any = await handler.handleRequest({ cookies: 'session=12345' });
    fs.writeFile(path.join(__dirname, 'output', 'test_error.html'), result.body ? result.body.replace( new RegExp('href="/static', 'g'), 'href="../../../static-resources/static') : '', () => { });
  });

  test('should render the page for local development', async () => {
    const dynamoDBClient = new DynamoDBClient();
    errorMessageForMock = '';
    const mockApiClient = { getData: jest.fn().mockResolvedValue(mockSuccesApiGetData) } as any as FormOverviewApiClient;
    const handler = new FormOverviewRequestHandler(dynamoDBClient, mockApiClient );
    const result: any = await handler.handleRequest({ cookies: 'session=12345' });
    fs.writeFile(path.join(__dirname, 'output', 'test.html'), result.body ? result.body.replace( new RegExp('href="/static', 'g'), 'href="../../../static-resources/static') : '', () => { });
  });
});

export const mockSuccesApiGetData = [
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
];