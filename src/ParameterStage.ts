import { Stack, Stage } from 'aws-cdk-lib';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Statics } from './statics';

export class ParameterStage extends Stage {
  constructor(scope: any, id: string, props?: any) {
    super(scope, id, props);
    new ParameterStack(this, 'stack');
  }
}

export class ParameterStack extends Stack {
  constructor(scope: any, id: string, props?: any) {
    super(scope, id, props);

    // Define parameter for all emails that are authorized to use this app
    new StringParameter(this, 'authorized-user-emails', {
      parameterName: Statics.ssmAuthorizedUserEmails,
      stringValue: '-', // Filled manually to keep emails from the code base
      description: 'Comma separated list of emails that are authorized to use the webapp',
    });

    // Setup OIDC client secret
    new Secret(this, 'oidc-client-secret', {
      description: 'The OIDC client secret for the Signicat connection',
      secretName: Statics.ssmOIDCClientSecret,
    });

    // Setup API key secret (eform-api)
    new Secret(this, 'api-key-secret', {
      description: 'The API KEY secret for the management api of webformulieren',
      secretName: Statics.ssmApiKeySecretWebformsManagment,
    });

  }
}