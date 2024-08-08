import { getSportPermissionDescription } from '../PermissionOptions';

describe('getSportPermissionDescriptionFromOptions', () => {
  it('should return the correct description for SP7', () => {
    expect(getSportPermissionDescription('SP7')).toBe('West');
  });

});