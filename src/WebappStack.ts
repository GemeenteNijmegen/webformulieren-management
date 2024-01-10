import { Stack, StackProps, Tags, aws_dynamodb as DynamoDB, RemovalPolicy } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { RemoteParameters } from 'cdk-remote-stack';
import { Construct } from 'constructs';
import { ApiFunction } from './ApiFunction';
import { HomeFunction } from './app/home/home-function';
import { PostloginFunction } from './app/post-login/postlogin-function';
import { ResubmitFunction } from './app/resbumit/resubmit-function';
import { Configurable } from './Configuration';
import { Statics } from './statics';
import { WebappConstruct } from './WebappConstruct';

export interface WebappStackProps extends StackProps, Configurable {}

/**
 * Stage responsible for the API Gateway and lambdas
 */
export class WebappStack extends Stack {
  constructor(scope: Construct, id: string, props: WebappStackProps) {
    super(scope, id, props);

    Tags.of(this).add('cdkManaged', 'yes');
    Tags.of(this).add('Project', Statics.projectName);

    // Import certificate from us-east-1
    const remoteCertificateArn = new RemoteParameters(this, 'remote-certificate-arn', {
      path: Statics.certificatePath,
      region: 'us-east-1',
    });
    const certificate = Certificate.fromCertificateArn(this, 'certificate', remoteCertificateArn.get(Statics.certificateArn));

    // Import hosted zone (parameters) from us-east-1
    const remoteHostedZone = new RemoteParameters(this, 'remote-hosted-zone', {
      path: Statics.ssmZonePath,
      region: 'us-east-1',
    });
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'hosted-zone', {
      hostedZoneId: remoteHostedZone.get(Statics.ssmHostedZoneId),
      zoneName: remoteHostedZone.get(Statics.ssmHostedZoneName),
    });

    // Setup OIDC client secret
    const clientSecret = new Secret(this, 'oidc-client-secret', {
      description: 'The OIDC client secret for the Signicat connection',
      secretName: Statics.ssmOIDCClientSecret,
    });

    // Setup API key secret (eform-api)
    const apiKeySecret = new Secret(this, 'api-key-secret', {
      description: 'The API KEY secret for the management api of webformulieren',
      secretName: Statics.ssmApiKeySecretWebformsManagment,
    });

    // Setup a table to keep track of recent resubmissions
    const resubmissionTable = new DynamoDB.Table(this, 'resubmission-table', {
      partitionKey: { name: 'id', type: DynamoDB.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: DynamoDB.AttributeType.STRING },
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    /**
     * Create the webapp!
     */
    const webapp = new WebappConstruct(this, 'app', {
      applicationName: 'webformulieren-management',
      cloudFrontCertificate: certificate,
      domainName: 'webformulieren-management.sandbox-marnix.csp-nijmegen.nl',
      additionalSourceFilesDir: 'src/inject',
      hostedZone: hostedZone,
      staticResourcesDirectory: './src/app/static-resources/',
      defaultPath: '/home',
      postLoginProcessor: this.postLoginHook(),
    });

    /**
     * Cool trick for building the webapp!
     * Grants all standard lambdas read rights on the secret.
     * That is the login, logout and auth lambda
     */
    clientSecret.grantRead(webapp);

    this.addHomePage(webapp);
    this.addResubmitPage(webapp, resubmissionTable, apiKeySecret, props);
  }

  /**
   * Add a home page to the webapp
   * @param webapp
   */
  addHomePage(webapp: WebappConstruct) {
    const homeFunction = new ApiFunction(this, 'home-function', {
      description: 'Home lambda',
      apiFunction: HomeFunction,
    });
    webapp.addPage('home', homeFunction, '/home');
  }

  /**
   * Add a resubmit page to the webapp
   * @param webapp
   * @param resubmissionTable
   * @param apiKeySecret
   * @param props
   */
  addResubmitPage(webapp: WebappConstruct, resubmissionTable: DynamoDB.Table, apiKeySecret: Secret, props: WebappStackProps) {
    const resubmitFunction = new ApiFunction(this, 'resubmit-function', {
      description: 'Resubmit lambda',
      apiFunction: ResubmitFunction,
      environment: {
        RESUBMISSION_TABLE_NAME: resubmissionTable.tableName,
        MANAGEMENT_API_KEY_SECRET_ARN: apiKeySecret.secretArn,
        MANAGEMENT_API_BASE_URL: props.configuration.webformsManagementApiBaseUrl,
      },
    });
    apiKeySecret.grantRead(resubmitFunction.lambda);
    resubmissionTable.grantReadWriteData(resubmitFunction.lambda);
    webapp.addPage('resubmit', resubmitFunction, '/resubmit');
  }

  /**
   * Constrcut a post-login hook function that is passed directly
   * to the webapp. It will register the function and redirect trafic
   * there after the pre-login (auth lambda).
   * @returns
   */
  postLoginHook() {
    return new ApiFunction(this, 'post-login-function', {
      description: 'Post-login lambda',
      apiFunction: PostloginFunction,
    });
  }

}
