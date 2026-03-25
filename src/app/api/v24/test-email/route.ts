import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import type { Options } from "nodemailer/lib/mailer";
import { CredentialType, getCredentials } from "@constants/Credentials";
import { getMailConfig } from "@constants/Mail";
import { StoreConstants } from "@constants/Stores";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string(),
  results: z.object({
    products: z.array(
      z.object({
        title: z.string(),
        tags: z.string(),
        handle: z.string(),
        body_html: z.string(),
        images: z.array(
          z.object({
            src: z.string(),
          }),
        ),
      }),
    ),
  }),
});

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { email, results } = parsed.data;

  const credentials = getCredentials("V24", CredentialType.Email);
  const mailConfig = getMailConfig("GMAIL");
  const storeDomain = StoreConstants.getStoreDomain("V24");
  const storeLogo = StoreConstants.getStoreLogo("V24");

  if (!credentials) {
    return NextResponse.json({ error: "Credentials not found" }, { status: 500 });
  }

  const productTitle = results.products[0].title;
  const productTags = results.products[0].tags;
  const productDescription = results.products[0].body_html;
  const productImage = results.products[0].images[0].src;
  const productHandle = results.products[0].handle;
  const productUrl = `${storeDomain}/products/${productHandle}`;

  console.log(`Received test email request: ${email} with product ${productTitle}`);

  const mailData: Options = {
    from: {
      name: credentials.name,
      address: credentials.user,
    },
    to: email,
    subject: "A V24 teszted eredménye",
    html: `
    <div
      style="
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        padding: 20px;
        font-family: 'Helvetica Neue', Helvetica, Arial, 'sans-serif';
      ">
      <a href="${storeDomain}" target="_blank" style="width: 125px" rel="noopener noreferrer">
        <img src="${storeLogo}" alt="V24" style="width: 125px" />
      </a>
      <h1 style="color: black; font-weight: 700; padding-top: 36px; padding-bottom: 36px; text-align: left; width: 100%">
        Köszönjük, hogy kitöltötted a tesztünket!
      </h1>

      <div style="color: #333; text-align: center">A válaszaid alapján az alábbi terméket ajánljuk a számodra:</div>

      <div style="border-top: 1px solid #ddd; margin-top: 20px">
        <a href="${productUrl}" style="text-decoration: none">
          <h2 style="text-align: center; color: #7b66e4; font-weight: 700">${productTitle}</h2>
        </a>

        <p style="text-align: center; color: #333; font-weight: 300; font-size: 14px">${productTags}</p>

        <a href="${productUrl}" style="width: 50%; margin-left: 12.5%; margin-right: 12.5%; margin-block: 16px">
          <img
            src="${productImage}"
            alt="${productTitle}"
            width="300px"
            style="border-radius: 8px; width: 50%; margin-left: 12.5%; margin-right: 12.5%; margin-block: 16px" />
        </a>

        <div style="margin-top: 10px; line-height: 1.6; color: #333">${productDescription.replace("\n", "")}</div>

        <div style="text-align: center; margin-top: 45px">
          <a
            href="${productUrl}"
            style="
              color: #fff;
              background-color: #7b66e4;
              padding: 20px 25px;
              border-radius: 8px;
              text-decoration: none;
              text-align: center;
              font-weight: 700;
              font-size: 16px;
              text-decoration: none;
            ">
            Tovább a termékre
          </a>
        </div>
      </div>
    </div>
    `,
  };

  const transporter = nodemailer.createTransport({
    port: mailConfig.port,
    host: mailConfig.host,
    auth: {
      type: mailConfig.authType,
      user: credentials.user,
      serviceClient: credentials.serviceClientId,
      privateKey: credentials.privateKey,
      accessUrl: mailConfig.accessUrl,
    },
    from: credentials.user,
    secure: true,
  });

  await new Promise((resolve, reject) => {
    transporter.sendMail(mailData, (err, info) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        console.log(info);
        resolve(info);
      }
    });
  });

  return NextResponse.json({
    ok: true,
  });
}
