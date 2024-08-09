import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { pagePermissions } from './PagePermissions';
import { PermissionOptions } from './PermissionOptions';
import { nav, NavItem } from '../nav/nav';

export class AccessController {
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
  public static permittedNav(session: Session): NavItem[] {
    const userPermissions = session.getValue('permissions', 'SS') as PermissionOptions[];

    return nav.filter((navItem: { url: string | number }) => {
      const requiredPermissions = pagePermissions[navItem.url];
      return requiredPermissions.some(permission => userPermissions.includes(permission));
    });
  }
}