import { Statics } from './statics';

/**
 * Adds a configuration field to another interface
 */
export interface Configurable {
  configuration: Configuration;
}

/**
 * Environment object (required fields)
 */
export interface Environment {
  account: string;
  region: string;
}

/**
 * Basic configuration options per environment
 */
export interface Configuration {
  /**
   * Branch name for the applicible branch (this branch)
   */
  branch: string;

  /**
   * Environment to place the pipeline
   */
  buildEnvironment: Environment;

  /**
   * Environment to deploy the application
   */
  deploymentEnvironment: Environment;

  /**
   * The CDK name of the pipeline stack (can be removed after
   * moving to new lz)
   */
  pipelineStackCdkName: string;
  pipelineName: string;
  /**
   * URL for the webforms management api
   */
  webformsManagementApiBaseUrl: string;

  /**
   * Path to directory containing resources that are bundled
   * into all lambdas.
   */
  resources: string;
}


const EnvironmentConfigurations: {[key:string]: Configuration} = {
  marnix: {
    branch: 'marnix',
    buildEnvironment: Statics.gnSandboxMarnix,
    deploymentEnvironment: Statics.gnSandboxMarnix,
    pipelineStackCdkName: 'webformulieren-management-interface-sandbox-marnix',
    pipelineName: 'webformulieren-management-interface-sandbox-marnix',
    webformsManagementApiBaseUrl: 'https://eform-api.webformulieren.webforms-dev.csp-nijmegen.nl',
    resources: 'src/resources-marnix',
  },
  acceptance: {
    branch: 'acceptance',
    buildEnvironment: Statics.gnBuild,
    deploymentEnvironment: Statics.gnWebformsAccp,
    pipelineStackCdkName: 'webformulieren-management-acceptance-pipeline-stack',
    pipelineName: 'webformulieren-management-acceptance',
    webformsManagementApiBaseUrl: 'https://eform-api.webformulieren.webforms-accp.csp-nijmegen.nl',
    resources: 'src/resources-accp',
  },
  main: {
    branch: 'main',
    buildEnvironment: Statics.gnBuild,
    deploymentEnvironment: Statics.gnWebformsProd,
    pipelineStackCdkName: 'webformulieren-management-production-pipeline-stack',
    pipelineName: 'webformulieren-management-production',
    webformsManagementApiBaseUrl: 'https://eform-api.webformulieren.webforms-prod.csp-nijmegen.nl',
    resources: 'src/resources-prod',
  },
};

export function getEnvironmentConfiguration(branchName: string) {
  const conf = EnvironmentConfigurations[branchName];
  if (!conf) {
    throw Error(`No configuration found for branch ${branchName}`);
  }
  return conf;
}
