import type { StoreData } from "../StoreMap";

const data: StoreData = {
  name: "TestBarat",
  domain: "https://testbarat.myshopify.com",
  credentials: {
    adminApi: {
      storeUrl: "testbarat.myshopify.com",
      accessToken: process.env.TESTBARAT_ADMIN_API_ACCESS_TOKEN ?? "",
      webhookCredentials: "",
    },
    fizzApi: {
      clientId: process.env.FIZZ_CLIENT_ID ?? "",
      clientSecret: process.env.FIZZ_CLIENT_SECRET ?? "",
      env: "demo", // Use 'prod' for production environment
    },
  },
};

export default data;
