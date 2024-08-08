import { Stack, Stage } from 'aws-cdk-lib';
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
  }
}
