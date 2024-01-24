import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { OpenIdConnectConnectionProfile } from './OIDCConnectionProfile';
import { Webpage } from './Webpage';

export interface WebappConfigurable {
  webappOptions: WebappOptions;
}

export interface WebappOptions {
  /**
   * The name of the application, can only contain alphanumeric and hypens.
   */
  applicationName: string;

  /**
   * A own lambda to handle project specific logic for handling
   * the login e.g. validating claims, updating the session.
   * note: you are reponsible for redirecting the user to the home page after post login processing.
   * @default none
   */
  postLoginProcessor?: Webpage;

  /**
   * The certificate to use for the cloudfront distribution
   * (should be in us-east-1)
   */
  cloudFrontCertificate: ICertificate;

  /**
   * The domain name used by this webapp
   * This is used for creating redirect urls in the lambdas.
   */
  domainName: string;

  /**
   * Optional alternative domain names
   * Note: certificate provided must be valid for all alternative domain names!
   * @defualt none
   */
  alternativeDomainNames?: string[];

  /**
   * Relative path to a directroy that contains files that need to be packed into the lambda
   * e.g. header.mustache, footer.mustache
   */
  additionalSourceFilesDir: string;

  /**
   * The hosted zone in which to add A and AAAA records
   * for the cloudfront distribution
   */
  hostedZone: IHostedZone;

  /**
   * The directory with static resources that are made available through
   * CloudFront under the /statics and /.well-knonw path.
   */
  staticResourcesDirectory: string;

  /**
   * Default url path the user is send to.
   * Note: responsibility of creating the lambda lies by the user of this construct.
   */
  defaultPath: string;

  /**
   * OpenID Connect connection profiles
   */
  oidcProfiles: OpenIdConnectConnectionProfile[];

  /**
   * Session lifetime in minutes
   * @default 15
   */
  sessionLifetime?: number;

  /**
   * Overwrites the default CSP header value
   */
  cspHeaderValue?: string;
}