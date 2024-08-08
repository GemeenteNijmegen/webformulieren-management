import { PermissionOptions } from '../../permission/PermissionOptions';
import { NavItem, permittedNav } from '../nav';

// Mock data for navigation items
const mockNav: NavItem[] = [
  {
    url: '/resubmit',
    title: 'Opnieuw inzenden',
    description: 'Formulieren opnieuw inzenden.',
    label: 'Formulieren opnieuw inzenden',
    icon: 'mockIcon',
    viewPermission: ['ADMIN', 'RESUBMIT'] as PermissionOptions[],
  },
  {
    url: '/formoverview',
    title: 'Formulieroverzichten',
    description: 'Formulierenoverzichten maken en downloaden.',
    label: 'Formulieroverzichten',
    icon: 'mockIcon',
    viewPermission: ['ADMIN', 'FORMOVERVIEW'] as PermissionOptions[],
  },
];

describe('permittedNav', () => {
  beforeEach(() => {
    // Replace `nav` with `mockNav` for testing
    (global as any).nav = mockNav;
  });

  test.each([
    {
      description: 'should return all nav items if all permissions are valid',
      userPermissions: ['ADMIN', 'RESUBMIT', 'FORMOVERVIEW'] as PermissionOptions[],
      expectedTitles: ['Opnieuw inzenden', 'Formulieroverzichten'],
    },
    {
      description: 'should return only the nav items that match the user permissions',
      userPermissions: ['RESUBMIT'] as PermissionOptions[],
      expectedTitles: ['Opnieuw inzenden'],
    },
    {
      description: 'should return an empty array if no nav items match the user permissions',
      userPermissions: ['SPORT'] as PermissionOptions[],
      expectedTitles: [],
    },
    {
      description: 'should return nav items that match at least one of the user permissions',
      userPermissions: ['ADMIN', 'SP1'] as PermissionOptions[],
      expectedTitles: ['Opnieuw inzenden', 'Formulieroverzichten'],
    },
    {
      description: 'should return an empty array if no permissions are provided',
      userPermissions: [] as PermissionOptions[],
      expectedTitles: [],
    },
  ])('$description', ({ userPermissions, expectedTitles }) => {
    const result = permittedNav(userPermissions);
    const titles = result.map(item => item.title);
    expect(titles).toEqual(expectedTitles);
  });
});