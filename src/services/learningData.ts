import type {
  CalendarDayRecord,
  DailyReport,
  GrammarErrorItem,
  PhrasePatternItem,
  WordItem,
} from '../types';
import { supabase } from '../lib/supabase';

type ReportRow = {
  id: string;
  learning_date: string;
  imported_at: string;
  speaking_minutes: number;
  total_minutes: number;
  overall_score: number | null;
  fluency_score: number | null;
  grammar_score: number | null;
  vocabulary_score: number | null;
  naturalness_score: number | null;
  communication_score: number | null;
  qualitative_review: string;
  learning_topics?: { label: string; position: number }[];
  daily_thoughts?: { zh: string; en: string | null; is_saved: boolean }[];
  feedback_items?: {
    id: string;
    kind: 'strength' | 'improvement' | 'next_goal';
    category: string | null;
    content: string;
    action_label: string | null;
    target_tab: 'error' | 'phrase' | 'vocab' | null;
    position: number;
  }[];
};

export interface LearningDataSnapshot {
  reports: DailyReport[];
  calendarRecords: CalendarDayRecord[];
  words: WordItem[];
  errors: GrammarErrorItem[];
  phrases: PhrasePatternItem[];
  dueReviewCount: number;
  completedReviewCount: number;
  completedReviewTypes: Record<'vocabulary' | 'sentence' | 'correction', boolean>;
}

const score10 = (value: number | null) => value ?? 0;
const score100 = (value: number | null) => Math.round(score10(value) * 10);

function mapReport(row: ReportRow, counts: {
  words: WordItem[];
  phrases: PhrasePatternItem[];
  errors: GrammarErrorItem[];
}): DailyReport {
  const feedback = [...(row.feedback_items ?? [])].sort((a, b) => a.position - b.position);
  const improvements = feedback.filter(item => item.kind === 'improvement');
  const nextGoals = feedback.filter(item => item.kind === 'next_goal');
  const thought = row.daily_thoughts?.[0];

  return {
    dateStr: row.learning_date,
    syncTime: row.imported_at,
    syncStatus: 'synced',
    speakingMinutes: row.speaking_minutes,
    totalMinutes: row.total_minutes,
    overallScore: score100(row.overall_score),
    dimensions: {
      fluency: score100(row.fluency_score),
      grammar: score100(row.grammar_score),
      vocabulary: score100(row.vocabulary_score),
      naturalness: score100(row.naturalness_score),
      communication: score100(row.communication_score),
    },
    topics: [...(row.learning_topics ?? [])]
      .sort((a, b) => a.position - b.position)
      .map(topic => topic.label),
    thought: thought ? { zh: thought.zh, en: thought.en ?? undefined, isSaved: thought.is_saved } : undefined,
    strengths: feedback.filter(item => item.kind === 'strength').map(item => item.content),
    improvements: improvements.map(item => ({
      id: item.id,
      category: item.category ?? '待提升',
      issue: item.content,
      actionLabel: item.action_label ?? '开始练习',
      targetTab: item.target_tab ?? 'error',
    })),
    newContentSummary: {
      newWordsCount: counts.words.length,
      naturalExprCount: 0,
      sentencePatternsCount: counts.phrases.length,
      correctedErrorsCount: counts.errors.length,
      previewWords: counts.words.slice(0, 3).map(item => item.word),
      previewPhrases: counts.phrases.slice(0, 3).map(item => item.pattern),
    },
    qualitativeReview: row.qualitative_review,
    memorizingSentences: counts.phrases.slice(0, 10),
    nextSuggestions: nextGoals.map(item => item.content),
  };
}

