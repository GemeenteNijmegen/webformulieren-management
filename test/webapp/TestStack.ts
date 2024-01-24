import { Stack } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { Webapp } from '../../src/webapp/Webapp';
import { OpenIdConnectConnectionProfile } from '../../src/webapp/OIDCConnectionProfile';
import { Function, FunctionProps } from 'aws-cdk-lib/aws-lambda';
import { Webpage } from '../../src/webapp/Webpage';

export interface TestStackProps {
  domainName?: string;
  alternativeDomainNames?: string[];
  additionalSourceFilesDir?: string;
  staticResourcesDirectory?: string;
  defaultPath?: string;
  oidcProfiles: OpenIdConnectConnectionProfile[];
  addHomePage?: boolean;
  postLoginProcessor? : Webpage;
  sessionLifetime?: number;
  cspHeader?: string;
}

/**
 * Configurable test stack
 */
export class TestStack extends Stack {
  constructor(scope: Construct, id: string, props: TestStackProps) {
    super(scope, id);

    const clientSecret = Secret.fromSecretNameV2(this, 'clientsecret', '/cdk/secrets/client-secret');
    const certificate = Certificate.fromCertificateArn(this, 'certificate', 'arn:aws:acm:us-east-1:1234567890:certificate/random-uuid');
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'hosted-zone', {
      hostedZoneId: 'ABC',
      zoneName: props.domainName ?? 'text.example.com',
    });
    
    /**
     * Create the webapp!
     */
    const webapp = new Webapp(this, 'app', {
      applicationName: id,
      cloudFrontCertificate: certificate,
      hostedZone: hostedZone,
      domainName: hostedZone.zoneName,
      additionalSourceFilesDir: props.additionalSourceFilesDir ?? './src/resources',
      staticResourcesDirectory: props.staticResourcesDirectory ?? './src/app/static-resources/',
      defaultPath: props.defaultPath ?? '/home',
      postLoginProcessor: props.postLoginProcessor,
      oidcProfiles: props.oidcProfiles,
      sessionLifetime: props.sessionLifetime ?? 60,
      alternativeDomainNames: props.alternativeDomainNames,
      cspHeaderValue: props.cspHeader,
    });

    // Test if granting works
    clientSecret.grantRead(webapp);

    // Test if adding a page works
    if(props.addHomePage){
      this.addHomePage(webapp);
    }
  }

  /**
   * Add a home page to the webapp
   * @param webapp
   */
  addHomePage(webapp: Webapp) {
    const homeFunction = new Webpage(this, 'home-function', {
      description: 'Home lambda',
      apiFunction: Function as (new (scope: Construct, id: string, props?: FunctionProps) => Function), // Type hack
    });
    webapp.addPage('home', homeFunction, '/home');
  }

}
