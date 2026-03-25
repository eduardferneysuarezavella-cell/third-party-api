import { NextResponse } from "next/server";
import { z } from "zod";

const outcomeSchema = z.object({
  success: z.boolean(),
});

export async function POST(request: Request) {
  const allowedOrigins = ["https://bio-barat.hu", "https://admin.shopify.com"].map((o) => o.toLowerCase());

  const origin = (request.headers.get("Origin") ?? "").toLowerCase();

  if (!origin || !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = await request.formData();
    const token = body.get("cf-turnstile-response");
    const ips = request.headers.get("X-Forwarded-For") ?? request.headers.get("X-Real-IP");

    const ip = ips?.split(",")[0];

    if (!token ?? !ip) {
      return NextResponse.json({ error: "Missing token or IP" }, { headers, status: 400 });
    }

    if (!process.env.BIOBARAT_CAPTCHA_SECRET) {
      return NextResponse.json({ error: "Missing captcha secret" }, { headers, status: 400 });
    }

    const formData = new FormData();
    formData.append("secret", process.env.BIOBARAT_CAPTCHA_SECRET);
    formData.append("response", token ?? "");
    formData.append("remoteip", ip);

    const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    const result = await fetch(url, {
      body: formData,
      method: "POST",
    });

    const outcome: unknown = await result.json();
    const parsedOutcome = outcomeSchema.safeParse(outcome);
    if (!parsedOutcome.success) {
      return NextResponse.json({ error: "Invalid outcome" }, { headers, status: 400 });
    }
    const { success } = parsedOutcome.data;
    if (success) {
      return NextResponse.json({ success: true }, { headers, status: 200 });
    }

    return NextResponse.json({ error: "Invalid token" }, { headers, status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "An unexpected error occurred", details: error }, { headers, status: 500 });
  }
}
