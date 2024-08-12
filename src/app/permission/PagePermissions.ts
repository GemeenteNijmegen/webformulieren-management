import { PermissionOptions, SPORT_PERMISSION_OPTIONS, SportPermissionOptions } from './PermissionOptions';

/**
 * Mapping of pages to permissions
 * Improvement possibility is to give ADMIN access to all pages without mentioning it in the mapping
 */
interface PagePermissionMapping {
  [page: string]: PermissionOptions[];
}

export const pagePermissions: PagePermissionMapping = {
  '/resubmit': ['ADMIN', 'RESUBMIT'],
  '/formoverview': ['ADMIN', 'FORMOVERVIEW'],
  '/sport': ['ADMIN', 'SPORTADMIN', 'SPORT', ...SPORT_PERMISSION_OPTIONS as SportPermissionOptions[]],
  // Add more pages as needed
};