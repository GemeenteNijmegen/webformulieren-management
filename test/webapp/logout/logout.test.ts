import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { handleLogoutRequest } from '../../../src/webapp/logout/handleLogoutRequest';

const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });

beforeAll(() => {
  if (process.env.VERBOSETESTS!='True') {
    global.console.error = jest.fn();
    global.console.time = jest.fn();
    global.console.log = jest.fn();
  }
  process.env.SESSION_TABLE = 'sessions-table';
});


test('Return logout page', async () => {
  const result = await handleLogoutRequest('', dynamoDBClient);
  expect(result.body).toMatch('Uitgelogd');
  expect(result.statusCode).toBe(200);
});

test('Return empty session cookie', async () => {
  const result = await handleLogoutRequest('', dynamoDBClient);
  let cookies = result?.cookies?.filter((cookie: string) => cookie.indexOf('sessionid=;'));
  expect(cookies?.length).toBe(1);
  expect(result.statusCode).toBe(200);
});