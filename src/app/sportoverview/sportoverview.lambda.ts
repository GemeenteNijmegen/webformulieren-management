import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { AWS } from '@gemeentenijmegen/utils';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { SportOverviewApiClient } from './sportoverviewApiClient';
import { SportOverviewRequestHandler } from './sportoverviewRequestHandler';

let requestHandler: SportOverviewRequestHandler | undefined = undefined;


export async function handler (event: any, _context: any):Promise<ApiGatewayV2Response> {
  requestHandler = await initialize();
  try {
    const params = parseEvent(event);
    return await requestHandler.handleRequest(params);

  } catch (err) {
    console.error(`[sportoverview lambda handler] ${err}`);
    return Response.error(500);
  }
};

async function initialize () {
  const apiKey = await AWS.getSecret(process.env.SUBMISSION_STORAGE_API_KEY_SECRET_ARN!);
  const apiClient = new SportOverviewApiClient({
    apiKey: apiKey,
    baseUrl: process.env.SUBMISSION_STORAGE_API_BASE_URL!,
    timeout: 30000,
  });
  const dynamoDBClient = new DynamoDBClient({});
  return requestHandler = new SportOverviewRequestHandler(dynamoDBClient, apiClient);
}

function parseEvent(event: APIGatewayProxyEventV2) {
  return {
    cookies: event?.cookies?.join(';') ?? '',
    downloadfile: event?.queryStringParameters?.downloadfile,
  };
}
