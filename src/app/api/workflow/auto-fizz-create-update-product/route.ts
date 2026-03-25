import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { FizzSyncService } from "@/services/fizz-sync.service";
import type { Store } from "@constants/StoreMap";
import { z } from "zod";

export function OPTIONS() {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  } as const;
  return NextResponse.json({}, { headers });
}

export async function GET(req: NextRequest) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  } as const;

  try {
    const storeParam = req.nextUrl.searchParams.get("store");

    if (typeof storeParam !== "string") {
      console.error("[Fizz Sync Service] Store parameter is required");
      return NextResponse.json(
        {
          error: "Store parameter is required",
        },
        { headers, status: 400 },
      );
    }

    const storeKey = storeParam.toLowerCase();

    const storeKeyMap: Record<string, Store> = {
      testbarat: "TestBarat",
      biobarat: "BioBarat",
    } as const;

    if (!storeKeyMap[storeKey]) {
      console.error("[Fizz Sync Service] Invalid store key");
      return NextResponse.json(
        {
          error: "Invalid store key",
        },
        { headers, status: 400 },
      );
    }

    const store = storeKeyMap[storeKey];

    const requiredEnvVars = {
      FIZZ_CLIENT_ID: process.env.FIZZ_CLIENT_ID,
      FIZZ_CLIENT_SECRET: process.env.FIZZ_CLIENT_SECRET,
      TESTBARAT_ADMIN_API_ACCESS_TOKEN: process.env.TESTBARAT_ADMIN_API_ACCESS_TOKEN,
    };

    const missingVars = Object.values(requiredEnvVars).filter((value) => typeof value !== "string");

    if (missingVars.length > 0) {
      console.error("[Fizz Sync Service] Missing required environment variables");
      return NextResponse.json(
        {
          error: "Missing required environment variables",
          missingVariables: missingVars,
          message: `Please set the following environment variables: ${missingVars.join(", ")}`,
        },
        { headers, status: 500 },
      );
    }

    let fizzSyncService;
    try {
      fizzSyncService = new FizzSyncService(store);
    } catch (serviceError) {
      console.error("[Fizz Sync Service] Error creating FizzSyncService:", serviceError);
      return NextResponse.json(
        {
          error: "Failed to create FizzSyncService",
          details: serviceError instanceof Error ? serviceError.message : "Unknown service error",
        },
        { headers, status: 500 },
      );
    }

    const { summary, results } = await fizzSyncService.syncProducts();

    return NextResponse.json(
      {
        success: true,
        summary,
        results,
        message: `Successfully processed ${summary.totalProcessed} products (${summary.updatedCount} updated, ${summary.createdCount} created, ${summary.skippedCount} skipped)`,
      },
      { headers, status: 200 },
    );
  } catch (error: unknown) {
    console.error("[Fizz Sync Service] Error in auto-fizz-create-update-product:", error);

    const errorSchema = z.object({
      response: z.object({
        data: z.unknown(),
        status: z.number(),
      }),
    });
    const parsedError = errorSchema.safeParse(error);

    if (parsedError.success) {
      console.error("[Fizz Sync Service] Error in auto-fizz-create-update-product:", parsedError.data.response.data);
      return NextResponse.json(
        {
          error: "Failed to process products",
          details: parsedError.data.response.data,
        },
        { headers, status: parsedError.data.response.status || 500 },
      );
    }

    console.error("[Fizz Sync Service] Error in auto-fizz-create-update-product:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred while processing products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { headers, status: 500 },
    );
  }
}
