import type { StoreData } from "../StoreMap";

const data: StoreData = {
  name: "Bio-Barát",
  domain: "https://bio-barat.hu/",
  credentials: {
    adminApi: {
      storeUrl: "biobarat.myshopify.com",
      accessToken: process.env.BIOBARAT_ADMIN_API_ACCESS_TOKEN ?? "",
      webhookCredentials: "",
    },
  },
};

export default data;
