import { adminApi as graphql } from "./graphql";

const GetCustomerByEmail = graphql(`
  query GetCustomerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      nodes {
        email
        id
        firstName
        lastName
        taxExemptions
        metafields(first: 10) {
          nodes {
            value
            key
            namespace
          }
        }
      }
    }
  }
`);

const CreateCustomer = graphql(`
  mutation CreateCustomerByEmail($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer {
        email
        id
        firstName
        lastName
        taxExemptions
      }
    }
  }
`);

const UpdateCustomer = graphql(`
  mutation UpdateCustomerByEmail($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        email
        id
        firstName
        lastName
        taxExemptions
      }
    }
  }
`);

const GetDiscountCodeById = graphql(`
  query GetDiscountCodeById($id: ID!) {
    codeDiscountNode(id: $id) {
      id
      codeDiscount {
        __typename
        ... on DiscountCodeFreeShipping {
          customerSelection {
            ... on DiscountCustomers {
              customers {
                id
              }
            }
          }
          title
          codes(first: 10) {
            nodes {
              code
            }
          }
          endsAt
          startsAt
          status
          appliesOncePerCustomer
          usageLimit
        }
        ... on DiscountCodeBasic {
          title
          endsAt
          startsAt
          status
          appliesOncePerCustomer
          recurringCycleLimit
          customerSelection {
            ... on DiscountCustomers {
              customers {
                id
              }
            }
          }
          usageLimit
          codes(first: 10) {
            nodes {
              code
            }
          }
          customerGets {
            appliesOnOneTimePurchase
            appliesOnSubscription
            value {
              ... on DiscountPercentage {
                percentage
              }
              ... on DiscountAmount {
                amount {
                  amount
                  currencyCode
                }
              }
              ... on DiscountOnQuantity {
                effect {
                  ... on DiscountAmount {
                    amount {
                      amount
                      currencyCode
                    }
                    appliesOnEachItem
                  }
                  ... on DiscountPercentage {
                    percentage
                  }
                }
                quantity {
                  quantity
                }
              }
            }
            items {
              ... on DiscountCollections {
                collections(first: 10) {
                  nodes {
                    title
                    id
                  }
                }
              }
            }
          }
          codesCount {
            count
            precision
          }
          combinesWith {
            orderDiscounts
            productDiscounts
            shippingDiscounts
          }
          minimumRequirement {
            ... on DiscountMinimumQuantity {
              greaterThanOrEqualToQuantity
            }
            ... on DiscountMinimumSubtotal {
              greaterThanOrEqualToSubtotal {
                amount
                currencyCode
              }
            }
          }
          shortSummary
          summary
        }
        ... on DiscountCodeApp {
          title
          endsAt
          startsAt
          status
          appliesOncePerCustomer
          usageLimit
          codes(first: 10) {
            nodes {
              code
            }
          }
        }
      }
    }
  }
`);

const UpdateBasicDiscountCode = graphql(`
  mutation UpdateBasicDiscountCode($id: ID!, $basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        codeDiscount {
          __typename
          ... on DiscountCodeBasic {
            title
            endsAt
            startsAt
            status
            appliesOncePerCustomer
            usageLimit
            codes(first: 10) {
              nodes {
                code
              }
            }
            codesCount {
              count
              precision
            }
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
          }
        }
      }
      userErrors {
        code
        message
        extraInfo
        field
      }
    }
  }
`);

const UpdateFreeShippingDiscountCode = graphql(`
  mutation UpdateFreeShippingDiscountCode($id: ID!, $freeShippingDiscount: DiscountCodeFreeShippingInput!) {
    discountCodeFreeShippingUpdate(id: $id, freeShippingCodeDiscount: $freeShippingDiscount) {
      codeDiscountNode {
        codeDiscount {
          __typename
          ... on DiscountCodeBasic {
            title
            endsAt
            startsAt
            status
            appliesOncePerCustomer
            usageLimit
            codes(first: 10) {
              nodes {
                code
              }
            }
            codesCount {
              count
              precision
            }
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
          }
        }
      }
      userErrors {
        code
        message
        extraInfo
        field
      }
    }
  }
`);

const SetMetafields = graphql(`
  mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        namespace
        value
      }
      userErrors {
        code
        message
        field
      }
    }
  }
`);

const GetCustomerMetafield = graphql(`
  query GetCustomerMetafield($id: ID!, $namespace: String!) {
    customer(id: $id) {
      metafields(namespace: $namespace, first: 20) {
        nodes {
          key
          namespace
          value
        }
      }
    }
  }
`);

const GetAutomaticAppDiscounts = graphql(`
  query GetAutomaticAppDiscounts {
    automaticDiscountNodes(first: 100, query: "status:ACTIVE AND type:app") {
      nodes {
        automaticDiscount {
          __typename
          ... on DiscountAutomaticApp {
            title
            startsAt
            endsAt
            status
          }
          ... on DiscountAutomaticBasic {
            title
          }
          ... on DiscountAutomaticFreeShipping {
            title
          }
          ... on DiscountAutomaticBxgy {
            title
          }
        }
        metafields(first: 10) {
          nodes {
            key
            namespace
            value
          }
        }
      }
    }
  }
`);

