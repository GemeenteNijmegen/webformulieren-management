import { App } from 'aws-cdk-lib';
import { TestStack } from './TestStack';
import { Template } from 'aws-cdk-lib/assertions';

const WEBAPP_NAME = 'test-webapp-1';

describe('Basic infrastructure of Webapp construct', () => {
  const app = new App();
  const stack = new TestStack(app, WEBAPP_NAME, {
    oidcProfiles: [
      {
        applicationBaseUrl: 'text.example.com',
        authenticationBaseUrl: 'auth.example.com',
        clientId: '1234',
        clientSecretArn: 'arn:aws:secretsmanager:eu-central-1:1234567890:secret/secret-name-random-suffix',
        cssClass: 'example-btn',
        immediateRedirect: false,
        name: 'test',
        scope: 'openid idp_scoping:simulator',
        title: 'Test'
      }
    ],
    addHomePage: true,
    additionalSourceFilesDir: undefined, // TODO test packaging of custom lambda layer
    sessionLifetime: 42,
    alternativeDomainNames: [
      'abc.example.com',
      'xyz.example.com',
    ],
    cspHeader: '<customcspheadervalue>',
    defaultPath: '/customdefaultpath', // Check if leading / is removed
    domainName: 'text.example.com',
    postLoginProcessor: undefined, // TODO add test for this.
  });

  const template = Template.fromStack(stack);

  const loginLambda = findFirst(template.findResources('AWS::Lambda::Function', {
    Properties: {
      Description: `Login page for webapp ${WEBAPP_NAME}.`
    }
  }));

  const logoutLambda = findFirst(template.findResources('AWS::Lambda::Function', {
    Properties: {
      Description: `Logout page for webapp ${WEBAPP_NAME}.`
    }
  }));

  const authLambda = findFirst(template.findResources('AWS::Lambda::Function', {
    Properties: {
      Description: `Auth landingpoint for webapp ${WEBAPP_NAME}.`
    }
  }));

  const homeLambda = findFirst(template.findResources('AWS::Lambda::Function', {
    Properties: {
      Description: 'Home lambda'
    }
  }));

  const lambdaLayers = template.findResources('AWS::Lambda::LayerVersion');
  const nameCustomLambdaLayer = Object.keys(lambdaLayers).find(name => name.startsWith('appapilayer'))!;
  const nameConfigurationLambdaLayer = Object.keys(lambdaLayers).find(name => name.startsWith('appapiconfigurationlayer'))!;
  const customLambdaLayer = lambdaLayers[nameCustomLambdaLayer];
  const configurationLambdaLayer = lambdaLayers[nameConfigurationLambdaLayer];

  test('Lambda layers', () => {
    expect(customLambdaLayer).toBeDefined();
    expect(configurationLambdaLayer).toBeDefined();
  });

  test('Check login lambda', () => {
    testLambdaResourceConfiguration(loginLambda);
  });

  test('Check logout lambda', () => {
    testLambdaResourceConfiguration(logoutLambda);
  });

  test('Check auth lambda', () => {
    testLambdaResourceConfiguration(authLambda);
  });

  test('Check home lambda', () => {
    testLambdaResourceConfiguration(homeLambda);
  });

  test('CloudFront configuration', () => {
    const cloudfront = findFirst(template.findResources('AWS::CloudFront::Distribution'));
    const config = cloudfront.Properties.DistributionConfig
    expect(config.DefaultRootObject).toBe('customdefaultpath');
    expect(config.Logging).toBeDefined();
    expect(config.Origins).toHaveLength(2);
    expect(config.CustomErrorResponses).toBeDefined();
    expect(config.ViewerCertificate.AcmCertificateArn).toBe('arn:aws:acm:us-east-1:1234567890:certificate/random-uuid');
    expect(config.Aliases).toContain('abc.example.com');
    expect(config.Aliases).toContain('xyz.example.com');
    expect(config.Aliases).toContain('text.example.com');
  });

  test('Csp header', () => {
    const responseHeaderPolicy = findFirst(template.findResources('AWS::CloudFront::ResponseHeadersPolicy'));
    const config = responseHeaderPolicy.Properties.ResponseHeadersPolicyConfig;
    expect(config.SecurityHeadersConfig.ContentSecurityPolicy.ContentSecurityPolicy).toBe('<customcspheadervalue>');
  });

  test('API routes', () => {
    checkApiRoute('/login');
    checkApiRoute('/logout');
    checkApiRoute('/auth');
    checkApiRoute('/home');
    checkApiRoute('/post-login', false);
  });

  function checkApiRoute(path: string, shouldBeDefined: boolean = true){
    const route = findFirst(template.findResources('AWS::ApiGatewayV2::Route', {
      Properties: {
        "RouteKey": `GET ${path}`,
      }
    }));
    if(shouldBeDefined){
      expect(route).toBeDefined();
    } else {
      expect(route).not.toBeDefined();
    }
  }

  function testLambdaResourceConfiguration(lambda: any){
    expect(lambda).toBeDefined();
    expect(lambda.Properties.Environment.Variables).toMatchObject({
      "SESSION_TABLE": {}, // Test if session table is injected.
      "SESSION_TTL_MIN": "42", // Test if ttl is passed from configuration.
      "WEBAPP_NAME": WEBAPP_NAME // Test if name is passed from configuration.
    });
    expect(lambda.Properties.Layers).toContainEqual({
      "Ref": nameCustomLambdaLayer
    });
    expect(lambda.Properties.Layers).toContainEqual({
      "Ref": nameConfigurationLambdaLayer
    });
  }

})

function findFirst(obj: any) {
  try {
    const keys = Object.keys(obj);
    return obj[keys[0]];
  } catch {
    throw Error('Resource niet gevonden!');
  }
}

