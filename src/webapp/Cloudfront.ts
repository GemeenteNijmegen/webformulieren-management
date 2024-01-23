import * as fs from 'fs';
import * as path from 'path';
import {
  Duration,
  aws_route53 as Route53,
  aws_route53_targets as Route53Targets,
  aws_s3 as S3,
  aws_s3_deployment,
  aws_iam as IAM,
} from 'aws-cdk-lib';
import {
  Distribution,
  PriceClass,
  OriginRequestPolicy,
  ViewerProtocolPolicy,
  AllowedMethods,
  ResponseHeadersPolicy,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  CachePolicy,
  OriginRequestHeaderBehavior,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CacheQueryStringBehavior,
  SecurityPolicyProtocol,
  OriginAccessIdentity,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import { WebappConfigurable } from './WebappOptions';

export interface CloudFrontProps extends WebappConfigurable {
  /**
   * The domain name of the API gateway to forward requests to.
   */
  apiGatewayDomain: string;
  /**
   * The value for the CSP header
   */
  cspHeaderValue?: string;
}

export class Cloudfront extends Construct {

  cloudfront: Distribution;

  constructor(scope: Construct, id: string, props: CloudFrontProps) {
    super(scope, id);
    this.cloudfront = this.setupCloudfront(props);
    this.addStaticResources(props, this.cloudfront);
    this.addDnsRecords(this.cloudfront, props);
  }

  /**
   * Add static contents to cloudfront
   *
   * Creates a bucket, deploys contents from a folder and adds it to
   * the cloudfront distribution.
   *
   * @param cloudfrontDistribution the distribution for these resources
   */
  private addStaticResources(props: CloudFrontProps, cloudfrontDistribution: Distribution) {
    const staticResourcesBucket = this.staticResourcesBucket();
    const originAccessIdentity = new OriginAccessIdentity(this, 'publicresourcesbucket-oia');
    this.allowOriginAccessIdentityAccessToBucket(originAccessIdentity, staticResourcesBucket);
    const origin = new S3Origin(staticResourcesBucket, {
      originAccessIdentity: originAccessIdentity,
    });
    cloudfrontDistribution.addBehavior(
      '/static/*',
      origin,
      {
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    );
    cloudfrontDistribution.addBehavior(
      '/.well-known/*',
      origin,
      {
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    );
    this.deployBucket(props, staticResourcesBucket, cloudfrontDistribution);
  }

  /**
   * Create a cloudfront distribution for the application
   *
   * Do not forward the Host header to API Gateway. This results in
   * an HTTP 403 because API Gateway won't be able to find an endpoint
   * on the cloudfront domain.
   *
   * @param {string} apiGatewayDomain the domain the api gateway can be reached at
   * @returns {Distribution} the cloudfront distribution
   */
  setupCloudfront(props: CloudFrontProps): Distribution {

    let defaultPath = props.webappOptions.defaultPath;
    if (defaultPath.startsWith('/')) {
      defaultPath = defaultPath.substring(1); // Strip leading /
    }

    const distribution = new Distribution(this, 'cf-distribution', {
      priceClass: PriceClass.PRICE_CLASS_100,
      domainNames: this.domainNames(props),
      certificate: props.webappOptions.cloudFrontCertificate,
      defaultBehavior: {
        origin: new HttpOrigin(props.apiGatewayDomain),
        originRequestPolicy: new OriginRequestPolicy(this, 'cf-originrequestpolicy', {
          originRequestPolicyName: 'cfOriginRequestPolicyMijnUitkering',
          headerBehavior: OriginRequestHeaderBehavior.allowList(
            'Accept-Charset',
            'Origin',
            'Accept',
            'Referer',
            'Accept-Language',
            'Accept-Datetime',
            'Authoriz',
          ),
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        cachePolicy: new CachePolicy(this, 'cf-caching', {
          cachePolicyName: 'cfCachingSessionsMijnUitkering',
          cookieBehavior: CacheCookieBehavior.all(),
          headerBehavior: CacheHeaderBehavior.allowList('Authorization'),
          queryStringBehavior: CacheQueryStringBehavior.all(),
          defaultTtl: Duration.seconds(0),
          minTtl: Duration.seconds(0),
          maxTtl: Duration.seconds(1),
        }),
        responseHeadersPolicy: this.responseHeadersPolicy(props),
      },
      errorResponses: this.errorResponses(),
      logBucket: this.logBucket(),
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultRootObject: defaultPath,
    });
    return distribution;
  }

  private errorResponses() {
    const errorCodes = [403, 404, 500, 503];
    return errorCodes.map(code => {
      return {
        httpStatus: code,
        responseHttpStatus: code,
        responsePagePath: `/static/http-errors/${code}.html`,
      };
    });
  }

  /**
   * Add DNS records for cloudfront to the Route53 Zone
   *
   * Requests to the custom domain will correctly use cloudfront.
   *
   * @param distribution the cloudfront distribution
   */
  addDnsRecords(distribution: Distribution, props: CloudFrontProps) {

    new Route53.ARecord(this, 'a-record', {
      zone: props.webappOptions.hostedZone,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.CloudFrontTarget(distribution)),
    });

    new Route53.AaaaRecord(this, 'aaaa-record', {
      zone: props.webappOptions.hostedZone,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.CloudFrontTarget(distribution)),
    });
  }

  /**
   * Create a bucket to hold cloudfront logs
   * @returns s3.Bucket
   */
  logBucket() {
    const cfLogBucket = new S3.Bucket(this, 'CloudfrontLogs', {
      blockPublicAccess: S3.BlockPublicAccess.BLOCK_ALL,
      eventBridgeEnabled: true,
      enforceSSL: true,
      encryption: S3.BucketEncryption.S3_MANAGED,
      objectOwnership: S3.ObjectOwnership.OBJECT_WRITER,
      lifecycleRules: [
        {
          id: 'delete objects after 180 days',
          enabled: true,
          expiration: Duration.days(180),
        },
      ],
    });
    return cfLogBucket;
  }


  /**
   * Get a set of (security) response headers to inject into the response
   * @returns {ResponseHeadersPolicy} cloudfront responseHeadersPolicy
   */
  responseHeadersPolicy(props: CloudFrontProps): ResponseHeadersPolicy {

    const csp = props.cspHeaderValue ?? this.cspHeaderValue();
    const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'headers', {
      securityHeadersBehavior: {
        contentSecurityPolicy: { contentSecurityPolicy: csp, override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: HeadersReferrerPolicy.NO_REFERRER, override: true },
        strictTransportSecurity: { accessControlMaxAge: Duration.days(366), includeSubdomains: true, override: true },
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
            override: false,
          },
          {
            header: 'Pragma',
            value: 'no-cache',
            override: false,
          },
          {
            header: 'Expires',
            value: '0',
            override: false,
          },
        ],
      },
    });
    return responseHeadersPolicy;
  }

  /**
   * Get the cleaned, trimmed header values for the csp header
   *
   * @returns string csp header values
   */
  cspHeaderValue() {
    const cspValues = 'default-src \'self\';\
    frame-ancestors \'self\';\
    frame-src \'self\';\
    connect-src \'self\' https://componenten.nijmegen.nl;\
    style-src \'self\' https://componenten.nijmegen.nl https://fonts.googleapis.com https://fonts.gstatic.com \
    \'sha256-hS1LM/30PjUBJK3kBX9Vm9eOAhQNCiNhf/SCDnUqu14=\' \'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=\' \'sha256-OTeu7NEHDo6qutIWo0F2TmYrDhsKWCzrUgGoxxHGJ8o=\';\
    script-src \'self\' https://componenten.nijmegen.nl https://siteimproveanalytics.com;\
    font-src \'self\' https://componenten.nijmegen.nl https://fonts.gstatic.com;\
    img-src \'self\' https://componenten.nijmegen.nl data: https://*.siteimproveanalytics.io;\
    object-src \'none\';\
    ';
    return cspValues.replace(/[ ]+/g, ' ').trim();
  }

  /**
   * Create an s3 bucket to hold static resources.
   * Must be unencrypted to allow cloudfront to serve
   * these resources.
   *
   * @returns S3.Bucket
   */
  staticResourcesBucket() {
    const bucket = new S3.Bucket(this, 'resources-bucket', {
      blockPublicAccess: S3.BlockPublicAccess.BLOCK_ALL,
      eventBridgeEnabled: true,
      enforceSSL: true,
      encryption: S3.BucketEncryption.UNENCRYPTED,
    });

    return bucket;
  }

  /**
   * Allow listBucket to the origin access identity
   *
   * Necessary so cloudfront receives 404's as 404 instead of 403. This also allows
   * a listing of the bucket if no /index.html is present in the bucket.
   *
   * @param originAccessIdentity
   * @param bucket
   */
  allowOriginAccessIdentityAccessToBucket(originAccessIdentity: OriginAccessIdentity, bucket: S3.Bucket) {
    bucket.addToResourcePolicy(new IAM.PolicyStatement({
      resources: [
        `${bucket.bucketArn}`,
        `${bucket.bucketArn}/*`,
      ],
      actions: [
        's3:GetObject',
        's3:ListBucket',
      ],
      effect: IAM.Effect.ALLOW,
      principals: [originAccessIdentity.grantPrincipal],
    }),
    );
  }

  /**
   * Deploy contents of folder to the s3 bucket
   *
   * Invalidates the correct cloudfront path
   * @param bucket s3.Bucket
   * @param distribution Distribution
   */
  deployBucket(props: CloudFrontProps, bucket: S3.Bucket, distribution: Distribution) {

    // Do some synth time validation on the directory provided!
    const staticDir = path.join(props.webappOptions.staticResourcesDirectory, 'static');
    if (!fs.existsSync(staticDir)) {
      throw Error(`Thers no directory for statics. Expected: ${staticDir}`);
    }

    const wellKnown = path.join(props.webappOptions.staticResourcesDirectory, '.well-known');
    if (!fs.existsSync(wellKnown)) {
      throw Error(`Thers no directory for .well-known. Expected: ${wellKnown}`);
    }

    //Deploy static resources to s3
    new aws_s3_deployment.BucketDeployment(this, 'staticResources', {
      sources: [aws_s3_deployment.Source.asset(props.webappOptions.staticResourcesDirectory)],
      destinationBucket: bucket,
      distribution: distribution,
      distributionPaths: ['/static/*', '/.well-known/'],
    });
  }

  private domainNames(props: CloudFrontProps) {
    let cloudfrontDomainNames = props.webappOptions.alternativeDomainNames ?? [];
    cloudfrontDomainNames.push(props.webappOptions.domainName);
    return cloudfrontDomainNames;
  }

}
