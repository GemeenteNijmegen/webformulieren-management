import { aws_dynamodb as DynamoDB, aws_kms as KMS, RemovalPolicy, StackProps } from 'aws-cdk-lib';
import { TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface SessionsTableProps extends StackProps {
  name?: string;
  key?: KMS.Key;
}

export class SessionsTable extends Construct {
  table: DynamoDB.Table;
  constructor(scope: Construct, id: string, props?: SessionsTableProps) {
    super(scope, id);
    this.table = new DynamoDB.Table(this, 'sessions-table', {
      partitionKey: { name: 'sessionid', type: DynamoDB.AttributeType.STRING },
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      tableName: props?.name,
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.RETAIN,
      encryptionKey: props?.key,
      encryption: TableEncryption.CUSTOMER_MANAGED,
    });
  }
}