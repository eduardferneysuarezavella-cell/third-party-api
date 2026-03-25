import { Client, cacheExchange, fetchExchange } from "@urql/core";
if (process.env.NODE_ENV === "production") {
  // @ts-ignore
  import("server-only");
}

export const adminClient = (domain: string, token: string) =>
  new Client({
    url: `https://${domain}/admin/api/2024-07/graphql.json`,
    exchanges: [cacheExchange, fetchExchange],
    fetchOptions: () => {
      return {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
      };
    },
  });
