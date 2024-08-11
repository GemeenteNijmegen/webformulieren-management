
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { render } from '@gemeentenijmegen/webapp';
import { SportOverviewApiClient } from './sportoverviewApiClient';
import * as sportoverviewTemplate from './templates/sportoverview.mustache';
import { AccessController } from '../permission/AccessController';
import { getSportPermissionDescriptions, isSportPermissionOption } from '../permission/PermissionOptions';
import { EncryptFilename } from '../shared/encryptFilename';
import { formatDateTime } from '../shared/FormatCreatedDate';
import { FormOverviewResultsSchema } from '../shared/FormOverviewResultsSchema';
import { getDateBasedOnScope } from '../shared/getDateBasedOnScope';
import { SubmissionsSchema, SubmissionsSchemaType } from '../shared/SubmissionsSchema';

export interface SportOverviewRequestHandlerParams {
  cookies: string;
  downloadfile?: string;
  downloadpdf?: string;
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
    if (params.downloadfile || params.downloadpdf) {
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
      const endpoint = params.downloadfile ? 'downloadformoverview' : 'download';
      const file = params.downloadpdf ? `${decryptedFilename}/${decryptedFilename}.pdf` : decryptedFilename;
      console.log('Download ', file, endpoint);
      const response = await this.api.get<{downloadUrl: string}>(endpoint, { key: file });
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
    const [overview, submissions] = await Promise.all([
      this.getListOverviews(appids),
      this.getSubmissions(appids),
    ]);
    const submissionsResults = SubmissionsSchema.parse(submissions);
    submissionsResults.sort((a, b) => (a.DatumTijdOntvangen < b.DatumTijdOntvangen) ? 1 : -1);

    const listFormOverviewResults = FormOverviewResultsSchema.parse(overview);
    listFormOverviewResults.sort((a, b) => (a.createdDate < b.createdDate) ? 1 : -1);
    await this.setEncryptionKey(session);

    const formattedSubmissionsResults: SportSubmissionsForTemplate[] = await this.formatSubmissions(submissionsResults, session);

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

    const allowedSportFormsInText = getSportPermissionDescriptions(session.getValue('permissions', 'SS')).join(', ');
    const data = {
      title: 'Sportformulieren',
      shownav: true,
      nav: AccessController.permittedNav(session),
      volledigenaam: naam,
      overview: formattedResults,
      submissions: formattedSubmissionsResults,
      error: errormessage,
      allowedSportFormsInText: allowedSportFormsInText,
    };
    // render page
    const html = await render(data, sportoverviewTemplate.default);
    return Response.html(html, 200, session.getCookie());
  }

  private async formatSubmissions(submissionResults: SubmissionsSchemaType, session: Session): Promise<SportSubmissionsForTemplate[]> {
    const promises = submissionResults.map(async submission => {

      const { formattedDate, formattedTime } = formatDateTime(submission.DatumTijdOntvangen);

      const tel = submission['Telefoonnummer telefoonnummer'] || '';
      const email = submission['E-mailadres eMailadres'] || '';

      const voornaam = submission['Voornaam voornaam'];
      const achternaam = submission['Achternaam achternaam'];

      const kind = {
        voornaam: submission['Voornaam kind'] ?? '',
        achternaam: submission['Voornaam kind'] ?? '',
        leeftijd: submission['Voornaam kind'] ?? '',
        bo: submission['School basisonderwijs'] ?? '',
        vo: submission['School voortgezetOnderwijs'] ?? '',
      };
      const kindstring = kind.voornaam ? `${kind.voornaam} ${kind.achternaam} (${kind.leeftijd} ${kind.bo} ${kind.vo})` : '';

      const activities: string[] = [];
      // Loop through keys and find checkboxes with 'true'
      Object.keys(submission).forEach(key => {
        if (key.startsWith('Aanmelden voor sportactiviteit') && typeof submission[key] === 'string') {
        // Check if value contains 'true' and extract activity names
          const value: string = typeof submission[key] === 'string' ? submission[key] as string : '';
          if (typeof value === 'string' && (value as string).includes('true')) {
          // Extract activity names from the value string
            const regex = /Checkbox\s(.*?)\s*is\strue\./g;
            let match;
            while ((match = regex.exec(value)) !== null) {
              activities.push(match[1].trim());
            }
          }
        }
      });

      // Process each submission
      return {
        reference: submission.FormulierKenmerk,
        filenameForPDFDownload: encodeURIComponent(await this.getEncryptedFileName(session, submission.FormulierKenmerk)),
        dateSubmitted: `${formattedDate} ${formattedTime}`,
        name: `${voornaam} ${achternaam}`,
        child: kindstring,
        telAndMail: `${tel} ${email}`.trim(),
        activities: activities.join(', '),
        comments: (submission.Opmerkingen || '').toString().trim(),
      };
    });

    // Wait for all promises to resolve
    return Promise.all(promises);
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
  private async getSubmissions(appids: string[] | undefined) {
    // Default API call if appids is undefined
    const startdatum = getDateBasedOnScope('month');
    if (!appids) {
      return this.api.get('/formoverview', { formuliernaam: 'aanmeldensportactiviteit', responseformat: 'json', startdatum: startdatum });
    }
    // Map appids to an array of API call promises
    const promises = appids.map(appid =>
      this.api.get('/formoverview', { formuliernaam: 'aanmeldensportactiviteit', responseformat: 'json', startdatum: startdatum, appid }),
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


export interface SportSubmissionsForTemplate {
  reference: string; // formulierkenmerk
  filenameForPDFDownload: string; // generated from formulierkenmerk with getEncryptedFileName
  dateSubmitted: string; // formatted date and time with a space in between
  name: string; // combination first and last name
  child: string;
  telAndMail: string; // from telefoonnummer and email with a space in between
  activities: string; // comma separated activities where checkbox is true
  comments: string; // opmerkingen from form
}