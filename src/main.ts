import { App } from 'aws-cdk-lib';
import * as Dotenv from 'dotenv';
import { getEnvironmentConfiguration } from './Configuration';
import { PipelineStack } from './PipelineStack';

Dotenv.config();
const app = new App();

const branchToBuild = getBranchToBuild();
const configuration = getEnvironmentConfiguration(branchToBuild);

new PipelineStack(app, configuration.pipelineStackCdkName, {
  env: configuration.buildEnvironment,
  configuration: configuration,
});

app.synth();


/**
 * Pick a branch configuration to build
 * 1. Environment variable BRANCH_NAME
 * 2. Environment variable GITHUB_BASE_REF (target branch for github PR)
 * 3. main
 * @returns branchToBuild
 */
function getBranchToBuild() {
  const githubBaseBranchName = process.env.GITHUB_BASE_REF;
  const environmentBranchName = process.env.BRANCH_NAME;
  if (environmentBranchName) {
    return environmentBranchName;
  }
  if (githubBaseBranchName) {
    try {
      getEnvironmentConfiguration(githubBaseBranchName);
      return githubBaseBranchName;
    } catch {
      console.error(`${githubBaseBranchName} has no valid configuration, using default`);
    }
  }
  return 'marnix';
}