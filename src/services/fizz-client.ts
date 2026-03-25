if (process.env.NODE_ENV === "production") {
  // @ts-ignore
  import("server-only");
}

import { getFizzAuthEndpoint, getFizzApiEndpoint } from "@constants/ThirdPartyEndpoints";
import type { FizzApiCredentials } from "@constants/Credentials";

interface FizzTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  id_token: string;
  "not-before-policy": number;
  scope: string;
}

interface FizzTokenCache {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, FizzTokenCache>();

export class FizzClient {
  private readonly credentials: FizzApiCredentials;
  private readonly cacheKey: string;

  constructor(credentials: FizzApiCredentials) {
    this.credentials = credentials;
    this.cacheKey = `fizz_${credentials.clientId}_${credentials.env}`;
  }

  async getAccessToken(): Promise<string> {
    const cached = tokenCache.get(this.cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    const authEndpoint = getFizzAuthEndpoint(this.credentials.env);

    const formData = new URLSearchParams();
    formData.append("grant_type", "client_credentials");
    formData.append("scope", "openid");
    formData.append("client_secret", this.credentials.clientSecret);
    formData.append("client_id", this.credentials.clientId);

    try {
      const response = await fetch(authEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to get Fizz access token: ${response.status} ${response.statusText}`);
      }

      const tokenResponse = (await response.json()) as FizzTokenResponse;

      // Cache the token (subtract 60 seconds for safety margin)
      const expiresAt = Date.now() + (tokenResponse.expires_in - 60) * 1000;
      tokenCache.set(this.cacheKey, {
        token: tokenResponse.access_token,
        expiresAt,
      });

      return tokenResponse.access_token;
    } catch (error) {
      console.error("Error fetching Fizz access token:", error);
      throw error;
    }
  }

  async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ success: boolean; data?: T | string; message?: string }> {
    const token = await this.getAccessToken();
    const baseUrl = getFizzApiEndpoint(this.credentials.env);

    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token might be expired, clear cache and retry once
      tokenCache.delete(this.cacheKey);
      const newToken = await this.getAccessToken();

      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
          ...options.headers,
        },
      });

      if (!retryResponse.ok) {
        let errorDetails: unknown;
        try {
          errorDetails = await retryResponse.json();
        } catch {
          errorDetails = await retryResponse.text();
        }

        const error = new Error(`Fizz API request failed: ${retryResponse.status} ${retryResponse.statusText}`, {
          cause: errorDetails,
        });
        throw error;
      }

      // Handle empty responses or non-JSON responses for retry
      const retryContentType = retryResponse.headers.get("content-type");
      const retryResponseText = await retryResponse.text();

      if (!retryResponseText || retryResponseText.trim() === "") {
        console.log("Empty retry response from Fizz API - treating as success");
        return { success: true, message: "Empty response from Fizz API on retry" };
      }

      if (!retryContentType || !retryContentType.includes("application/json")) {
        console.log("Non-JSON retry response from Fizz API:", retryResponseText);
        return { success: true, data: retryResponseText };
      }

      try {
        const data = JSON.parse(retryResponseText) as T;
        return { success: true, data };
      } catch (parseError) {
        console.error("Failed to parse JSON retry response:", retryResponseText);
        throw new Error(`Invalid JSON response from Fizz API on retry: ${retryResponseText}`, {
          cause: parseError,
        });
      }
    }

    if (!response.ok) {
      let errorDetails: unknown;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }

      const error = new Error(`Fizz API request failed: ${response.status} ${response.statusText}`, {
        cause: errorDetails,
      });
      throw error;
    }

    // Handle empty responses or non-JSON responses
    const contentType = response.headers.get("content-type");
    const responseText = await response.text();

    if (!responseText || responseText.trim() === "") {
      console.log("Empty response from Fizz API - treating as success");
      return { success: true, message: "Empty response from Fizz API" };
    }

    if (!contentType || !contentType.includes("application/json")) {
      console.log("Non-JSON response from Fizz API:", responseText);
      return { success: true, data: responseText };
    }

    try {
      const data = JSON.parse(responseText) as T;
      return { success: true, data };
    } catch (parseError) {
      console.error("Failed to parse JSON response:", responseText);
      throw new Error(`Invalid JSON response from Fizz API: ${responseText}`, {
        cause: parseError,
      });
    }
  }

  // Convenience methods for common HTTP operations
  async get<T>(endpoint: string) {
    return this.makeRequest<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: { [key: string]: unknown }) {
    return this.makeRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: { [key: string]: unknown }) {
    return this.makeRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string) {
    return this.makeRequest<T>(endpoint, { method: "DELETE" });
  }
}

export const createFizzClient = (credentials: FizzApiCredentials): FizzClient => {
  return new FizzClient(credentials);
};
