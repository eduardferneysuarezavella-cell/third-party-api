if (process.env.NODE_ENV === "production") {
  // @ts-ignore
  import("server-only");
}

import type { Credentials } from "./Credentials";
import V24 from "./stores/V24";
import ZhaoZhouTeaHu from "./stores/ZhaoZhouTeaHu";
import ZhaoZhouTeaEu from "./stores/ZhaoZhouTeaEu";
import GyorgyteaDev from "./stores/GyorgyteaDev";
import GyorgyteaLive from "./stores/GyorgyteaLive";
import Nordvital from "./stores/Nordvital";
import BioBarat from "./stores/BioBarat";
import TestBarat from "./stores/TestBarat";

export interface StoreData {
  name: string;
  domain: string;
  logo?: string;
  credentials: Credentials;
}

const StoreMap = {
  V24,
  ZhaoZhouTeaHu,
  ZhaoZhouTeaEu,
  GyorgyteaDev,
  GyorgyteaLive,
  Nordvital,
  BioBarat,
  TestBarat,
};

export type Store = keyof typeof StoreMap;

export default StoreMap;
