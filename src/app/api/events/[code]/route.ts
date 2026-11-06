import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const event = await prisma.event.findUnique({
      where: { code },
      include: {
        questions: {
          orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
          include: {
            votes: true,
          },
        },
        polls: {
          orderBy: { orderIndex: "asc" },
          include: {
            options: {
              orderBy: { orderIndex: "asc" },
              include: {
                _count: {
                  select: { responses: true },
                },
              },
            },
            responses: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: "Event tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const body = await req.json();

    const updated = await prisma.event.update({
      where: { code },
      data: {
        title: body.title,
        description: body.description,
        isModerationEnabled: body.isModerationEnabled,
        isAnonymousAllowed: body.isAnonymousAllowed,
        status: body.status,
        highlightedQuestionId: body.highlightedQuestionId !== undefined ? body.highlightedQuestionId : undefined,
      },
    });

    broadcastToEvent(code, "event:updated", updated);

    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

