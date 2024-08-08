import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { PermissionOptions } from './PermissionOptions';


export interface UserPermission {
  useremail: string;
  permissions?: PermissionOptions[];
  [key:string]: any;
}

export class Permission {
  dynamoDBClient: DynamoDBClient;

  /**
   * Permission Table Handler
   * Retrieve, create and update permissions
   *
   * @param dynamoDBClient
   */
  constructor(dynamoDBClient: DynamoDBClient) {
    if (!process.env.PERMISSION_TABLE) {
      throw Error('No environment variable PERMISSION_TABLE set');
    }
    this.dynamoDBClient = dynamoDBClient;
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
      const userPermission = await this.dynamoDBClient.send(getItemCommand);
      if (userPermission.Item?.useremail !== undefined) {
        return userPermission.Item;
      } else {
        return false;
      }
    } catch (err) {
      console.error('Error getting session from DynamoDB: ' + err);
      throw err;
    }
  }

}