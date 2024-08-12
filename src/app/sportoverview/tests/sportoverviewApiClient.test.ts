import { SportOverviewApiClient } from '../sportoverviewApiClient';


describe('SportOverviewApiClient', () => {
  const baseUrl = 'https://api.example.com';
  const apiKey = 'test-api-key';

  //   let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let globalFetchSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset fetch mock
    globalFetchSpy = jest.spyOn(global, 'fetch')
      .mockResolvedValue({ status: 200, body: {}, ok: true, json: jest.fn().mockResolvedValue({}) } as any as Response);

    // Mock console methods
    jest.spyOn(global.console, 'log').mockImplementation(() => {});
    // consoleLogSpy = jest.spyOn(global.console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(global.console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up spies and mocks
    jest.restoreAllMocks();
  });

  describe('Usage Example', () => {
    it('should demonstrate typical usage of SportOverviewApiClient with specific parameters and response types', async () => {
      // Initialize the API client with configuration
      const apiClient = new SportOverviewApiClient({
        baseUrl: 'https://api.example.com', // Base URL for API requests
        apiKey: 'test-api-key', // API key for authentication
        timeout: 3000, // Timeout for requests (3 seconds)
      });

      // Define a type for the expected GET response
      interface ExampleGetResponse {
        voornaam: string;
        cijfers: number[];
      }

      // Mock fetch response for GET request
      const mockResponse = {
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue({
          voornaam: 'Jan',
          cijfers: [8, 9, 7],
        } as ExampleGetResponse),
      } as unknown as Response;

      globalFetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

      // Perform a GET request with query parameters - you do not need to check empty params before passing
      const result = await apiClient.get<ExampleGetResponse>('/example-endpoint', {
        param1: 'value1', // Valid query parameter
        param2: undefined, // Undefined query parameter, should be ignored
      });

      // Validate the response
      expect(result).toEqual({
        voornaam: 'Jan',
        cijfers: [8, 9, 7],
      });

      // Validate the fetch call parameters
      const fetchCall = globalFetchSpy.mock.calls[0];
      expect(fetchCall).toContainEqual('https://api.example.com/example-endpoint?param1=value1');

      // Example of how to use POST requests
      const postResponseMock = {
        status: 201,
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      } as unknown as Response;

      globalFetchSpy.mockResolvedValueOnce(postResponseMock);

      // Perform a POST request with a body
      const postResult = await apiClient.post('/example-endpoint', { key: 'value' });

      // Validate the POST response
      expect(postResult).toEqual({ success: true });

      // Validate the fetch call parameters for POST request
      const postFetchCall = globalFetchSpy.mock.calls[1];
      expect(postFetchCall).toContainEqual('https://api.example.com/example-endpoint');
      expect(postFetchCall).toContainEqual(expect.objectContaining({
        method: 'POST',
      }));
      // Demonstrate error handling
      const errorMessage = '[ApiClient] Failed to perform GET request. An unknown error occurred';
      globalFetchSpy.mockRejectedValueOnce(new Error());

      await expect(apiClient.get<ExampleGetResponse>('/example-endpoint')).rejects.toThrow('Failed to perform GET request');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    });
  });

  describe('Initialization', () => {
    it('should correctly handle default values', async () => {
      const apiClient = new SportOverviewApiClient({ baseUrl, apiKey });
      await apiClient.get('/test-endpoint');
      const calledWith = globalFetchSpy.mock.calls[0];
      expect(calledWith).toContainEqual( expect.objectContaining({ method: 'GET' }));
      expect(calledWith).toContainEqual(`${baseUrl}/test-endpoint`);
      expect(calledWith).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            headers: expect.objectContaining({
              'x-api-key': apiKey,
            }),
          }),
        ]),
      );
    });
  });

  describe('GET requests', () => {
    it('should build a correct URL for GET requests without duplicating the base URL', async () => {
      const apiClient = new SportOverviewApiClient({ baseUrl, apiKey });
      await apiClient.get('/test-endpoint');
      const calledWith = globalFetchSpy.mock.calls[0];

      expect(calledWith).toEqual([
        `${baseUrl}/test-endpoint`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ 'x-api-key': apiKey }),
        }),
      ]);
    });

    it('should build a correct URL with query parameters for GET requests', async () => {
      const apiClient = new SportOverviewApiClient({ baseUrl, apiKey });
      await apiClient.get('/test-endpoint', { param1: 'value1', param2: 'value2' });
      const calledWith = globalFetchSpy.mock.calls[0];

      expect(calledWith).toEqual([
        `${baseUrl}/test-endpoint?param1=value1&param2=value2`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ 'x-api-key': apiKey }),
        }),
      ]);
    });
  });


  describe('POST requests', () => {
    it('should perform a successful POST request with body', async () => {
      const apiClient = new SportOverviewApiClient({ baseUrl, apiKey });
      const mockResponse = {
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue({ data: 'responseData' }),
      } as unknown as Response;
      globalFetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as any as Response);

      const response = await apiClient.post('/test-endpoint', { key: 'value' });
      expect(response).toEqual({ data: 'responseData' });
    });
  });

  describe('Error handling', () => {
    it('should handle errors during GET request and log them', async () => {
      const apiClient = new SportOverviewApiClient({ baseUrl, apiKey });
      const errorMessage = 'Failed to perform GET request';
      globalFetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error(errorMessage));

      await expect(apiClient.get('/test-endpoint')).rejects.toThrow(errorMessage);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    });
    it('should handle errors during POST request and log them', async () => {
      const apiClient = new SportOverviewApiClient({ baseUrl, apiKey });
      const errorMessage = 'Failed to perform POST request';
      globalFetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error(errorMessage));

      await expect(apiClient.post('/test-endpoint', { key: 'value' })).rejects.toThrow(errorMessage);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    });

    it('should handle unknown errors during request', async () => {
      const apiClient = new SportOverviewApiClient({ baseUrl, apiKey });
      globalFetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue({ someProp: 'someValue' });

      await expect(apiClient.get('/test-endpoint')).rejects.toThrow('An unknown error occurred');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('An unknown error occurred'));
    });
  });
  describe('Invalid URL handling', () => {
    it('should handle invalid URL gracefully', async () => {
      const apiClient = new SportOverviewApiClient({ baseUrl: 'invalid-url', apiKey });
      await expect(apiClient.get('/test-endpoint')).rejects.toThrow('Failed to perform GET request');
    });
  });
  describe('Timeout handling', () => {
    beforeEach(() => {
      jest.useFakeTimers(); // Use fake timers for this test suite
    });

    afterEach(() => {
      jest.useRealTimers(); // Restore real timers after tests
    });

    it('should handle GET request timeout', async () => {
      const apiClient = new SportOverviewApiClient({ baseUrl, apiKey, timeout: 1000 }); // Set a very short timeout

      // Mock fetch to never resolve, simulating a timeout
      globalFetchSpy = jest.spyOn(global, 'fetch').mockImplementation((_url: any, options?: RequestInit | any) => {
        const signal = options.signal;
        if (signal) {
          // Return a promise that never resolves
          return new Promise((_, reject) => {
            // Listen for abort event and reject the promise if aborted
            signal.addEventListener('abort', () => reject(new Error('Request timed out')));
          });
        }
        return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({}) } as Response);
      });

      const requestPromise = apiClient.get('/test-endpoint');
      jest.advanceTimersByTime(1002); // Fast-forward the timer to simulate timeout
      await expect(requestPromise).rejects.toThrow('Request timed out');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Request timed out'));
    });
  });
});