import { NextResponse } from "next/server";
import { adminClient } from "@admin-api/admin-client";
import { Admin } from "@admin-api/operations";
import { CredentialType, getCredentials } from "@constants/Credentials";
import { getViesApiEndpoint } from "@constants/ThirdPartyEndpoints";
import { z } from "zod";

const inputSchema = z.object({
  vatNumber: z.string(),
  email: z.string(),
});

const viesResponseSchema = z.object({
  isValid: z.boolean(),
});

export async function POST(request: Request) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  const input: unknown = await request.json();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { headers, status: 400 });
  }
  const { vatNumber, email } = parsed.data;

  if (!vatNumber) {
    return NextResponse.json({ error: "Missing VAT number" }, { headers, status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { headers, status: 400 });
  }

  const credentials = getCredentials("ZhaoZhouTeaEu", CredentialType.AdminApi);

  if (!credentials?.accessToken || !credentials?.storeUrl) {
    console.error("Credentials not found");
    return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
  }

  const client = adminClient(credentials.storeUrl, credentials.accessToken);

  const { data: customerData } = await client.query(Admin.Queries.GetCustomerByEmail, { query: `email:${email}` });

  const customer = customerData?.customers?.nodes[0];
  const customerExists = !!customer;
  const customerTaxExempt =
    customer?.taxExemptions.includes("EU_REVERSE_CHARGE_EXEMPTION_RULE") &&
    customer?.metafields.nodes.find((field) => field.key === "vat_number")?.value === vatNumber;

  if (customerTaxExempt) {
    return NextResponse.json(
      {
        success: true,
        body: "Customer is already tax exempt",
      },
      { headers, status: 200 },
    );
  }

  const viesResponse = await fetch(getViesApiEndpoint(vatNumber));
  const viesData: unknown = await viesResponse.json();
  const parsedViesData = viesResponseSchema.safeParse(viesData);
  if (!parsedViesData.success) {
    return NextResponse.json({ error: "Invalid VAT number" }, { headers, status: 400 });
  }
  const { isValid } = parsedViesData.data;

  if (!isValid) {
    return NextResponse.json(
      {
        error: "Invalid VAT number",
      },
      { headers, status: 400 },
    );
  }

  if (isValid) {
    const { data: _upsertCustomerData, error: upsertCustomerError } = await client.mutation(
      customerExists ? Admin.Mutations.UpdateCustomer : Admin.Mutations.CreateCustomer,
      {
        input: customerExists
          ? {
              id: customerData.customers.nodes[0].id,
              taxExemptions: ["EU_REVERSE_CHARGE_EXEMPTION_RULE"],
              metafields: [
                {
                  key: "vat_number",
                  namespace: "custom",
                  value: vatNumber,
                },
              ],
            }
          : {
              email,
              firstName: "",
              lastName: "",
              taxExemptions: ["EU_REVERSE_CHARGE_EXEMPTION_RULE"],
              metafields: [
                {
                  key: "vat_number",
                  namespace: "custom",
                  value: vatNumber,
                },
              ],
            },
      },
    );

    if (upsertCustomerError) {
      console.error(upsertCustomerError);
      return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        body: "Tax exemption successfully applied to the customer",
      },
      { headers, status: 200 },
    );
  }
}
