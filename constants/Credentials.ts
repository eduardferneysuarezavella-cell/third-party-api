import StoreMap, { type Store } from "./StoreMap";
if (process.env.NODE_ENV === "production") {
  // @ts-ignore
  import("server-only");
}

export interface EmailCredentials {
  name: string;
  user: string;
  serviceClientId: string;
  privateKey: string;
}

export interface AdminApiCredentials {
  storeUrl: string;
  accessToken: string;
  webhookCredentials?: string;
}

export interface FizzApiCredentials {
  clientId: string;
  clientSecret: string;
  env: "demo" | "prod";
}

export enum CredentialType {
  Email = "email",
  AdminApi = "adminApi",
  FizzApi = "fizzApi",
}

export interface Credentials {
  [CredentialType.Email]?: EmailCredentials;
  [CredentialType.AdminApi]?: AdminApiCredentials;
  [CredentialType.FizzApi]?: FizzApiCredentials;
}

const Credentials = Object.fromEntries(Object.entries(StoreMap).map(([store, { credentials }]) => [store, credentials])) as {
  [store in keyof typeof StoreMap]: Credentials;
};

export function getCredentials(store: Store, usage: CredentialType.Email): EmailCredentials | null;
export function getCredentials(store: Store, usage: CredentialType.AdminApi): AdminApiCredentials | null;
export function getCredentials(store: Store, usage: CredentialType.FizzApi): FizzApiCredentials | null;
export function getCredentials(store: Store, usage: CredentialType) {
  if (!Object.hasOwn(Credentials, store)) {
    return null;
  }

  if (!Object.hasOwn(Credentials[store as keyof typeof Credentials], usage)) {
    return null;
  }

  const storeCreds = Credentials[store as keyof typeof Credentials];
  return storeCreds[usage as keyof typeof storeCreds];
}
