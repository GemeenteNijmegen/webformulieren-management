import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import * as loginTemplate from './templates/login.mustache';
import { OpenIDConnect } from '../util/OpenIDConnect';
import { render } from '../util/render';

interface LoginRequestHandlerProps {
  /**
   * Provide an object that is used to create the authentication urls
   * and render the buttons
   */
  oidcProfiles: any[];
  /**
   * Optionally overwrite the packaged default template
   */
  templateOverwrite?: string;
}

export class LoginRequestHandler {
  private config: LoginRequestHandlerProps;
  constructor(props: LoginRequestHandlerProps) {
    this.config = props;
  }

  async handleRequest(cookies: string, dynamoDBClient: DynamoDBClient):Promise<ApiGatewayV2Response> {

    // Check if loggedin
    let session = new Session(cookies, dynamoDBClient, {
      ttlInMinutes: parseInt(process.env.SESSION_TTL_MIN ?? '15'),
    });
    await session.init();
    if (session.isLoggedIn() === true) {
      console.debug('redirect to default page');
      return Response.redirect('/');
    }

    // Construct new sesssion and redirect urls
    const states: {[key: string]: string} = {};
    const authenticationOptions: any[] = [];
    for (const profile of this.config.oidcProfiles) {
      let OIDC = new OpenIDConnect({
        clientId: profile.clientId,
        clientSecretArn: '', // Not used for generating urls
        applicationBaseUrl: profile.applicationBaseUrl,
        authenticationBaseUrl: profile.authenticationBaseUrl,
      });

      // Create a state & store it in the session store
      const state = OpenIDConnect.generateState();
      states[state] = profile.name;

      const authUrl = OIDC.getLoginUrl(state, profile.scope);

      if (profile.immediateRedirect) {
        const newCookies = [session.getCookie()];
        return Response.redirect(authUrl, 302, newCookies);
      }

      authenticationOptions.push({
        title: profile.title,
        class: profile.cssClass,
        authUrl: authUrl,
      });
    }

    await session.createSession({
      loggedin: { BOOL: false },
      states: { S: JSON.stringify(states) },
    });

    // Show the page
    const data = {
      title: 'Inloggen',
      authenticationOptions: authenticationOptions,
    };

    const template = this.config.templateOverwrite ?? loginTemplate.default;
    const html = await render(data, template);
    const newCookies = [session.getCookie()];
    return Response.html(html, 200, newCookies);
  }
}
