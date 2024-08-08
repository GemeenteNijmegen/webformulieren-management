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

export function getSportPermissionDescription(permission: SportPermissionOptions): string {
  return sportPermissionDescriptions[permission];
}
const sportPermissionDescriptions: Record<SportPermissionOptions, string> = {
  SP1: 'Lindenholt',
  SP2: 'Dukenburg',
  SP3: 'Midden en Zuid',
  SP4: 'Noord',
  SP5: 'Centrum',
  SP6: 'Oost',
  SP7: 'West',
};