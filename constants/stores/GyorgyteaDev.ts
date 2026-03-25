import type { StoreData } from "../StoreMap";

const data: StoreData = {
  name: "GyorgyteaDev",
  domain: "https://gyorgytea-dev.myshopify.com/",
  credentials: {
    adminApi: {
      storeUrl: "gyorgytea-dev.myshopify.com",
      accessToken: process.env.GYT_DEV_ADMIN_API_ACCESS_TOKEN ?? "",
      webhookCredentials: process.env.GYT_DEV_WEBHOOK_SIGNATURE ?? "",
    },
  },
};

export default data;
