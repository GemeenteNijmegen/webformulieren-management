import { OpenIdConnectConnectionProfile } from "../../src/webapp/OIDCConnectionProfile";

const baseProfile = {
  applicationBaseUrl: 'http://app',
  authenticationBaseUrl: 'http://auth',
  clientId: '123',
  clientSecretArn: '123',
  immediateRedirect: false,
}

export const yiviProfile: OpenIdConnectConnectionProfile = {
  ...baseProfile,
  cssClass: 'yivi-css-class',
  name: 'yivi',
  scope: 'openid idp_scoping:yivi irma-demo.gemeente.personalData.bsn',
  title: 'Yivi-title',
}

export const digiDProfile: OpenIdConnectConnectionProfile = {
  ...baseProfile,
  cssClass: 'digid-css-class',
  name: 'digid',
  scope: 'openid idp_scoping:digid service:DigiD_Midden',
  title: 'DigiD-title',
}

export const immediateRedirectProfile: OpenIdConnectConnectionProfile = {
  ...baseProfile,
  cssClass: 'digid',
  name: 'digid',
  scope: 'openid idp_scoping:digid service:DigiD_Midden',
  title: 'DigiD',
  authenticationBaseUrl: 'http://example.com',
  immediateRedirect: true,
}

export const oidcProfiles = [yiviProfile, digiDProfile];