export abstract class Statics {
  static readonly projectName: string = 'webformulieren-management';

  /**
   * Authentication URL base, used in auth and login lambda
   */
  static readonly ssmAuthUrlBaseParameter: string = `/cdk/${this.projectName}/authUrlBase`;


  // Managed in dns-managment project:
  // Below references the new hosted zone separeted from webformulieren
  static readonly accountRootHostedZonePath: string = '/gemeente-nijmegen/account/hostedzone';
  static readonly accountRootHostedZoneId: string = '/gemeente-nijmegen/account/hostedzone/id';
  static readonly accountRootHostedZoneName: string = '/gemeente-nijmegen/account/hostedzone/name';

  /**
   * Route53 Zone ID and name for the zone for Mijn Nijmegen. decouples stacks to not pass
   * the actual zone between stacks. This param is set by DNSStack and should not be modified after.
   */
  static readonly ssmZonePath: string = `/cdk/${this.projectName}/zone`;
  static readonly ssmHostedZoneId: string = `/cdk/${this.projectName}/zone/id`;
  static readonly ssmHostedZoneName: string = `/cdk/${this.projectName}/zone/name`;


  static readonly certificatePath: string = `/cdk/${this.projectName}/certificates`;
  static readonly certificateArn: string = `/cdk/${this.projectName}/certificates/certificate-arn`;

  static readonly ssmOIDCClientSecret = `/cdk/${this.projectName}/secrets/oidc/client-secret`;
  static readonly ssmApiKeySecretWebformsManagment = `/cdk/${this.projectName}/secrets/webforms-management/api-key`;
  static readonly ssmApiKeySecretSubmissionsFormOverview = `/cdk/${this.projectName}/secrets/webforms-management/form-overview-api-key`;

  static readonly ssmAuthorizedUserEmails = `/cdk/${this.projectName}/authentication/authorized-emails`;

  // ENVIRONMENTS

  static readonly gnBuild = {
    account: '836443378780',
    region: 'eu-central-1',
  };

  static readonly gnWebformsAccp = {
    account: '338472043295',
    region: 'eu-central-1',
  };

  static readonly gnWebformsProd = {
    account: '147064197580',
    region: 'eu-central-1',
  };

}