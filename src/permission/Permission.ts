
import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
import { PermissionOptions } from './PermissionOptions';

export interface UserPermission {
  useremail: string;
  permissions?: PermissionOptions[];
  [key:string]: any;
}

/**
 * Type expected fromt he dynamodb database
 */
export interface DynamoDBUserPermission {

  useremail: {S: string};
  permissions?: {SS: string[]};
  [key:string]: any;
}

export class Permission {
  dynamoDBClient: DynamoDBClient;
  debug: boolean = false;

  /**
   * Permission Table Handler
   * Retrieve, create and update permissions
   *
   * @param dynamoDBClient
   */
  constructor(dynamoDBClient: DynamoDBClient, debug: boolean = false) {
    if (!process.env.PERMISSION_TABLE) {
      throw Error('No environment variable PERMISSION_TABLE set');
    }
    this.dynamoDBClient = dynamoDBClient;
    this.debug = debug;
  }


  async getUser(useremail: string ) {
    if (!useremail) { return false; }
    const getItemCommand = new GetItemCommand({
      TableName: process.env.PERMISSION_TABLE,
      Key: {
        useremail: { S: useremail },
      },
    });
    try {
      const userPermission: GetItemCommandOutput = await this.dynamoDBClient.send(getItemCommand);

      if (userPermission.Item?.useremail !== undefined) {
        if (this.debug) this.logAnonymousItem(userPermission.Item as DynamoDBUserPermission);
        return userPermission.Item;
      } else {
        return false;
      }
    } catch (err) {
      console.error('Error getting permission from DynamoDB: ' + err);
      throw err;
    }
  }

  logAnonymousItem( userPermissionItem: DynamoDBUserPermission) {
    // Copy the item to avoid mutating the original
    const anonymizedItem = { ...userPermissionItem } as DynamoDBUserPermission;
    // Replace the useremail with its first 5 chars and ****
    if (anonymizedItem.useremail && anonymizedItem.useremail.S) {
      anonymizedItem.useremail.S = anonymizedItem.useremail.S.substring(0, 5) + '****';
    }
    console.log('Permission getUser: ', anonymizedItem);
  }
}