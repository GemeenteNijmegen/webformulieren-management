import { HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IGrantable, IPrincipal, IRole, ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { Api } from './ApiConstruct';
import { Webpage } from './ApiFunction';
import { Cloudfront } from './CloudfrontStack';
import { OpenIdConnectConnectionProfile } from './OIDCConnectionProfile';
import { SessionsTable } from './SessionsTable';


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
}


export class Webapp extends Construct implements IGrantable {
  readonly api: Api;
  readonly cloudfront: Cloudfront;
  readonly sessions: SessionsTable;

  grantPrincipal: IPrincipal;

  constructor(scope: Construct, id: string, props: WebappOptions) {
    super(scope, id);

    // Principal used by lambdas
    this.grantPrincipal = this.setupLambdaExecutionRole(props);

    // Sessions
    this.sessions = new SessionsTable(this, 'sessions', {
      name: `${props.applicationName}-sessions-table`,
    });

    // API gateway
    this.api = new Api(this, 'api', {
      sessionsTable: this.sessions,
      applicationName: props.applicationName,
      lambdaRole: this.grantPrincipal as IRole, // The IGrantable interface only lets us use an IPrincipal, so cast
      usePostLoginProcessor: props.postLoginProcessor != undefined,
      customLambdaLayerDir: props.additionalSourceFilesDir,
      sessionLifetime: 60,
      oidcProfiles: props.oidcProfiles,
    });
    this.api.node.addDependency(this.sessions);

    // Cloudfront distribution
    this.cloudfront = new Cloudfront(this, 'cloudfront', {
      certificate: props.cloudFrontCertificate,
      hostedZone: props.hostedZone,
      apiGatewayDomain: this.api.domain(),
      cloudfrontDomainNames: this.cloudfrontDomainNames(props),
      staticResourcesDirectory: props.staticResourcesDirectory,
      defaultPath: props.defaultPath,
    });
    this.cloudfront.node.addDependency(this.api);

    // Post process login function
    if (props.postLoginProcessor) {
      this.addPage('post-login', props.postLoginProcessor, '/post-login');
    }

  }

  private setupLambdaExecutionRole(props: WebappOptions) {
    return new Role(this, 'role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: `Role used for lambdas in webapp ${props.applicationName}`,
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });
  }

  private cloudfrontDomainNames(props: WebappOptions) {
    let cloudfrontDomainNames = props.alternativeDomainNames ?? [];
    cloudfrontDomainNames.push(props.domainName);
    return cloudfrontDomainNames;
  }

  /**
   * Add another page to the webapp
   * @param id
   * @param path
   * @param methods
   * @param handler
   */
  addPage(id: string, handler: Webpage, path: string, methods: HttpMethod[] = [HttpMethod.GET] ) {
    this.api.addRoute(id, handler, path, methods);
  }

}