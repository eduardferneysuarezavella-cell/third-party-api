import type { StoreData } from "../StoreMap";

const data: StoreData = {
  name: "GyorgyteaLive",
  domain: "https://gyorgyteabolt.hu/",
  credentials: {
    adminApi: {
      storeUrl: "gyorgytea-new.myshopify.com",
      accessToken: process.env.GYT_LIVE_ADMIN_API_ACCESS_TOKEN ?? "",
      webhookCredentials: process.env.GYT_LIVE_WEBHOOK_SIGNATURE ?? "",
    },
  },
};

export default data;
