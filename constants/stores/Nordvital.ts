import type { StoreData } from "../StoreMap";

const data: StoreData = {
  name: "Nordvital",
  domain: "https://nordvital.hu/",
  credentials: {
    adminApi: {
      storeUrl: "bioboltnordvital.myshopify.com",
      accessToken: process.env.NORDVITAL_ADMIN_API_ACCESS_TOKEN ?? "",
      webhookCredentials: "",
    },
  },
};

export default data;
