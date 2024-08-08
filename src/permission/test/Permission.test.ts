import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
import { Permission } from '../Permission';

// Replace in each test for different data set
let mockSendDynamo = jest.fn().mockResolvedValue({});

let dynamoDBClientMock = {
  send: mockSendDynamo,
};

describe('Permission Class', () => {
  let permission: Permission;

  beforeEach(() => {
    process.env.PERMISSION_TABLE = 'test-table';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if PERMISSION_TABLE environment variable is not set', () => {
    delete process.env.PERMISSION_TABLE;
    expect(() => new Permission(dynamoDBClientMock as any as DynamoDBClient)).toThrow('No environment variable PERMISSION_TABLE set');
  });

  it('should call DynamoDBClient.send and return user data', async () => {
    const mockItem = {
      Item: {
        useremail: { S: 'john.doe@example.com' },
        permissions: { SS: ['ADMIN', 'READ'] },
      },
    } as any as GetItemCommandOutput;

    mockSendDynamo.mockResolvedValue(mockItem);
    permission = new Permission(dynamoDBClientMock as any as DynamoDBClient);

    const useremail = 'john.doe@example.com';
    const result = await permission.getUser(useremail);

    expect(dynamoDBClientMock.send).toHaveBeenCalledWith(expect.any(GetItemCommand));
    expect(result).toEqual(mockItem.Item);
  });

  it('should return false if useremail is not found', async () => {
    mockSendDynamo.mockResolvedValue({ Item: undefined } as any as GetItemCommandOutput);
    permission = new Permission(dynamoDBClientMock as any as DynamoDBClient);

    const result = await permission.getUser('nonexistent@example.com');

    expect(result).toBe(false);
  });

  it('should log an anonymized user email when in debug mode', async () => {
    const mockItem = {
      Item: {
        useremail: { S: 'john.doe@example.com' },
        permissions: { SS: ['ADMIN'] },
      },
    } as any as GetItemCommandOutput;


    mockSendDynamo.mockResolvedValue(mockItem);
    permission = new Permission(dynamoDBClientMock as any as DynamoDBClient);

    const spy = jest.spyOn(global.console, 'log').mockImplementation(() => {});

    permission.debug = true;
    await permission.getUser('john.doe@example.com');

    expect(spy).toHaveBeenCalledWith('Permission getUser: ', {
      useremail: { S: 'john.****' },
      permissions: { SS: ['ADMIN'] },
    });

    spy.mockRestore();
  });

  it('should handle errors from DynamoDBClient.send', async () => {
    const error = new Error('DynamoDB error');

    mockSendDynamo.mockRejectedValue(error);
    permission = new Permission(dynamoDBClientMock as any as DynamoDBClient);
    await expect(permission.getUser('john.doe@example.com')).rejects.toThrow('DynamoDB error');
  });
});