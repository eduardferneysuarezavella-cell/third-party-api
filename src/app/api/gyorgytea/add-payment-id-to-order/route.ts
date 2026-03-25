import { adminClient } from "@admin-api/admin-client";
import { Admin } from "@admin-api/operations";
import { CredentialType, getCredentials } from "@constants/Credentials";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  const allowedParams = ["live", "dev"];

  const shop = request?.nextUrl?.searchParams.get("shop");

  if (!shop || !allowedParams.includes(shop)) {
    return NextResponse.json({ error: "Shop not found" }, { headers, status: 400 });
  }

  const credentials = getCredentials(shop === "live" ? "GyorgyteaLive" : "GyorgyteaDev", CredentialType.AdminApi);

  if (!credentials?.accessToken || !credentials?.storeUrl) {
    console.error("Credentials not found");
    return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
  }

  const shopifyHmac = request.headers.get("X-Shopify-Hmac-Sha256");
  const byteArray = request.body;

  if (!byteArray) {
    console.error("Body not found");
    return NextResponse.json({ error: "Body not found" }, { headers, status: 400 });
  }

  if (!shopifyHmac) {
    console.error("Webhook signature not found");
    return NextResponse.json({ error: "Webhook signature not found" }, { headers, status: 400 });
  }

  if (!credentials.webhookCredentials) {
    console.error("Webhook credentials not found");
    return NextResponse.json({ error: "Webhook credentials not found" }, { headers, status: 400 });
  }

  const bodyBuffer = await request.arrayBuffer();

  const decoder = new TextDecoder("utf-8");
  const bodyString = decoder.decode(bodyBuffer);

  const calculatedHmacDigest = crypto
    .createHmac("sha256", credentials.webhookCredentials)
    .update(new Uint8Array(bodyBuffer))
    .digest("base64");

  const hmacValid = crypto.timingSafeEqual(Buffer.from(calculatedHmacDigest), Buffer.from(shopifyHmac));

  if (!hmacValid) {
    console.error("Webhook signature does not match");
    return NextResponse.json({ error: "Webhook signature does not match" }, { headers, status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyString);
  } catch (error) {
    console.error("Failed to parse webhook body:", error);
    return NextResponse.json({ error: "Invalid webhook body format" }, { headers, status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("admin_graphql_api_id" in body) ||
    typeof body.admin_graphql_api_id !== "string"
  ) {
    console.error("Invalid webhook body format");
    return NextResponse.json({ error: "Invalid webhook body format" }, { headers, status: 400 });
  }

  const orderId = body.admin_graphql_api_id;

  if (!orderId) {
    console.error("Order ID not found");
    return NextResponse.json({ error: "Order ID not found" }, { headers, status: 400 });
  }

  const client = adminClient(credentials.storeUrl, credentials.accessToken);

  const { data, error } = await client.query(Admin.Queries.GetTransactionPaymentIdByOrderById, { id: orderId });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
  }

  const gatewayName = data?.order?.transactions[0]?.gateway;
  console.log(`Gateway name: ${gatewayName}`);

  if (shop === "live" && gatewayName !== "shopify_payments") {
    return NextResponse.json({ success: true }, { headers, status: 200 });
  }

  const paymentId = data?.order?.transactions[0]?.paymentId;

  if (!paymentId) {
    console.error("Payment ID not found");
    return NextResponse.json({ error: "Payment ID not found" }, { headers, status: 400 });
  }

  const transactionAttributeKey = "SimplePay TRX";
  const transactionAttributeValue = paymentId.slice(-9);

  const newCustomAttributes = [
    ...(data?.order?.customAttributes.map((attribute) => ({ key: attribute.key, value: attribute.value ?? "" })) ?? []),
    {
      key: transactionAttributeKey,
      value: transactionAttributeValue,
    },
  ];

  await client.mutation(Admin.Mutations.UpdateOrder, {
    input: {
      id: orderId,
      customAttributes: newCustomAttributes,
    },
  });

  return NextResponse.json({ success: true }, { headers, status: 200 });
}
