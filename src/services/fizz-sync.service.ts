import { createFizzClient } from "@/services/fizz-client";
import { adminClient } from "@admin-api/admin-client";
import { Admin } from "@admin-api/operations";
import { CredentialType, getCredentials } from "@constants/Credentials";
import { z } from "zod";
import type { FizzSyncConfig } from "@/config/fizz-sync.config";
import { getFizzSyncConfig } from "@/config/fizz-sync.config";
import { ShopifyProductSchema, FizzProductRequestSchema, FizzCategorySchema } from "@/schemas/fizz";
import type { Store } from "@constants/StoreMap";

type ShopifyProduct = z.infer<typeof ShopifyProductSchema>;
type FizzProductRequest = z.infer<typeof FizzProductRequestSchema> & {
  sku?: string | null;
};
type FizzCategory = z.infer<typeof FizzCategorySchema>;

interface SyncResult {
  productTitle: string;
  action: "updated" | "created" | "skipped";
  productRequestId?: string;
  success: boolean;
  error?: string;
  details?: unknown;
}

interface SyncSummary {
  totalShopifyProducts: number;
  totalExistingRequests: number;
  totalProcessed: number;
  updatedCount: number;
  createdCount: number;
  skippedCount: number;
  errorCount: number;
  syncDuration: number;
}

export class FizzSyncService {
  private readonly config: FizzSyncConfig;
  private readonly fizzClient: ReturnType<typeof createFizzClient>;

  constructor(storeKey: Store, customConfig?: Partial<FizzSyncConfig>) {
    try {
      const fizzSyncConfig = getFizzSyncConfig(storeKey);
      this.config = { ...fizzSyncConfig, ...customConfig };

      const credentials = getCredentials(this.config.storeName, CredentialType.FizzApi);

      if (typeof credentials?.clientId !== "string" || typeof credentials?.clientSecret !== "string") {
        console.error(`[Fizz Sync Service] Fizz API credentials not found for store: ${this.config.storeName}`);
        throw new Error(`[Fizz Sync Service] Fizz API credentials not found for ${this.config.storeName}`);
      }
      this.fizzClient = createFizzClient(credentials);
    } catch (error) {
      console.error(`[Fizz Sync Service] Error in FizzSyncService constructor:`, error);
      throw error;
    }
  }

  getLastSyncTimestamp(): Date | null {
    try {
      return null;
    } catch (error) {
      return null;
    }
  }

  async fetchAllFizzProductRequests(): Promise<FizzProductRequest[]> {
    const allRequests: FizzProductRequest[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.fizzClient.get(`/single-product-request?skip=${skip}&take=${this.config.batchSize}`);
        let items: unknown[] = [];

        if (response.data && typeof response.data === 'object') {
          const responseData = response.data as Record<string, unknown>;
          if (Array.isArray(responseData.items)) {
            items = responseData.items;
          } else if (Array.isArray(responseData)) {
            items = responseData;
          }
        } else if (Array.isArray((response as Record<string, unknown>).items)) {
          items = (response as Record<string, unknown>).items as unknown[];
        } else if (Array.isArray(response)) {
          items = response;
        } else if (response && typeof response === 'object') {
          const responseObj = response as Record<string, unknown>;
          const possibleKeys = ['data', 'items', 'results', 'products', 'requests'];
          for (const key of possibleKeys) {
            if (Array.isArray(responseObj[key])) {
              items = responseObj[key] as unknown[];
              break;
            }
          }
        }

        if (items.length === 0) {
          hasMore = false;
          break;
        }
        try {
          const validatedRequests = z.array(FizzProductRequestSchema).parse(items);
          allRequests.push(...validatedRequests);
        } catch (validationError) {
          console.error(`[DEBUG] Validation error for Fizz requests at skip=${skip}:`, validationError);
          console.error(`[DEBUG] Problematic data:`, items);

          items.forEach((item: unknown, index: number) => {
            try {
              FizzProductRequestSchema.parse(item);
            } catch (itemError) {
              console.error(`[DEBUG] Item ${index} validation failed:`, itemError);
              console.error(`[DEBUG] Item ${index} raw data:`, item);
            }
          });

          const safeItems = items.filter((item): item is FizzProductRequest => {
            return typeof item === 'object' && item !== null && 'id' in item;
          });
          allRequests.push(...safeItems);
        }

        if (items.length < this.config.batchSize) {
          hasMore = false;
        } else {
          skip += this.config.batchSize;
        }
      } catch (error) {
        console.error(`[DEBUG] Error fetching Fizz requests at skip=${skip}:`, error);
        throw error;
      }
    }

