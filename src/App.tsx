import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LessonView from './pages/LessonView';
import ReviewSession from './pages/ReviewSession';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import CustomContent from './pages/CustomContent';
import { loadProgress, saveProgress, updateSettings } from './store/progress';
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

  return (
    <HashRouter>
      <Routes>
        <Route
          element={
            <Layout script={script} onScriptChange={handleScriptChange} />
          }
        >
          <Route
            index
            element={<Dashboard progress={progress} script={script} />}
          />
          <Route
            path="lesson/:id"
            element={
              <LessonView
                progress={progress}
                setProgress={setProgress}
                script={script}
              />
            }
          />
          <Route
            path="review"
            element={
              <ReviewSession
                progress={progress}
                setProgress={setProgress}
                script={script}
              />
            }
          />
          <Route
            path="stats"
            element={<Stats progress={progress} script={script} />}
          />
          <Route
            path="settings"
            element={
              <Settings
                progress={progress}
                setProgress={setProgress}
                script={script}
              />
            }
          />
          <Route
            path="custom"
            element={<CustomContent progress={progress} script={script} />}
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}
