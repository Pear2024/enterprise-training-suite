
// app/(app)/topics/[id]/edit/submit/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z, ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/topics?error=unauth", req.url), 303);
  
  if (session.role === "EMPLOYEE") return NextResponse.redirect(new URL("/topics?error=forbidden", req.url), 303);

  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) return NextResponse.redirect(new URL("/topics?error=badid", req.url), 303);

  const fd = await req.formData();
  const payload = {
    title: String(fd.get("title") ?? ""),
    description: String(fd.get("description") ?? ""),
    status: String(fd.get("status") ?? "ACTIVE"),
  };

  const schema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(10000).optional().transform(v => (v ?? "").trim()),
    status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  });

  try {
    const data = schema.parse(payload);
    await prisma.trainingTopic.update({
      where: { id: idNum },
      data: {
        title: data.title,
        description: data.description || null,
        status: data.status,
      },
    });
    return NextResponse.redirect(new URL("/topics?updated=1", req.url), 303);
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.redirect(new URL(`/topics/${id}/edit?error=invalid`, req.url), 303);
    }
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.redirect(new URL("/topics?error=notfound", req.url), 303);
    }
    console.error("POST /topics/[id]/edit/submit failed", e);
    return NextResponse.redirect(new URL(`/topics/${id}/edit?error=update_failed`, req.url), 303);
  }
}
