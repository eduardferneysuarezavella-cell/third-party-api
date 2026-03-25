import type { ZodType } from "zod";
import type { z } from "zod";
import { NextResponse } from "next/server";

export type ValidationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function validateJsonRequest<T>(req: Request, schema: ZodType): Promise<ValidationResult<T>> {
  try {
    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "Validation failed",
            issues: parsed.error.issues.map((i: z.core.$ZodIssue) => ({ path: i.path, message: i.message })),
          },
          { status: 400 },
        ),
      };
    }
    return { ok: true, data: parsed.data as T };
  } catch (err) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}

export function validateExternalResponse<T>(
  data: unknown,
  schema: ZodType,
): { ok: true; data: T } | { ok: false; error: unknown } {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error };
  }
  return { ok: true, data: parsed.data as T };
}
