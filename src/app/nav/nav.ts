import { MdiAccount } from './Icons';

export interface NavItem {
  url: string;
  title: string;
  description: string;
  label: string;
  icon: any; // Replace `any` with the correct type at some point
}


export const nav = [
  {
    url: '/resubmit',
    title: 'Opnieuw inzenden',
    description: 'Formulieren opnieuw inzenden.',
    label: 'Formulieren opnieuw inzenden.',
    icon: MdiAccount.default,
  },
  {
    url: '/formoverview',
    title: 'Formulier overzichten',
    description: 'Formulierenoverzichten maken en downloaden.',
    label: 'Formulier overzichten',
    icon: MdiAccount.default,
  },
];