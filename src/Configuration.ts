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
   * Sandbox deployment
   * @default false
   */
  sandobxDeployment?: boolean;

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
}


const EnvironmentConfigurations: {[key:string]: Configuration} = {
  marnix: {
    branch: 'marnix',
    buildEnvironment: Statics.gnSandboxMarnix,
    deploymentEnvironment: Statics.gnSandboxMarnix,
    pipelineStackCdkName: 'webformulieren-management-interface-sandbox-marnix',
    pipelineName: 'webformulieren-management-interface-sandbox-marnix',
    sandobxDeployment: true,
    webformsManagementApiBaseUrl: 'https://eform-api.webformulieren.webforms-dev.csp-nijmegen.nl',
  },
};

export function getEnvironmentConfiguration(branchName: string) {
  const conf = EnvironmentConfigurations[branchName];
  if (!conf) {
    throw Error(`No configuration found for branch ${branchName}`);
  }
  return conf;
}
