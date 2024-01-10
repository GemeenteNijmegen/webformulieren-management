import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { Statics } from '../../statics';
import { OpenIDConnect } from '../util/OpenIDConnect';

interface requestProps {
  cookies: string;
  queryStringParamCode: string;
  queryStringParamState: string;
  dynamoDBClient: DynamoDBClient;
  oidcProfiles: any[];
  redirectToPostLoginHook: boolean;
}

export class AuthRequestHandler {
  private config: requestProps;
  constructor(props: requestProps) {
    this.config = props;
  }

  async handleRequest() {
    const logger = new Logger({ serviceName: Statics.projectName });

    // Check for active session
    let session = new Session(this.config.cookies, this.config.dynamoDBClient, {
      ttlInMinutes: parseInt(process.env.SESSION_TTL_MIN ?? '15'),
    });
    await session.init();
    if (session.sessionId === false) {
      return Response.redirect('/login');
    }

    // Get the state from the session & find the coresponding profile
    const states = JSON.parse(session.getValue('states'));
    const profileName = states[this.config.queryStringParamState];
    if (!profileName) {
      console.error('state does not match session state');
      return Response.redirect('/login');
    }
    const profile = this.config.oidcProfiles.find(p => p.name === profileName);
    if (!profile) {
      console.error('No profile found for name', profileName);
      return Response.redirect('/login');
    }

    // Get claims
    try {
      const OIDC = new OpenIDConnect(profile);
      // Backchannel to get claims
      const claims = await OIDC.authorize(this.config.queryStringParamCode, Object.keys(states), this.config.queryStringParamState);
      if (claims) {

        // Log loggin information
        if (claims.hasOwnProperty('acr') && claims.hasOwnProperty('amr')) {
          logger.info('auth succesful', { loa: claims.acr, method: claims.amr });
        }

        // Store claims in session
        try {
          // Set status and loggedin value depending on if we have a post-login hook
          const loggedin = this.config.redirectToPostLoginHook ? false : true;
          const status = this.config.redirectToPostLoginHook ? 'pre-login' : 'loggedin';
          await session.createSession({
            loggedin: { BOOL: loggedin },
            status: { S: status },
            claims: { S: JSON.stringify(claims) },
            profileUsed: { S: profile.name },
          });
        } catch (error: any) {
          console.error(error.message);
          return Response.error(500);
        }

      } else {
        return Response.redirect('/login');
      }
    } catch (error: any) {
      console.error(error.message);
      return Response.redirect('/login');
    }

    const redirect = this.config.redirectToPostLoginHook ? '/post-login' : '/';
    return Response.redirect(redirect, 302, [session.getCookie()]);
  }

}
