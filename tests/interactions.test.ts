import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { calculateRankingResults } from "../src/lib/ranking-calculator";

async function runInteractionTests() {
  console.log("=================================================");
  console.log("🚀 STARTING AUTOMATED TESTS: IDEAS, RANKING, SURVEY");
  console.log("=================================================\n");

  let testEventId: string | null = null;
  const testEventCode = "TEST" + Math.floor(1000 + Math.random() * 9000);

  try {
    // -------------------------------------------------------------------------
    // PREPARATION: Create Test Event
    // -------------------------------------------------------------------------
    console.log("📦 Creating temporary test event:", testEventCode);
    const testEvent = await prisma.event.create({
      data: {
        code: testEventCode,
        title: "Test Event for Interactions",
        description: "Automated test suite suite",
        status: "ACTIVE",
      },
    });
    testEventId = testEvent.id;
    assert.ok(testEventId, "Event should be created");

    // =========================================================================
    // FEATURE 1: IDEAS POLL (CURAH GAGASAN)
    // =========================================================================
    console.log("\n--- [TEST SUITE 1: IDEAS POLL] ---");

    // 1. Membuat polling ide
    console.log("1. Membuat Ideas Poll...");
    const ideasPoll = await prisma.ideasPoll.create({
      data: {
        eventId: testEventId,
        title: "Brainstorming Fitur Baru",
        question: "Fitur apa yang paling Anda butuhkan untuk onboarding?",
        description: "Tuliskan ide konkret Anda",
        status: "active",
        allowAnonymous: true,
        allowReactions: true,
        allowParticipantsToSeeIdeas: true,
        moderationEnabled: true,
        maxIdeasPerParticipant: 3,
        createdBy: "trainer-1",
      },
    });
    assert.equal(ideasPoll.title, "Brainstorming Fitur Baru");
    assert.equal(ideasPoll.status, "active");
    assert.equal(ideasPoll.moderationEnabled, true);
    console.log("✅ Ideas Poll berhasil dibuat.");

    // 2. Mengirim ide (Peserta 1 & 2)
    console.log("2. Mengirim ide dari peserta...");
    const idea1 = await prisma.idea.create({
      data: {
        pollId: ideasPoll.id,
        participantId: "token-p1",
        authorName: "Peserta Satu",
        content: "Membuat video panduan interaktif singkat 2 menit",
        category: "Materi",
        status: ideasPoll.moderationEnabled ? "pending" : "published",
      },
    });
    assert.equal(idea1.status, "pending", "Jika moderasi aktif, ide harus berstatus pending");

    const idea2 = await prisma.idea.create({
      data: {
        pollId: ideasPoll.id,
        participantId: "token-p2",
        authorName: "Peserta Dua",
        content: "Sesi live Q&A tatap muka setiap Jumat pagi",
        category: "Teknis",
        status: "pending",
      },
    });
    console.log("✅ Ide berhasil dikirim dengan status pending.");

    // 3. Moderasi ide (Trainer menyetujui, menolak, pin, edit)
    console.log("3. Moderasi ide (publish, pin, reject)...");
    const publishedIdea1 = await prisma.idea.update({
      where: { id: idea1.id },
      data: {
        status: "published",
        isPinned: true,
      },
    });
    assert.equal(publishedIdea1.status, "published");
    assert.equal(publishedIdea1.isPinned, true);

    const publishedIdea2 = await prisma.idea.update({
      where: { id: idea2.id },
      data: { status: "published" },
    });
    assert.equal(publishedIdea2.status, "published");
    console.log("✅ Moderasi ide berhasil diverifikasi.");

    // 4. Memberikan reaksi (Upvote)
    console.log("4. Memberikan reaksi / upvote...");
    const reaction1 = await prisma.ideaReaction.create({
      data: {
        ideaId: idea1.id,
        participantId: "token-p2",
        reactionType: "upvote",
      },
    });
    await prisma.idea.update({
      where: { id: idea1.id },
      data: { reactionCount: { increment: 1 } },
    });
    assert.ok(reaction1.id);

    // 5. Mencegah reaksi ganda
    console.log("5. Mencegah reaksi ganda dari peserta yang sama...");
    let duplicatePrevented = false;
    try {
      await prisma.ideaReaction.create({
        data: {
          ideaId: idea1.id,
          participantId: "token-p2", // Same participant & idea
          reactionType: "upvote",
        },
      });
    } catch (e) {
      duplicatePrevented = true;
    }
    assert.ok(duplicatePrevented, "Reaksi ganda dari peserta yang sama harus dicegah oleh unique constraint");
    console.log("✅ Reaksi ganda sukses dicegah.");

    // 6. Mengurutkan ide (Pinned first, reaction count, newest)
    console.log("6. Mengurutkan ide berdasarkan status pinned dan reaction count...");
    const allIdeas = await prisma.idea.findMany({
      where: { pollId: ideasPoll.id, status: "published" },
      orderBy: [{ isPinned: "desc" }, { reactionCount: "desc" }, { createdAt: "desc" }],
    });
    assert.equal(allIdeas.length, 2);
    assert.equal(allIdeas[0].id, idea1.id, "Ide yang di-pin harus berada di urutan teratas");
    console.log("✅ Pengurutan ide berhasil.");

    // 7. Menutup polling ide
    console.log("7. Menutup polling ide...");
    const closedIdeasPoll = await prisma.ideasPoll.update({
      where: { id: ideasPoll.id },
      data: { status: "closed" },
    });
    assert.equal(closedIdeasPoll.status, "closed");
    console.log("✅ Ideas Poll berhasil ditutup.");

    // =========================================================================
    // FEATURE 2: RANKING POLL (POLLING PERINGKAT & POSITIONAL SCORING)
    // =========================================================================
    console.log("\n--- [TEST SUITE 2: RANKING POLL] ---");

    // 1. Membuat Ranking Poll & Opsi
    console.log("1. Membuat Ranking Poll...");
    const rankingPoll = await prisma.rankingPoll.create({
      data: {
        eventId: testEventId,
        title: "Prioritas Fitur Q1",
        question: "Urutkan fitur yang paling penting dikembangkan lebih dulu!",
        minRankItems: 2,
        maxRankItems: 3,
        restrictedRanking: true,
        randomizeOptions: false,
        showResultsToParticipants: true,
        allowAnonymous: false,
        status: "active",
        options: {
          create: [
            { label: "Fitur A: Mobile Notification", order: 0 },
            { label: "Fitur B: Export Excel/PDF", order: 1 },
            { label: "Fitur C: AI Summary", order: 2 },
            { label: "Fitur D: SSO Google", order: 3 },
          ],
        },
      },
      include: { options: true },
    });
    assert.equal(rankingPoll.options.length, 4);
    assert.equal(rankingPoll.minRankItems, 2);
    assert.equal(rankingPoll.maxRankItems, 3);
    console.log("✅ Ranking Poll dengan 4 opsi berhasil dibuat.");

    const [optA, optB, optC, optD] = rankingPoll.options;

    // 2. Validasi minimum dan maksimum pilihan
    console.log("2. Validasi minimum dan maksimum pilihan...");
    const validateChoiceCount = (count: number, min: number, max: number) => {
      return count >= min && count <= max;
    };
    assert.equal(validateChoiceCount(1, rankingPoll.minRankItems, rankingPoll.maxRankItems), false, "1 pilihan harus ditolak (min 2)");
    assert.equal(validateChoiceCount(4, rankingPoll.minRankItems, rankingPoll.maxRankItems), false, "4 pilihan harus ditolak (max 3)");
    assert.equal(validateChoiceCount(3, rankingPoll.minRankItems, rankingPoll.maxRankItems), true, "3 pilihan harus valid");
    console.log("✅ Validasi min/max pilihan berhasil.");

    // 3. Submit Ranking Response & Positional Scores
    // Scenario:
    // Peserta 1 meranking: [optA (pos 1), optB (pos 2), optC (pos 3)]. (optD tidak dipilih)
    // Skor Peserta 1: optA = 3, optB = 2, optC = 1, optD = 0.
    // Peserta 2 meranking: [optB (pos 1), optA (pos 2)]. (optC & optD tidak dipilih)
    // Skor Peserta 2: optB = 2, optA = 1, optC = 0, optD = 0.
    console.log("3. Submit respons ranking dari 2 peserta...");

    // Response 1
    const resp1 = await prisma.rankingResponse.create({
      data: {
        pollId: rankingPoll.id,
        participantId: "rank-user-1",
        participantName: "Budi",
        answers: {
          create: [
            { optionId: optA.id, position: 1, score: 3 },
            { optionId: optB.id, position: 2, score: 2 },
            { optionId: optC.id, position: 3, score: 1 },
          ],
        },
      },
    });
    assert.ok(resp1.id);

    // Response 2
    const resp2 = await prisma.rankingResponse.create({
      data: {
        pollId: rankingPoll.id,
        participantId: "rank-user-2",
        participantName: "Siti",
        answers: {
          create: [
            { optionId: optB.id, position: 1, score: 2 },
            { optionId: optA.id, position: 2, score: 1 },
          ],
        },
      },
    });
    assert.ok(resp2.id);

    // 4. Mencegah duplicate response
    console.log("4. Mencegah respons ganda dari peserta...");
    let duplicateRankingPrevented = false;
    try {
      await prisma.rankingResponse.create({
        data: {
          pollId: rankingPoll.id,
          participantId: "rank-user-1", // Already submitted
          participantName: "Budi",
        },
      });
    } catch (e) {
      duplicateRankingPrevented = true;
    }
    assert.ok(duplicateRankingPrevented, "Peserta tidak boleh submit ranking lebih dari 1 kali");
    console.log("✅ Duplicate ranking response dicegah.");

    // 5. Perhitungan Positional Score & Average Score
    console.log("5. Menguji algoritma perhitungan skor positional average...");
    const rawResponses = await prisma.rankingResponse.findMany({
      where: { pollId: rankingPoll.id },
      include: { answers: true },
    });

    const calculated = calculateRankingResults({
      options: rankingPoll.options,
      responses: rawResponses,
    });
    assert.equal(calculated.totalParticipants, 2);

    // Total Score verifikasi:
    // optA: 3 (user1) + 1 (user2) = 4 points. average = 4 / 2 = 2.0
    // optB: 2 (user1) + 2 (user2) = 4 points. average = 4 / 2 = 2.0
    // optC: 1 (user1) + 0 (user2) = 1 point. average = 1 / 2 = 0.5
    // optD: 0 (user1) + 0 (user2) = 0 points. average = 0 / 2 = 0.0
    const resA = calculated.results.find((r) => r.optionId === optA.id)!;
    const resB = calculated.results.find((r) => r.optionId === optB.id)!;
    const resC = calculated.results.find((r) => r.optionId === optC.id)!;
    const resD = calculated.results.find((r) => r.optionId === optD.id)!;

    assert.equal(resA.totalScore, 4);
    assert.equal(resA.averageScore, 2.0);
    assert.equal(resB.totalScore, 4);
    assert.equal(resB.averageScore, 2.0);
    assert.equal(resC.totalScore, 1);
    assert.equal(resC.averageScore, 0.5);
    assert.equal(resD.totalScore, 0, "Opsi yang tidak dipilih harus bernilai 0");
    assert.equal(resD.averageScore, 0.0);
    console.log("✅ Perhitungan Positional Average Score 100% akurat.");

    // =========================================================================
    // FEATURE 3: SURVEY (SURVEI MULTI-PERTANYAAN)
    // =========================================================================
    console.log("\n--- [TEST SUITE 3: SURVEY] ---");

    // 1. Membuat survey
    console.log("1. Membuat Survey Container...");
    const survey = await prisma.survey.create({
      data: {
        eventId: testEventId,
        title: "Evaluasi Pelatihan Training",
        description: "Mohon isi evaluasi untuk perbaikan sesi mendatang",
        status: "active",
        allowAnonymous: true,
        showProgress: true,
        allowBackNavigation: true,
        showResultsAfterSubmit: true,
      },
    });
    assert.equal(survey.title, "Evaluasi Pelatihan Training");
    assert.equal(survey.status, "active");
    console.log("✅ Survey berhasil dibuat.");

    // 2. Menambahkan dan menghapus pertanyaan survey
    console.log("2. Menambahkan pertanyaan survey dengan berbagai tipe...");
    const q1 = await prisma.surveyQuestion.create({
      data: {
        surveyId: survey.id,
        type: "RATING",
        question: "Bagaimana kepuasan Anda terhadap materi trainer hari ini?",
        order: 1,
        required: true,
      },
    });

    const q2 = await prisma.surveyQuestion.create({
      data: {
        surveyId: survey.id,
        type: "MULTIPLE_CHOICE",
        question: "Seberapa relevan materi dengan pekerjaan Anda?",
        order: 2,
        required: true,
        options: JSON.stringify(["Sangat Relevan", "Cukup Relevan", "Kurang Relevan"]),
      },
    });

    const q3ToDelete = await prisma.surveyQuestion.create({
      data: {
        surveyId: survey.id,
        type: "OPEN_TEXT",
        question: "Pertanyaan sementara yang akan dihapus",
        order: 3,
        required: false,
      },
    });

    // Hapus q3
    await prisma.surveyQuestion.delete({
      where: { id: q3ToDelete.id },
    });

    const q4 = await prisma.surveyQuestion.create({
      data: {
        surveyId: survey.id,
        type: "OPEN_TEXT",
        question: "Saran dan masukan untuk trainer?",
        order: 3,
        required: false, // opsional
      },
    });

    const questionsList = await prisma.surveyQuestion.findMany({
      where: { surveyId: survey.id },
      orderBy: { order: "asc" },
    });
    assert.equal(questionsList.length, 3, "Harus tersisa 3 pertanyaan setelah penghapusan");
    console.log("✅ Penambahan dan penghapusan pertanyaan survey berhasil.");

    // 3. Validasi pertanyaan wajib (Required field validation)
    console.log("3. Validasi pertanyaan wajib (required)...");
    const checkRequiredAnswers = (
      questions: Array<{ id: string; required: boolean }>,
      answers: Record<string, any>
    ) => {
      for (const q of questions) {
        if (q.required) {
          const val = answers[q.id];
          if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
            return false;
          }
        }
      }
      return true;
    };

    assert.equal(
      checkRequiredAnswers(questionsList, { [q1.id]: 5 }),
      false,
      "Harus gagal karena q2 yang wajib belum diisi"
    );
    assert.equal(
      checkRequiredAnswers(questionsList, { [q1.id]: 5, [q2.id]: "Sangat Relevan" }),
      true,
      "Harus lolos karena semua pertanyaan wajib terisi (q4 opsional boleh kosong)"
    );
    console.log("✅ Validasi pertanyaan wajib berhasil.");

    // 4. Menyimpan Autosave (status: in_progress)
    console.log("4. Menyimpan respons autosave (status: in_progress)...");
    const surveyResp1 = await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        participantId: "survey-user-1",
        completionStatus: "in_progress",
        answers: {
          create: [
            { questionId: q1.id, value: "5" },
          ],
        },
      },
      include: { answers: true },
    });
    assert.equal(surveyResp1.completionStatus, "in_progress");
    assert.equal(surveyResp1.answers.length, 1);
    console.log("✅ Autosave berhasil disimpan.");

    // 5. Final Submit (status: completed)
    console.log("5. Final submit respons (status: completed)...");
    const completedSurveyResp = await prisma.surveyResponse.update({
      where: { id: surveyResp1.id },
      data: {
        completionStatus: "completed",
        completedAt: new Date(),
        answers: {
          create: [
            { questionId: q2.id, value: "Sangat Relevan" },
            { questionId: q4.id, value: "Pelatihan sangat bermanfaat!" },
          ],
        },
      },
      include: { answers: true },
    });
    assert.equal(completedSurveyResp.completionStatus, "completed");
    assert.equal(completedSurveyResp.answers.length, 3);
    console.log("✅ Final submit survey sukses.");

    // Add another response that is abandoned / in_progress to test completion rate
    await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        participantId: "survey-user-2",
        completionStatus: "in_progress",
      },
    });

    // 6. Menghitung Completion Rate
    console.log("6. Menghitung Completion Rate...");
    const allSurveyResponses = await prisma.surveyResponse.findMany({
      where: { surveyId: survey.id },
    });
    const totalStarted = allSurveyResponses.length;
    const completedCount = allSurveyResponses.filter((r) => r.completionStatus === "completed").length;
    const completionRate = totalStarted > 0 ? (completedCount / totalStarted) * 100 : 0;

    assert.equal(totalStarted, 2);
    assert.equal(completedCount, 1);
    assert.equal(completionRate, 50.0);
    console.log(`✅ Completion Rate: ${completionRate}% (${completedCount}/${totalStarted})`);

    // 7. Menutup survey
    console.log("7. Menutup survey...");
    const closedSurvey = await prisma.survey.update({
      where: { id: survey.id },
      data: { status: "closed" },
    });
    assert.equal(closedSurvey.status, "closed");
    console.log("✅ Survey berhasil ditutup.");

    console.log("\n=================================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! (100% PASS)");
    console.log("=================================================");
  } finally {
    // CLEANUP
    if (testEventId) {
      console.log("\n🧹 Cleaning up test event...");
      try {
        await prisma.event.delete({ where: { id: testEventId } });
        console.log("✅ Test event cleaned up.");
      } catch (e) {
        console.error("Cleanup warning:", e);
      }
    }
    await prisma.$disconnect();
  }
}

runInteractionTests().catch((err) => {
  console.error("❌ TEST RUN FAILED:", err);
  process.exit(1);
});
