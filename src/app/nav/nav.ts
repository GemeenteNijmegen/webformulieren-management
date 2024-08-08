import { MdiAccount } from './Icons';
import { PermissionOptions } from '../permission/PermissionOptions';

export interface NavItem {
  url: string;
  title: string;
  description: string;
  label: string;
  icon: any; // Replace `any` with the correct type at some point
  viewPermission: PermissionOptions[];
}


export const nav = [
  {
    url: '/resubmit',
    title: 'Opnieuw inzenden',
    description: 'Formulieren opnieuw inzenden.',
    label: 'Formulieren opnieuw inzenden.',
    icon: MdiAccount.default,
    viewPermission: ['ADMIN', 'RESUBMIT'] as PermissionOptions[],
  },
  {
    url: '/formoverview',
    title: 'Formulier overzichten',
    description: 'Formulierenoverzichten maken en downloaden.',
    label: 'Formulier overzichten',
    icon: MdiAccount.default,
    viewPermission: ['ADMIN', 'FORMOVERVIEW'] as PermissionOptions[],
  },
];

export const permittedNav = (permissions: PermissionOptions[]): NavItem[] => {
  return nav.filter(item =>
    item.viewPermission.some(permission => permissions.includes(permission)),
  );
};