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

  /**
   * Connects to API's. Use .post() or .get() to get the actual info
   */
  constructor(props: FormOverviewApiClientProps) {
    this.props = props;
    this.axios = this.initAxios({ axiosInstance: props.axios });
    this.timeout = props.timeout ?? 1000 * 30; // 30 seconden
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

  async postData(endpoint: string, body: any, headers?: any): Promise<any> {
    headers = this.addApiKeyHeader(this.props.apiKey, this.props.apiHeader, headers);
    try {
      const response = await this.axios.post(endpoint, body, {
        headers: headers,
        timeout: this.timeout,
      });
      return response.data;
    } catch (error: any | AxiosError) {
      this.handleErrors(error, endpoint);
    }
  }

  async getData(endpoint: string, headers?: any): Promise<any> {
    headers = this.addApiKeyHeader(this.props.apiKey, this.props.apiHeader, headers);
    try {
      const response = await this.axios.get(endpoint, {
        headers,
        timeout: this.timeout,
      });
      return response.data;
    } catch (error: any | AxiosError) {
      return this.handleErrors(error, endpoint);
    }
  }

  private handleErrors(error: any, endpoint: string): {apiClientError: string} {
    let errorMessage = { apiClientError: 'Er is iets misgegaan bij een aanroep naar een andere service. Probeer het later opnieuw.' };
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        // Timeout
        errorMessage.apiClientError = 'Er is een timeout opgetreden. Dit kan gebeuren wanneer een csv-bestand van grote omvang gemaakt wordt. Het bestand wordt op de achtergrond nog steeds aangemaakt. Vernieuw de pagina om de nieuwe csv-overzichten te zien.';
      }
      if (error.response) {
        // The request was made and the server responded with a status code and perhaps a message
        console.log(`Error Response http status for ${endpoint} ${error.response.status}`);
        console.log(`Error Response message for endpoint ${endpoint} ${error.response.data?.message}`);
        errorMessage.apiClientError += ` Details: het betreft ${endpoint} ${error.response.status} ${error.response.data?.message}.`;
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(`Error Request endpoint ${endpoint} ${error?.code}`);
        errorMessage.apiClientError += ` Details: het betreft ${endpoint} ${error?.code}.`;
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error(error.message);
        errorMessage.apiClientError += ` Details: het betreft ${endpoint} ${error.message}.`;
      }
    } else {
      console.error(error.message);
      errorMessage.apiClientError += ` Details: het betreft ${endpoint} ${error.message}.`;
    }
    return errorMessage;
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