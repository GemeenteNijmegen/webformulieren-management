
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { render } from '@gemeentenijmegen/webapp';
import { SportOverviewApiClient } from './sportoverviewApiClient';
import * as sportoverviewTemplate from './templates/sportoverview.mustache';
import { AccessController } from '../permission/AccessController';
import { getSportPermissionDescriptions, hasSportAdminPermission, isSportPermissionOption, PermissionOptions, SPORT_PERMISSION_DESCRIPTIONS, SPORT_PERMISSION_OPTIONS } from '../permission/PermissionOptions';
import { EncryptFilename } from '../shared/encryptFilename';
import { formatDateTime } from '../shared/FormatCreatedDate';
import { FormOverviewResultsSchema } from '../shared/FormOverviewResultsSchema';
import { getDateBasedOnScope } from '../shared/getDateBasedOnScope';
import { SubmissionsSchema, SubmissionsSchemaType } from '../shared/SubmissionsSchema';

export interface SportOverviewRequestHandlerParams {
  cookies: string;
  downloadfile?: string;
  downloadpdf?: string;
  genereerCsvOptie?: string;
  formStartDate?: string;
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
    } else if (params.genereerCsvOptie) {
      return this.handleGenerateCsvSeasonStart(session, params);
    } else {
      return this.handleListOverview(session);
    }
    Response.error(400, 'Er is geen functie uitgevoerd in handleLoggedInRequest');
  }
  async handleGenerateCsvSeasonStart(session: Session, params: SportOverviewRequestHandlerParams) {
    console.log('[handleGenerateCsvSeasonStart]', session, params);
    if (!params.formStartDate) console.warn('[handleGenerateCsvSeasonStart] undefined formStartDate unexpected. Replaced by seasonStartDate.');
    const startdatum: string = params.formStartDate ?? this.getSeasonStartDate();
    // Get appid from param indien all, dan wordt undefined
    const appId = params.genereerCsvOptie == 'all' ? undefined : params.genereerCsvOptie;
    let errorMessageForSession = '';
    let result;
    try {
      result = await this.api.get('formoverview', { formuliernaam: 'aanmeldensportactiviteit', startdatum: startdatum, appid: appId });
    } catch (error) {
      if (error instanceof Error) {
        errorMessageForSession = error.message;
      } else {
        // Handle non-Error cases or unexpected errors
        errorMessageForSession = 'Er is iets fout gegaan bij de API aanroep csv genereren. De fout is onbekend.';
      }
    }
    errorMessageForSession = !errorMessageForSession && (!result || Object.keys(result).length === 0) ? `Er zijn geen inzendingen gevonden. De csv is niet gemaakt met optie: ${params.genereerCsvOptie}. Controleer eventueel de inzendingen van de laatste maand om te zien of dit klopt.` : '';
    if (errorMessageForSession) {
      await session.setValue('errorMessageFormOverview', errorMessageForSession);
    }
    // Reload the  lambda as formoverview to render the page. This prevents a browser refresh to send the form again.
    return Response.redirect('/sport', 302, session.getCookie());


  }
  async handleDownloadFileRequest(session: Session, params: SportOverviewRequestHandlerParams) {
    const key: string = session.getValue('sportkey', 'S');
    if (key) {
      const toDecode = params.downloadfile ?? params.downloadpdf;
      const decryptedFilename = await EncryptFilename.decrypt(key, decodeURIComponent(toDecode!));
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
    const allowedGenerateCsvOptions = getAllowedCsvOptions(session.getValue('permissions', 'SS'));
    const data = {
      title: 'Sportformulieren',
      shownav: true,
      nav: AccessController.permittedNav(session),
      volledigenaam: naam,
      overview: formattedResults,
      submissions: formattedSubmissionsResults,
      error: errormessage,
      allowedSportFormsInText: allowedSportFormsInText,
      allowedGenerateCsvOptions: allowedGenerateCsvOptions,
      startdatum: this.getSeasonStartDate(),
    };
    // render page
    const html = await render(data, sportoverviewTemplate.default);
    return Response.html(html, 200, session.getCookie());
  }

  private async formatSubmissions(submissionResults: SubmissionsSchemaType, session: Session): Promise<SportSubmissionsForTemplate[]> {
    const promises = submissionResults.map(async submission => {

      const { formattedDate, formattedTime } = formatDateTime(submission.DatumTijdOntvangen);

      const tel = submission['Telefoonnummer telefoonnummer'] ?? '';
      const email = submission['E-mailadres eMailadres'] ?? '';

      const voornaam = submission['Voornaam voornaam'] ?? '';
      const achternaam = submission['Achternaam achternaam'] ?? '';

      const kind = {
        voornaam: submission['Voornaam kind'] ?? '',
        achternaam: submission['Achternaam kind'] ?? '',
        leeftijd: submission['Leeftijd kind'] ?? '',
        bo: submission['School basisonderwijs'] ?? '',
        vo: submission['School voortgezetOnderwijs'] ?? '',
        groep: submission.Groep ? `Groep: ${submission.Groep}` : '',
      };
      const kindstring = kind.voornaam ? `${kind.voornaam} ${kind.achternaam} (${kind.leeftijd} ${kind.bo} ${kind.vo}) ${kind.groep}` : '';

      const activities: string[] = [];
      // Loop through keys and find checkboxes with 'true'
      Object.keys(submission).forEach(key => {
        if (key.startsWith('Aanmelden voor sportactiviteit') && typeof submission[key] === 'string') {
        // Check if value contains 'true' and extract activity names
          const value: string = typeof submission[key] === 'string' ? submission[key] as string : '';
          if (typeof value === 'string' && (value as string).includes('true')) {
          // Extract activity names from the value string
            const regex = /Checkbox\s(.*?)\s*is\strue/g;
            let match;
            while ((match = regex.exec(value)) !== null) {
              activities.push(match[1].trim());
            }
          }
        }
        if (key.includes('omWelkeSportactiviteitGaatHetDan') && typeof submission[key] === 'string' && !!submission[key]) {
          activities.push(`Andere: ${submission[key]}`);
        }
      });

      // Process each submission
      return {
        reference: submission.FormulierKenmerk,
        filenameForPDFDownload: encodeURIComponent(await this.getEncryptedFileName(session, submission.FormulierKenmerk)),
        dateSubmitted: `${formattedDate}`,
        timeSubmitted: `${formattedTime}`,
        name: `${voornaam} ${achternaam}`,
        child: kindstring,
        telAndMail: `${tel} ${email}`,
        activities: activities.join(', '),
        comments: (submission.Opmerkingen || '').toString(),
      };
    });

    // Wait for all promises to resolve
    return Promise.all(promises);
  }


  private async getListOverviews(appids: string[] | undefined) {
    try {
      // Default API call if appids is undefined
      if (!appids) {
        const result = await this.api.get('/listformoverviews', { formuliernaam: 'aanmeldensportactiviteit' });
        return result && Object.keys(result).length ? result : [];
      }

      // Map appids to an array of API call promises with await
      const promises = appids.map(async (appid) => {
        try {
          const result = await this.api.get('/listformoverviews', { formuliernaam: 'aanmeldensportactiviteit', appid });
          return result && Object.keys(result).length ? result : []; // Handle empty results
        } catch {
          return []; // Handle errors gracefully
        }
      });

      // Await all promises and return the results
      const results = await Promise.all(promises);
      return results.flat();
    } catch (error) {
      console.error('Error fetching list overviews:', appids, error);
      return []; // Return an empty array in case of an error
    }
  }

  private async getSubmissions(appids: string[] | undefined) {
    const startdatum = getDateBasedOnScope('month');

    try {
      // Default API call if appids is undefined
      if (!appids) {
        const result = await this.api.get('/formoverview', { formuliernaam: 'aanmeldensportactiviteit', responseformat: 'json', startdatum: startdatum });
        return result && Object.keys(result).length ? result : []; // Handle empty results
      }

      // Map appids to an array of API call promises with await
      const promises = appids.map(async (appid) => {
        try {
          const result = await this.api.get('/formoverview', { formuliernaam: 'aanmeldensportactiviteit', responseformat: 'json', startdatum: startdatum, appid });
          return result && Object.keys(result).length ? result : []; // Handle empty results
        } catch (error) {
          console.error(`Error fetching submissions for appid ${appid}:`, error);
          return []; // Handle errors gracefully and return an empty array
        }
      });

      // Await all promises and return the results
      const results = await Promise.all(promises);
      return results.flat();
    } catch (error) {
      console.error('Error fetching submissions:', appids, error);
      return []; // Return an empty array in case of an error
    }
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

  /**
   * Method that calculates the sport season start date
   * The seasons start on the first of january and first of august
   * Check if today is before 08-01 of the year then it returns currentyear-01-01
   * Check if today is after 08-01 of the year then it returns currentyear-08-01
   *
   * @returns string pattern yyyy-mm-dd
   */
  getSeasonStartDate(): string {
    const today = new Date();
    const currentYear = today.getFullYear();

    const januaryFirst = `${currentYear}-01-01`;
    const augustFirst = `${currentYear}-08-01`;

    if (today < new Date(augustFirst)) {
      return januaryFirst;
    } else {
      return augustFirst;
    }
  }

}


export interface SportSubmissionsForTemplate {
  reference: string; // formulierkenmerk
  filenameForPDFDownload: string; // generated from formulierkenmerk with getEncryptedFileName
  dateSubmitted: string; // formatted date and time with a space in between
  timeSubmitted: string;
  name: string; // combination first and last name
  child: string;
  telAndMail: string; // from telefoonnummer and email with a space in between
  activities: string; // comma separated activities where checkbox is true
  comments: string; // opmerkingen from form
}

function getAllowedCsvOptions(permissions: PermissionOptions[] ): {val: string; description: string}[] {
  if (hasSportAdminPermission(permissions)) {
    // Return all options with "Totaaloverzicht" as the first option
    return [
      { val: 'all', description: 'Totaaloverzicht' },
      ...SPORT_PERMISSION_OPTIONS
        .filter(isSportPermissionOption)
        .map(option => ({
          val: option,
          description: SPORT_PERMISSION_DESCRIPTIONS[option],
        })),
    ];
  } else {
    // Return only the options the user has permission for
    return permissions
      .filter(isSportPermissionOption)
      .map(permission => ({
        val: permission,
        description: SPORT_PERMISSION_DESCRIPTIONS[permission],
      }));
  }
}
