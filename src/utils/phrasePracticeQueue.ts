import type { PhrasePatternItem } from '../types';

export const PHRASE_PRACTICE_BATCH_SIZE = 10;

type QueueOptions = {
  now?: Date;
  seed: string;
  excludedIds?: Iterable<string>;
  limit?: number;
};

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableShuffle(
  items: PhrasePatternItem[],
  seed: string,
) {
  return [...items].sort((left, right) =>
    stableHash(`${seed}:${left.id}`) - stableHash(`${seed}:${right.id}`),
  );
}

function timestamp(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

export function buildPhrasePracticeQueue(
  phrases: PhrasePatternItem[],
  options: QueueOptions,
) {
  const now = options.now ?? new Date();
  const limit = options.limit ?? PHRASE_PRACTICE_BATCH_SIZE;
  const excludedIds = new Set(options.excludedIds ?? []);
  const available = phrases.filter(phrase => !excludedIds.has(phrase.id));
  const selected: PhrasePatternItem[] = [];
  const selectedIds = new Set<string>();

  const add = (items: PhrasePatternItem[], count: number) => {
    for (const item of items) {
      if (selected.length >= limit || count <= 0) break;
      if (selectedIds.has(item.id)) continue;
      selected.push(item);
      selectedIds.add(item.id);
      count -= 1;
    }
  };

  const dueOrWeak = available
    .filter(phrase => {
      const reviewed = (phrase.reviewCount ?? 0) > 0;
      const due = reviewed && timestamp(phrase.dueAt) <= now.getTime();
      const weak = reviewed && (
        phrase.reviewState === 'relearning' || phrase.masteryLevel <= 2
      );
      return due || weak;
    })
    .sort((left, right) =>
      timestamp(left.dueAt) - timestamp(right.dueAt) ||
      left.masteryLevel - right.masteryLevel ||
      stableHash(`${options.seed}:priority:${left.id}`) -
        stableHash(`${options.seed}:priority:${right.id}`),
    );

  const neverReviewed = stableShuffle(
    available.filter(phrase => (phrase.reviewCount ?? 0) === 0),
    `${options.seed}:new`,
  );

  add(dueOrWeak, 5);
  add(neverReviewed, 3);

  const randomCandidates = stableShuffle(
    available.filter(phrase => !selectedIds.has(phrase.id)),
    `${options.seed}:random`,
  );
  add(randomCandidates, 2);

  const remaining = available
    .filter(phrase => !selectedIds.has(phrase.id))
    .sort((left, right) =>
      (left.reviewCount ?? 0) - (right.reviewCount ?? 0) ||
      left.masteryLevel - right.masteryLevel ||
      timestamp(left.lastReviewedAt) - timestamp(right.lastReviewedAt) ||
      stableHash(`${options.seed}:fill:${left.id}`) -
        stableHash(`${options.seed}:fill:${right.id}`),
    );
  add(remaining, limit - selected.length);

  return selected;
}
