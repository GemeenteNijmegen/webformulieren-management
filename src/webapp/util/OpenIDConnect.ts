import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { IdTokenClaims, Issuer, generators } from 'openid-client';

export interface OpenIDConnectOptions {
  readonly clientId: string;
  readonly clientSecretArn: string;
  readonly authenticationBaseUrl: string;
  readonly applicationBaseUrl: string;
}

export class OpenIDConnect {

  static generateState() {
    return generators.state();
  }

  issuer: Issuer;
  clientSecret?: string;

  private options: OpenIDConnectOptions;

  /**
   * Helper class for our OIDC auth flow
   */
  constructor(options: OpenIDConnectOptions) {
    this.issuer = this.getIssuer(options.authenticationBaseUrl);
    this.options = options;
  }

  /**
   * Retrieve client secret from secrets manager
   * @returns string the client secret
   */
  async getOidcClientSecret() {
    if (!this.clientSecret) {
      const secretsManagerClient = new SecretsManagerClient({});
      const command = new GetSecretValueCommand({ SecretId: this.options.clientSecretArn });
      const data = await secretsManagerClient.send(command);
      // Depending on whether the secret is a string or binary, one of these fields will be populated.
      if (data.SecretString) {
        this.clientSecret = data.SecretString;
      } else {
        console.error('no secret value found');
      }
    }
    return this.clientSecret;
  }

  /**
   * setup the oidc issuer. For now using env. parameters & hardcoded urls
   * Issuer could also be discovered based on file in .well-known, this
   * should be cached somehow.
   *
   * @returns openid-client Issuer
   */
  getIssuer(authenticationBaseUrl: string): Issuer {
    //Issuer.discover('https://authenticatie-accp.nijmegen.nl/broker/sp/oidc'); // TODO check for autodiscovery?
    const issuer = new Issuer({
      issuer: `${authenticationBaseUrl}/broker/sp/oidc`,
      authorization_endpoint: `${authenticationBaseUrl}/broker/sp/oidc/authenticate`,
      token_endpoint: `${authenticationBaseUrl}/broker/sp/oidc/token`,
      jwks_uri: `${authenticationBaseUrl}/broker/sp/oidc/certs`,
      userinfo_endpoint: `${authenticationBaseUrl}/broker/sp/oidc/userinfo`,
      revocation_endpoint: `${authenticationBaseUrl}/broker/sp/oidc/token/revoke`,
      introspection_endpoint: `${authenticationBaseUrl}/broker/sp/oidc/token/introspect`,
      end_session_endpoint: `${authenticationBaseUrl}/broker/sp/oidc/logout`,
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
      introspection_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
      revocation_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
      revocation_endpoint_auth_signing_alg_values_supported: ['RS256'],
    });
    return issuer;
  }

  /**
   * Get the login url for the OIDC-provider.
   * @param {string} state A string parameter that gets returned in the auth callback.
   * This should be checked before accepting the login response.
   * @returns {string} the login url
   */
  getLoginUrl(state: string, scope?: string): string {
    const base_url = new URL(this.options.applicationBaseUrl);
    const redirect_uri = new URL('/auth', base_url);
    const client = new this.issuer.Client({
      client_id: this.options.clientId,
      redirect_uris: [redirect_uri.toString()],
      response_types: ['code'],
    });
    const authUrl = client.authorizationUrl({
      scope,
      resource: this.options.authenticationBaseUrl,
      state: state,
    });
    return authUrl;
  }

  /**
     * Use the returned code from the OIDC-provider and stored state param
     * to complete the login flow.
     *
     * @param {string} code
     * @param {string} states
     * @returns {IdTokenClaims} returns a claims object on succesful auth
     */
  async authorize(code: string, states: string[], returnedState: string): Promise<IdTokenClaims> {
    const base_url = new URL(this.options.applicationBaseUrl);
    const redirect_uri = new URL('/auth', base_url);
    const client_secret = await this.getOidcClientSecret();
    const client = new this.issuer.Client({
      client_id: this.options.clientId,
      redirect_uris: [redirect_uri.toString()],
      client_secret: client_secret,
      response_types: ['code'],
    });
    const params = client.callbackParams(redirect_uri + '/?code=' + code + '&state=' + returnedState);
    if (!states.includes(returnedState)) {
      throw new Error('state does not match session state');
    }
    let tokenSet;
    try {
      tokenSet = await client.callback(redirect_uri.toString(), params, { state: returnedState });
    } catch (err: any) {
      throw new Error(`${err.error} ${err.error_description}`);
    }
    const claims = tokenSet.claims();
    if (claims.aud != this.options.clientId) {
      throw new Error('claims aud does not match client id');
    }
    return claims;

  }


}