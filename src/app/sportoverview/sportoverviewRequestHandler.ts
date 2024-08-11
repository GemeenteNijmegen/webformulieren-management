
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { render } from '@gemeentenijmegen/webapp';
import { SportOverviewApiClient } from './sportoverviewApiClient';
import * as sportoverviewTemplate from './templates/sportoverview.mustache';
import { AccessController } from '../permission/AccessController';
import { isSportPermissionOption } from '../permission/PermissionOptions';
import { EncryptFilename } from '../shared/encryptFilename';
import { formatDateTime } from '../shared/FormatCreatedDate';
import { FormOverviewResultsSchema } from '../shared/FormOverviewResultsSchema';

export interface SportOverviewRequestHandlerParams {
  cookies: string;
  downloadfile?: string;
}
export class SportOverviewRequestHandler {
  private dynamoDBClient: DynamoDBClient;
  private api: SportOverviewApiClient;

  constructor(dynamoDBClient: DynamoDBClient, sportoverviewApiClient: SportOverviewApiClient) {
    this.dynamoDBClient = dynamoDBClient;
    this.api = sportoverviewApiClient;
  }
  async handleRequest(params: SportOverviewRequestHandlerParams): Promise<ApiGatewayV2Response> {
    let session = new Session(params.cookies, this.dynamoDBClient, {
      ttlInMinutes: parseInt(process.env.SESSION_TTL_MIN ?? '15'),
    });
    await session.init();
    const accessCheck = await AccessController.checkPageAccess(session, '/sport');
    return accessCheck ?? this.handleLoggedinRequest(session, params);
  }
  private async handleLoggedinRequest(session: Session, params: SportOverviewRequestHandlerParams) {
    if (params.downloadfile) {
      return this.handleDownloadFileRequest(session, params);
    } else {
      return this.handleListOverview(session);
    }
    Response.error(400, 'Er is geen functie uitgevoerd in handleLoggedInRequest');
  }
  async handleDownloadFileRequest(session: Session, params: SportOverviewRequestHandlerParams) {
    const key: string = session.getValue('sportkey', 'S');
    if (key) {
      const decryptedFilename = await EncryptFilename.decrypt(key, decodeURIComponent(params.downloadfile!));
      const response = await this.api.get<{downloadUrl: string}>('downloadformoverview', { key: decryptedFilename });
      if (response.downloadUrl) {
        return Response.redirect(response.downloadUrl, 302, session.getCookie());
      } else {
        console.error('[handleDownloadFileRequest] Redirecting to download failed because there was no downloadUrl. Check the apicall response.');
        return Response.error(404);
      }
    } else {
      console.error('[handleDownloadFileRequest] no encryptionkey in session. Decrypting filename for download impossible.');
      return Response.error(404);
    }
  }
  async handleListOverview(session: Session) {
    const { naam, errormessage } = await this.getTemplateValuesFromSession(session);
    const appids: string[] | undefined = this.getAppidQueryParam(session);
    const overview = await this.getListOverviews(appids);

    const listFormOverviewResults = FormOverviewResultsSchema.parse(overview);
    listFormOverviewResults.sort((a, b) => (a.createdDate < b.createdDate) ? 1 : -1);
    await this.setEncryptionKey(session);
    const formattedResults = await Promise.all(listFormOverviewResults.map(async item => {
      const { formattedDate, formattedTime } = formatDateTime(item.createdDate);
      const filenameForDownload = encodeURIComponent(await this.getEncryptedFileName(session, item.fileName));
      const formattedFilename = item.fileName.replace(/-/g, ' ');
      return {
        ...item,
        formattedCreatedDate: formattedDate,
        formattedCreatedTime: formattedTime,
        formattedFilename: formattedFilename,
        filenameForDownload: filenameForDownload,
      };
    }));
    const data = {
      title: 'Sportformulieren',
      shownav: true,
      nav: AccessController.permittedNav(session),
      volledigenaam: naam,
      overview: formattedResults,
      error: errormessage,
    };
    // render page
    const html = await render(data, sportoverviewTemplate.default);
    return Response.html(html, 200, session.getCookie());
  }
  private async getListOverviews(appids: string[] | undefined) {
    // Default API call if appids is undefined
    if (!appids) {
      return this.api.get('/listformoverviews', { formuliernaam: 'aanmeldensportactiviteit' });
    }
    // Map appids to an array of API call promises
    const promises = appids.map(appid =>
      this.api.get('/listformoverviews', { formuliernaam: 'aanmeldensportactiviteit', appid }),
    );
    // Await all promises and return the results
    const results = await Promise.all(promises);
    return results.flat();
  }

  async getTemplateValuesFromSession(session: Session): Promise<{ naam: string; errormessage: string | undefined }> {
    //Controleer of er een errorMessage is in de sessie. Haal op en maak leeg.
    await session.init();
    const err = session.getValue('errorMessageFormOverview', 'S') ?? '';
    const errormessage = err;
    // Verwijder error uit sessie om te voorkomen dat deze steeds in beeld blijft
    await session.setValue('errorMessageFormOverview', '');
    //Haal naam op voor header
    const naam = session.getValue('email', 'S') ?? 'Onbekende gebruiker';
    return { naam, errormessage };
  }
  /**
   * Get appid for the listoverview query based on permissions
   * @param session
   */
  private getAppidQueryParam(session: Session) {
    const permissions: string[] = session.getValue('permissions', 'SS');
    const showAllPermissions = ['ADMIN', 'SPORTADMIN'];
    if (showAllPermissions.some(v => permissions.includes(v))) {
      return undefined;
    }
    return permissions.filter(isSportPermissionOption);
  }
  private async setEncryptionKey(session: Session): Promise<void> {
    if (!session.getValue('sportkey', 'S')) {
      const key = EncryptFilename.generateKey();
      await session.setValue('sportkey', key);
      await session.init();
    }
  }
  private async getEncryptedFileName(session: Session, filename: string): Promise<string> {
    let key: string = session.getValue('sportkey', 'S');
    return EncryptFilename.encrypt(key, filename);
  }

}