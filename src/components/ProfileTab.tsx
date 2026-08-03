import React from 'react';
import { useApp } from '../context/AppContext';
import { ThemeId } from '../types';
import { MORANDI_THEMES } from '../data/mockData';
import { Check, Moon, Sun, Clock, Target, Bot, Download, ChevronRight, Sparkles, Type, FileJson, Pencil, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfileTab: React.FC = () => {
  const { user } = useAuth();
  const {
    settings,
    setThemeId,
    toggleDarkMode,
    updateSettings,
    theme,
    setShowLoginModal,
    setShowReportImportModal
  } = useApp();
  const accountAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || settings.avatar;
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(settings.name);

  React.useEffect(() => {
    if (!editingName) setNameDraft(settings.name);
  }, [editingName, settings.name]);

  const saveNickname = () => {
    const name = nameDraft.trim().slice(0, 40);
    if (!name) return;
    updateSettings({ name });
    setEditingName(false);
  };

  const handleExportData = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      appName: 'LingoTrace',
      settings
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LingoTrace_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 1. User Profile Header */}
      <section className="rounded-2xl p-5 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs flex items-center gap-4">
        <img
          src={accountAvatar}
          alt={settings.name}
          className="w-16 h-16 rounded-full object-cover border-2 shadow-xs"
          style={{ borderColor: theme.primaryHex }}
        />
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between gap-2">
            {editingName ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <input
                  autoFocus
                  value={nameDraft}
                  maxLength={40}
                  onChange={event => setNameDraft(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') saveNickname(); if (event.key === 'Escape') setEditingName(false); }}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--bg-main)] px-2.5 py-1.5 text-sm font-bold text-[var(--text-primary)] outline-none"
                  aria-label="昵称"
                />
                <button onClick={saveNickname} disabled={!nameDraft.trim()} aria-label="保存昵称" className="rounded-lg p-1.5 text-emerald-600 disabled:opacity-40"><Save className="h-4 w-4" /></button>
                <button onClick={() => setEditingName(false)} aria-label="取消修改昵称" className="rounded-lg p-1.5 text-[var(--text-secondary)]"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-1.5">
                <h2 className="truncate text-base font-bold text-[var(--text-primary)]">{settings.name}</h2>
                {user && <button onClick={() => setEditingName(true)} aria-label="修改昵称" className="shrink-0 rounded-lg p-1 text-[var(--text-secondary)]"><Pencil className="h-3.5 w-3.5" /></button>}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-opacity active-press hover:opacity-80"
              style={{
                backgroundColor: theme.colors.c150,
                borderColor: theme.colors.c300,
                color: theme.colors.c900
              }}
            >
              {user ? '切换账号' : '登录'}
            </button>
          </div>
          <p className="text-xs text-[var(--text-secondary)] break-all">
            {user?.email || '登录 Google 账号后可启用云端身份'}
          </p>
          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 pt-0.5">
            <span>ID: LT_89230</span>
            <span>·</span>
            <span>手动导入模式</span>
          </div>
        </div>
      </section>

      {/* 2. ChatGPT Import Connection Status */}
      <section className="rounded-2xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--text-primary)]">ChatGPT 日报导入</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                最近一次同步：{settings.lastSyncTime}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowReportImportModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--card-border)] flex items-center gap-1 active-press"
          >
            <FileJson className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>手动导入</span>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-main)]/60 text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
          <span>自动化导入</span>
          <span className="font-bold text-[var(--text-secondary)]">暂未接入</span>
        </div>
      </section>

      {/* 3. Theme Color Selector (实时预览五种莫兰迪颜色) */}
      <section className="rounded-2xl p-5 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              主题风格颜色
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              五种低饱和度莫兰迪专属配色方案 (当前: {theme.name})
            </p>
          </div>
          <Sparkles className="w-4 h-4" style={{ color: theme.primaryHex }} />
        </div>

        <div className="grid grid-cols-5 gap-2 pt-2">
          {Object.values(MORANDI_THEMES).map(t => {
            const isSelected = settings.themeId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id as ThemeId)}
                className={`relative flex min-h-[108px] flex-col items-center justify-start rounded-2xl border px-1.5 pb-2 pt-3 transition-all active-press ${
                  isSelected
                    ? 'border-black/20 dark:border-white/30 bg-[var(--bg-main)] shadow-xs ring-1 ring-black/10'
                    : 'border-transparent hover:bg-[var(--bg-main)]/50'
                }`}
              >
                {/* 5-tier tonal scale visual preview strip */}
                {isSelected && (
                  <span
                    className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: t.colors.c700 }}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}

                <div className="mb-2 flex h-6 w-full max-w-[48px] shrink-0 overflow-hidden rounded-full border border-black/10 bg-white/50 p-0.5 shadow-xs">
                  <div className="h-full flex-1 rounded-l-full" style={{ backgroundColor: t.colors.c150 }} />
                  <div className="h-full flex-1" style={{ backgroundColor: t.colors.c300 }} />
                  <div className="h-full flex-1" style={{ backgroundColor: t.colors.c500 }} />
                  <div className="h-full flex-1" style={{ backgroundColor: t.colors.c700 }} />
                  <div className="h-full flex-1 rounded-r-full" style={{ backgroundColor: t.colors.c900 }} />
                </div>

                <span className="flex h-4 items-center whitespace-nowrap text-[10px] font-bold text-[var(--text-primary)]">
                  {t.name}
                </span>
                <span className="mt-0.5 flex min-h-7 items-start justify-center text-center text-[9px] leading-3 text-[var(--text-muted)]">
                  {t.enName}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Display & System Preferences */}
      <section className="rounded-2xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-[var(--text-secondary)] px-1">显示与界面</h3>

        {/* Dark Mode */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-main)]/50">
          <div className="flex items-center gap-2.5">
            {settings.isDarkMode ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <span className="text-xs font-bold text-[var(--text-primary)]">
              低亮度深色模式
            </span>
          </div>

          <button
            onClick={toggleDarkMode}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.isDarkMode ? 'bg-emerald-600' : 'bg-black/20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.isDarkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Font Size */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-main)]/50">
          <div className="flex items-center gap-2.5">
            <Type className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              文字大小
            </span>
          </div>

          <div className="flex bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-0.5 text-[11px]">
            {[
              { id: 'normal', label: '标准' },
              { id: 'medium', label: '中' },
              { id: 'large', label: '大' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => updateSettings({ fontSize: f.id as any })}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  settings.fontSize === f.id
                    ? 'bg-[var(--bg-main)] font-bold text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Goal & Reminder Settings */}
      <section className="rounded-2xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-[var(--text-secondary)] px-1">学习目标与提醒</h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--card-border)]/60 space-y-1">
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <Clock className="w-3.5 h-3.5" />
              <span>每日目标时长</span>
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {settings.dailyGoalMinutes} 分钟
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--card-border)]/60 space-y-1">
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <Target className="w-3.5 h-3.5" />
              <span>每日提醒时间</span>
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {settings.reminderTime}
            </div>
          </div>
        </div>
      </section>

      {/* 6. Account & Data Backup */}
      <section className="rounded-2xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs space-y-2">
        <button
          onClick={handleExportData}
          className="w-full p-3 rounded-xl bg-[var(--bg-main)]/50 hover:bg-[var(--bg-main)] text-xs font-bold text-[var(--text-primary)] flex items-center justify-between transition-colors active-press"
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[var(--text-secondary)]" />
            <span>导出个人学习数据 (JSON)</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>

      </section>
    </div>
  );
};
