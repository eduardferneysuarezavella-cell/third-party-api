export const getViesApiEndpoint = (vat: string) => {
  return `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${vat.slice(0, 2)}/vat/${vat}`;
};

export const getFizzAuthEndpoint = (env: "demo" | "prod" = "demo") => {
  const envPrefix = env === "demo" ? ".demo" : "";
  return `https://auth${envPrefix}.fizz.hu/realms/open-cart/protocol/openid-connect/token`;
};

export const getFizzApiEndpoint = (env: "demo" | "prod" = "demo") => {
  const envPrefix = env === "demo" ? ".demo" : "";
  return `https://merchant-api${envPrefix}.fizz.hu/api/v1`;
};
