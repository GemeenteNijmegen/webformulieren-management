import { aws_dynamodb as DynamoDB } from 'aws-cdk-lib';
import { TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { Statics } from './statics';


/**
   * The Permissions Table is a DynamoDB table which stores
   * Permissions for users based on their email
   * Key is AWS_MANAGED right now
   */

export class PermissionsTable extends Construct {
  table: DynamoDB.Table;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.table = new DynamoDB.Table(this, 'permissions-table', {
      partitionKey: { name: 'useremail', type: DynamoDB.AttributeType.STRING },
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      tableName: Statics.ssmPermissionsTableName,
      encryption: TableEncryption.AWS_MANAGED,
    });
  }
}