    const _skuCount = allRequests.filter(r => r.sku && r.sku.trim() !== '').length;
    const _externalVendorIdCount = allRequests.filter(r => r.externalVendorId && r.externalVendorId.trim() !== '').length;
    
    return allRequests;
  }

  async fetchShopifyProducts(_lastSyncTime?: Date): Promise<ShopifyProduct[]> {
    try {
      const adminApiCredentials = getCredentials(this.config.storeName, CredentialType.AdminApi);

      if (typeof adminApiCredentials?.accessToken !== "string" || typeof adminApiCredentials?.storeUrl !== "string") {
        console.error(`Admin API credentials not found for store: ${this.config.storeName}`);
        throw new Error(`Admin API credentials not found for store: ${this.config.storeName}`);
      }

      const client = adminClient(adminApiCredentials.storeUrl, adminApiCredentials.accessToken);

      type DetailedCategoryInfo = {
        id: string;
        name: string;
        displayName: string;
        description: string;
        externalId: string;
        orderNumber: number;
        visible: boolean;
        parentCategoryId: string;
        categoryTagTypes: { tagType: { id: string; name: string } | null }[];
        categoryGoogleIds: string[];
        createdAt: string;
        updatedAt: string;
      };

      const fizzCategoriesMap: Map<string, DetailedCategoryInfo> = new Map();
      try {
        const fizzCredentials = getCredentials(this.config.storeName, CredentialType.FizzApi);
        if (fizzCredentials?.clientId && fizzCredentials?.clientSecret) {
          const fizzClient = createFizzClient(fizzCredentials);

          const categoriesResponse = await fizzClient.get<{ items?: DetailedCategoryInfo[] }>("/category");

          if (
            categoriesResponse?.data &&
            typeof categoriesResponse.data === "object" &&
            categoriesResponse.data.items
          ) {
            categoriesResponse.data.items.forEach((category) => {
              if (category.name && category.id) {
                const categoryInfo = {
                  id: category.id,
                  name: category.name,
                  displayName: category.displayName,
                  description: category.description,
                  externalId: category.externalId,
                  orderNumber: category.orderNumber,
                  visible: category.visible,
                  parentCategoryId: category.parentCategoryId,
                  categoryTagTypes: category.categoryTagTypes || [],
                  categoryGoogleIds: category.categoryGoogleIds || [],
                  createdAt: category.createdAt,
                  updatedAt: category.updatedAt,
                };

                fizzCategoriesMap.set(category.name.toLowerCase().trim(), categoryInfo);
                if (category.displayName && category.displayName !== category.name) {
                  fizzCategoriesMap.set(category.displayName.toLowerCase().trim(), categoryInfo);
                }
              }
            });
          }
        }
      } catch (fizzError) {
        console.warn("Failed to fetch Fizz categories:", fizzError);
      }

      const queryString = "metafields.custom.isfizzproduct:true";

      const { data: productsData, error } = await client.query(Admin.Queries.GetAllProducts, {
        first: 250,
        query: queryString,
      });

      if (error) {
        throw new Error(`Failed to fetch products from Shopify: ${error.message}`);
      }

      if (!productsData?.products) {
        throw new Error("No products data received");
      }

      const transformedProducts = (
        await Promise.all(
          productsData.products.edges.map(async (edge) => {
            const product = edge.node;

            const fizzCategoryMetafield = product.metafields.edges.find(
              (metafieldEdge) => metafieldEdge.node.key === "fizz_category",
            );

            if (!fizzCategoryMetafield?.node?.value || fizzCategoryMetafield.node.value.trim() === "") {
              return null;
            }

            const baseTransformedProduct = {
              id: product.id,
              title: product.title,
              handle: product.handle,
              description: product.description,
              descriptionHtml: product.descriptionHtml,
              productType: product.productType,
              vendor: product.vendor,
              tags: product.tags,
              status: product.status,
              createdAt: product.createdAt,
              updatedAt: product.updatedAt,
              publishedAt: product.publishedAt,
              totalInventory: product.totalInventory,
              onlineStoreUrl: product.onlineStoreUrl,
              availableForSale: product.variants.edges.some((variantEdge) => variantEdge.node.availableForSale),
              variants: product.variants.edges.map((variantEdge) => ({
                id: variantEdge.node.id,
                title: variantEdge.node.title,
                sku: variantEdge.node.sku,
                barcode: variantEdge.node.barcode,
                price: variantEdge.node.price,
                compareAtPrice: variantEdge.node.compareAtPrice,
                availableForSale: variantEdge.node.availableForSale,
                inventoryQuantity: variantEdge.node.inventoryQuantity,
                taxable: variantEdge.node.taxable,
                image: variantEdge.node.image
                  ? {
                    id: variantEdge.node.image.id,
                    url: variantEdge.node.image.url,
                    altText: variantEdge.node.image.altText,
                  }
                  : null,
                selectedOptions: variantEdge.node.selectedOptions.map((option) => ({
                  name: option.name,
                  value: option.value,
                })),
              })),
              priceRange: {
                min: {
                  amount: product.priceRangeV2.minVariantPrice.amount,
                  currency: product.priceRangeV2.minVariantPrice.currencyCode,
                },
                max: {
                  amount: product.priceRangeV2.maxVariantPrice.amount,
                  currency: product.priceRangeV2.maxVariantPrice.currencyCode,
                },
              },
              images: product.images.edges.map((imageEdge) => ({
                id: imageEdge.node.id,
                url: imageEdge.node.url,
                altText: imageEdge.node.altText,
                width: imageEdge.node.width,
                height: imageEdge.node.height,
              })),
              metafields: product.metafields.edges.map((metafieldEdge) => ({
                id: metafieldEdge.node.id,
                namespace: metafieldEdge.node.namespace,
                key: metafieldEdge.node.key,
                value: metafieldEdge.node.value,
                type: metafieldEdge.node.type,
              })),
            };

            type TransformedProduct = typeof baseTransformedProduct & {
              fizzCategory?: DetailedCategoryInfo;
              fizzCategoryName?: string;
            };
            const transformedProduct: TransformedProduct = {
              ...baseTransformedProduct,
            };

            if (fizzCategoriesMap.size > 0) {
              const fizzCategoryMetafield = transformedProduct.metafields.find(
                (metafield) => metafield.key === "fizz_category",
              );

              if (fizzCategoryMetafield?.value) {
                const categoryName = fizzCategoryMetafield.value.toLowerCase().trim();
                const categoryInfo = fizzCategoriesMap.get(categoryName);

                if (categoryInfo) {
                  let detailedCategoryInfo: DetailedCategoryInfo = categoryInfo;
                  if (
                    (!categoryInfo.categoryTagTypes || categoryInfo.categoryTagTypes.length === 0) &&
                    categoryInfo.id
                  ) {
                    try {
                      const fizzCredentials = getCredentials(this.config.storeName, CredentialType.FizzApi);
                      if (fizzCredentials?.clientId && fizzCredentials?.clientSecret) {
                        const fizzClient = createFizzClient(fizzCredentials);
                        const categoryResponse = await fizzClient.get<DetailedCategoryInfo>(
                          `/category/${categoryInfo.id}`,
                        );
                        if (categoryResponse?.data && typeof categoryResponse.data === "object") {
                          detailedCategoryInfo = categoryResponse.data;
                        }
                      }
                    } catch (detailError) {
                      console.warn(`Failed to fetch detailed category info for ${categoryInfo.id}:`, detailError);
                    }
                  }

                  transformedProduct.fizzCategory = {
                    id: detailedCategoryInfo.id,
                    name: detailedCategoryInfo.name,
                    displayName: detailedCategoryInfo.displayName,
                    description: detailedCategoryInfo.description,
                    externalId: detailedCategoryInfo.externalId,
                    orderNumber: detailedCategoryInfo.orderNumber,
                    visible: detailedCategoryInfo.visible,
                    parentCategoryId: detailedCategoryInfo.parentCategoryId,
                    categoryTagTypes: detailedCategoryInfo.categoryTagTypes || [],
                    categoryGoogleIds: detailedCategoryInfo.categoryGoogleIds || [],
                    createdAt: detailedCategoryInfo.createdAt,
                    updatedAt: detailedCategoryInfo.updatedAt,
                  };
                  transformedProduct.fizzCategoryName = fizzCategoryMetafield.value;
                } else {
                  console.warn(
                    `Fizz category not found for product ${product.title}: "${fizzCategoryMetafield.value}"`,
                  );
                  transformedProduct.fizzCategoryName = fizzCategoryMetafield.value;
                  transformedProduct.fizzCategory = undefined;
                }
              }
            }

            return transformedProduct;
          }),
        )
      ).filter((product) => product !== null);

      const products = z.array(ShopifyProductSchema).parse(transformedProducts);
      return products;
    } catch (error) {
      console.error(`Error fetching Shopify products for store ${this.config.storeName}:`, error);
      throw error;
    }
  }

  async fetchCategoriesBatch(categoryIds: string[]): Promise<Map<string, FizzCategory>> {
    const categoriesMap = new Map<string, FizzCategory>();
    const uniqueCategoryIds = Array.from(new Set(categoryIds));

    const chunks = this.chunkArray(uniqueCategoryIds, this.config.maxConcurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (categoryId) => {
        try {
          const response = await this.fizzClient.get(`/category/${categoryId}`);
          const categoryData = response.data || response;
          const validatedCategory = FizzCategorySchema.parse(categoryData);
          return { id: categoryId, category: validatedCategory };
        } catch (error) {
          console.warn(`Failed to fetch category ${categoryId}:`, error);
          return { id: categoryId, category: null };
        }
      });

      const results = await Promise.all(promises);

      for (const result of results) {
        if (result.category) {
          categoriesMap.set(result.id, result.category);
        }
      }
    }

    return categoriesMap;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private findMatchingProductRequest(
    shopifyProduct: ShopifyProduct,
    existingRequests: FizzProductRequest[],
  ): FizzProductRequest | null {

    if (shopifyProduct.variants?.[0]?.sku && shopifyProduct.variants[0].sku.trim() !== '') {
      const productSku = shopifyProduct.variants[0].sku;

      const skuMatch = existingRequests.find(
        request => request.sku && request.sku.trim() !== '' && request.sku === productSku
      );

      if (skuMatch) {
        return skuMatch;
      } 
    } 
    const externalVendorId = this.buildExternalVendorId(shopifyProduct);
    const vendorIdMatch = existingRequests.find(
      request => request.externalVendorId && request.externalVendorId === externalVendorId
    );

    if (vendorIdMatch) {
      return vendorIdMatch;
    } 

    const nameMatch = existingRequests.find(
      request => request.name && request.name.toLowerCase().trim() === shopifyProduct.title.toLowerCase().trim()
    );

    if (nameMatch) {
      return nameMatch;
    } else {
    }
    return null;
  }

  private buildExternalVendorId(product: ShopifyProduct): string {
    const vendorName = (product.vendor ?? '').trim();
    const firstVariantId = product.variants?.[0]?.id;

    if (!firstVariantId) {
      return vendorName;
    }

    const numericId = firstVariantId.includes('/')
      ? firstVariantId.split('/').pop() ?? ''
      : firstVariantId;

    const result = vendorName ? `${vendorName}-${numericId}` : numericId;
    return result;
  }

  private populateMissingDataInRequests(existingRequests: FizzProductRequest[], shopifyProducts: ShopifyProduct[]): FizzProductRequest[] {

    const populatedRequests = existingRequests.map(request => {
      if (request.sku && request.externalVendorId) {
        return request;
      }

      const matchingProduct = shopifyProducts.find(product =>
        product.title.toLowerCase().trim() === request.name?.toLowerCase().trim()
      );

      if (matchingProduct) {
        const sku = request.sku ?? matchingProduct.variants?.[0]?.sku ?? null;
        const externalVendorId = request.externalVendorId ?? this.buildExternalVendorId(matchingProduct);

        return {
          ...request,
          sku,
          externalVendorId
        };
      } else {
        return request;
      }
    });

    const _skuCount = populatedRequests.filter(r => r.sku && r.sku.trim() !== '').length;
    const _externalVendorIdCount = populatedRequests.filter(r => r.externalVendorId && r.externalVendorId.trim() !== '').length;
    return populatedRequests;
  }

  private buildProductPayload(product: ShopifyProduct, category: FizzCategory | null | undefined) {
    const externalVendorId = this.buildExternalVendorId(product);
    const firstVariant = product.variants?.[0];

    const defaultPayload = {
      name: product.title,
      description: product.descriptionHtml,
      categoryId: product.fizzCategory.id,
      visible: true,
      stock: product.totalInventory,
      deliveryTime: this.config.deliveryTime,
      externalVendorId,
    };

    type DefaultPayload = typeof defaultPayload;

    interface Payload extends DefaultPayload {
      assets?: {
        src: string;
        orderNumber: number;
      }[];
      sku?: string;
      ean?: string;
      price?: {
        currency: string;
        amount: string;
      };
      shippingPrice?: {
        currency: string;
        amount: string;
      };
      tags?: {
        tagTypeId: string;
        name: string;
      }[];
    }

    const payload: Payload = {
      ...defaultPayload,
    };

    if (product.images?.length) {
      payload.assets = product.images.map((image, index) => ({
        src: image.url,
        orderNumber: index,
      }));
    }

    if (firstVariant?.sku) {
      payload.sku = firstVariant.sku;
    }

    if (firstVariant?.barcode) {
      const numericId = firstVariant.id.includes("/") ? firstVariant.id.split("/").pop() || "" : firstVariant.id;
      payload.ean = `${firstVariant.barcode}-${numericId}`;
    } else if (firstVariant?.id) {
      const numericId = firstVariant.id.includes("/") ? firstVariant.id.split("/").pop() || "" : firstVariant.id;
      payload.ean = `NO-EAN-${numericId}`;
    }

    if (firstVariant?.price) {
      payload.price = {
        currency: this.config.currency,
        amount: firstVariant.price,
      };
      payload.shippingPrice = {
        currency: this.config.currency,
        amount: firstVariant.price,
      };
    }

    if (category?.categoryTagTypes) {
      const tags = category.categoryTagTypes
        .filter((ctt) => ctt.tagType)
        .map((ctt) => ({
          tagTypeId: ctt.tagType?.id ?? "",
          name: ctt.tagType?.name ?? "",
        }));

      if (tags.length > 0) {
        payload.tags = tags;
      }
    }

    return payload;
  }

  async updateMetafield(product: ShopifyProduct): Promise<void> {
    const adminApiCredentials = getCredentials(this.config.storeName, CredentialType.AdminApi);
    if (!adminApiCredentials?.accessToken || !adminApiCredentials?.storeUrl) {
      console.error(`Admin API credentials are missing or invalid for product ${product.title}`);
      return;
    }
    try {
      if (!product.id) {
        console.error(`Product ID is undefined for product: ${product.title}`);
        return;
      }

      const productIdNumeric = product.id.replace("gid://shopify/Product/", "");
      const metafieldsUrl = `https://${adminApiCredentials.storeUrl.replace(/^https?:\/\//, "")}/admin/api/2025-07/products/${productIdNumeric}/metafields.json`;

      const existingMetafieldsResponse = await fetch(metafieldsUrl, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": adminApiCredentials.accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!existingMetafieldsResponse.ok) {
        const errorText = await existingMetafieldsResponse.text();
        console.error(
          `Failed to fetch existing metafields for product ${product.title}:`,
          existingMetafieldsResponse.status,
          errorText,
        );
        return;
      }

      const existingMetafieldsData = (await existingMetafieldsResponse.json()) as {
        metafields?: { id: string; namespace: string; key: string }[];
      };
      const existingMetafield = existingMetafieldsData.metafields?.find(
        (mf) => mf.namespace === "custom" && mf.key === "fizz_sync_updated_time",
      );

      if (existingMetafield) {
        const currentTimestamp = new Date().toISOString();
        const updatePayload = {
          metafield: {
            value: currentTimestamp,
          },
        };

        const metafieldIdNumeric = existingMetafield.id.toString().replace("gid://shopify/Metafield/", "");
        const updateUrl = `https://${adminApiCredentials.storeUrl.replace(/^https?:\/\//, "")}/admin/api/2025-07/products/${productIdNumeric}/metafields/${metafieldIdNumeric}.json`;

        const updateResponse = await fetch(updateUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": adminApiCredentials.accessToken,
          },
          body: JSON.stringify(updatePayload),
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(
            `Direct metafield update failed for product ${product.title}:`,
            updateResponse.status,
            errorText,
          );

          const metafieldIdNumericAlt = existingMetafield.id.toString().replace("gid://shopify/Metafield/", "");
          const alternativeUpdatePayload = {
            product: {
              id: productIdNumeric,
              metafields: [
                {
                  id: metafieldIdNumericAlt,
                  value: currentTimestamp,
                  namespace: existingMetafield.namespace,
                  key: existingMetafield.key,
                },
              ],
            },
          };

          const alternativeUpdateUrl = `https://${adminApiCredentials.storeUrl.replace(/^https?:\/\//, "")}/admin/api/2025-07/products/${productIdNumeric}.json`;

          const alternativeUpdateResponse = await fetch(alternativeUpdateUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": adminApiCredentials.accessToken,
            },
            body: JSON.stringify(alternativeUpdatePayload),
          });

          if (!alternativeUpdateResponse.ok) {
            const alternativeErrorText = await alternativeUpdateResponse.text();
            console.error(
              `Alternative metafield update also failed for product ${product.title}:`,
              alternativeUpdateResponse.status,
              alternativeErrorText,
            );
          }
        }
      } else {
        const currentTimestamp = new Date().toISOString();
        const createMetafieldPayload = {
          metafield: {
            namespace: "custom",
            key: "fizz_sync_updated_time",
            value: currentTimestamp,
            type: "date_time",
          },
        };

        const createMetafieldUrl = `https://${adminApiCredentials.storeUrl.replace(/^https?:\/\//, "")}/admin/api/2025-07/products/${productIdNumeric}/metafields.json`;

        const createMetafieldResponse = await fetch(createMetafieldUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": adminApiCredentials.accessToken,
          },
          body: JSON.stringify(createMetafieldPayload),
        });

        if (!createMetafieldResponse.ok) {
          const errorText = await createMetafieldResponse.text();
          console.error(
            `Failed to create metafield for product ${product.title}:`,
            createMetafieldResponse.status,
            errorText,
          );
        }
      }
    } catch (metafieldError) {
      console.error(`Exception updating metafield for product ${product.title}:`, metafieldError);
    }
  }

  async processProduct(
    product: ShopifyProduct,
    existingRequests: FizzProductRequest[],
    categoriesMap: Map<string, FizzCategory>,
  ): Promise<SyncResult> {
    try {

      const matchingRequest = this.findMatchingProductRequest(product, existingRequests);
      if (matchingRequest) {
      }

      const category = categoriesMap.get(product.fizzCategory.id);
      const payload = this.buildProductPayload(product, category);

      if (matchingRequest) {
        const response = await this.fizzClient.makeRequest(
          `/single-product-request/${matchingRequest.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          }
        );

        if (response && response.success) {
          await this.updateMetafield(product);
        }

        return {
          productTitle: product.title,
          action: 'updated',
          productRequestId: matchingRequest.id,
          success: true,
          details: response,
        };
      } else {
        const requestId = `product-${product.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;

        const response = await this.fizzClient.makeRequest(
          '/import-adapter/batch-single-product-request',
          {
            method: 'POST',
            body: JSON.stringify([{ ...payload, status: 'PENDING' }]),
            headers: { 'x-request-id': requestId },
          }
        );

        if (response && response.success) {
          await this.updateMetafield(product);
        }

        return {
          productTitle: product.title,
          action: 'created',
          success: true,
          details: response,
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        productTitle: product.title,
        action: 'skipped',
        success: false,
        error: errorMessage,
        details: error,
      };
    }
  }

  async syncProducts(): Promise<{ summary: SyncSummary; results: SyncResult[] }> {
    const startTime = Date.now();

    try {
      const [existingRequests, shopifyProducts] = await Promise.all([
        this.fetchAllFizzProductRequests(),
        this.fetchShopifyProducts(),
      ]);


      const populatedRequests = this.populateMissingDataInRequests(existingRequests, shopifyProducts);

      if (shopifyProducts.length === 0) {
        return {
          summary: {
            totalShopifyProducts: 0,
            totalExistingRequests: existingRequests.length,
            totalProcessed: 0,
            updatedCount: 0,
            createdCount: 0,
            skippedCount: 0,
            errorCount: 0,
            syncDuration: Date.now() - startTime,
          },
          results: [],
        };
      }

      const productsToProcess = shopifyProducts.filter((product) => {
        const fizzSyncMetafield = product.metafields?.find((metafield) =>
          metafield.key === 'fizz_sync_updated_time'
        );

        if (!fizzSyncMetafield?.value || fizzSyncMetafield.value.trim() === '') {
          return true;
        }

        const productUpdatedAt = new Date(product.updatedAt);
        const lastSyncTime = new Date(fizzSyncMetafield.value);
        const timeDifferenceMs = productUpdatedAt.getTime() - lastSyncTime.getTime();
        const timeDifferenceSeconds = timeDifferenceMs / 1000;

        if (productUpdatedAt > lastSyncTime && timeDifferenceSeconds > 6) {
          return true;
        }
        return false;
      });

      if (productsToProcess.length === 0) {
        return {
          summary: {
            totalShopifyProducts: shopifyProducts.length,
            totalExistingRequests: existingRequests.length,
            totalProcessed: 0,
            updatedCount: 0,
            createdCount: 0,
            skippedCount: shopifyProducts.length,
            errorCount: 0,
            syncDuration: Date.now() - startTime,
          },
          results: [],
        };
      }

      const categoryIds = Array.from(new Set(productsToProcess.map((p) => p.fizzCategory.id)));
      const categoriesMap = await this.fetchCategoriesBatch(categoryIds);

      const results: SyncResult[] = [];
      const chunks = this.chunkArray(productsToProcess, this.config.maxConcurrency);

      for (const chunk of chunks) {
        const chunkPromises = chunk.map((product) => this.processProduct(product, populatedRequests, categoriesMap));

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
      }

      const summary: SyncSummary = {
        totalShopifyProducts: shopifyProducts.length,
        totalExistingRequests: existingRequests.length,
        totalProcessed: results.length,
        updatedCount: results.filter((r) => r.action === "updated").length,
        createdCount: results.filter((r) => r.action === "created").length,
        skippedCount: shopifyProducts.length - productsToProcess.length,
        errorCount: results.filter((r) => !r.success).length,
        syncDuration: Date.now() - startTime,
      };

      return { summary, results };
    } catch (error) {
      console.error("Sync failed:", error);
      throw error;
    }
  }
}
