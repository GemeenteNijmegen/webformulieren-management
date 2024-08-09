import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { nav } from '../../nav/nav';
import { AccessController } from '../AccessController';
import { pagePermissions } from '../PagePermissions';


// Mock pagePermissions and nav for testing
jest.mock('../PagePermissions', () => ({
  pagePermissions: {
    '/admin': ['ADMIN'],
    '/resubmit': ['ADMIN', 'RESUBMIT'],
    '/formoverview': ['ADMIN', 'FORMOVERVIEW'],
  },
}));

jest.mock('../../nav/nav', () => ({
  nav: [
    { url: '/resubmit', title: 'Opnieuw inzenden', description: 'Formulieren opnieuw inzenden.', label: 'Formulieren opnieuw inzenden.', icon: 'icon' },
    { url: '/formoverview', title: 'Formulier overzichten', description: 'Formulierenoverzichten maken en downloaden.', label: 'Formulieren overzichten', icon: 'icon' },
  ],
}));

// Mock the Session class
jest.mock('@gemeentenijmegen/session', () => {
  const mockSession = {
    isLoggedIn: jest.fn(),
    getValue: jest.fn(),
  };
  return { Session: jest.fn(() => mockSession) };
});

// Mock console.error
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('AccessController', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session('fakecookie', {} as any as DynamoDBClient);
  });

  describe('checkPageAccess', () => {
    it('should have correct values in pagePermissions and nav', () => {
      expect(pagePermissions['/admin']).toEqual(['ADMIN']);
      expect(nav.some(item => item.url === '/resubmit')).toBe(true);
    });
    it('should redirect to /login if not logged in', async () => {
      (session.isLoggedIn as jest.Mock).mockReturnValue(false);
      const result = await AccessController.checkPageAccess(session, '/admin');
      expect(result).toEqual(Response.redirect('/login'));
    });

    it('should redirect to /home if the user does not have required permissions', async () => {
      (session.isLoggedIn as jest.Mock).mockReturnValue(true);
      (session.getValue as jest.Mock).mockReturnValueOnce(['USER']); // User without ADMIN permission
      const result = await AccessController.checkPageAccess(session, '/admin');
      expect(result).toEqual(Response.redirect('/home'));
    });

    it('should return null if the user has required permissions', async () => {
      (session.isLoggedIn as jest.Mock).mockReturnValue(true);
      (session.getValue as jest.Mock).mockReturnValueOnce(['ADMIN']); // User with ADMIN permission
      const result = await AccessController.checkPageAccess(session, '/admin');
      expect(result).toBeNull();
    });

    it('should return a 404 response and log an error for unknown page URLs', async () => {
      (session.isLoggedIn as jest.Mock).mockReturnValue(true);
      (session.getValue as jest.Mock).mockReturnValueOnce(['ADMIN']); // User with ADMIN permission

      const result = await AccessController.checkPageAccess(session, '/unknownpage');

      expect(result).toEqual(Response.error(404));
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unknown page URL is not in PagePermissionMapping: /unknownpage');
    });
  });

  describe('permittedNav', () => {
    it('should return only nav items the user has permission for', () => {
      (session.isLoggedIn as jest.Mock).mockReturnValue(true);
      (session.getValue as jest.Mock).mockReturnValue(['ADMIN']);
      const result = AccessController.permittedNav(session);
      expect(result).toEqual([
        { url: '/resubmit', title: 'Opnieuw inzenden', description: 'Formulieren opnieuw inzenden.', label: 'Formulieren opnieuw inzenden.', icon: 'icon' },
        { url: '/formoverview', title: 'Formulier overzichten', description: 'Formulierenoverzichten maken en downloaden.', label: 'Formulieren overzichten', icon: 'icon' },
      ]);
    });

    it('should return an empty array if the user does not have any permissions', () => {
      (session.isLoggedIn as jest.Mock).mockReturnValue(true);
      (session.getValue as jest.Mock).mockReturnValue([]);
      const result = AccessController.permittedNav(session);
      expect(result).toEqual([]);
    });
  });
});
