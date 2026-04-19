'use client';

import { useEffect } from 'react';
import {
  EXPERIENCE_SETTINGS_EVENT,
  applyThemeToDocument,
  readExperienceSettings,
} from '@/lib/experience-settings';

export function ExperienceSettingsSync() {
  useEffect(() => {
    applyThemeToDocument(readExperienceSettings().theme);

    const handleUpdate = () => {
      applyThemeToDocument(readExperienceSettings().theme);
    };

    window.addEventListener(EXPERIENCE_SETTINGS_EVENT, handleUpdate as EventListener);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EXPERIENCE_SETTINGS_EVENT, handleUpdate as EventListener);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return null;
}