export async function loadLearningData(userId: string): Promise<LearningDataSnapshot> {
  const [reportsResult, wordsResult, phrasesResult, errorsResult, reviewStatesResult] = await Promise.all([
    supabase
      .from('learning_reports')
      .select(`
        id, learning_date, imported_at, speaking_minutes, total_minutes,
        overall_score, fluency_score, grammar_score, vocabulary_score,
        naturalness_score, communication_score, qualitative_review,
        learning_topics(label, position),
        daily_thoughts(zh, en, is_saved),
        feedback_items(id, kind, category, content, action_label, target_tab, position)
      `)
      .eq('user_id', userId)
      .order('learning_date', { ascending: false }),
    supabase.from('vocabulary_entries').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('sentence_entries').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('correction_entries').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('review_states').select('item_type, item_id, state, due_at, review_count, last_reviewed_at').eq('user_id', userId),
  ]);

  const firstError = reportsResult.error ?? wordsResult.error ?? phrasesResult.error ?? errorsResult.error ?? reviewStatesResult.error;
  if (firstError) throw firstError;

  const reviewStates = reviewStatesResult.data ?? [];
  const statesFor = (itemType: string) => new Map(
    reviewStates.filter(row => row.item_type === itemType).map(row => [row.item_id, row])
  );
  const wordReviewStates = statesFor('vocabulary');
  const phraseReviewStates = statesFor('sentence');
  const words: WordItem[] = (wordsResult.data ?? []).map(row => ({
    id: row.id,
    word: row.term,
    ipa: row.ipa ?? '',
    pos: row.part_of_speech ?? '',
    meaning: row.meaning_zh,
    exampleEn: row.example_en ?? '',
    exampleZh: row.example_zh ?? '',
    collocation: row.collocation ?? '',
    sourceDialogue: row.source_context ?? '',
    status: wordReviewStates.get(row.id)?.state === 'mastered' ? 'mastered' : 'to_review',
    tags: row.tags ?? [],
    reviewCount: wordReviewStates.get(row.id)?.review_count ?? 0,
    lastReviewed: wordReviewStates.get(row.id)?.last_reviewed_at ?? '',
    isFavorite: row.is_favorite,
    dueAt: wordReviewStates.get(row.id)?.due_at,
  }));
  const phraseCategoryLabels: Record<string, string> = {
    daily: '日常交流',
    work: '工作沟通',
    travel: '旅行场景',
    opinion: '观点表达',
    emotion: '情绪表达',
  };
  const errorCategoryLabels: Record<string, string> = {
    grammar: '语法错误',
    spelling: '拼写错误',
    word_choice: '用词错误',
    collocation: '固定搭配',
    naturalness: '自然表达',
  };

  const phrases: PhrasePatternItem[] = (phrasesResult.data ?? []).map(row => ({
    id: row.id,
    pattern: row.pattern,
    meaningZh: row.meaning_zh,
    exampleEn: row.example_en ?? '',
    exampleZh: row.example_zh ?? '',
    category: row.category as PhrasePatternItem['category'],
    categoryLabel: phraseCategoryLabels[row.category] ?? row.category,
    sourceTag: row.source_tag ?? '',
    masteryLevel: (() => {
      const state = phraseReviewStates.get(row.id);
      if (!state) return 1;
      if (state.state === 'mastered') return 5;
      return Math.min(4, Math.max(1, state.review_count + 1));
    })(),
    isFavorite: row.is_favorite,
    reviewCount: phraseReviewStates.get(row.id)?.review_count ?? 0,
    reviewState: phraseReviewStates.get(row.id)?.state,
    dueAt: phraseReviewStates.get(row.id)?.due_at ?? undefined,
    lastReviewedAt: phraseReviewStates.get(row.id)?.last_reviewed_at ?? undefined,
  }));
  const errors: GrammarErrorItem[] = (errorsResult.data ?? []).map(row => ({
    id: row.id,
    originalSentence: row.original_sentence,
    errorHighlight: row.error_highlight ?? '',
    correctedSentence: row.corrected_sentence,
    correctedHighlight: row.corrected_highlight ?? '',
    explanation: row.explanation,
    category: row.category,
    categoryLabel: errorCategoryLabels[row.category] ?? row.category,
    occurrenceCount: row.occurrence_count,
    tag: '',
    dateAdded: row.created_at.slice(0, 10),
  }));

  const wordReportIds = new Map((wordsResult.data ?? []).map(row => [row.id, row.source_report_id]));
  const phraseReportIds = new Map((phrasesResult.data ?? []).map(row => [row.id, row.source_report_id]));
  const errorReportIds = new Map((errorsResult.data ?? []).map(row => [row.id, row.source_report_id]));
  const reportRows = (reportsResult.data ?? []) as unknown as ReportRow[];
  const reports = reportRows.map(row => mapReport(row, {
    words: words.filter(item => wordReportIds.get(item.id) === row.id),
    phrases: phrases.filter(item => phraseReportIds.get(item.id) === row.id),
    errors: errors.filter(item => errorReportIds.get(item.id) === row.id),
  }));
  const calendarRecords = reports.map(report => ({
    dateStr: report.dateStr,
    dayNumber: Number(report.dateStr.slice(-2)),
    hasRecord: true,
    score: report.overallScore,
    isFullyReviewed: false,
    studyMinutes: report.totalMinutes,
    reviewWords: report.newContentSummary.newWordsCount,
    correctedErrors: report.newContentSummary.correctedErrorsCount,
    newPhrases: report.newContentSummary.sentencePatternsCount,
    aiSummary: report.qualitativeReview,
  }));

  const now = Date.now();
  const dueReviewCount = reviewStates.filter(row => !row.due_at || new Date(row.due_at).getTime() <= now).length;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  const completedReviewCount = reviewStates.filter(row =>
    row.last_reviewed_at &&
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date(row.last_reviewed_at)) === today
  ).length;
  const completedReviewTypes = {
    vocabulary: reviewStates.some(row => row.item_type === 'vocabulary' && row.last_reviewed_at &&
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date(row.last_reviewed_at)) === today),
    sentence: reviewStates.some(row => row.item_type === 'sentence' && row.last_reviewed_at &&
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date(row.last_reviewed_at)) === today),
    correction: reviewStates.some(row => row.item_type === 'correction' && row.last_reviewed_at &&
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date(row.last_reviewed_at)) === today),
  };

  return { reports, calendarRecords, words, errors, phrases, dueReviewCount, completedReviewCount, completedReviewTypes };
}
