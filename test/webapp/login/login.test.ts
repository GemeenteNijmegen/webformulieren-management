import { writeFile } from 'fs';
import * as path from 'path';
import { DynamoDBClient, GetItemCommandOutput, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { LoginRequestHandler } from '../../../src/webapp/login/loginRequestHandler';
import {
  yiviProfile, 
  digiDProfile, 
  immediateRedirectProfile,
  oidcProfiles
} from '../OIDCProfiles';

const ddbMock = mockClient(DynamoDBClient);
const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });

beforeAll(() => {
  if (process.env.VERBOSETESTS != 'True') {
    global.console.error = jest.fn();
    global.console.time = jest.fn();
    global.console.log = jest.fn();
  }

  // Set env variables
  process.env.SESSION_TABLE = 'sessions-table';

});


beforeEach(() => {
  ddbMock.reset();
});

describe('Test login page and urls', () => {
  test('Return login page with correct link', async () => {
    const loginRequestHandler = new LoginRequestHandler({ oidcProfiles });
    const result = await loginRequestHandler.handleRequest('', dynamoDBClient);
    expect(result.body).toMatch(`http://auth/broker/sp/oidc/authenticate`);
    expect(result.body).toMatch(encodeURIComponent(`http://app/auth`));
    expect(result.body).toMatch(encodeURIComponent('idp_scoping:digid'));
    expect(result.statusCode).toBe(200);
  });

  test('Return login page with yivi profile', async () => {
    const loginRequestHandler = new LoginRequestHandler({ oidcProfiles });

    const result = await loginRequestHandler.handleRequest('', dynamoDBClient);
    expect(result.body).toMatch(encodeURIComponent('idp_scoping:yivi'));
    expect(result.body).toMatch(encodeURIComponent('irma-demo.gemeente.personalData.bsn'));
    expect(result.body).toMatch('yivi-css-class');
    expect(result.body).toMatch('Yivi-title');
    if (result.body) {
      writeFile(path.join(__dirname, 'output', 'test.html'), result.body, () => { });
    }
  });

  test('Return login page with digid profile', async () => {
    const loginRequestHandler = new LoginRequestHandler({ oidcProfiles });

    const result = await loginRequestHandler.handleRequest('', dynamoDBClient);
    expect(result.body).toMatch(encodeURIComponent('idp_scoping:digid'));
    expect(result.body).toMatch(encodeURIComponent('service:DigiD_Midden'));
    expect(result.body).toMatch('digid-css-class');
    expect(result.body).toMatch('DigiD-title');
    if (result.body) {
      writeFile(path.join(__dirname, 'output', 'test.html'), result.body, () => { });
    }
  });



  test('Do not return login page in immidate redirect', async () => {
    const loginRequestHandler = new LoginRequestHandler({ 
      oidcProfiles: [
        yiviProfile, 
        digiDProfile, 
        immediateRedirectProfile
      ], 
    });
    const result = await loginRequestHandler.handleRequest('', dynamoDBClient);
    expect(result.statusCode).toBe(302);
    expect(result.headers?.Location).toMatch('http://example.com');
  });

}); // End describe

test('No redirect if session cookie doesn\'t exist', async () => {
  const loginRequestHandler = new LoginRequestHandler({ oidcProfiles });

  const result = await loginRequestHandler.handleRequest('demo=12345', dynamoDBClient);
  expect(result.statusCode).toBe(200);
});

test('Create session if no session exists', async () => {
  const loginRequestHandler = new LoginRequestHandler({ oidcProfiles });

  await loginRequestHandler.handleRequest('', dynamoDBClient);

  expect(ddbMock.calls().length).toBe(1);
});

test('Redirect to home if already logged in', async () => {
  const output: Partial<GetItemCommandOutput> = {
    Item: {
      data: {
        M: {
          loggedin: {
            BOOL: true,
          },
        },
      },
    },
  };
  ddbMock.on(GetItemCommand).resolves(output);
  const sessionId = '12345';
  const loginRequestHandler = new LoginRequestHandler({ oidcProfiles });

  const result = await loginRequestHandler.handleRequest(`session=${sessionId}`, dynamoDBClient);
  expect(result?.headers?.Location).toBe('/');
  expect(result.statusCode).toBe(302);
});

test('Unknown session returns login page', async () => {
  const output: Partial<GetItemCommandOutput> = {}; //empty output
  ddbMock.on(GetItemCommand).resolves(output);
  const sessionId = '12345';
  const loginRequestHandler = new LoginRequestHandler({ oidcProfiles });

  const result = await loginRequestHandler.handleRequest(`session=${sessionId}`, dynamoDBClient);
  expect(ddbMock.calls().length).toBe(2);
  expect(result.statusCode).toBe(200);
});

test('Known session without login returns login page, without creating new session', async () => {
  const output: Partial<GetItemCommandOutput> = {
    Item: {
      loggedin: {
        BOOL: false,
      },
    },
  };
  ddbMock.on(GetItemCommand).resolves(output);
  const sessionId = '12345';
  const loginRequestHandler = new LoginRequestHandler({ oidcProfiles });

  const result = await loginRequestHandler.handleRequest(`session=${sessionId}`, dynamoDBClient);
  expect(ddbMock.calls().length).toBe(2);
  expect(result.statusCode).toBe(200);
});

test('Request without session returns session cookie', async () => {
  const loginRequestHandler = new LoginRequestHandler({ oidcProfiles });

  const result = await loginRequestHandler.handleRequest('', dynamoDBClient);
  expect(result.cookies).toEqual(
    expect.arrayContaining([expect.stringMatching('session=')]),
  );
});

test('DynamoDB error', async () => {
  ddbMock.on(GetItemCommand).rejects(new Error('Not supported!'));
  let failed = false;
  try {
    const loginRequestHandler = new LoginRequestHandler({ oidcProfiles });

    await loginRequestHandler.handleRequest('session=12345', dynamoDBClient);
  } catch (error) {
    failed = true;
  }
  expect(ddbMock.calls().length).toBe(1);
  expect(failed).toBe(true);
});
