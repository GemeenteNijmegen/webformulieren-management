import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { Permission, UserPermission } from '../../permission/Permission';

export class PostLoginRequestHandler {
  private dynamoDBClient: DynamoDBClient;
  constructor(dynamoDBClient: DynamoDBClient) {
    this.dynamoDBClient = dynamoDBClient;
  }

  async handleRequest(cookies: string) {
    let session = new Session(cookies, this.dynamoDBClient, {
      ttlInMinutes: parseInt(process.env.SESSION_TTL_MIN ?? '15'),
    });
    await session.init();

    // Get Permission class and set debug to true for now
    // TODO: Get debug from config or set to false
    let permission = new Permission(this.dynamoDBClient, true);

    // User should not be logged in yet and have a status of pre-login (e.g. did the roundtrip to the IDP)
    if (session.isLoggedIn() == false && session.getValue('status') === 'pre-login') {
      return this.handleLoggedinRequest(session, permission);
    }
    if (session.isLoggedIn() == true) {
      return Response.redirect('/');
    }
    return Response.redirect('/login');
  }

  private async handleLoggedinRequest(session: Session, permission: Permission) {

    // Get the claims from the session
    const claims = JSON.parse(session.getValue('claims'));

    // Do claim processing, for example
    // - Get BSN from claims & make a brp call
    // - Just get en email from the claims
    // - Check authorization (e.g. by using AD groups)

    // Match against a whitelist of allowed email adreses.
    const email = claims.email;
    const allowedUsers = process.env.AUTHORIZED_USER_EMAILS?.split(',') ?? [];
    const authorized = allowedUsers.includes(email);

    // Get permissions for session
    const userPermission: UserPermission | false = await permission.getUser(email);
    const hasPermission: boolean = userPermission && !userPermission.permissions?.length; //not false and has at least one permission
    if (!hasPermission) {
      console.log('The user is not in permissions database or has empty permissions. Next step is not logged in and authorized to false.');
    }

    if (!authorized || !hasPermission) {
      await session.createSession({
        loggedin: { BOOL: false },
      });
      return Response.redirect('/login?error=not_authorized', 302, session.getCookie());
    }


    // Update the session to make it authenticated!
    {
      await session.createSession({
        loggedin: { BOOL: true },
        email: { S: email },
        permissions: { SS: (userPermission as UserPermission).permissions },
      });
    }

    // Redirect to default path
    return Response.redirect('/', 302, session.getCookie());
  }
}