const GetActiveAutomaticProductDiscounts = graphql(`
  query GetActiveAutomaticProductDiscounts {
    automaticDiscountNodes(first: 100, query: "status:ACTIVE AND type:all") {
      edges {
        node {
          automaticDiscount {
            ... on DiscountAutomaticBasic {
              title
              customerGets {
                appliesOnOneTimePurchase
                ... on DiscountCustomerGets {
                  value {
                    ... on DiscountAmount {
                      amount {
                        amount
                        currencyCode
                      }
                    }
                    ... on DiscountPercentage {
                      percentage
                    }
                  }
                }
                items {
                  ... on DiscountCollections {
                    collections(first: 50) {
                      nodes {
                        handle
                      }
                    }
                  }
                  ... on DiscountProducts {
                    productVariants(first: 200) {
                      nodes {
                        title
                        product {
                          handle
                        }
                      }
                    }
                    products(first: 200) {
                      nodes {
                        id
                        handle
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);

const GetShopifyFunctions = graphql(`
  query GetShopifyFunctions {
    shop {
      name
      myshopifyDomain
    }
    shopifyFunctions(first: 25) {
      edges {
        node {
          id
        }
      }
      nodes {
        app {
          title
        }
        apiType
        title
        id
      }
    }
    appDiscountTypes {
      title
      functionId
    }
  }
`);

const GetTransactionPaymentIdByOrderById = graphql(`
  query GetOrderById($id: ID!) {
    order(id: $id) {
      id
      customAttributes {
        key
        value
      }
      transactions {
        id
        paymentId
        gateway
      }
    }
  }
`);

const UpdateOrder = graphql(`
  mutation UpdateOrder($input: OrderInput!) {
    orderUpdate(input: $input) {
      order {
        id
        customAttributes {
          key
          value
        }
      }
    }
  }
`);

const DiscountAutomaticAppCreate = graphql(`
  mutation DiscountAutomaticAppCreate($input: DiscountAutomaticAppInput!) {
    discountAutomaticAppCreate(automaticAppDiscount: $input) {
      automaticAppDiscount {
        discountId
      }
      userErrors {
        code
        field
        message
        extraInfo
      }
    }
  }
`);

const DiscountAutomaticAppUpdate = graphql(`
  mutation DiscountAutomaticAppUpdate($input: DiscountAutomaticAppInput!, $id: ID!) {
    discountAutomaticAppUpdate(automaticAppDiscount: $input, id: $id) {
      automaticAppDiscount {
        discountId
      }
      userErrors {
        code
        field
        message
        extraInfo
      }
    }
  }
`);

const GetOrderFulfillments = graphql(`
  query GetOrderFulfillments($orderId: ID!) {
    order(id: $orderId) {
      fullyPaid
      fulfillments(first: 5) {
        id
        status
        createdAt
        trackingInfo {
          number
        }
      }
    }
  }
`);

const GetAllProducts = graphql(`
  query GetAllProducts($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      edges {
        node {
          id
          title
          handle
          description
          descriptionHtml
          productType
          vendor
          tags
          status
          createdAt
          updatedAt
          publishedAt
          totalInventory
          onlineStoreUrl
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                barcode
                price
                compareAtPrice
                availableForSale
                inventoryQuantity
                taxable
                image {
                  id
                  url
                  altText
                }
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          options {
            id
            name
            values
          }
          collections(first: 10) {
            edges {
              node {
                id
                title
                handle
              }
            }
          }
          seo {
            title
            description
          }
          metafields(first: 20) {
            edges {
              node {
                id
                namespace
                key
                value
                type
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`);

const MarkFulfillmentDelivered = graphql(`
  mutation MarkFulfillmentDelivered($fulfillmentId: ID!) {
    fulfillmentEventCreate(fulfillmentEvent: { fulfillmentId: $fulfillmentId, status: DELIVERED, message: "Order delivered to customer" }) {
      fulfillmentEvent {
        id
        status
        happenedAt
      }
      userErrors {
        field
        message
      }
    }
  }
`);

const MarkOrderAsPaid = graphql(`
  mutation MarkOrderAsPaid($id: ID!) {
    orderMarkAsPaid(input: { id: $id }) {
      order {
        id
        displayFinancialStatus
      }
      userErrors {
        field
        message
      }
    }
  }
`);

const Mutations = {
  CreateCustomer,
  UpdateCustomer,
  UpdateBasicDiscountCode,
  UpdateFreeShippingDiscountCode,
  SetMetafields,
  UpdateOrder,
  DiscountAutomaticAppCreate,
  DiscountAutomaticAppUpdate,
  MarkFulfillmentDelivered,
  MarkOrderAsPaid,
};

const Queries = {
  GetCustomerByEmail,
  GetDiscountCodeById,
  GetCustomerMetafield,
  GetActiveAutomaticProductDiscounts,
  GetTransactionPaymentIdByOrderById,
  GetAutomaticAppDiscounts,
  GetShopifyFunctions,
  GetOrderFulfillments,
  GetAllProducts,
};

export const Admin = {
  Mutations,
  Queries,
};
