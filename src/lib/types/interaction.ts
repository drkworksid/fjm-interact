export interface IdeasPoll {
  id: string;
  eventId: string;
  title: string;
  question: string;
  description?: string | null;
  status: "draft" | "active" | "paused" | "closed" | "archived";
  allowAnonymous: boolean;
  allowReactions: boolean;
  allowParticipantsToSeeIdeas: boolean;
  moderationEnabled: boolean;
  maxIdeasPerParticipant: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  ideas?: Idea[];
}

export interface Idea {
  id: string;
  pollId: string;
  participantId: string;
  authorName?: string | null;
  content: string;
  category?: string | null;
  reactionCount: number;
  isPinned: boolean;
  status: "pending" | "published" | "rejected";
  createdAt: string;
  updatedAt: string;
  reactions?: IdeaReaction[];
}

export interface IdeaReaction {
  id: string;
  ideaId: string;
  participantId: string;
  reactionType: string;
  createdAt: string;
}

export interface RankingOption {
  id: string;
  pollId: string;
  label: string;
  description?: string | null;
  imageUrl?: string | null;
  order: number;
}

export interface RankingAnswer {
  id: string;
  responseId: string;
  optionId: string;
  position: number;
  score: number;
}

export interface RankingResponse {
  id: string;
  pollId: string;
  participantId: string;
  participantName?: string | null;
  submittedAt: string;
  answers: RankingAnswer[];
}

export interface RankingPoll {
  id: string;
  eventId: string;
  title: string;
  question: string;
  description?: string | null;
  status: "draft" | "active" | "paused" | "closed" | "archived";
  minRankItems: number;
  maxRankItems: number;
  restrictedRanking: boolean;
  randomizeOptions: boolean;
  showResultsToParticipants: boolean;
  scoringMethod: string;
  allowAnonymous: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  options: RankingOption[];
  responses?: RankingResponse[];
}

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  type: "MULTIPLE_CHOICE" | "WORD_CLOUD" | "RATING" | "OPEN_TEXT" | "RANKING";
  question: string;
  description?: string | null;
  order: number;
  required: boolean;
  options?: string | null; // JSON stringified array of strings/objects
  settings?: string | null; // JSON stringified question settings
  createdAt: string;
  updatedAt: string;
}

export interface SurveyAnswer {
  id: string;
  responseId: string;
  questionId: string;
  value?: string | null;
  metadata?: string | null;
  createdAt: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  participantId: string;
  participantName?: string | null;
  startedAt: string;
  completedAt?: string | null;
  completionStatus: "in_progress" | "completed" | "abandoned";
  answers: SurveyAnswer[];
}

export interface Survey {
  id: string;
  eventId: string;
  title: string;
  description?: string | null;
  status: "draft" | "active" | "paused" | "closed" | "archived";
  allowAnonymous: boolean;
  showProgress: boolean;
  allowBackNavigation: boolean;
  startAt?: string | null;
  endAt?: string | null;
  timeLimitSeconds?: number | null;
  showResultsAfterSubmit: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  questions: SurveyQuestion[];
  responses?: SurveyResponse[];
}

