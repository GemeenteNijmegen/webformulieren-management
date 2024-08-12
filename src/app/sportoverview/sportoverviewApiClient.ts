export interface SportOverviewApiClientParams {
  baseUrl: string;
  apiKey: string;
  debug?: boolean; // Optional, default to false
  timeout?: number; // Optional, default to 5000 ms
}

export class SportOverviewApiClient {
  private baseUrl: string;
  private apiKey: string;
  private debug: boolean;
  private timeout: number;

  /**
     * Initializes the ApiClient with base configuration.
     * @param config - The configuration object containing baseUrl, apiKey, debug mode, and timeout.
     */
  constructor(config: SportOverviewApiClientParams) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.debug = config.debug || false;
    this.timeout = config.timeout || 5000; // Default timeout of 5000 ms
  }

  /**
     * Performs a GET request to the specified endpoint.
     * Allows for optional query parameters, which are only included if non-empty.
     * @param endpoint - API endpoint to be appended to the baseUrl.
     * @param queryParams - Optional query parameters to be added to the URL.
     * @returns A Promise that resolves to the parsed JSON response.
     * @throws If the request fails or times out.
     */
  public async get<T>(endpoint: string, queryParams?: Record<string, string | undefined>): Promise<T> {
    try {
      const fullUrl = new URL(endpoint, this.baseUrl); // Properly create URL object

      //   Append query parameters to the URL if provided
      if (queryParams) {
        Object.entries(queryParams)
          .filter(([_paramKey, paramValue]) => Boolean(paramValue)) // Filter out undefined and empty values
          .forEach(([paramKey, paramValue]) => fullUrl.searchParams.append(paramKey, paramValue as string));
      }

      const response: Response = await this.request('GET', fullUrl);
      const json: T = await response.json() as T;
      return json;
    } catch (error) {
      // Log and rethrow the error to the caller
      const errorMessage = `Failed to perform GET request. ${error instanceof Error && error.message ? error?.message : ''}`;
      this.logError(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
     * Performs a POST request to the specified endpoint.
     * Allows for an optional JSON body to be sent with the request.
     * @param endpoint - API endpoint to be appended to the baseUrl.
     * @param body - Optional JSON body to be included in the request.
     * @returns A Promise that resolves to the parsed JSON response.
     * @throws If the request fails or times out.
     */
  public async post<T>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
    try {
      const response = await this.request('POST', new URL(endpoint, this.baseUrl), {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json: T = await response.json() as T;
      return json;
    } catch (error) {
      // Log and rethrow the error to the caller
      const errorMessage = `Failed to perform POST request. ${error instanceof Error && error.message ? error?.message : ''}`;
      this.logError(errorMessage);
      throw new Error(errorMessage);
    }
  }
  /**
     * Logs debug messages if debug mode is enabled.
     * @param message - The message to be logged.
     */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[ApiClient] ${message}`);
    }
  }

  /**
         * Logs errors using console.error.
         * @param message - The error message to be logged.
         */
  private logError(message: string): void {
    console.error(`[ApiClient] ${message}`);
  }

  /**
     * Makes an HTTP request using the Fetch API.
     * Handles GET and POST requests with proper headers, and applies a timeout.
     * @param method - HTTP method ('GET' or 'POST').
     * @param url - url to call
     * @param options - Additional request options (e.g., headers, body).
     * @returns A Promise that resolves to the Fetch API's Response object.
     * @throws If the request fails or times out.
     */
  private async request(
    method: 'GET' | 'POST',
    url: URL,
    options: RequestInit = {},
  ): Promise<Response> {
    const defaultHeaders = {
      'x-api-key': this.apiKey,
    };

    const headers = {
      ...defaultHeaders,
      ...options.headers,
    };

    this.log(`${method} ${url.toString()}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response: Response = await fetch(url.toString(), {
        method,
        headers,
        signal: controller.signal,
        ...options,
      });
      this.log(`Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorMessage = `Request ${url.toString()} failed with status ${response.status} ${response.statusText}`;
        this.logError(errorMessage);
        throw new Error(errorMessage);
      }

      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Specific handling for request timeouts
          const timeoutMessage = 'Request timed out';
          this.logError(timeoutMessage);
          throw new Error(timeoutMessage);
        } else if (error.message) {
          // Handle other errors
          const errorMessage = error.message;
          this.logError(`Error: ${errorMessage}`);
          throw new Error(errorMessage);
        } else {
          this.handleUnknownError();
        }
      } else {
        // Handle unexpected errors that are not instances of Error
        this.handleUnknownError();
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private handleUnknownError(): never {
    const unknownErrorMessage = 'An unknown error occurred';
    this.logError(unknownErrorMessage);
    throw new Error(unknownErrorMessage);
  }
}
