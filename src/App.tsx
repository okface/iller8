import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Path from './pages/Path';
import LessonView from './pages/LessonView';
import ReviewSession from './pages/ReviewSession';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import CustomContent from './pages/CustomContent';
import Catalog from './pages/Catalog';
import FamilyDrill from './pages/FamilyDrill';
import WordDrill from './pages/WordDrill';
import Daily from './pages/Daily';
import DrivingHome from './pages/DrivingHome';
import DrivingQuiz from './pages/DrivingQuiz';
import { loadProgress, saveProgress, updateSettings } from './store/progress';
import { AudioSettingsProvider } from './lib/audio-context';
import type { UserProgress } from './store/types';

export default function App() {
  const [progress, setProgress] = useState<UserProgress>(loadProgress);
  const [script, setScript] = useState<'latin' | 'cyrillic'>(() => {
    const pref = loadProgress().settings.scriptPreference;
    return pref === 'cyrillic' ? 'cyrillic' : 'latin';
  });

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleScriptChange = (newScript: 'latin' | 'cyrillic') => {
    setScript(newScript);
    const updated = updateSettings(progress, { scriptPreference: newScript });
    setProgress(updated);
    saveProgress(updated);
  };

  const handleAutoplayChange = (enabled: boolean) => {
    const updated = updateSettings(progress, { autoplayAudio: enabled });
    setProgress(updated);
    saveProgress(updated);
  };

  const handleVoiceGenderChange = (g: 'female' | 'male') => {
    const updated = updateSettings(progress, { voiceGender: g });
    setProgress(updated);
    saveProgress(updated);
  };

  return (
    <AudioSettingsProvider
      voiceGender={progress.settings.voiceGender}
      autoplay={progress.settings.autoplayAudio}
    >
      <HashRouter>
        <Routes>
          <Route
            element={
              <Layout
                script={script}
                onScriptChange={handleScriptChange}
                streak={progress.currentStreak}
                autoplay={progress.settings.autoplayAudio}
                onAutoplayChange={handleAutoplayChange}
                voiceGender={progress.settings.voiceGender}
                onVoiceGenderChange={handleVoiceGenderChange}
              />
            }
          >
            {/* Home = the learning path */}
            <Route index element={<Path progress={progress} script={script} />} />

            {/* Practice = the unified smart session */}
            <Route
              path="daily"
              element={<Daily progress={progress} setProgress={setProgress} script={script} />}
            />

            {/* Browse = look anything up (categories, words, families) */}
            <Route path="browse" element={<Catalog progress={progress} script={script} />} />

            {/* Keep-sharp maintenance (launched from the path) */}
            <Route
              path="review"
              element={<ReviewSession progress={progress} setProgress={setProgress} script={script} />}
            />

            {/* Deep links (no tab): focused drills + a single lesson */}
            <Route
              path="words"
              element={<WordDrill progress={progress} setProgress={setProgress} script={script} />}
            />
            <Route
              path="families"
              element={<FamilyDrill progress={progress} setProgress={setProgress} script={script} />}
            />
            <Route
              path="families/:lessonId"
              element={<FamilyDrill progress={progress} setProgress={setProgress} script={script} />}
            />
            <Route
              path="lesson/:id"
              element={<LessonView progress={progress} setProgress={setProgress} script={script} />}
            />

            {/* Me = settings + stats + custom content */}
            <Route
              path="settings"
              element={<Settings progress={progress} setProgress={setProgress} script={script} />}
            />
            <Route path="stats" element={<Stats progress={progress} script={script} />} />
            <Route path="custom" element={<CustomContent progress={progress} script={script} />} />

            {/* Körkortsteori — separate Swedish driving-theory track */}
            <Route path="driving" element={<DrivingHome />} />
            <Route path="driving/quiz" element={<DrivingQuiz />} />
          </Route>
        </Routes>
      </HashRouter>
    </AudioSettingsProvider>
  );
}
