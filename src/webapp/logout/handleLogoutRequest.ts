import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import cookie from 'cookie';
import * as logoutTemplate from './templates/logout.mustache';
import { render } from '../util/render';

export async function handleLogoutRequest(cookies: string, dynamoDBClient: DynamoDBClient, templateOverwrite?: string) {
  let session = new Session(cookies, dynamoDBClient, {
    ttlInMinutes: parseInt(process.env.SESSION_TTL_MIN ?? '15'),
  });
  if (await session.init()) {
    await session.updateSession({
      loggedin: { BOOL: false },
    });
  }

  const template = templateOverwrite ?? logoutTemplate.default;
  const html = await render({ title: 'Uitgelogd' }, template);
  const emptyCookie = cookie.serialize('session', '', {
    httpOnly: true,
    secure: true,
  });
  return Response.html(html, 200, [emptyCookie]);
}
