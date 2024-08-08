import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { render } from '@gemeentenijmegen/webapp';
import { z } from 'zod';
import { FormOverviewApiClient } from './FormOverviewApiClient';
import * as formOverviewTemplate from './templates/formOverview.mustache';
import { permittedNav } from '../nav/nav';

export const FormOverviewResultsSchema = z.array(
  z.object({
    fileName: z.string(),
    createdDate: z.string().datetime(),
    createdBy: z.string(),
    formName: z.string(),
    formTitle: z.string(),
    queryStartDate: z.string(),
    queryEndDate: z.string(),
  }),
);

export interface FormOverviewRequestHandlerParams {
  cookies: string;
  formName?: string;
  file?: string;
  formStartDate?: string;
  formEndDate?: string;
}

export class FormOverviewRequestHandler {
  private dynamoDBClient: DynamoDBClient;
  private apiClient: FormOverviewApiClient;
  private errorMessage: string | undefined;

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
    } else if (params.formName) {
      return this.handleGenerateCsvRequest(session, params);
    } else {
      return this.handleListOverviewRequest(session, params);
    }
  }

  private async handleGenerateCsvRequest(session: Session, params: FormOverviewRequestHandlerParams) {
    let endpoint = `/formoverview?formuliernaam=${params.formName}`;
    if (params.formStartDate) {endpoint += `&startdatum=${params.formStartDate}`;}
    if (params.formEndDate) {endpoint += `&einddatum=${params.formEndDate}`;}
    const result = await this.apiClient.getData(endpoint);
    this.errorMessage = result.apiClientError ?? undefined;
    return this.handleListOverviewRequest(session, params);
  }

  private async handleListOverviewRequest(session: Session, _params: FormOverviewRequestHandlerParams) {
    //Haal naam op voor header
    const naam = session.getValue('email', 'S') ?? 'Onbekende gebruiker';
    //Haal de bestanden op die gedownload kunnen worden
    const overview = await this.apiClient.getData('/listformoverviews');
    const listFormOverviewResults = FormOverviewResultsSchema.parse(overview);
    listFormOverviewResults.sort((a, b) => (a.createdDate < b.createdDate) ? 1 : -1);

    const data = {
      title: 'Formulieroverzicht',
      shownav: true,
      nav: permittedNav(session.getValue('permissions', 'SS')),
      volledigenaam: naam,
      overview: listFormOverviewResults,
      error: this.errorMessage,
    };
    // render page
    const html = await render(data, formOverviewTemplate.default);
    return Response.html(html, 200, session.getCookie());
  }

  private async handleDownloadRequest(_session: Session, params: FormOverviewRequestHandlerParams): Promise<Response> {
    const response = await this.apiClient.getData(`/downloadformoverview?key=${params.file}`);
    if (response) {
      return Response.redirect(response.downloadUrl);
    } else {
      return Response.error(404);
    }
  }
}
