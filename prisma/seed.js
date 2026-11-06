const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial training event...");

  // Clean existing data
  await prisma.questionVote.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.pollResponse.deleteMany({});
  await prisma.pollOption.deleteMany({});
  await prisma.poll.deleteMany({});
  await prisma.event.deleteMany({});

  // Create demo event
  const demoEvent = await prisma.event.create({
    data: {
      code: "TRAIN26",
      title: "Interactive Training Workshop 2026",
      description: "Sesi training interaktif - Silakan kirim pertanyaan dan berikan feedback Anda!",
      isModerationEnabled: false,
      isAnonymousAllowed: true,
      status: "ACTIVE",
      questions: {
        create: [
          {
            authorName: "Budi Santoso",
            isAnonymous: false,
            content: "Apakah materi slide presentasi dan recording training ini akan dibagikan setelah sesi selesai?",
            upvotes: 7,
            status: "APPROVED",
          },
          {
            authorName: "Peserta",
            isAnonymous: true,
            content: "Bagaimana cara terbaik menerapkan arsitektur microservices untuk tim kecil?",
            upvotes: 12,
            status: "APPROVED",
          },
          {
            authorName: "Siti Rahma",
            isAnonymous: false,
            content: "Tools apa saja yang paling direkomendasikan untuk monitoring sistem di VPS/Cloud?",
            upvotes: 4,
            status: "APPROVED",
          },
        ],
      },
      polls: {
        create: [
          {
            title: "Seberapa familiar Anda dengan topik training hari ini?",
            type: "MULTIPLE_CHOICE",
            isActive: true,
            showResults: true,
            orderIndex: 0,
            options: {
              create: [
                { optionText: "Sangat Baru / Pemula", orderIndex: 0 },
                { optionText: "Sudah Pernah Dengar Konsepnya", orderIndex: 1 },
                { optionText: "Sudah Sering Menggunakan", orderIndex: 2 },
                { optionText: "Expert / Sudah Mahir", orderIndex: 3 },
              ],
            },
          },
          {
            title: "Satu kata yang menggambarkan ekspektasi Anda terhadap sesi ini?",
            type: "WORD_CLOUD",
            isActive: false,
            showResults: true,
            orderIndex: 1,
          },
          {
            title: "Nilai tingkat pemahaman Anda terhadap materi sesi 1",
            type: "RATING",
            isActive: false,
            showResults: true,
            orderIndex: 2,
          },
        ],
      },
    },
  });

  console.log(`Demo event created with code: ${demoEvent.code} (ID: ${demoEvent.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

