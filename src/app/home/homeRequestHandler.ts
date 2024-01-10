import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import * as homeTemplate from './templates/home.mustache';
import { render } from '../../webapp/util/render';
import { nav } from '../nav/nav';

export class HomeRequestHandler {
  private dynamoDBClient: DynamoDBClient;
  constructor(dynamoDBClient: DynamoDBClient) {
    this.dynamoDBClient = dynamoDBClient;
  }

  async handleRequest(cookies: string) {
    let session = new Session(cookies, this.dynamoDBClient, {
      ttlInMinutes: parseInt(process.env.SESSION_TTL_MIN ?? '15'),
    });
    await session.init();
    if (session.isLoggedIn() == true) {
      return this.handleLoggedinRequest(session);
    }
    return Response.redirect('/login');
  }

  private async handleLoggedinRequest(session: Session) {

    const naam = session.getValue('email') ?? 'Onbekende gebruiker';
    const data = {
      title: 'overzicht',
      shownav: true,
      nav: nav,
      volledigenaam: naam,
    };

    // render page
    const html = await render(data, homeTemplate.default);

    return Response.html(html, 200, session.getCookie());
  }
}
