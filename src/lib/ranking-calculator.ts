export interface RankedOptionResult {
  optionId: string;
  label: string;
  description?: string | null;
  imageUrl?: string | null;
  totalScore: number;
  averageScore: number;
  voteCount: number;
  rank: number;
  distribution: Record<number, number>; // position -> count (e.g. { 1: 5, 2: 3, 3: 1 })
}

export interface CalculateRankingParams {
  options: { id: string; label: string; description?: string | null; imageUrl?: string | null }[];
  responses: {
    id: string;
    participantId: string;
    answers: { optionId: string; position: number; score?: number }[];
  }[];
  totalOptionsToRank?: number;
}

/**
 * Calculates positional average score for Ranking Poll.
 * If a participant ranks N items:
 * Position 1 gets N points, Position 2 gets N - 1 points, ..., Position N gets 1 point.
 * Options not selected by participant get 0 points.
 * Average score = totalScore / totalParticipants.
 */
export function calculateRankingResults(params: CalculateRankingParams): {
  results: RankedOptionResult[];
  totalParticipants: number;
} {
  const { options, responses } = params;
  const totalParticipants = responses.length;

  const resultMap = new Map<string, RankedOptionResult>();

  // Initialize all options with 0 score
  for (const opt of options) {
    resultMap.set(opt.id, {
      optionId: opt.id,
      label: opt.label,
      description: opt.description,
      imageUrl: opt.imageUrl,
      totalScore: 0,
      averageScore: 0,
      voteCount: 0,
      rank: 0,
      distribution: {},
    });
  }

  for (const resp of responses) {
    const answeredCount = resp.answers.length;
    for (const ans of resp.answers) {
      const item = resultMap.get(ans.optionId);
      if (item) {
        // Positional score: 1st gets answeredCount, 2nd gets answeredCount - 1, etc.
        const score = typeof ans.score === "number" && ans.score > 0
          ? ans.score
          : Math.max(1, answeredCount - ans.position + 1);

        item.totalScore += score;
        item.voteCount += 1;
        item.distribution[ans.position] = (item.distribution[ans.position] || 0) + 1;
      }
    }
  }

  // Calculate averages
  const results: RankedOptionResult[] = Array.from(resultMap.values()).map((item) => {
    const averageScore = totalParticipants > 0 ? Number((item.totalScore / totalParticipants).toFixed(2)) : 0;
    return {
      ...item,
      averageScore,
    };
  });

  // Sort by averageScore descending, then by voteCount descending
  results.sort((a, b) => {
    if (b.averageScore !== a.averageScore) {
      return b.averageScore - a.averageScore;
    }
    return b.voteCount - a.voteCount;
  });

  // Assign ranks
  results.forEach((item, index) => {
    item.rank = index + 1;
  });

  return {
    results,
    totalParticipants,
  };
}

