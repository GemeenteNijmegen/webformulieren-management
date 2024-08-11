import { getSportPermissionDescriptions } from '../PermissionOptions';

describe('getSportPermissionDescriptionFromOptions', () => {
  it('should return the correct description for SP7', () => {
    expect(getSportPermissionDescriptions(['SP7'])).toEqual(['West']);
  });

});