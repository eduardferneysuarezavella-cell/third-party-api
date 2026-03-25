if (process.env.NODE_ENV === "production") {
  // @ts-ignore
  import("server-only");
}

import StoreMap, { type Store } from "./StoreMap";

const getStoreDomain = (store: Store) => {
  return StoreMap[store].domain;
};

const getStoreLogo = (store: Store) => {
  return StoreMap[store].logo;
};

export const StoreConstants = {
  getStoreDomain,
  getStoreLogo,
};
