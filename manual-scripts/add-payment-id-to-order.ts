import { adminClient } from "@admin-api/admin-client";
import { Admin } from "@admin-api/operations";
import { CredentialType, getCredentials } from "@constants/Credentials";

type OrderAttribute = { key: string; value: string };

async function main(orderId: string, additionalAttributes: OrderAttribute[]) {
  const credentials = getCredentials("GyorgyteaLive", CredentialType.AdminApi);

  if (!orderId || typeof credentials?.storeUrl !== "string" || typeof credentials?.accessToken !== "string") {
    console.error("Order ID not found");
    return;
  }

  const client = adminClient(credentials.storeUrl, credentials.accessToken);

  const { data, error } = await client.query(Admin.Queries.GetTransactionPaymentIdByOrderById, { id: orderId });

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Payment ID: ${data?.order?.transactions[0]?.paymentId}`);

  const paymentId = data?.order?.transactions[0]?.paymentId;

  if (!paymentId) {
    console.error("Payment ID not found");
    return;
  }

  const transactionAttributeKey = "SimplePay TRX";
  const transactionAttributeValue = paymentId.slice(-9);

  const newCustomAttributes: OrderAttribute[] = [
    ...(data?.order?.customAttributes.map((attribute) => ({ key: attribute.key, value: attribute.value || "" })) || []),
    ...additionalAttributes,
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
}

const additionalAttributes = [{ key: "", value: "" }].filter(({ key, value }) => !!key && !!value);
const ORDER_ID = "11800807145849";
const SHOPIFY_ORDER_GID = `gid://shopify/Order/${ORDER_ID}`;

void main(SHOPIFY_ORDER_GID, additionalAttributes);
