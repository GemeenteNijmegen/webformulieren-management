import { Stack, Stage } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Statics } from '../statics';

export class PermissionStage extends Stage {
  constructor(scope: any, id: string, props?: any) {
    super(scope, id, props);
    new PermissionStack(this, 'permission-stack');
  }
}

export class PermissionStack extends Stack {
  constructor(scope: any, id: string, props?: any) {
    super(scope, id, props);

    new StringParameter(this, 'ssm_permissions_table', {
      parameterName: Statics.ssmPermissionsTableArn,
      stringValue: '-',
      description: 'Tablename of the permissions table',
    });

  }
}