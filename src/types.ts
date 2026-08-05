export type ThemeId = 'sage' | 'fog' | 'rose' | 'oatmeal' | 'lavender';

export interface ColorScale {
  c900: string; // 最深强调色 / 特别强调
  c700: string; // 主要操作色 / 主按钮 / 激活图标
  c500: string; // 中等数据色 / 常用图表 / 记得反馈
  c300: string; // 浅色选中背景 / 选中标签 / 模糊反馈
  c150: string; // 辅助区域背景 / 次要按钮 / 忘记反馈
  c075: string; // 极浅局部背景 / 选中导航背景
}

export interface MorandiTheme {
  id: ThemeId;
  name: string;
  enName: string;
  colors: ColorScale;
  primaryHex: string; // matches colors.c700
  lightBg: string;    // matches colors.c150
  darkHex: string;     // matches colors.c900
  darkLightBg: string;
  badgeBg: string;    // matches colors.c300
  badgeText: string;  // matches colors.c900
  chartGradient: [string, string];
}

export interface Quote {
  id: string;
  en: string;
  zh: string;
  author: string;
  category: 'BOOK' | 'MOVIE' | 'POETRY' | 'PHILOSOPHY';
  isFavorite: boolean;
}

export interface LearningStats {
  overallScore: number;
  vocabScore: number;
  grammarScore: number;
  expressionScore: number;
  reviewScore: number;
  studyTimeMinutes: number;
  reviewWordsCount: number;
  newPhrasesCount: number;
  errorsCorrectedCount: number;
}

export interface CalendarDayRecord {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  hasRecord: boolean;
  score: number;
  isFullyReviewed: boolean;
  studyMinutes: number;
  reviewWords: number;
  correctedErrors: number;
  newPhrases: number;
  aiSummary: string;
}

export interface WordItem {
  id: string;
  word: string;
  ipa: string;
  pos: string;
  meaning: string;
  exampleEn: string;
  exampleZh: string;
  collocation: string;
  sourceDialogue: string;
  status: 'to_review' | 'vague' | 'forgot' | 'mastered';
  tags: string[];
  reviewCount: number;
  lastReviewed: string;
  isFavorite?: boolean;
  dueAt?: string;
}

export interface GrammarErrorItem {
  id: string;
  originalSentence: string;
  errorHighlight: string;
  correctedSentence: string;
  correctedHighlight: string;
  explanation: string;
  category: 'grammar' | 'spelling' | 'word_choice' | 'collocation' | 'naturalness';
  categoryLabel: string;
  occurrenceCount: number;
  tag: string;
  dateAdded: string;
}

export interface PhrasePatternItem {
  id: string;
  pattern: string;
  meaningZh: string;
  exampleEn: string;
  exampleZh: string;
  category: 'daily' | 'work' | 'travel' | 'opinion' | 'emotion';
  categoryLabel: string;
  sourceTag: string;
  masteryLevel: number; // 1 to 5
  isFavorite: boolean;
  reviewCount?: number;
  reviewState?: string;
  dueAt?: string;
  lastReviewedAt?: string;
}

export interface DailyThought {
  zh: string;
  en?: string;
  isSaved?: boolean;
}

export interface DimensionScores {
  fluency: number;
  grammar: number;
  vocabulary: number;
  naturalness: number;
  communication: number;
}

export interface ImprovementArea {
  id: string;
  category: string;
  issue: string;
  actionLabel: string;
  targetTab: 'error' | 'phrase' | 'vocab';
}

export interface DailyReport {
  dateStr: string;
  syncTime: string;
  syncStatus: 'synced' | 'syncing' | 'no_record';
  speakingMinutes: number;
  totalMinutes: number;
  overallScore: number;
  dimensions: DimensionScores;
  topics: string[];
  thought?: DailyThought;
  strengths: string[];
  improvements: ImprovementArea[];
  newContentSummary: {
    newWordsCount: number;
    naturalExprCount: number;
    sentencePatternsCount: number;
    correctedErrorsCount: number;
    previewWords: string[];
    previewPhrases: string[];
  };
  qualitativeReview: string;
  memorizingSentences: PhrasePatternItem[];
  nextSuggestions: string[];
}

export interface UserSettings {
  name: string;
  avatar: string;
  dailyGoalMinutes: number;
  reminderTime: string;
  dailyWordTarget: number;
  themeId: ThemeId;
  isDarkMode: boolean;
  fontSize: 'normal' | 'medium' | 'large';
  isChatGptConnected: boolean;
  lastSyncTime: string;
}
