import { HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { IGrantable, IPrincipal, IRole, ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Api } from './Api';
import { Cloudfront } from './Cloudfront';
import { SessionsTable } from './SessionsTable';
import { WebappOptions } from './WebappOptions';
import { Webpage } from './Webpage';

export class Webapp extends Construct implements IGrantable {
  readonly api: Api;
  readonly cloudfront: Cloudfront;
  readonly sessions: SessionsTable;

  grantPrincipal: IPrincipal;

  constructor(scope: Construct, id: string, props: WebappOptions) {
    super(scope, id);

    // Defaults
    props.sessionLifetime = props.sessionLifetime ?? 15;

    // Principal used by lambdas
    this.grantPrincipal = this.setupLambdaExecutionRole(props);

    // Sessions
    this.sessions = new SessionsTable(this, 'sessions', {
      name: `${props.applicationName}-sessions-table`,
    });

    // API gateway
    this.api = new Api(this, 'api', {
      webappOptions: props,
      sessionsTable: this.sessions,
      lambdaRole: this.grantPrincipal as IRole, // The IGrantable interface only lets us use an IPrincipal, so cast
    });
    this.api.node.addDependency(this.sessions);

    // Cloudfront distribution
    this.cloudfront = new Cloudfront(this, 'cloudfront', {
      webappOptions: props,
      apiGatewayDomain: this.api.domain(),
    });
    this.cloudfront.node.addDependency(this.api);

    // Post process login function
    if (props.postLoginProcessor) {
      this.addPage('post-login', props.postLoginProcessor, '/post-login');
    }

  }

  private setupLambdaExecutionRole(props: WebappOptions) {
    return new Role(this, 'role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: `Role used for lambdas in webapp ${props.applicationName}`,
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });
  }

  /**
   * Add another page to the webapp
   * @param id
   * @param path
   * @param methods
   * @param handler
   */
  addPage(id: string, handler: Webpage, path: string, methods: HttpMethod[] = [HttpMethod.GET] ) {
    this.api.addRoute(id, handler, path, methods);
  }

}