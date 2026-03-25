if (process.env.NODE_ENV === "production") {
  // @ts-ignore
  import("server-only");
}

const MailConfig = {
  GMAIL: {
    host: "smtp.gmail.com",
    port: 465,
    accessUrl: "https://oauth2.googleapis.com/token",
    authType: "OAuth2",
  },
} as const;

const MailProviderTypes = ["GMAIL"] as const;
export type MailProviderType = (typeof MailProviderTypes)[number];

export const getMailConfig = (provider: MailProviderType) => {
  return MailConfig[provider];
};
