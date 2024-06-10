import { HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { IGrantable, IPrincipal } from 'aws-cdk-lib/aws-iam';
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

  constructor(scope: Construct, id: string, props: WebappOptions) {
    super(scope, id);

    // Defaults
    props.sessionLifetime = props.sessionLifetime ?? 15;

    // Sessions
    this.sessions = new SessionsTable(this, 'sessions', {
      name: `${props.applicationName}-sessions-table`,
    });

    // API gateway
    this.api = new Api(this, 'api', {
      webappOptions: props,
      sessionsTable: this.sessions,
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

  get grantPrincipal() : IPrincipal { // Hack to keep the role in the API construct
    return this.api.role;
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
