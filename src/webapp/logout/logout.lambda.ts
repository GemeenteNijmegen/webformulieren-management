import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { handleLogoutRequest } from './handleLogoutRequest';
import { Files } from '../util/Files';

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const templateOverwrite = Files.getTemplateOverwrite('/opt/logout.mustache');

function parseEvent(event: any) {
  return {
    cookies: event?.cookies?.join(';'),
  };
}

exports.handler = async (event: any, _context: any) => {
  try {
    const params = parseEvent(event);
    return await handleLogoutRequest(params.cookies, dynamoDBClient, templateOverwrite);
  } catch (err) {
    console.error(err);
    return Response.error(500);
  }
};