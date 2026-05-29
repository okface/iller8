import { createContext, useContext } from 'react';
import { voiceForGender, type VoiceId } from './audio';

/**
 * Global audio settings exposed to every component that plays clips.
 * Avoids prop-drilling `voiceGender` + `autoplayAudio` through every
 * page → exercise → primitive chain. Read with `useAudioSettings()`;
 * the provider lives in `App.tsx` and reads from `UserProgress`.
 */
export interface AudioSettings {
  voice: VoiceId;
  autoplay: boolean;
}

const DEFAULT: AudioSettings = {
  voice: 'sophie',
  autoplay: true,
};

const AudioSettingsContext = createContext<AudioSettings>(DEFAULT);

export function AudioSettingsProvider({
  voiceGender,
  autoplay,
  children,
}: {
  voiceGender: 'female' | 'male';
  autoplay: boolean;
  children: React.ReactNode;
}) {
  const value: AudioSettings = {
    voice: voiceForGender(voiceGender),
    autoplay,
  };
  return (
    <AudioSettingsContext.Provider value={value}>
      {children}
    </AudioSettingsContext.Provider>
  );
}

export function useAudioSettings(): AudioSettings {
  return useContext(AudioSettingsContext);
}
