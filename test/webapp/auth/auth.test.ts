import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { OpenIDConnect } from '../../../src/webapp/util/OpenIDConnect';
import { AuthRequestHandler } from '../../../src/webapp/auth/AuthRequestHandler';
import {
  oidcProfiles
} from '../OIDCProfiles';
import { IdTokenClaims } from 'openid-client';


jest.spyOn(OpenIDConnect.prototype, 'authorize').mockImplementation(
  async (_code: string, _states: string[], _returnedState: string) => {
    const claims: IdTokenClaims = {
      aud: 'app',
      exp: 0,
      iat: 0,
      iss: 'auth',
      sub: 'app',
      email: 'test@example.com',
    };
    return claims;
  }
);

beforeAll(() => {

  if (process.env.VERBOSETESTS != 'True') {
    // global.console.error = jest.fn();
    // global.console.time = jest.fn();
    // global.console.log = jest.fn();
  }

  // Set env variables
  process.env.SESSION_TABLE = 'sessions-table';

});

const ddbMock = mockClient(DynamoDBClient);
const sessionId = '12345';

beforeEach(() => {
  ddbMock.reset();
});

function setupSessionResponse(loggedin: boolean) {
  const getItemOutput: Partial<GetItemCommandOutput> = {
    Item: {
      data: {
        M: {
          loggedin: { BOOL: loggedin },
          states: {
            S: JSON.stringify({
              'state-yivi': 'yivi',
              'state-digid': 'digid',
            })
          },
        },
      },
    },
  };
  ddbMock.on(GetItemCommand).resolves(getItemOutput);
}

test('Already authenticated redirects to /', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  setupSessionResponse(true);
  const handler = new AuthRequestHandler({
    oidcProfiles: oidcProfiles,
    redirectToPostLoginHook: true,
    cookies: `session=${sessionId}`,
    queryStringParamState: 'state',
    queryStringParamCode: '12345',
    dynamoDBClient,
  });
  const result = await handler.handleRequest();
  expect(result.statusCode).toBe(302);
  expect(result?.headers?.Location).toBe('/');
});

test('No session redirects to /login', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  setupSessionResponse(false);
  const handler = new AuthRequestHandler({
    oidcProfiles: oidcProfiles,
    redirectToPostLoginHook: true,
    cookies: `randomcookie=${sessionId}`,
    queryStringParamState: 'state',
    queryStringParamCode: '12345',
    dynamoDBClient,
  });
  const result = await handler.handleRequest();
  expect(result.statusCode).toBe(302);
  expect(result?.headers?.Location).toBe('/login');
});

test('Successful auth using yivi profile', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  setupSessionResponse(false);
  const handler = new AuthRequestHandler({
    oidcProfiles: oidcProfiles,
    redirectToPostLoginHook: true,
    cookies: `session=${sessionId}`,
    queryStringParamState: 'state-yivi',
    queryStringParamCode: '12345',
    dynamoDBClient,
  });
  const result = await handler.handleRequest();
  expect(result.statusCode).toBe(302);
  expect(result?.headers?.Location).toBe('/post-login');
});

test('Successful auth using digid profile', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  setupSessionResponse(false);
  const handler = new AuthRequestHandler({
    oidcProfiles: oidcProfiles,
    redirectToPostLoginHook: true,
    cookies: `session=${sessionId}`,
    queryStringParamState: 'state-digid',
    queryStringParamCode: '12345',
    dynamoDBClient,
  });
  const result = await handler.handleRequest();
  expect(result.statusCode).toBe(302);
  expect(result?.headers?.Location).toBe('/post-login');
});

test('Successful auth without post login hook', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  setupSessionResponse(false);
  const handler = new AuthRequestHandler({
    oidcProfiles: oidcProfiles,
    redirectToPostLoginHook: false, // No Post login hook
    cookies: `session=${sessionId}`,
    queryStringParamState: 'state-digid',
    queryStringParamCode: '12345',
    dynamoDBClient,
  });
  const result = await handler.handleRequest();
  expect(result.statusCode).toBe(302);
  expect(result?.headers?.Location).toBe('/');
});

test('Successful auth creates new session (with post-login hook)', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  setupSessionResponse(false);
  const handler = new AuthRequestHandler({
    oidcProfiles: oidcProfiles,
    redirectToPostLoginHook: true,
    cookies: `session=${sessionId}`,
    queryStringParamState: 'state-yivi',
    queryStringParamCode: '12345',
    dynamoDBClient,
  });
  const result = await handler.handleRequest();

  // New session and redirect
  expect(result.statusCode).toBe(302);
  expect(result?.headers?.Location).toBe('/post-login');
  expect(result.cookies).toContainEqual(expect.stringContaining('session='));

  // Check the session contents
  const sessionData = ddbMock.calls()[1].lastArg.input.Item.data.M;
  expect(sessionData.claims).toBeDefined();
  expect(sessionData.loggedin).toMatchObject({
    "BOOL": false
  });
  expect(sessionData.status).toMatchObject({
    "S": 'pre-login'
  });
  expect(sessionData.profileUsed).toMatchObject({
    "S": 'yivi'
  });
});

