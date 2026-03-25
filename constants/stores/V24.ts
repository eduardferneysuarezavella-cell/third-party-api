import type { StoreData } from "../StoreMap";

const data: StoreData = {
  name: "V24",
  domain: "https://v24essentials.hu",
  logo: "https://cdn.shopify.com/s/files/1/0602/3384/2824/files/v24-logo_2.png",
  credentials: {
    email: {
      name: "V24",
      user: "info@v24essentials.hu",
      serviceClientId: "105448879800895922885",
      privateKey: process.env.V24_G_PRIVATE_KEY ?? "",
    },
  },
};

export default data;
