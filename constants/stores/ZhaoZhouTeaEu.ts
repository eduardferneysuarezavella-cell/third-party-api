import type { StoreData } from "../StoreMap";

const data: StoreData = {
  name: "ZhaoZhouTeaEu",
  domain: "https://zhaozhoutea.com/",
  credentials: {
    adminApi: {
      storeUrl: "zhaozhoutea-eu.myshopify.com",
      accessToken: process.env.ZHAOZHOUTEA_EN_ADMIN_API_ACCESS_TOKEN ?? "",
    },
  },
};

export default data;
