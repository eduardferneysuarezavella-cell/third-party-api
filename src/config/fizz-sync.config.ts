import type { Store } from "@constants/StoreMap";

export interface FizzSyncConfig {
  storeName: Store;
  batchSize: number;
  maxConcurrency: number;
  deliveryTime: number;
  currency: string;
  retryAttempts: number;
  retryDelay: number;
}

export const fizzSyncConfigs: Partial<Record<Store, FizzSyncConfig>> = {
  ["TestBarat"]: {
    storeName: "TestBarat",
    batchSize: 100,
    maxConcurrency: 5,
    deliveryTime: Number(process.env.FIZZ_SYNC_DEFAULT_DELIVERY_TIME) || 2,
    currency: process.env.FIZZ_SYNC_DEFAULT_CURRENCY ?? "HUF",
    retryAttempts: 3,
    retryDelay: 1000,
  } as const,
  ["BioBarat"]: {
    storeName: "BioBarat",
    batchSize: 100,
    maxConcurrency: 5,
    deliveryTime: Number(process.env.FIZZ_SYNC_DEFAULT_DELIVERY_TIME) || 2,
    currency: process.env.FIZZ_SYNC_DEFAULT_CURRENCY ?? "HUF",
    retryAttempts: 3,
    retryDelay: 1000,
  } as const,
};

export const getFizzSyncConfig = (storeKey: Store): FizzSyncConfig => {
  const config = fizzSyncConfigs[storeKey];
  if (!config) {
    throw new Error(`No Fizz sync configuration found for store: ${storeKey}`);
  }
  return config;
};
