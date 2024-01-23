import * as fs from 'fs';
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { Webpage } from './ApiFunction';
import { OpenIdConnectConnectionProfile } from './OIDCConnectionProfile';
import { SessionsTable } from './SessionsTable';
import { AuthFunction } from './webapp/auth/auth-function';
import { LoginFunction } from './webapp/login/login-function';
import { LogoutFunction } from './webapp/logout/logout-function';

export interface ApiProps {
  /**
   * The dynamodb session table
   */
  sessionsTable: SessionsTable;
  /**
   * The name of this application
   */
  applicationName: string;
  /**
   * Flag to incidate if the user should be redirected to
   * the /post-login endpoint with the post login handler.
   */
  usePostLoginProcessor: boolean;
  /**
   * Path to the source directory of additional files to pack into the lambda
   * e.g. header.mustache, config.json
   * @default - no custom lambda layer is created
   */
  customLambdaLayerDir?: string;
  /**
   * The role to be used by the lambdas
   */
  lambdaRole: IRole;
  /**
   * Session lifetime in minutes
   * @default 15
   */
  sessionLifetime?: number;

  /**
   * The OIDC profile configuration to pass to the lambda.
   */
  oidcProfiles: OpenIdConnectConnectionProfile[];
}

/**
 * The API Stack creates the API Gateway and related
 * lambda's. It requires supporting resources (such as the
 * DynamoDB sessions table to be provided and thus created first)
 */
export class Api extends Construct {
  private sessionsTable: Table;
  private customLambdaLayer?: LayerVersion;
  private configurationLambdaLayer: LayerVersion;
  private props: ApiProps;
  api: apigatewayv2.HttpApi;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);
    this.props = props;
    this.sessionsTable = props.sessionsTable.table;
    this.customLambdaLayer = this.setupCustomLambdaLayer(props.customLambdaLayerDir);
    this.configurationLambdaLayer = this.setupConfigurationLambdaLayer(props.oidcProfiles);

    this.api = new apigatewayv2.HttpApi(this, 'gateway', {
      description: `API Gateway webapp: ${props.applicationName}`,
    });

    this.setFunctions(props);
  }

  /**
   * Create a lambda layer that incldues templates overwrites
   * and configuration files. It is made available to all lambda
   * registerd in this webapp.
   * @param props
   */
  setupCustomLambdaLayer(customLambdaLayerDir?: string) {
    if (!customLambdaLayerDir) { return; }
    return new lambda.LayerVersion(this, 'layer', {
      code: lambda.Code.fromAsset(customLambdaLayerDir),
    });
  }

  /**
   * Create a configuration lambda layer that contains the configuration files
   * for the lambda.
   * @param profiles
   */
  setupConfigurationLambdaLayer(profiles: OpenIdConnectConnectionProfile[]) {
    // Create temp directory (use projen assets dir)
    const tempDir = './assets/webapp/configuration-layer';
    fs.mkdirSync(tempDir, { recursive: true });

    // Write configuration objects to JSON files in temp dir
    const authenticationJson = JSON.stringify(profiles);
    fs.writeFileSync(`${tempDir}/authentication.json`, authenticationJson);

    // Make layer using the temp directory
    return new lambda.LayerVersion(this, 'configuration-layer', {
      code: lambda.Code.fromAsset(tempDir),
      description: 'Webapp construct managed layer to inject configuration files in lambdas',
    });
  }

  /**
   * Create and configure lambda's for all api routes, and
   * add routes to the gateway.
   */
  setFunctions(props: ApiProps) {
    const loginFunction = new Webpage(this, 'login-function', {
      description: `Login page for webapp ${props.applicationName}.`,
      apiFunction: LoginFunction,
      role: props.lambdaRole,
    });
    this.addRoute('login', loginFunction, '/login', [apigatewayv2.HttpMethod.GET]);

    const logoutFunction = new Webpage(this, 'logout-function', {
      description: `Logout page for webapp ${props.applicationName}.`,
      apiFunction: LogoutFunction,
      role: props.lambdaRole,
    });
    this.addRoute('logout', logoutFunction, '/logout', [apigatewayv2.HttpMethod.GET]);

    const authFunction = new Webpage(this, 'auth-function', {
      description: `Auth landingpoint for webapp ${props.applicationName}.`,
      role: props.lambdaRole,
      apiFunction: AuthFunction,
      environment: {
        REDIRECT_TO_POST_LOGIN_HOOK: props.usePostLoginProcessor ? 'true' : 'false',
      },
    });
    this.addRoute('auth', authFunction, '/auth', [apigatewayv2.HttpMethod.GET]);
  }

  /**
   * Add a new page to the webapp
   * @param id
   * @param handler
   * @param path
   * @param methods
   */
  addRoute(id: string, handler: Webpage, path: string, methods: HttpMethod[]) {
    handler.allowSessionAccess(this.sessionsTable);
    if (this.customLambdaLayer) { handler.addLambdaLayer(this.customLambdaLayer); }
    handler.addLambdaLayer(this.configurationLambdaLayer);
    handler.setSessionLifetime(this.props.sessionLifetime ?? 15);
    handler.monitor(this.props.applicationName);
    handler.addStandardEnvironment(this.props.applicationName);
    this.api.addRoutes({
      path,
      methods,
      integration: new HttpLambdaIntegration(id, handler.lambda),
    });
  }

  /**
   * Clean and return the apigateway subdomain placeholder
   * https://${Token[TOKEN.246]}.execute-api.eu-west-1.${Token[AWS.URLSuffix.3]}/
   * which can't be parsed by the URL class.
   *
   * @returns a domain-like string cleaned of protocol and trailing slash
   */
  domain(): string {
    const url = this.api.url;
    if (!url) { return ''; }
    let cleanedUrl = url
      .replace(/^https?:\/\//, '') //protocol
      .replace(/\/$/, ''); //optional trailing slash
    return cleanedUrl;
  }

}