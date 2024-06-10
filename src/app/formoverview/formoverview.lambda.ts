import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { AWS } from '@gemeentenijmegen/utils';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { FormOverviewApiClient } from './FormOverviewApiClient';
import { FormOverviewRequestHandler, FormOverviewRequestHandlerParams } from './formoverviewRequestHandler';

let requestHandler: FormOverviewRequestHandler | undefined = undefined;

async function init() {
  //TODO: change secret
  const apiKey = await AWS.getSecret(process.env.FORMOVERVIEW_API_KEY_SECRET_ARN!);
  console.log('Loaded API key', apiKey.substring(0, 4));
  const apiClient = new FormOverviewApiClient({
    apiKey: apiKey,
    baseUrl: process.env.FORMOVERVIEW_API_BASE_URL!,
    timeout: 4000,
  });
  const dynamoDBClient = new DynamoDBClient({});
  requestHandler = new FormOverviewRequestHandler(dynamoDBClient, apiClient);
}

const initalization = init();

function parseEvent(event: APIGatewayProxyEventV2): FormOverviewRequestHandlerParams {
  return {
    cookies: event?.cookies?.join(';') ?? '',
    // reference: event?.queryStringParameters?.reference,
    file: event?.pathParameters?.file,
  };
}

export async function handler (event: any, _context: any):Promise<ApiGatewayV2Response> {
  await initalization;
  try {
    const params = parseEvent(event);
    if (!requestHandler) {
      throw Error('Request handler not initalized!');
    }
    return await requestHandler.handleRequest(params);
  } catch (err) {
    console.error(err);
    return Response.error(500);
  }
};
