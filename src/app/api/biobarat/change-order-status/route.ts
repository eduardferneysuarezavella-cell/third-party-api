import { adminClient } from "@admin-api/admin-client";
import { Admin } from "@admin-api/operations";
import { CredentialType, getCredentials } from "@constants/Credentials";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface WebhookResponse {
  id: string;
  provider: Provider;
  reference_id: string;
  source_id: string;
  mode: string;
  direct: boolean;
  origin: Origin;
  sender: Sender;
  destination: Destination;
  recipient: Recipient;
  parcels: Parcel[];
  tracking?: unknown;
  status: Status;
  events: Event[];
  created_at: string;
  updated_at: string;
}

interface Event {
  hash: string;
  event: string;
  actor: string;
  timestamp: string;
  provider: null[];
  is_simulated?: unknown;
}

interface Status {
  status: string;
  resolution?: unknown;
  timestamp: string;
}

interface Parcel {
  reference_id: string;
  tracking?: unknown;
  label: null[];
  weight: number;
  dimensions: null[];
  cash_on_delivery: null[];
  value?: unknown;
  insurance?: unknown;
}

interface Recipient {
  first_name: string;
  last_name: string;
  name: string;
  language: string;
  email: string;
  phone: string;
}

interface Destination {
  pickup_point: Provider;
  address: Address;
  location: Location;
}

interface Location {
  latitude: number;
  longitude: number;
}

interface Sender {
  name: string;
  email: string;
  phone: string;
}

interface Origin {
  address: Address;
}

interface Address {
  country: string;
  state?: unknown;
  city: string;
  postal_code: string;
  address_line1: string;
  address_line2?: unknown;
  note?: unknown;
}

interface Provider {
  id: string;
}

export function OPTIONS() {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  } as const;
  return NextResponse.json({}, { headers });
}

export async function POST(req: NextRequest) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  } as const;

  const data = (await req.json()) as WebhookResponse;

  console.log(data);

  if (!data.source_id.includes("biobarat.myshopify.com")) {
    console.log(`Event for ${data.reference_id} cannot be applied to an order in this store.`);
    return NextResponse.json({}, { headers, status: 200 });
  }

  const isDelivered = data.events.some((e) => e.event === "delivered");

  if (!isDelivered) {
    console.log(`Event for ${data.reference_id} does not have a delivered status.`);
    return NextResponse.json({}, { headers, status: 200 });
  }

  const credentials = getCredentials("BioBarat", CredentialType.AdminApi);

  if (typeof credentials?.accessToken !== "string" || typeof credentials?.storeUrl !== "string") {
    console.error("Credentials not found");
    return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
  }

  const client = adminClient(credentials.storeUrl, credentials.accessToken);

  const orderId = `gid://shopify/Order/${data.reference_id}`;

  try {
    const { data: orderData, error: orderError } = await client.query(Admin.Queries.GetOrderFulfillments, {
      orderId,
    });

    if (!!orderError ?? !orderData?.order) {
      console.error("Error fetching fulfillments:", orderError);
      return NextResponse.json({ error: "Failed to fetch fulfillments" }, { headers, status: 500 });
    }

    if (orderData.order.fulfillments.length > 0) {
      for (const fulfillment of orderData.order.fulfillments) {
        const { data: fulfillmentEventData, error: fulfillmentEventError } = await client.mutation(
          Admin.Mutations.MarkFulfillmentDelivered,
          { fulfillmentId: fulfillment.id },
        );

        if (fulfillmentEventError) {
          console.error(`Error marking fulfillment ${fulfillment.id} as delivered:`, fulfillmentEventError);
          continue;
        }

        if (
          fulfillmentEventData?.fulfillmentEventCreate?.userErrors &&
          fulfillmentEventData.fulfillmentEventCreate.userErrors.length > 0
        ) {
          console.error(
            `User errors marking fulfillment ${fulfillment.id} as delivered:`,
            fulfillmentEventData.fulfillmentEventCreate.userErrors,
          );
          continue;
        }

        console.log(`Fulfillment ${fulfillment.id} marked as delivered.`);
      }
    }

    if (!(orderData.order.fulfillments.length > 0)) {
      console.log(`No fulfillments found for order ${orderId} or fulfillments array is empty.`);
    }

    if (!orderData.order.fullyPaid) {
      const { data: paidData, error: paidError } = await client.mutation(Admin.Mutations.MarkOrderAsPaid, {
        id: orderId,
      });

      if (paidError) {
        console.error(`Error marking order ${orderId} as paid:`, paidError);
      } else if (paidData?.orderMarkAsPaid?.userErrors && paidData.orderMarkAsPaid.userErrors.length > 0) {
        console.error(`User errors marking order ${orderId} as paid:`, paidData.orderMarkAsPaid.userErrors);
      } else {
        console.log(
          `Order ${orderId} marked as paid. Status: ${paidData?.orderMarkAsPaid?.order?.displayFinancialStatus}`,
        );
      }
    }

    return NextResponse.json({ message: "Webhook processed" }, { headers, status: 200 });
  } catch (error) {
    console.error("General error in POST handler:", error);
    return NextResponse.json({ error: "Internal server error" }, { headers, status: 500 });
  }
}
