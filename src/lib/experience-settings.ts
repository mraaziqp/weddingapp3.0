export type EnvelopeStyle = 'royal-cinematic' | 'soft-romance' | 'modern-minimal';

export type EnvelopeMusic = 'golden-chimes' | 'velvet-pulse' | 'silent';

export type IntroMusic = 'spark-rise' | 'ceremony-bloom' | 'silent';

export type ThemeSettings = {
  primaryColor: string;
  accentColor: string;
  foregroundColor: string;
  headingFont: string;
};

export type ExperienceSettings = {
  theme: ThemeSettings;
  envelopeStyle: EnvelopeStyle;
  envelopeMusic: EnvelopeMusic;
  introMusic: IntroMusic;
};

export const EXPERIENCE_SETTINGS_KEY = 'wedu_experience_settings';
export const EXPERIENCE_SETTINGS_EVENT = 'wedu:experienceSettings';

export const DEFAULT_EXPERIENCE_SETTINGS: ExperienceSettings = {
  theme: {
    primaryColor: '#064e3b',
    accentColor: '#d4af37',
    foregroundColor: '#f6e7b7',
    headingFont: 'Playfair Display',
  },
  envelopeStyle: 'royal-cinematic',
  envelopeMusic: 'golden-chimes',
  introMusic: 'spark-rise',
};

function normalizeSettings(value: unknown): ExperienceSettings {
  const base = DEFAULT_EXPERIENCE_SETTINGS;

  if (!value || typeof value !== 'object') {
    return base;
  }

  const maybe = value as Partial<ExperienceSettings> & {
    theme?: Partial<ThemeSettings>;
  };

  return {
    theme: {
      primaryColor: maybe.theme?.primaryColor || base.theme.primaryColor,
      accentColor: maybe.theme?.accentColor || base.theme.accentColor,
      foregroundColor: maybe.theme?.foregroundColor || base.theme.foregroundColor,
      headingFont: maybe.theme?.headingFont || base.theme.headingFont,
    },
    envelopeStyle: maybe.envelopeStyle || base.envelopeStyle,
    envelopeMusic: maybe.envelopeMusic || base.envelopeMusic,
    introMusic: maybe.introMusic || base.introMusic,
  };
}

export function readExperienceSettings(): ExperienceSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_EXPERIENCE_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(EXPERIENCE_SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_EXPERIENCE_SETTINGS;
    }
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_EXPERIENCE_SETTINGS;
  }
}

export function applyThemeToDocument(theme: ThemeSettings) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.style.setProperty('--aurora-emerald', theme.primaryColor);
  document.documentElement.style.setProperty('--aurora-gold', theme.accentColor);
  document.documentElement.style.setProperty('--aurora-soft-gold', theme.foregroundColor);
  document.documentElement.style.setProperty('--wedu-heading-font', `'${theme.headingFont}', serif`);
}

export function saveExperienceSettings(next: ExperienceSettings) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(EXPERIENCE_SETTINGS_KEY, JSON.stringify(next));
  applyThemeToDocument(next.theme);
  window.dispatchEvent(new CustomEvent(EXPERIENCE_SETTINGS_EVENT, { detail: next }));
}
