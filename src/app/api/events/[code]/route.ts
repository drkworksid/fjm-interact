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
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view"); // "presenter" | "participant" | "moderate" | null
    const voterToken = searchParams.get("voterToken") || "";

    // Security check: Only include trainerPin if authenticated as trainer/admin
    const token = req.cookies.get("fjm_trainer_token")?.value;
    const isTrainer = verifyTrainerToken(token, code);

    if (view === "presenter" || view === "participant" || view === "moderate") {
      const baseEvent = await prisma.event.findUnique({
        where: { code },
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          isModerationEnabled: true,
          isAnonymousAllowed: true,
          status: true,
          highlightedQuestionId: true,
          announcement: true,
          trainerPin: isTrainer,
        },
      });

      if (!baseEvent) {
        return NextResponse.json({ success: false, error: "Event tidak ditemukan" }, { status: 404 });
      }

      if (view === "presenter") {
        const [questions, polls, ideasPolls, rankingPolls, surveys] = await Promise.all([
          prisma.question.findMany({
            where: { eventId: baseEvent.id, status: { in: ["APPROVED", "ANSWERED"] } },
            orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
            select: {
              id: true,
              authorName: true,
              isAnonymous: true,
              content: true,
              upvotes: true,
              status: true,
              createdAt: true,
            },
          }),
          prisma.poll.findMany({
            where: { eventId: baseEvent.id },
            orderBy: { orderIndex: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
              isActive: true,
              isLocked: true,
              showResults: true,
              hasCorrectAnswer: true,
              quizState: true,
              timerSeconds: true,
              orderIndex: true,
              // Hanya ambil imageUrl, options, dan responses untuk poll yang sedang aktif
              imageUrl: true,
              options: {
                orderBy: { orderIndex: "asc" },
                select: {
                  id: true,
                  optionText: true,
                  isCorrect: true,
                  pointValue: true,
                  orderIndex: true,
                },
              },
              responses: {
                select: {
                  id: true,
                  optionId: true,
                  textResponse: true,
                  ratingValue: true,
                  participantToken: true,
                  participantName: true,
                  createdAt: true,
                },
              },
            },
          }),
          prisma.ideasPoll.findMany({
            where: { eventId: baseEvent.id },
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, status: true, question: true },
          }),
          prisma.rankingPoll.findMany({
            where: { eventId: baseEvent.id },
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, status: true, question: true },
          }),
          prisma.survey.findMany({
            where: { eventId: baseEvent.id },
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, status: true, description: true },
          }),
        ]);

        // Strip heavy imageUrl & responses for inactive polls to keep payload tiny
        const optimizedPolls = polls.map((p) =>
          p.isActive ? p : { ...p, imageUrl: null, responses: [] }
        );

        return NextResponse.json({
          success: true,
          event: {
            ...baseEvent,
            questions,
            polls: optimizedPolls,
            ideasPolls,
            rankingPolls,
            surveys,
          },
        });
      }

      if (view === "participant") {
        const [questions, polls, ideasPolls, rankingPolls, surveys] = await Promise.all([
          prisma.question.findMany({
            where: { eventId: baseEvent.id, status: { in: ["APPROVED", "ANSWERED"] } },
            orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
            select: {
              id: true,
              authorName: true,
              isAnonymous: true,
              content: true,
              upvotes: true,
              status: true,
              createdAt: true,
              votes: voterToken
                ? {
                    where: { voterToken },
                    select: { id: true, voterToken: true },
                  }
                : undefined,
            },
          }),
          prisma.poll.findMany({
            where: { eventId: baseEvent.id, isActive: true },
            orderBy: { orderIndex: "asc" },
            select: {
              id: true,
              title: true,
              imageUrl: true,
              type: true,
              isActive: true,
              isLocked: true,
              showResults: true,
              hasCorrectAnswer: true,
              quizState: true,
              timerSeconds: true,
              orderIndex: true,
              options: {
                orderBy: { orderIndex: "asc" },
                select: {
                  id: true,
                  optionText: true,
                  isCorrect: true,
                  pointValue: true,
                  orderIndex: true,
                },
              },
              responses: {
                select: {
                  id: true,
                  optionId: true,
                  textResponse: true,
                  ratingValue: true,
                  participantToken: true,
                },
              },
            },
          }),
          prisma.ideasPoll.findMany({
            where: { eventId: baseEvent.id, status: "active" },
            orderBy: { createdAt: "desc" },
            include: {
              ideas: {
                where: voterToken
                  ? { OR: [{ status: "published" }, { participantId: voterToken }] }
                  : { status: "published" },
                orderBy: [{ isPinned: "desc" }, { reactionCount: "desc" }, { createdAt: "desc" }],
                include: {
                  reactions: voterToken
                    ? { where: { participantId: voterToken }, select: { id: true, participantId: true } }
                    : false,
                },
              },
            },
          }),
          prisma.rankingPoll.findMany({
            where: { eventId: baseEvent.id, status: "active" },
            orderBy: { createdAt: "desc" },
            include: {
              options: { orderBy: { order: "asc" } },
              responses: voterToken
                ? {
                    where: { participantId: voterToken },
                    include: { answers: true },
                  }
                : false,
            },
          }),
          prisma.survey.findMany({
            where: { eventId: baseEvent.id, status: "active" },
            orderBy: { createdAt: "desc" },
            include: {
              questions: { orderBy: { order: "asc" } },
              responses: voterToken
                ? {
                    where: { participantId: voterToken },
                    include: { answers: true },
                  }
                : false,
            },
          }),
        ]);

        return NextResponse.json({
          success: true,
          event: {
            ...baseEvent,
            questions: questions.map((q: any) => ({ ...q, votes: q.votes || [] })),
            polls,
            ideasPolls,
            rankingPolls: rankingPolls.map((rp: any) => ({ ...rp, responses: rp.responses || [] })),
            surveys: surveys.map((s: any) => ({ ...s, responses: s.responses || [] })),
          },
        });
      }

      // view === "moderate"
      const [questions, polls, ideasPolls, rankingPolls, surveys] = await Promise.all([
        prisma.question.findMany({
          where: { eventId: baseEvent.id },
          orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            authorName: true,
            isAnonymous: true,
            content: true,
            upvotes: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.poll.findMany({
          where: { eventId: baseEvent.id },
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            title: true,
            imageUrl: true,
            type: true,
            isActive: true,
            isLocked: true,
            showResults: true,
            hasCorrectAnswer: true,
            quizState: true,
            timerSeconds: true,
            orderIndex: true,
            options: {
              orderBy: { orderIndex: "asc" },
              select: {
                id: true,
                optionText: true,
                isCorrect: true,
                pointValue: true,
                orderIndex: true,
              },
            },
            responses: {
              select: {
                id: true,
                optionId: true,
                textResponse: true,
                ratingValue: true,
                participantToken: true,
                participantName: true,
                createdAt: true,
              },
            },
          },
        }),
        prisma.ideasPoll.findMany({
          where: { eventId: baseEvent.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            question: true,
            description: true,
            status: true,
            allowAnonymous: true,
            allowReactions: true,
            allowParticipantsToSeeIdeas: true,
            moderationEnabled: true,
            maxIdeasPerParticipant: true,
          },
        }),
        prisma.rankingPoll.findMany({
          where: { eventId: baseEvent.id },
          orderBy: { createdAt: "desc" },
          include: {
            options: { orderBy: { order: "asc" } },
          },
        }),
        prisma.survey.findMany({
          where: { eventId: baseEvent.id },
          orderBy: { createdAt: "desc" },
          include: {
            questions: { orderBy: { order: "asc" } },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        event: {
          ...baseEvent,
          questions,
          polls,
          ideasPolls,
          rankingPolls,
          surveys,
        },
      });
    }

    // Default fallback query (backward compatible)
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
        ideasPolls: {
          orderBy: { createdAt: "desc" },
          include: {
            ideas: {
              orderBy: [{ isPinned: "desc" }, { reactionCount: "desc" }, { createdAt: "desc" }],
              include: {
                reactions: true,
              },
            },
          },
        },
        rankingPolls: {
          orderBy: { createdAt: "desc" },
          include: {
            options: {
              orderBy: { order: "asc" },
            },
            responses: {
              include: {
                answers: true,
              },
            },
          },
        },
        surveys: {
          orderBy: { createdAt: "desc" },
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
            responses: {
              include: {
                answers: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: "Event tidak ditemukan" }, { status: 404 });
    }

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

    if (body.announcement !== undefined) {
      dataToUpdate.announcement = body.announcement ? String(body.announcement).trim() : null;
    }

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
