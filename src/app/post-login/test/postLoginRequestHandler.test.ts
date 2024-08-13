import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { Permission, UserPermission } from '../../permission/Permission';
import { PostLoginRequestHandler } from '../postLoginRequestHandler';

// Mockfunctions
let sessionInitMock = jest.fn().mockResolvedValue({});
let sessionIsLoggedInMock = jest.fn().mockReturnValue(true);
let sessiongetValueMock = jest.fn().mockReturnValueOnce('pre-login').mockReturnValueOnce(JSON.stringify({ email: 'testmail@example.com' }));
let sessionIsCreateSessionMock = jest.fn().mockResolvedValue({});
let sessionGetCookieMock = jest.fn().mockReturnValue('cookie');

let permissionGetUserMock = jest.fn().mockResolvedValue({ useremail: 'testmail@example.com', permissions: ['ADMIN'] } as UserPermission );


jest.mock('@gemeentenijmegen/session', () => {
  return {
    // Constructor mock
    Session: jest.fn( () => {
      return {
        init: sessionInitMock,
        isLoggedIn: sessionIsLoggedInMock,
        getValue: sessiongetValueMock,
        createSession: sessionIsCreateSessionMock,
        getCookie: sessionGetCookieMock,
      };
    }),
  };
});
jest.mock('../../permission/Permission', () => {
  return {
    Permission: jest.fn(() => {
      return {
        getUser: permissionGetUserMock,
      };
    }),
  };
});


const originalEnv = process.env;
describe('postLoginRequestHandler', () => {
  let redirectSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    redirectSpy = jest.spyOn(Response, 'redirect').mockImplementation(() => {
      return { statusCode: 302, headers: { Location: 'test' }, body: '' } as any;
    });
    process.env = {
      ...originalEnv,
      SESSION_TTL_MIN: '16',
    };
  });
  afterEach(() => {
    process.env = originalEnv;
  });
  test('should instantiate', () => {
    expect(new PostLoginRequestHandler({} as any as DynamoDBClient)).toBeTruthy();
  });
  test('should setup', async () => {
    redirectSpy.mockReset();
    const postLoginRequestHandler = new PostLoginRequestHandler({} as any as DynamoDBClient);
    await postLoginRequestHandler.handleRequest('fakeCookie');
    expect(Session).toHaveBeenCalledTimes(1);
    expect(Permission).toHaveBeenCalledTimes(1);
    expect(redirectSpy).toHaveBeenCalledTimes(1);
  });

  test('should call redirect with loggedIn false pre-login and permission in default setup', async () => {
    sessionIsLoggedInMock = jest.fn().mockImplementation(() => { return false;});
    sessiongetValueMock = jest.fn().mockReturnValueOnce('pre-login').mockReturnValueOnce(JSON.stringify({ email: 'testmail@example.com' }));
    redirectSpy.mockReset();
    const postLoginRequestHandler = new PostLoginRequestHandler({} as any as DynamoDBClient);
    await postLoginRequestHandler.handleRequest('fakeCookie');
    expect(redirectSpy).toHaveBeenCalledWith('/', 302, 'cookie');
  });
});