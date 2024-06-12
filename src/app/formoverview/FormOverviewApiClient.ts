import axios, { AxiosError, AxiosInstance } from 'axios';

export interface FormOverviewApiClientProps {
  /**
   * The API key to authenticate requests
   */
  apiKey: string;
  /**
   * API base URL without ending /
   */
  baseUrl: string;
  /**
   * The header that contains the api key
   * @default x-api-key
   */
  apiHeader?: string;
  /**
   * Optionally provide an axios instance
   * @default - a new instance will be created
   */
  axios?: AxiosInstance;
  /**
   * timeout in ms
   * @default 2000
   */
  timeout?: number;
}

export class FormOverviewApiClient {
  private props: FormOverviewApiClientProps;
  private axios: AxiosInstance;
  private timeout: number;

  private accessToken?: string;
  private accessTokenExpiration?: number;

  /**
   * Connects to API's. Use .post() or .get() to get the actual info
   */
  constructor(props: FormOverviewApiClientProps) {
    this.props = props;
    this.axios = this.initAxios({ axiosInstance: props.axios });
    this.timeout = props.timeout ?? 2000;
  }

  private initAxios(config: {
    axiosInstance?: AxiosInstance | undefined;
  }): AxiosInstance {
    if (config.axiosInstance) {
      return config.axiosInstance;
    } else {
      return axios.create({
        baseURL: this.props.baseUrl,
      });
    }
  }

  setTimeout(timeout: number) {
    this.timeout = timeout;
  }

  async renewAccessToken() {
    const client = axios.create({
      auth: {
        username: '376a1705-651b-4d8a-809e-b7563142ebde',
        password: '0f68cf72-75ad-45ed-b7d1-e9cba35694aa',
      },
      baseURL: 'https://authentication.sandbox-marnix.csp-nijmegen.nl/oauth',
    });
    try {
      const response = await client.post('/token', {
        grant_type: 'client_credentials',
        scope: 'form-overview',
      });
      console.log(response.data);
      this.accessToken = response.data.access_token;
      this.accessTokenExpiration = Date.now() + (parseInt(response.data.expires_in) * 1000);
    } catch (error) {
      console.error(error);
      throw Error('Could not obtain access token');
    }
  }

  async getAccessToken() {
    if (!this.accessTokenExpiration || this.accessTokenExpiration > Date.now() - 60*1000) {
      await this.renewAccessToken();
    }
    if (!this.accessToken) {
      throw Error('No access token found');
    }
    return this.accessToken;
  }

  async postData(endpoint: string, body: any, headers?: any): Promise<any> {
    const jwt = await this.getAccessToken();
    headers = this.addApiKeyHeader(jwt, 'Authorization', headers);
    headers = this.addApiKeyHeader(this.props.apiKey, this.props.apiHeader, headers);
    console.time('request to ' + endpoint);
    try {
      const response = await this.axios.post(endpoint, body, {
        headers: headers,
        timeout: this.timeout,
      });
      console.timeEnd('request to ' + endpoint);
      return response.data;
    } catch (error: any | AxiosError) {
      console.timeEnd('request to ' + endpoint);
      this.handleErrors(error, endpoint);
    }
  }

  async getData(endpoint: string, headers?: any): Promise<any> {
    const jwt = await this.getAccessToken();
    headers = this.addApiKeyHeader(jwt, 'Authorization', headers);
    headers = this.addApiKeyHeader(this.props.apiKey, this.props.apiHeader, headers);
    console.time('GET request to ' + endpoint);
    try {
      const response = await this.axios.get(endpoint, {
        headers,
        timeout: this.timeout,
      });
      console.timeEnd('GET request to ' + endpoint);
      return response.data;
    } catch (error: any | AxiosError) {
      console.timeEnd('GET request to ' + endpoint);
      this.handleErrors(error, endpoint);
    }
  }

  private handleErrors(error: any, endpoint: string) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log('http status for ' + endpoint + ': ' + error.response.status);

        // Check if there is a message field in the response
        console.log(error.response.data?.message);
        const message = error.response.data?.message;
        if (message) {
          throw Error(`Message: ${message}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.error(error?.code);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error(error.message);
      }
    } else {
      console.error(error.message);
    }

    throw new Error('Het ophalen van gegevens is misgegaan.');
  }

  private addApiKeyHeader(value: string, headerName?: string, headers?: any) {
    if (!headers) {
      return {
        [headerName ?? 'x-api-key']: value,
      };
    }
    headers[headerName ?? 'x-api-key'] = value;
    return headers;
  }

}