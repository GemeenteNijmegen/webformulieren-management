export type PermissionOptions =
| 'ADMIN'
| 'RESUBMIT'
| 'FORMOVERVIEW'
| 'SPORT'
| 'SPORTADMIN'
| SportPermissionOptions;

export type SportPermissionOptions =
| 'SP1'
| 'SP2'
| 'SP3'
| 'SP4'
| 'SP5'
| 'SP6'
| 'SP7'
;
export const SPORT_PERMISSION_OPTIONS = [
  'SP1', 'SP2', 'SP3', 'SP4', 'SP5', 'SP6', 'SP7',
];
export function isSportPermissionOption(value: any): value is SportPermissionOptions {
  return SPORT_PERMISSION_OPTIONS.includes(value);
}
export function getSportPermissionDescriptions(permissions: SportPermissionOptions[]): string[] {
  return permissions.map(permission => SPORT_PERMISSION_DESCRIPTIONS[permission]);

}
export const SPORT_PERMISSION_DESCRIPTIONS: Record<SportPermissionOptions, string> = {
  SP1: 'Lindenholt',
  SP2: 'Dukenburg',
  SP3: 'Midden en Zuid',
  SP4: 'Noord',
  SP5: 'Centrum',
  SP6: 'Oost',
  SP7: 'West',
};