import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { pagePermissions } from './PagePermissions';
import { PermissionOptions } from './PermissionOptions';
import { nav, NavItem } from '../nav/nav';

export class AccessController {
  /**
   * Checks if the user has access to the specified page based on their session.
   *
   * This method first verifies if the user is logged in. If not, it redirects them to the login page.
   * If the page URL is not found in the `pagePermissions` mapping, it logs an error and returns a 404 error response.
   * It then checks if the user has at least one of the required permissions for the page.
   * If not, it logs an error and redirects the user to the home page.
   *
   * Async chosen to make sure the check is done before proceeding
   *
   * @param session - The session object containing user information and permissions.
   * @param pageUrl - The URL of the page to check access for - check if it is present in PagePermissions
   * @returns A `Response` object with redirection or error, or `null` if access is granted.
   */
  public static async checkPageAccess(session: Session, pageUrl: string): Promise<Response | null> {
    if (!session.isLoggedIn()) {
      return Response.redirect('/login');
    }

    const userPermissions = session.getValue('permissions', 'SS') as PermissionOptions[];

    if (!pagePermissions.hasOwnProperty(pageUrl)) {
      console.error(`Unknown page URL is not in PagePermissionMapping: ${pageUrl}`);
      return Response.error(404);
    }
    const requiredPermissions = pagePermissions[pageUrl];

    if (!requiredPermissions.some(permission => userPermissions.includes(permission))) {
      console.error('User is logged in, but does not have permission to view the page. Redirect to home.', userPermissions, requiredPermissions);
      return Response.redirect('/home');
    }

    return null;
  }
  /**
   * Filters and returns the navigation items that the user has permission to access.
   *
   * This method retrieves the user's permissions from the session and filters the navigation items
   * based on these permissions. Only those navigation items for which the user has at least one required
   * permission are included in the returned list.
   *
   * @param session - The session object containing user permissions.
   * @returns An array of navigation items that the user is permitted to view.
   */
  public static permittedNav(session: Session): NavItem[] {
    const userPermissions = session.getValue('permissions', 'SS') as PermissionOptions[];

    return nav.filter((navItem: { url: string | number }) => {
      const requiredPermissions = pagePermissions[navItem.url];
      return requiredPermissions.some(permission => userPermissions.includes(permission));
    });
  }
}