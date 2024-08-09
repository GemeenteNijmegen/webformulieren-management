import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { render } from '@gemeentenijmegen/webapp';
import { z } from 'zod';
import { FormOverviewApiClient } from './FormOverviewApiClient';
import * as formOverviewTemplate from './templates/formOverview.mustache';
import { AccessController } from '../permission/AccessController';


export const FormOverviewResultsSchema = z.array(
  z.object({
    fileName: z.string(),
    createdDate: z.string().datetime(),
    createdBy: z.string(),
    formName: z.string(),
    formTitle: z.string(),
    queryStartDate: z.string(),
    queryEndDate: z.string(),
    appId: z.optional(z.string()),
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

  constructor(dynamoDBClient: DynamoDBClient, apiClient: FormOverviewApiClient) {
    this.dynamoDBClient = dynamoDBClient;
    this.apiClient = apiClient;
  }

  async handleRequest(params: FormOverviewRequestHandlerParams) {
    let session = new Session(params.cookies, this.dynamoDBClient, {
      ttlInMinutes: parseInt(process.env.SESSION_TTL_MIN ?? '15'),
    });
    await session.init();
    const accessCheck = await AccessController.checkPageAccess(session, '/formoverview');
    return accessCheck ?? this.handleLoggedinRequest(session, params);
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
    const paramErrorMessage = this.validateParams(params);
    if (paramErrorMessage) {
      await session.setValue('errorMessageFormOverview', paramErrorMessage);
    } else {
      const endpoint = this.createCsvEndpoint(params);
      const result = await this.apiClient.getData(endpoint);
      const errorMessageForSession = result.apiClientError ?? undefined;
      await session.setValue('errorMessageFormOverview', errorMessageForSession);
      if (errorMessageForSession) {console.error(`Error Message was set: ${errorMessageForSession}`);}
    }
    // Reload the  lambda as formoverview to render the page. This prevents a browser refresh to send the form again.
    return Response.redirect('/', 302, session.getCookie());
  }


  private async handleListOverviewRequest(session: Session, _params: FormOverviewRequestHandlerParams) {
    //Controleer of er een errorMessage is in de sessie. Haal op en maak leeg.
    const errorMessageFromSession = session.getValue('errorMessageFormOverview', 'S') ?? undefined;
    await session.setValue('errorMessageFormOverview', '');
    console.log('Error message was set: ', errorMessageFromSession);
    //Haal naam op voor header
    const naam = session.getValue('email', 'S') ?? 'Onbekende gebruiker';

    //Haal de bestanden op die gedownload kunnen worden
    const overview = await this.apiClient.getData('/listformoverviews');
    console.log('overview has been retrieved. Now it has to be parsed.');
    const listFormOverviewResults = FormOverviewResultsSchema.parse(overview);
    console.log('formoverview result schema has been parsed');
    listFormOverviewResults.sort((a, b) => (a.createdDate < b.createdDate) ? 1 : -1);

    const data = {
      title: 'Formulieroverzicht',
      shownav: true,
      nav: AccessController.permittedNav(session),
      volledigenaam: naam,
      overview: listFormOverviewResults,
      error: errorMessageFromSession,
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

  /**
   * Parameter helper functies
   * Validatie nodig voor endpoint maken. Dan is er zeker een formuliernaam.
   */
  private validateParams(params: FormOverviewRequestHandlerParams): string | undefined {
    if (!params.formName) {
      return 'Er is geen formuliernaam ingevoerd. Een formuliernaam is vereist.';
    }
    if (params.formStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(params.formStartDate)) {
      return `De startdatum ${params.formStartDate} voldoet niet aan het datumformaat JJJJ-MM-DD`;
    }
    if (params.formEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(params.formEndDate)) {
      return `De einddatum ${params.formEndDate} voldoet niet aan het datumformaat JJJJ-MM-DD`;
    }
    if (params.formStartDate && params.formEndDate) {
      if (new Date(params.formStartDate) < new Date(params.formEndDate)) {
        return `Einddatum ${params.formEndDate} mag niet na de startdatum ${params.formStartDate} liggen. Voorbeeld correcte datumrange: startdatum 2024-07-01 en einddatum 2024-06-01`;
      }
    }
    return undefined;
  }

  private createCsvEndpoint(params: FormOverviewRequestHandlerParams): string {
    let endpoint = `/formoverview?formuliernaam=${params.formName}`;
    if (params.formStartDate) {endpoint += `&startdatum=${params.formStartDate}`;}
    if (params.formEndDate) {endpoint += `&einddatum=${params.formEndDate}`;}
    return endpoint;
  }


}
