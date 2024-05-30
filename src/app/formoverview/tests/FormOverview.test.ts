import * as fs from 'fs';
import path from 'path';
import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
// eslint-disable-next-line import/no-extraneous-dependencies
import { mockClient } from 'aws-sdk-client-mock';
import { FormOverviewApiClient } from '../FormOverviewApiClient';
import { FormOverviewRequestHandler } from '../formoverviewRequestHandler';

beforeAll(() => {
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
});

const mockApiClient = {
  setTimeout: jest.fn(),
  postData: jest.fn(),
  getData: jest.fn(),
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