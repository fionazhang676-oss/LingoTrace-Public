import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PhrasePatternItem } from '../types';
import { Bookmark, Heart, Volume2, Copy, Check, Plus, Sparkles, Star, Search, X, Trash2, CirclePlay, RotateCw, ArrowRight } from 'lucide-react';
import { buildPhrasePracticeQueue } from '../utils/phrasePracticeQueue';

const PHRASE_PRACTICE_STORAGE_KEY = 'lingotrace:phrase-practice:v1';

type SavedPhrasePractice = {
  date: string;
  scope: string;
  queueIds: string[];
  currentIndex: number;
  completedIds: string[];
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadSavedPhrasePractice(): SavedPhrasePractice | null {
  try {
    const raw = window.localStorage.getItem(PHRASE_PRACTICE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedPhrasePractice>;
    if (
      typeof parsed.date !== 'string' || typeof parsed.scope !== 'string' ||
      !Array.isArray(parsed.queueIds) || !Array.isArray(parsed.completedIds) ||
      typeof parsed.currentIndex !== 'number'
    ) return null;
    return parsed as SavedPhrasePractice;
  } catch {
    return null;
  }
}

function savePhrasePractice(session: SavedPhrasePractice) {
  try {
    window.localStorage.setItem(PHRASE_PRACTICE_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Practice still works when storage is unavailable; only resume is disabled.
  }
}

export const PhraseTab: React.FC = () => {
  const { phrases, togglePhraseFavorite, addPhrase, deletePhrase, ratePhrase, theme } = useApp();

  const handleDeletePhrase = (id: string, pattern: string) => {
    if (window.confirm(`确定要删除句型“${pattern}”吗？删除后可立即撤销。`)) {
      deletePhrase(id);
    }
  };

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceQueue, setPracticeQueue] = useState<PhrasePatternItem[]>([]);
  const [isPracticeRevealed, setIsPracticeRevealed] = useState(false);

  const [newPhrase, setNewPhrase] = useState({
    pattern: '',
    meaningZh: '',
    exampleEn: '',
    exampleZh: '',
    category: 'daily' as PhrasePatternItem['category'],
    categoryLabel: '日常交流',
    sourceTag: '#ChatGPT高频',
    masteryLevel: 4,
    isFavorite: false
  });

  const filteredPhrases = phrases.filter(p => {
    const matchesSearch =
      p.pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.meaningZh.includes(searchQuery) ||
      p.exampleEn.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeCategory === 'all') return matchesSearch;
    if (activeCategory === 'favorite') return matchesSearch && p.isFavorite;
    return matchesSearch && p.category === activeCategory;
  });

  const currentPracticePhrase = practiceQueue[practiceIndex] || practiceQueue[0];

  const practiceCandidates = filteredPhrases.length > 0 ? filteredPhrases : phrases;
  const practiceScope = `${activeCategory}:${searchQuery.trim().toLocaleLowerCase()}`;

  const startPractice = () => {
    if (!practiceCandidates.length) return;
    const date = localDateKey();
    const saved = loadSavedPhrasePractice();
    const candidatesById = new Map(practiceCandidates.map(phrase => [phrase.id, phrase]));

    if (saved?.date === date && saved.scope === practiceScope) {
      const savedQueue = saved.queueIds
        .map(id => candidatesById.get(id))
        .filter((phrase): phrase is PhrasePatternItem => Boolean(phrase));
      if (
        savedQueue.length &&
        saved.currentIndex >= 0 &&
        saved.currentIndex < savedQueue.length
      ) {
        setPracticeQueue(savedQueue);
        setPracticeIndex(saved.currentIndex);
        setIsPracticeRevealed(false);
        setShowPractice(true);
        return;
      }
    }

    const completedIds = saved?.date === date && saved.scope === practiceScope
      ? saved.completedIds.filter(id => candidatesById.has(id))
      : [];
    const availableCount = practiceCandidates.length - completedIds.length;
    const effectiveCompletedIds = availableCount > 0 ? completedIds : [];
    const nextQueue = buildPhrasePracticeQueue(practiceCandidates, {
      seed: `${date}:${practiceScope}:${effectiveCompletedIds.length}`,
      excludedIds: effectiveCompletedIds,
    });
    if (!nextQueue.length) return;

    const nextSession: SavedPhrasePractice = {
      date,
      scope: practiceScope,
      queueIds: nextQueue.map(phrase => phrase.id),
      currentIndex: 0,
      completedIds: effectiveCompletedIds,
    };
    savePhrasePractice(nextSession);
    setPracticeQueue(nextQueue);
    setPracticeIndex(0);
    setIsPracticeRevealed(false);
    setShowPractice(true);
  };

  const handlePracticeRating = (remembered: boolean) => {
    if (!currentPracticePhrase) return;
    ratePhrase(currentPracticePhrase.id, remembered);
    const date = localDateKey();
    const saved = loadSavedPhrasePractice();
    const completedIds = Array.from(new Set([
      ...(saved?.date === date && saved.scope === practiceScope ? saved.completedIds : []),
      currentPracticePhrase.id,
    ]));
    if (practiceIndex < practiceQueue.length - 1) {
      const nextIndex = practiceIndex + 1;
      savePhrasePractice({
        date,
        scope: practiceScope,
        queueIds: practiceQueue.map(phrase => phrase.id),
        currentIndex: nextIndex,
        completedIds,
      });
      setPracticeIndex(nextIndex);
      setIsPracticeRevealed(false);
    } else {
      savePhrasePractice({
        date,
        scope: practiceScope,
        queueIds: [],
        currentIndex: 0,
        completedIds,
      });
      setShowPractice(false);
      setPracticeQueue([]);
      setPracticeIndex(0);
      setIsPracticeRevealed(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handlePlayAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhrase.pattern || !newPhrase.meaningZh) return;

    setIsSaving(true);
    try {
      await addPhrase({
      ...newPhrase,
      categoryLabel:
        newPhrase.category === 'daily' ? '日常交流' :
        newPhrase.category === 'work' ? '工作' :
        newPhrase.category === 'travel' ? '旅行' :
        newPhrase.category === 'opinion' ? '观点表达' : '情绪表达'
      });

      setShowAddModal(false);
      setNewPhrase({
      pattern: '',
      meaningZh: '',
      exampleEn: '',
      exampleZh: '',
      category: 'daily',
      categoryLabel: '日常交流',
      sourceTag: '#ChatGPT高频',
      masteryLevel: 4,
      isFavorite: false
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '保存句型失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 1. Header & Category Filters */}
      <section className="rounded-2xl p-5 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>地道句型表达库</span>
              <span className="text-[10px] font-normal text-[var(--text-secondary)] bg-[var(--bg-main)] px-2 py-0.5 rounded-full border border-[var(--card-border)]">
                ChatGPT 积累
              </span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              整理日常交流、工作与高级表达的固定骨架
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowAddModal(true)}
              className="p-2 rounded-xl bg-[var(--bg-main)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active-press"
              title="添加新句型"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all', label: '全部' },
            { id: 'favorite', label: '收藏' },
            { id: 'daily', label: '日常交流' },
            { id: 'work', label: '工作' },
            { id: 'travel', label: '旅行' },
            { id: 'opinion', label: '观点表达' },
            { id: 'emotion', label: '情绪表达' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border ${
                activeCategory === cat.id
                  ? 'border-transparent text-white font-bold shadow-xs'
                  : 'border-[var(--card-border)] bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              style={{
                backgroundColor: activeCategory === cat.id ? theme.primaryHex : undefined
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-70" />
          <input
            type="text"
            placeholder="搜索句型英文骨架、中文解析或例句..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-all"
          />
        </div>
      </section>

      {/* 2. Phrase Cards List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-[var(--text-secondary)]">
            句型展示 ({filteredPhrases.length})
          </span>
          <button
            onClick={startPractice}
            disabled={!practiceCandidates.length}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)] disabled:opacity-40"
            title="开始或继续今日 10 句复习"
          >
            <CirclePlay className="h-3.5 w-3.5" style={{ color: theme.colors.c700 }} />
            <span>练习当前句型</span>
          </button>
        </div>

        <div className="space-y-3">
          {filteredPhrases.map(item => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xs space-y-3 hover:border-black/20 transition-all"
            >
              {/* Category, source tag & actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full border border-black/5"
                    style={{ backgroundColor: theme.colors.c150, color: theme.colors.c900 }}
                  >
                    {item.categoryLabel}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {item.sourceTag}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePlayAudio(item.pattern)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="朗读句型"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleCopy(item.id, item.pattern)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="复制句型"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => togglePhraseFavorite(item.id)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="收藏句型"
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${
                        item.isFavorite ? 'fill-rose-400 text-rose-400' : ''
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => handleDeletePhrase(item.id, item.pattern)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50/70 transition-colors"
                    title="删除句型"
                    aria-label={`删除句型 ${item.pattern}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Core Pattern & Chinese Meaning */}
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                  {item.pattern}
                </h3>
                <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5">
                  {item.meaningZh}
                </p>
              </div>

              {/* Real Context Example */}
              {(item.exampleEn || item.exampleZh) && (
                <div className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--card-border)]/60 space-y-1">
                  {item.exampleEn && (
                    <p className="font-serif text-sm font-normal leading-relaxed text-[var(--text-primary)]">
                      “{item.exampleEn}”
                    </p>
                  )}
                  {item.exampleZh && (
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                      {item.exampleZh}
                    </p>
                  )}
                </div>
              )}

              {/* Mastery Level Stars */}
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--card-border)]/60">
                <span>熟练度等级</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < item.masteryLevel
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-[var(--text-muted)] opacity-30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add Phrase Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">添加表达句型</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--text-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">英文句型骨架</label>
                <input
                  type="text"
                  required
                  placeholder="例如: It occurs to me that..."
                  value={newPhrase.pattern}
                  onChange={e => setNewPhrase({ ...newPhrase, pattern: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--card-border)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">中文解析</label>
                <input
                  type="text"
                  required
                  placeholder="例如: 我突然想到 / 我意识到..."
                  value={newPhrase.meaningZh}
                  onChange={e => setNewPhrase({ ...newPhrase, meaningZh: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--card-border)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">语境真实例句 (英文)</label>
                <textarea
                  rows={2}
                  placeholder="ChatGPT 对话中的例句..."
                  value={newPhrase.exampleEn}
                  onChange={e => setNewPhrase({ ...newPhrase, exampleEn: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--card-border)] text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[var(--text-secondary)] font-medium mb-1">分类</label>
                  <select
                    value={newPhrase.category}
                    onChange={e => setNewPhrase({ ...newPhrase, category: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--card-border)] text-[var(--text-primary)]"
                  >
                    <option value="daily">日常交流</option>
                    <option value="work">工作交流</option>
                    <option value="travel">旅行出游</option>
                    <option value="opinion">观点表达</option>
                    <option value="emotion">情绪表达</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] font-medium mb-1">来源标签</label>
                  <input
                    type="text"
                    placeholder="#ChatGPT写作"
                    value={newPhrase.sourceTag}
                    onChange={e => setNewPhrase({ ...newPhrase, sourceTag: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--card-border)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl font-bold text-white transition-all shadow-xs"
                style={{ backgroundColor: theme.primaryHex }}
              >
                保存至句型库
              </button>
            </form>
          </div>
        </div>
      )}

      {showPractice && currentPracticePhrase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <CirclePlay className="h-4 w-4" style={{ color: theme.colors.c700 }} />
                <span>句型主动回忆</span>
              </div>
              <button
                onClick={() => setShowPractice(false)}
                className="rounded-full bg-[var(--bg-main)] p-1.5 text-[var(--text-secondary)]"
                aria-label="关闭句型练习"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
              <span>{practiceIndex + 1} / {practiceQueue.length}</span>
              <span>先根据中文说出英文句型</span>
            </div>

            <div className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] p-5 text-center">
              <span
                className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold"
                style={{ backgroundColor: theme.colors.c150, color: theme.colors.c900 }}
              >
                {currentPracticePhrase.categoryLabel}
              </span>
              <p className="text-base font-bold leading-relaxed text-[var(--text-primary)]">
                {currentPracticePhrase.meaningZh}
              </p>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                {currentPracticePhrase.exampleZh}
              </p>

              {isPracticeRevealed ? (
                <div className="space-y-2 border-t border-[var(--card-border)] pt-4 animate-fadeIn">
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {currentPracticePhrase.pattern}
                  </p>
                  <p className="font-serif text-sm italic leading-relaxed text-[var(--text-secondary)]">
                    “{currentPracticePhrase.exampleEn}”
                  </p>
                  <button
                    onClick={() => handlePlayAudio(currentPracticePhrase.pattern)}
                    className="mx-auto flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)]"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    听发音
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsPracticeRevealed(true)}
                  className="mx-auto mt-2 flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: theme.colors.c700 }}
                >
                  <RotateCw className="h-4 w-4" />
                  查看答案
                </button>
              )}
            </div>

            {isPracticeRevealed && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePracticeRating(false)}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--bg-main)] py-3 text-xs font-bold text-[var(--text-secondary)] active-press"
                >
                  还不熟
                </button>
                <button
                  onClick={() => handlePracticeRating(true)}
                  className="flex items-center justify-center gap-1 rounded-xl py-3 text-xs font-bold text-white active-press"
                  style={{ backgroundColor: theme.colors.c700 }}
                >
                  能说出来
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
