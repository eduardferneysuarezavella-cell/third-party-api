import { z } from "zod";

export const ShopifyProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  descriptionHtml: z.string().nullable(),
  vendor: z.string().nullable(),
  totalInventory: z.number(),
  updatedAt: z.string(),
  priceRange: z.object({
    min: z.object({
      currency: z.string(),
    }),
  }),
  fizzCategory: z.object({
    id: z.string(),
  }),
  variants: z.array(
    z.object({
      id: z.string(),
      sku: z.string().nullable(),
      barcode: z.string().nullable(),
      price: z.string(),
    }),
  ),
  images: z.array(
    z.object({
      url: z.string(),
    }),
  ),
  metafields: z.array(
    z.object({
      id: z.string(),
      namespace: z.string(),
      key: z.string(),
      value: z.string(),
      type: z.string(),
    }),
  ),
});

export const FizzCategoryTagTypeSchema = z.object({
  tagType: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
});

export const FizzCategorySchema = z.object({
  id: z.union([z.string(), z.number()]).transform((val) => String(val)),
  categoryTagTypes: z
    .array(
      z.object({
        tagType: z
          .object({
            id: z.union([z.string(), z.number()]).transform((val) => String(val)),
            name: z.string(),
          })
          .nullable(),
      }),
    )
    .nullable(),
});

export const FizzProductRequestSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    sku: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => {
      if (val === null || val === undefined) return null;
      return String(val);
    }).optional(),
    externalVendorId: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => {
      if (val === null || val === undefined) return null;
      return String(val);
    }),
  })
  .loose();

export const FizzListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().optional(),
    skip: z.number().optional(),
    take: z.number().optional(),
  });

export const FizzCategoryResponseSchema = z.object({
  data: FizzCategorySchema,
});

export const FizzCategoryListResponseSchema = z.object({
  data: z.array(FizzCategorySchema),
  total: z.number(),
  skip: z.number(),
  take: z.number(),
});

export type FizzCategory = z.infer<typeof FizzCategorySchema>;
export type FizzProductRequest = z.infer<typeof FizzProductRequestSchema>;
