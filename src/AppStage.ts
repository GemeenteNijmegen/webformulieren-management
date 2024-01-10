import { PermissionsBoundaryAspect } from '@gemeentenijmegen/aws-constructs';
import { Aspects, Stage, StageProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Configurable } from './Configuration';
import { Statics } from './statics';
import { UsEastStack } from './UsEastStack';
import { WebappStack } from './WebappStack';

export interface AppStageProps extends StageProps, Configurable {}

export class AppStage extends Stage {
  constructor(scope: Construct, id: string, props: AppStageProps) {
    super(scope, id, props);

    // Setup tagging and our permission boundary for all stacks
    Tags.of(this).add('cdkManaged', 'yes');
    Tags.of(this).add('Project', Statics.projectName);
    Aspects.of(this).add(new PermissionsBoundaryAspect());

    // Deploy resources that must exist in us-east-1
    const usEastStack = new UsEastStack(this, 'us-east-stack', {
      env: { region: 'us-east-1' },
      accountHostedZoneRegion: 'eu-central-1',
      subdomain: 'webformulieren-management',
      alternativeDomainNames: undefined, // No nijmegen.nl subdomain
    });

    // Deploy our webapp
    const webappStack = new WebappStack(this, 'web', {
      configuration: props.configuration,
    });
    webappStack.addDependency(usEastStack);


  }
}
