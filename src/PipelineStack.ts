import { PermissionsBoundaryAspect } from '@gemeentenijmegen/aws-constructs';
import { Stack, StackProps, Tags, pipelines, CfnParameter, Aspects } from 'aws-cdk-lib';
import { Repository } from 'aws-cdk-lib/aws-codecommit';
import { Construct } from 'constructs';
import { AppStage } from './AppStage';
import { Configurable } from './Configuration';
import { ParameterStage } from './ParameterStage';
import { Statics } from './statics';

export interface PipelineStackProps extends StackProps, Configurable {}

export class PipelineStack extends Stack {
  branchName: string;
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);
    Tags.of(this).add('cdkManaged', 'yes');
    Tags.of(this).add('Project', Statics.projectName);
    Aspects.of(this).add(new PermissionsBoundaryAspect());
    this.branchName = props.configuration.branch;

    const connectionArn = new CfnParameter(this, 'connectionArn');
    const source = this.connectionSource(connectionArn);

    const pipeline = this.pipeline(source, props);

    pipeline.addStage(new ParameterStage(this, 'webformulieren-management-parameters', {
      env: props.configuration.deploymentEnvironment,
    }));

    pipeline.addStage(new AppStage(this, 'webformulieren-managment', {
      env: props.configuration.deploymentEnvironment,
      configuration: props.configuration,
    }));

  }


  repository() {
    return new Repository(this, 'repository', {
      repositoryName: Statics.projectName,
    });
  }

  pipeline(source: pipelines.CodePipelineSource, props: PipelineStackProps): pipelines.CodePipeline {
    const synthStep = new pipelines.ShellStep('Synth', {
      input: source,
      env: {
        BRANCH_NAME: this.branchName,
      },
      commands: [
        'yarn install --frozen-lockfile',
        'yarn build',
      ],
    });

    const pipeline = new pipelines.CodePipeline(this, props.configuration.pipelineName, {
      pipelineName: props.configuration.pipelineName,
      crossAccountKeys: true,
      synth: synthStep,
    });
    return pipeline;
  }

  private connectionSource(connectionArn: CfnParameter): pipelines.CodePipelineSource {
    return pipelines.CodePipelineSource.connection('GemeenteNijmegen/webformulieren-management', this.branchName, {
      connectionArn: connectionArn.valueAsString,
    });
  }
}
