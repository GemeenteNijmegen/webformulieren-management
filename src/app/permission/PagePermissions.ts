import { PermissionOptions } from './PermissionOptions';

// Mapping of pages to required permissions
interface PagePermissionMapping {
  [page: string]: PermissionOptions[];
}

// Example mapping of pages to permissions
export const pagePermissions: PagePermissionMapping = {
  '/admin': ['ADMIN'],
  '/resubmit': ['ADMIN', 'RESUBMIT'],
  '/formoverview': ['ADMIN', 'FORMOVERVIEW'],
  // Add more pages as needed
};