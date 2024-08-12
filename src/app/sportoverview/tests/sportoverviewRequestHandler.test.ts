import * as fs from 'fs';
import path from 'path';
import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
// eslint-disable-next-line import/no-extraneous-dependencies
import { mockClient } from 'aws-sdk-client-mock';
import { SubmissionsSchemaType } from '../../shared/SubmissionsSchema';
import { SportOverviewApiClient } from '../sportoverviewApiClient';
import { SportOverviewRequestHandler } from '../sportoverviewRequestHandler';
let sessionIsLoggedInMock = jest.fn().mockReturnValue(true);
let errorMessageForMock = `Er is een timeout opgetreden. Dit kan gebeuren wanneer een csv-bestand van grote omvang gemaakt wordt. 
Het bestand wordt op de achtergrond nog steeds aangemaakt. 
Vernieuw de pagina om de nieuwe csv-overzichten te zien. Dit is lange testerror.`;
let sessionGetValueMock = jest.fn((key: string, type: string) => {
  if (key === 'permissions' && type === 'SS') {
    return ['ADMIN'];
  } else if (key === 'email' && type === 'S') {
    return 'fakemail@example.com';
  } else if (key === 'sportkey') {
    return 'ab3a40df52563b7a25b03fbbe6b7764c';
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
describe('Sportoverview Request Handler', () => {


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
            permissions: { SS: ['ADMIN'] },
          },
        },
      },
    };
    ddbMock.on(GetItemCommand).resolves(getItemOutput);
  });

  test('should render the page for local development with an error', async () => {
    const dynamoDBClient = new DynamoDBClient();
    const mockApiClient = {
      get: jest.fn((endpoint: string) => {
        if (endpoint.includes('/listformoverviews')) {
          return Promise.resolve(mockSuccesApiGetData);
        } else if (endpoint.includes('/formoverview')) {
          return Promise.resolve(mockSubmissionsData);
        }
        return Promise.reject(new Error('Unknown endpoint'));
      }),
    } as any as SportOverviewApiClient;
    const handler = new SportOverviewRequestHandler(dynamoDBClient, mockApiClient );
    const result: any = await handler.handleRequest({ cookies: 'session=12345' });
    fs.writeFile(path.join(__dirname, 'output', 'test.html'), result.body ? result.body.replace( new RegExp('(href|src)="/static', 'g'), '$1="../../../static-resources/static') : '', () => { });

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
export const mockSubmissionsData: SubmissionsSchemaType = [
  {
    'DatumTijdOntvangen': '2024-06-01T10:00:00.000Z',
    'Telefoonnummer telefoonnummer': '123-456-7890',
    'E-mailadres eMailadres': 'test1@example.com',
    'Voornaam voornaam': 'JanPieter',
    'Achternaam achternaam': 'JansenLangereNaam',
    'Voornaam kind': 'kind',
    'Achternaam kind': 'twee',
    'Leeftijd kind': '12',
    'School basisonderwijs': 'De school',
    'Groep': '8',
    'Opmerkingen': 'Some comments here',
    'FormulierKenmerk': 'SP228.713',
    'Formuliernaam': 'aanmeldensportactiviteit',
    'Aanmelden voor sportactiviteit A': '',
    'Aanmelden voor sportactiviteit B': 'Checkbox ActivityB is true. Checkbox ActivityT is true',
    'Aanmelden voor sportactiviteit C': 'Checkbox ActivityC is true.',
    'Om welke sportactiviteit gaat het dan? omWelkeSportactiviteitGaatHetDanC': 'weqwewe',
  },
];