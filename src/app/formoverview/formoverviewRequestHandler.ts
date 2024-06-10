import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { FormOverviewApiClient } from './FormOverviewApiClient';
import * as formOverviewTemplate from './templates/formOverview.mustache';
import { render } from '../../webapp/util/render';
import { nav } from '../nav/nav';


export interface FormOverviewRequestHandlerParams {
  cookies: string;
  file?: string;
}

export class FormOverviewRequestHandler {
  private dynamoDBClient: DynamoDBClient;
  private apiClient: FormOverviewApiClient;
  constructor(dynamoDBClient: DynamoDBClient, apiClient: FormOverviewApiClient) {
    this.dynamoDBClient = dynamoDBClient;
    this.apiClient = apiClient;
  }

  async handleRequest(params: FormOverviewRequestHandlerParams) {
    let session = new Session(params.cookies, this.dynamoDBClient, {
      ttlInMinutes: parseInt(process.env.SESSION_TTL_MIN ?? '15'),
    });
    await session.init();
    if (session.isLoggedIn() == true) {
      return this.handleLoggedinRequest(session, params);
    }
    return Response.redirect('/login');
  }

  private async handleLoggedinRequest(session: Session, params: FormOverviewRequestHandlerParams) {
    if (params.file) {
      return this.handleDownloadRequest(session, params);
    } else {
      return this.handleListOverviewRequest(session, params);
    }
  }

  private async handleListOverviewRequest(session: Session, params: FormOverviewRequestHandlerParams) {
    const naam = session.getValue('email') ?? 'Onbekende gebruiker';
    const listFormOverviewResults = await this.apiClient.getData('/listformoverviews');
    console.log('Apiclient made? ', !!this.apiClient);
    console.log('Cookies in params? ', !!params.cookies);

    const data = {
      title: 'Formulieroverzicht',
      shownav: true,
      nav: nav,
      volledigenaam: naam,
      overview: listFormOverviewResults.body,
    };

    // render page
    const html = await render(data, formOverviewTemplate.default);
    return Response.html(html, 200, session.getCookie());
  }

  private async handleDownloadRequest(params: FormOverviewRequestHandlerParams) {
    const response = await this.apiClient.getData(`/downloadFormOverview?key=${params.file}`);
    if (response) {
      return Response.redirect(response.downloadUrl);
    } else {
      return Response.error(404);
    }
  }
}
