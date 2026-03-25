import { adminClient } from "@admin-api/admin-client";
import { Admin } from "@admin-api/operations";
import { CredentialType, getCredentials } from "@constants/Credentials";
import { NextResponse } from "next/server";
import { z } from "zod";

const webhookResponseSchema = z.object({
  admin_graphql_api_id: z.string(),
  title: z.string(),
  status: z.enum(["ACTIVE", "EXPIRED", "SCHEDULED"]),
  created_at: z.string(),
  updated_at: z.string(),
});

export async function POST(request: Request) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  const body: unknown = await request.json();

  const webhookResponse = webhookResponseSchema.safeParse(body);
  if (!webhookResponse.success) {
    return NextResponse.json({ error: "Invalid webhook response" }, { headers, status: 400 });
  }

  const credentials = getCredentials("GyorgyteaDev", CredentialType.AdminApi);

  if (!credentials?.accessToken || !credentials?.storeUrl) {
    console.error("Credentials not found");
    return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
  }

  const client = adminClient(credentials.storeUrl, credentials.accessToken);

  const { data: discountData, error } = await client.query(Admin.Queries.GetDiscountCodeById, {
    id: webhookResponse.data.admin_graphql_api_id,
  });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
  }

  const discount = discountData?.codeDiscountNode?.codeDiscount;

  if (
    !discount ||
    (discount.__typename !== "DiscountCodeBasic" && discount.__typename !== "DiscountCodeFreeShipping")
  ) {
    return NextResponse.json({ error: "Discount not found" }, { headers, status: 400 });
  }

  if (discount.title.includes("HUSEG")) {
    return NextResponse.json({ error: "Discount title already modified" }, { headers, status: 400 });
  }

  const getNewDiscountTitle = (disc: typeof discount | null) => {
    if (!disc) {
      return "";
    }

    if (disc.__typename === "DiscountCodeFreeShipping") {
      return `HUSEGS-${disc.title}`;
    }

    if (disc.__typename === "DiscountCodeBasic") {
      const discountPercentage =
        disc.customerGets.value.__typename === "DiscountPercentage" ? disc.customerGets.value.percentage * 100 : 0;

      return `HUSEG${discountPercentage}-${disc.title}`;
    }
  };

  const newDiscountTitle = getNewDiscountTitle(discount);

  const customerId =
    discount.customerSelection.__typename === "DiscountCustomers" ? discount.customerSelection.customers[0].id : null;

  if (!customerId) {
    return NextResponse.json({ error: "Customer not found" }, { headers, status: 400 });
  }

  const discountCodeMetafield = {
    key: "discount_codes",
    namespace: "b2c",
  };

  const { data: preexistingCustomerDiscounts, error: preexistingCustomerDiscountsError } = await client.query(
    Admin.Queries.GetCustomerMetafield,
    {
      id: customerId,
      namespace: discountCodeMetafield.namespace,
    },
  );

  if (preexistingCustomerDiscountsError) {
    console.error(preexistingCustomerDiscountsError);
    return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
  }

  const existingDiscounts = JSON.parse(
    preexistingCustomerDiscounts?.customer?.metafields?.nodes.find(
      (metafield) => metafield.key === discountCodeMetafield.key,
    )?.value ?? "[]",
  ) as string[];

  const { data: updateCustomerMetafield, error: updateCustomerMetafieldError } = await client.mutation(
    Admin.Mutations.SetMetafields,
    {
      metafields: [
        {
          ownerId: customerId,
          namespace: discountCodeMetafield.namespace,
          key: discountCodeMetafield.key,
          type: "list.single_line_text_field",
          value: JSON.stringify([...existingDiscounts, newDiscountTitle]),
        },
      ],
    },
  );

  if (updateCustomerMetafieldError) {
    console.error(updateCustomerMetafieldError);
    return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
  }

  if ((updateCustomerMetafield?.metafieldsSet?.userErrors?.length ?? 0) > 0) {
    console.error(updateCustomerMetafield?.metafieldsSet?.userErrors);
    return NextResponse.json(
      { error: updateCustomerMetafield?.metafieldsSet?.userErrors[0].message },
      { headers, status: 400 },
    );
  }

  if (discount.__typename === "DiscountCodeBasic") {
    const { data: updatedDiscount, error: updateError } = await client.mutation(
      Admin.Mutations.UpdateBasicDiscountCode,
      {
        id: webhookResponse.data.admin_graphql_api_id,
        basicCodeDiscount: {
          appliesOncePerCustomer: discount.appliesOncePerCustomer,
          endsAt: discount.endsAt,
          startsAt: discount.startsAt,
          usageLimit: discount.usageLimit,
          combinesWith: {
            orderDiscounts: true,
            productDiscounts: true,
            shippingDiscounts: true,
          },
          title: newDiscountTitle,
          code: newDiscountTitle,
        },
      },
    );
    if (updateError) {
      console.error(updateError);
      return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
    }

    if ((updatedDiscount?.discountCodeBasicUpdate?.userErrors?.length ?? 0) > 0) {
      console.error(updatedDiscount?.discountCodeBasicUpdate?.userErrors);
      return NextResponse.json(
        { error: updatedDiscount?.discountCodeBasicUpdate?.userErrors[0].message },
        { headers, status: 400 },
      );
    }
  }

  if (discount.__typename === "DiscountCodeFreeShipping") {
    const { data: updatedDiscount, error: updateError } = await client.mutation(
      Admin.Mutations.UpdateFreeShippingDiscountCode,
      {
        id: webhookResponse.data.admin_graphql_api_id,
        freeShippingDiscount: {
          appliesOncePerCustomer: discount.appliesOncePerCustomer,
          endsAt: discount.endsAt,
          startsAt: discount.startsAt,
          usageLimit: discount.usageLimit,
          combinesWith: {
            orderDiscounts: true,
            productDiscounts: true,
          },
          title: newDiscountTitle,
          code: newDiscountTitle,
        },
      },
    );
    if (updateError) {
      console.error(updateError);
      return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
    }

    if ((updatedDiscount?.discountCodeFreeShippingUpdate?.userErrors?.length ?? 0) > 0) {
      console.error(updatedDiscount?.discountCodeFreeShippingUpdate?.userErrors);
      return NextResponse.json(
        { error: updatedDiscount?.discountCodeFreeShippingUpdate?.userErrors[0].message },
        { headers, status: 400 },
      );
    }
  }

  return NextResponse.json({ success: true }, { headers, status: 200 });
}
