import { adminClient } from "@admin-api/admin-client";
import { Admin } from "@admin-api/operations";
import { CredentialType, getCredentials } from "@constants/Credentials";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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
  const userTags = req?.nextUrl?.searchParams.get("userTags")?.split(",") || [];

  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { headers, status: 400 });
  }

  if (!userTags || userTags.length === 0) {
    return NextResponse.json({ error: "User ID not found" }, { headers, status: 400 });
  }

  const credentials = getCredentials(shop === "new" ? "GyorgyteaLive" : "GyorgyteaDev", CredentialType.AdminApi);

  if (!credentials?.accessToken || !credentials?.storeUrl) {
    console.error("Credentials not found");
    return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
  }

  const client = adminClient(credentials.storeUrl, credentials.accessToken);

  try {
    const { data: discountData, error } = await client.query(Admin.Queries.GetAutomaticAppDiscounts, {});

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
    }

    type Discount = {
      title: string;
      percentage: number;
      collections: string[];
      products: string[];
      variants: { title: string; product: string }[];
    };

    type DiscountMetafield = {
      userTags: string[];
      productIds: string[];
      discountPercentage: string;
    };

    const activeDiscounts: Discount[] =
      discountData?.automaticDiscountNodes.nodes
        .map((node) => {
          return {
            discount: node.automaticDiscount,
            configuration: JSON.parse(
              node.metafields.nodes.find((metafield) => metafield.key === "function-configuration")?.value || "{}",
            ) as DiscountMetafield,
          };
        })
        .filter((discount) => {
          const discountMetafield = discount.configuration;
          if (!discountMetafield?.userTags) {
            return false;
          }
          const tags = discountMetafield.userTags || [];
          return tags.some((tag) => userTags.includes(tag));
        })
        .map((data) => {
          const discountMetafield = data.configuration;
          const discountData = data.discount;
          if (!discountData) {
            return null;
          }
          const discount: Discount = {
            title: discountData.title,
            percentage: parseFloat(discountMetafield.discountPercentage),
            collections: [],
            products: discountMetafield.productIds,
            variants: [],
          };
          return discount;
        })
        .filter((discount) => discount !== null) || [];

    return NextResponse.json(activeDiscounts, { headers, status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
  }
}
