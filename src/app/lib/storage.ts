// Local storage helpers for app preferences

const STORAGE_KEYS = {
  HAS_COMPLETED_ONBOARDING: 'pocketnetwork_onboarding_complete',
  THEME_PREFERENCE: 'pocketnetwork_theme',
  NUDGE_INTENSITY: 'pocketnetwork_nudge_intensity',
  DEFAULT_FOLLOWUP_TIMING: 'pocketnetwork_default_followup_timing',
  CALENDAR_REMINDERS_ENABLED: 'pocketnetwork_calendar_reminders'
} as const;

export type ThemePreference = 'dark' | 'light' | 'auto';
export type NudgeIntensity = 'low' | 'medium';
export type FollowUpTiming = '24h' | '3d' | '7d';

export const storage = {
  getHasCompletedOnboarding(): boolean {
    return localStorage.getItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING) === 'true';
  },

  // Alias for backward compatibility
  getHasOnboarded(): boolean {
    return this.getHasCompletedOnboarding();
  },

  setHasCompletedOnboarding(value: boolean): void {
    localStorage.setItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING, String(value));
  },

  // Alias for backward compatibility
  setHasOnboarded(value: boolean): void {
    this.setHasCompletedOnboarding(value);
  },

  getThemePreference(): ThemePreference {
    const value = localStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE);
    if (value === 'light' || value === 'auto') return value;
    return 'dark';
  },

  setThemePreference(value: ThemePreference): void {
    localStorage.setItem(STORAGE_KEYS.THEME_PREFERENCE, value);
  },

  getNudgeIntensity(): NudgeIntensity {
    const value = localStorage.getItem(STORAGE_KEYS.NUDGE_INTENSITY);
    return value === 'medium' ? 'medium' : 'low';
  },

  setNudgeIntensity(value: NudgeIntensity): void {
    localStorage.setItem(STORAGE_KEYS.NUDGE_INTENSITY, value);
  },

  getDefaultFollowUpTiming(): FollowUpTiming {
    const value = localStorage.getItem(STORAGE_KEYS.DEFAULT_FOLLOWUP_TIMING);
    if (value === '24h' || value === '7d') return value;
    return '3d';
  },

  setDefaultFollowUpTiming(value: FollowUpTiming): void {
    localStorage.setItem(STORAGE_KEYS.DEFAULT_FOLLOWUP_TIMING, value);
  },

  getCalendarRemindersEnabled(): boolean {
    const value = localStorage.getItem(STORAGE_KEYS.CALENDAR_REMINDERS_ENABLED);
    return value !== 'false'; // Default to true
  },

  setCalendarRemindersEnabled(value: boolean): void {
    localStorage.setItem(STORAGE_KEYS.CALENDAR_REMINDERS_ENABLED, String(value));
  },

  clear(): void {
    // Clear all PocketNetwork storage keys
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};