import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { ApiClient } from './ApiClient';
import * as resubmitTemplate from './templates/resubmit.mustache';
import { render } from '../../webapp/util/render';
import { nav } from '../nav/nav';

const RESUBMISSION = 'RESUBMISSION';

export interface ResubmitRequestHandlerParams {
  cookies: string;
  reference?: string;
}

export class ResubmitRequestHandler {
  private dynamoDBClient: DynamoDBClient;
  private apiClient: ApiClient;
  constructor(dynamoDBClient: DynamoDBClient, apiClient: ApiClient) {
    this.dynamoDBClient = dynamoDBClient;
    this.apiClient = apiClient;
  }

  async handleRequest(params: ResubmitRequestHandlerParams) {
    let session = new Session(params.cookies, this.dynamoDBClient, {
      ttlInMinutes: parseInt(process.env.SESSION_TTL_MIN ?? '15'),
    });
    await session.init();
    if (session.isLoggedIn() == true) {
      return this.handleLoggedinRequest(session, params);
    }
    return Response.redirect('/login');
  }

  private async handleLoggedinRequest(session: Session, params: ResubmitRequestHandlerParams) {
    const naam = session.getValue('email') ?? 'Onbekende gebruiker';

    let resubmitted = undefined;
    let resubmittedSuccess = undefined;
    if (params.reference) {
      console.log('Resubmitting form', params.reference);
      try {
        await this.apiClient.postData(`/management/resubmit?key=${params.reference}`, '');
        await this.addToRecentResubmissions(params.reference, naam);
        resubmitted = 'Opnieuw ingezonden!';
        resubmittedSuccess = true;
      } catch (err) {
        console.error('resubmitting failed', err);
        resubmitted = `Er ging iets fout! ${err}`;
        resubmittedSuccess = false;
      }
    }

    const recents = await this.getRecentResubmissions();
    const data = {
      title: 'Opnieuw inzenden',
      shownav: true,
      nav: nav,
      volledigenaam: naam,
      resubmitted,
      resubmittedSuccess,
      recents,
    };

    // render page
    const html = await render(data, resubmitTemplate.default);
    return Response.html(html, 200, session.getCookie());
  }


  async getRecentResubmissions() {
    const recents = await this.dynamoDBClient.send(new QueryCommand({
      TableName: process.env.RESUBMISSION_TABLE_NAME,
      ScanIndexForward: false, // true = ascending, false = descending
      Limit: 30,
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': { S: RESUBMISSION },
      }
    }));
    const mapped = recents.Items?.map(item => {
      return {
        ref: item.reference.S,
        timestamp: item.timestamp.S,
        user: item.user?.S ?? '-',
      };
    });
    return mapped;
  }

  async addToRecentResubmissions(reference: string, user: string) {
    const timestamp = new Date().toISOString();
    const ttl = Date.now() + (1000 * 3600 * 24 * 30); // 30 days
    await this.dynamoDBClient.send(new PutItemCommand({
      Item: {
        id: { S: RESUBMISSION },
        reference: { S: reference },
        timestamp: { S: timestamp },
        user: { S: user },
        ttl: { N: ttl.toString() },
      },
      TableName: process.env.RESUBMISSION_TABLE_NAME,
    }));
  }

}
