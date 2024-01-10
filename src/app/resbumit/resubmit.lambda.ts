import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { AWS } from '@gemeentenijmegen/utils';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { ApiClient } from './ApiClient';
import { ResubmitRequestHandler } from './resubmitRequestHandler';

let requestHandler: ResubmitRequestHandler | undefined = undefined;

async function init() {
  const apiKey = await AWS.getSecret(process.env.MANAGEMENT_API_KEY_SECRET_ARN!);
  console.log('Loaded API key', apiKey.substring(0, 4));
  const apiClient = new ApiClient({
    apiKey: apiKey,
    baseUrl: process.env.MANAGEMENT_API_BASE_URL!,
  });
  const dynamoDBClient = new DynamoDBClient({});
  requestHandler = new ResubmitRequestHandler(dynamoDBClient, apiClient);
}

const initalization = init();

function parseEvent(event: APIGatewayProxyEventV2) {
  return {
    cookies: event?.cookies?.join(';') ?? '',
    reference: event?.queryStringParameters?.reference,
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
