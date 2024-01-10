import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { LoginRequestHandler } from './loginRequestHandler';
import { Files } from '../util/Files';

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });

const loginRequestHandler = new LoginRequestHandler({
  oidcProfiles: Files.getAuthenticationProfiles(),
  templateOverwrite: Files.getTemplateOverwrite('/opt/login.mustache'),
});

function parseEvent(event: any) {
  return { cookies: event?.cookies?.join(';') };
}

export async function handler (event: any, _context: any):Promise<ApiGatewayV2Response> {
  try {
    const params = parseEvent(event);
    const response = await loginRequestHandler.handleRequest(params.cookies, dynamoDBClient);
    return response;
  } catch (err) {
    console.error(err);
    return Response.error(500);
  }
};