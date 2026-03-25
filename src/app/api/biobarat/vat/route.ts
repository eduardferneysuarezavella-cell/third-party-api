import { NextResponse } from "next/server";
import { getViesApiEndpoint } from "@constants/ThirdPartyEndpoints";
import { z } from "zod";

const inputSchema = z.object({
  vatNumber: z.string(),
});

const viesResponseSchema = z.object({
  isValid: z.boolean(),
});

export async function POST(request: Request) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const body: unknown = await request.json();
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { headers, status: 400 });
    }

    const { vatNumber } = parsed.data;
    if (!vatNumber) {
      return NextResponse.json({ error: "Missing VAT number" }, { headers, status: 400 });
    }

    const response = await fetch(getViesApiEndpoint(vatNumber));

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch VIES data" }, { headers, status: response.status });
    }

    const viesData: unknown = await response.json();
    const parsedViesData = viesResponseSchema.safeParse(viesData);
    if (!parsedViesData.success) {
      return NextResponse.json({ error: "Invalid response structure from VIES API" }, { headers, status: 500 });
    }

    const { isValid } = parsedViesData.data;

    if (typeof isValid !== "boolean") {
      return NextResponse.json({ error: "Invalid response structure from VIES API" }, { headers, status: 500 });
    }

    return NextResponse.json(viesData, { headers });
  } catch (error) {
    return NextResponse.json({ error: "An unexpected error occurred", details: error }, { headers, status: 500 });
  }
}
