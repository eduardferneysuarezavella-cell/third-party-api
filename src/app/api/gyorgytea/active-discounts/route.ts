import { adminClient } from "@admin-api/admin-client";
import { Admin } from "@admin-api/operations";
import { CredentialType, getCredentials } from "@constants/Credentials";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function OPTIONS() {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  } as const;
  return NextResponse.json({}, { headers });
}

export async function GET(req: NextRequest) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  } as const;

  const shop = req?.nextUrl?.searchParams.get("shop");

  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { headers, status: 400 });
  }

  const credentials = getCredentials(shop === "new" ? "GyorgyteaLive" : "GyorgyteaDev", CredentialType.AdminApi);

  if (!credentials?.accessToken || !credentials?.storeUrl) {
    console.error("Credentials not found");
    return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
  }

  const client = adminClient(credentials.storeUrl, credentials.accessToken);

  try {
    const { data: discountData, error } = await client.query(Admin.Queries.GetActiveAutomaticProductDiscounts, {});

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
    }

    const activeDiscounts =
      discountData?.automaticDiscountNodes?.edges.map((edge) => edge.node.automaticDiscount) ?? [];

    return NextResponse.json(activeDiscounts, { headers, status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
  }
}
