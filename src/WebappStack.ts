import { Stack, StackProps, Tags, aws_dynamodb as DynamoDB, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { RemoteParameters } from 'cdk-remote-stack';
import { Construct } from 'constructs';
import { FormoverviewFunction } from './app/formoverview/formoverview-function';
import { HomeFunction } from './app/home/home-function';
import { PostloginFunction } from './app/post-login/postlogin-function';
import { ResubmitFunction } from './app/resubmit/resubmit-function';
import { Configurable } from './Configuration';
import { Statics } from './statics';
import { Webapp } from './webapp/Webapp';
import { Webpage } from './webapp/Webpage';

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
    // Setup API key secret (submissions form overview)
    const formOverviewApiKeySecret = new Secret(this, 'form-overview-api-key-secret', {
      description: 'The API KEY secret for the webforms-submissions formoverview api',
      secretName: Statics.ssmApiKeySecretSubmissionsFormOverview,
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
    const webapp = new Webapp(this, 'app', {
      applicationName: Statics.projectName,
      cloudFrontCertificate: certificate,
      domainName: `${hostedZone.zoneName}`,
      additionalSourceFilesDir: 'src/resources',
      hostedZone: hostedZone,
      staticResourcesDirectory: './src/app/static-resources/',
      defaultPath: '/home',
      postLoginProcessor: this.postLoginHook(),
      oidcProfiles: props.configuration.oidcProfiles,
      sessionLifetime: 60,
    });

    /**
     * Cool trick for building the webapp!
     * Grants all standard lambdas read rights on the secret.
     * That is the login, logout and auth lambda
     */
    clientSecret.grantRead(webapp);

    this.addHomePage(webapp);
    this.addResubmitPage(webapp, resubmissionTable, apiKeySecret, props);
    this.addFormOverviewPage(webapp, formOverviewApiKeySecret, props);
  }

  /**
   * Add a home page to the webapp
   * @param webapp
   */
  addHomePage(webapp: Webapp) {
    const homeFunction = new Webpage(this, 'home-function', {
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
  addResubmitPage(webapp: Webapp, resubmissionTable: DynamoDB.Table, apiKeySecret: ISecret, props: WebappStackProps) {
    const resubmitFunction = new Webpage(this, 'resubmit-function', {
      description: 'Resubmit lambda',
      apiFunction: ResubmitFunction,
      environment: {
        RESUBMISSION_TABLE_NAME: resubmissionTable.tableName,
        MANAGEMENT_API_KEY_SECRET_ARN: apiKeySecret.secretArn,
        MANAGEMENT_API_BASE_URL: props.configuration.webformsManagementApiBaseUrl,
      },
      timeout: Duration.seconds(6), // Long but the resubmission takes some time when cold started
    });
    apiKeySecret.grantRead(resubmitFunction.lambda);
    resubmissionTable.grantReadWriteData(resubmitFunction.lambda);
    webapp.addPage('resubmit', resubmitFunction, '/resubmit');
  }

  addFormOverviewPage(webapp: Webapp, formOverviewApiKeySecret: ISecret, props: WebappStackProps) {
    const formOverviewFunction = new Webpage(this, 'formoverview-function', {
      description: 'FormOverview lambda',
      apiFunction: FormoverviewFunction,
      environment: {
        FORMOVERVIEW_API_KEY_SECRET_ARN: formOverviewApiKeySecret.secretArn,
        FORMOVERVIEW_API_BASE_URL: props.configuration.webformsSubmissionsApiBaseUrl,
      },
      timeout: Duration.seconds(6), // Long but the resubmission takes some time when cold started
    });
    formOverviewApiKeySecret.grantRead(formOverviewFunction.lambda);
    webapp.addPage('formoverview', formOverviewFunction, '/formoverview');
    webapp.addPage('formoverview-download', formOverviewFunction, '/formoverview/download/{file+}');
  }

  /**
   * Constrcut a post-login hook function that is passed directly
   * to the webapp. It will register the function and redirect trafic
   * there after the pre-login (auth lambda).
   * @returns
   */
  postLoginHook() {
    return new Webpage(this, 'post-login-function', {
      description: 'Post-login lambda',
      apiFunction: PostloginFunction,
      environment: {
        AUTHORIZED_USER_EMAILS: StringParameter.valueForStringParameter(this, Statics.ssmAuthorizedUserEmails),
      },
    });
  }

}
