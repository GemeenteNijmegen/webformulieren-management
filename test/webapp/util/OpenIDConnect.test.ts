import { GetSecretValueCommand, GetSecretValueCommandOutput, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import { OpenIDConnect } from '../../../src/webapp/util/OpenIDConnect';

const secretsMock = mockClient(SecretsManagerClient);
const output: GetSecretValueCommandOutput = {
  $metadata: {},
  SecretString: 'ditiseennepgeheim',
};
secretsMock.on(GetSecretValueCommand).resolves(output);

//Move this test to OIDC test
test('Incorrect state errors', async () => {
  const oidc = new OpenIDConnect({
    applicationBaseUrl: 'http://localhost',
    authenticationBaseUrl: 'http://localhost',
    clientId: 'id',
    clientSecretArn: 'arn:secret/bla'
  });
  expect.assertions(1); // Otherwise, if the catch claused is missed, the test would succeed
  try {
    await oidc.authorize('test', ['state1'], 'state2');
  } catch (e: any) {
    console.debug(e);
    expect(e.message).toMatch('state does not match session state');
  }

});