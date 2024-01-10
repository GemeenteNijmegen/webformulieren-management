import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { AuthRequestHandler } from './AuthRequestHandler';
import { Files } from '../util/Files';

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const profiles = Files.getAuthenticationProfiles();

function parseEvent(event: any) {
  return {
    cookies: event?.cookies?.join(';'),
    code: event?.queryStringParameters?.code,
    state: event?.queryStringParameters?.state,
  };
}

export async function handler(event: any, _context: any):Promise<ApiGatewayV2Response> {
  try {
    const params = parseEvent(event);
    const requestHandler = new AuthRequestHandler({
      cookies: params.cookies,
      queryStringParamCode: params.code,
      queryStringParamState: params.state,
      dynamoDBClient,
      oidcProfiles: profiles,
      redirectToPostLoginHook: process.env.REDIRECT_TO_POST_LOGIN_HOOK === 'true',
    });
    return await requestHandler.handleRequest();
  } catch (err) {
    console.error(err);
    return Response.error(500);
  }
}