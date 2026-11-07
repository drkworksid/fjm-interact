import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";
import { verifyTrainerToken } from "@/lib/auth";

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

    // Security check: Only include trainerPin if authenticated as trainer/admin
    const token = req.cookies.get("fjm_trainer_token")?.value;
    const isTrainer = verifyTrainerToken(token, code);

    const resultEvent = { ...event };
    if (!isTrainer) {
      delete (resultEvent as any).trainerPin;
    }

    return NextResponse.json({ success: true, event: resultEvent });
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

    const dataToUpdate: any = {
      title: body.title,
      description: body.description,
      isModerationEnabled: body.isModerationEnabled,
      isAnonymousAllowed: body.isAnonymousAllowed,
      status: body.status,
      highlightedQuestionId: body.highlightedQuestionId !== undefined ? body.highlightedQuestionId : undefined,
    };

    if (body.trainerPin && /^\d{6}$/.test(body.trainerPin)) {
      dataToUpdate.trainerPin = body.trainerPin;
    }

    const updated = await prisma.event.update({
      where: { code },
      data: dataToUpdate,
    });

    broadcastToEvent(code, "event:updated", updated);

    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
