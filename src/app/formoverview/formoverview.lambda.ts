import * as querystring from 'querystring';
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
    timeout: 30000,
  });
  const dynamoDBClient = new DynamoDBClient({});
  requestHandler = new FormOverviewRequestHandler(dynamoDBClient, apiClient);
}

const initalization = init();

function parseEvent(event: APIGatewayProxyEventV2): FormOverviewRequestHandlerParams {
  const formParams = getFormParamsFromBody(event);
  return {
    cookies: event?.cookies?.join(';') ?? '',
    formName: formParams.formName,
    formStartDate: formParams.formStartDate,
    formEndDate: formParams.formEndDate,
    file: event?.pathParameters?.file,
  };
}

function getFormParamsFromBody(event: APIGatewayProxyEventV2): FormOverviewQueryParams {
  let urlencodedform;
  if (event.body) {
    urlencodedform = (event?.isBase64Encoded) ? Buffer.from(event?.body, 'base64').toString('utf-8') : event.body;
    const parsedQuerystring = querystring.parse(urlencodedform);
    return {
      formName: parsedQuerystring.formName ? parsedQuerystring.formName as string : undefined,
      formStartDate: parsedQuerystring.formStartDate ? parsedQuerystring.formStartDate as string : undefined,
      formEndDate: parsedQuerystring.formEndDate ? parsedQuerystring.formEndDate as string : undefined,
    };
  }
  return { formName: undefined, formStartDate: undefined, formEndDate: undefined };
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
export interface FormOverviewQueryParams {
  formName: string | undefined;
  formStartDate: string | undefined;
  formEndDate: string | undefined;
}
