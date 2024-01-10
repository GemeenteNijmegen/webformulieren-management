export interface OpenIdConnectConnectionProfile {
  /**
   * The name of this profile must be unique
   */
  name: string;
  /**
   * The title to render for this proble
   */
  title: string;
  /**
   * The CSS class appended to the rendered href.
   */
  cssClass: string;
  /**
   * OIDC client ID
   * Note: if client ID ssm parameter is provided, this will be overwritten
   */
  clientId?: string;
  /**
   * Arn of the secretsmanager secret to lookup the
   * client secret.
   */
  clientSecretArn: string;
  /**
   * The base URL of the application, used to build the redirect url
   */
  applicationBaseUrl: string;
  /**
   * The base URL of the authentication provider
   */
  authenticationBaseUrl: string;
  /**
   * The scopes this profile requests and allows
   * Scopes are separated using spaces
   */
  scope: string;
  /**
   * Do not render the HTML page but redirect to this authentication
   * provider immediately.
   */
  immediateRedirect: boolean;
}