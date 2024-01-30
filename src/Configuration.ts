import { Statics } from './statics';
import { OpenIdConnectConnectionProfile } from './webapp/OIDCConnectionProfile';

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

  oidcProfiles: OpenIdConnectConnectionProfile[];
}


const EnvironmentConfigurations: {[key:string]: Configuration} = {
  acceptance: {
    branch: 'acceptance',
    buildEnvironment: Statics.gnBuild,
    deploymentEnvironment: Statics.gnWebformsAccp,
    pipelineStackCdkName: 'webformulieren-management-acceptance-pipeline-stack',
    pipelineName: 'webformulieren-management-acceptance',
    webformsManagementApiBaseUrl: 'https://eform-api.webformulieren.webforms-accp.csp-nijmegen.nl',
    resources: 'src/resources-accp',
    oidcProfiles: [
      {
        name: 'microsoft',
        title: 'Gemeente Nijmegen account',
        cssClass: 'btn-microsoft',
        clientId: 'NLQoT5arUEkxEvcq4dRsyMGjhs1fxXJI',
        clientSecretArn: 'arn:aws:secretsmanager:eu-central-1:338472043295:secret:/cdk/webformulieren-management/secrets/oidc/client-secret-DjnIhi',
        applicationBaseUrl: 'https://webformulieren-management.webforms-accp.csp-nijmegen.nl',
        authenticationBaseUrl: 'https://authenticatie-accp.nijmegen.nl',
        scope: 'openid idp_scoping:microsoft',
        immediateRedirect: false,
      },
    ],
  },
  main: {
    branch: 'main',
    buildEnvironment: Statics.gnBuild,
    deploymentEnvironment: Statics.gnWebformsProd,
    pipelineStackCdkName: 'webformulieren-management-main-pipeline-stack',
    pipelineName: 'webformulieren-management-main',
    webformsManagementApiBaseUrl: 'https://eform-api.webformulieren.auth-prod.csp-nijmegen.nl',
    resources: 'src/resources-prod',
    oidcProfiles: [
      {
        name: 'microsoft',
        title: 'Gemeente Nijmegen account',
        cssClass: 'btn-microsoft',
        clientId: 'yxtUvlHufAHyLZjLICDaQfAsGRJj1BmS',
        clientSecretArn: 'arn:aws:secretsmanager:eu-central-1:147064197580:secret:/cdk/webformulieren-management/secrets/oidc/client-secret-VBIqUi',
        applicationBaseUrl: 'https://webformulieren-management.webforms-prod.csp-nijmegen.nl',
        authenticationBaseUrl: 'https://authenticatie.nijmegen.nl',
        scope: 'openid idp_scoping:microsoft',
        immediateRedirect: false,
      },
    ],
  },
};

export function getEnvironmentConfiguration(branchName: string) {
  const conf = EnvironmentConfigurations[branchName];
  if (!conf) {
    throw Error(`No configuration found for branch ${branchName}`);
  }
  return conf;
}
