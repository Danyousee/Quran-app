import React, { useCallback, useEffect, useState } from 'react';
import { AuthSyncProvider, useAuthSync } from './context/AuthSyncContext';
import { AudioPlayerProvider, useAudioPlayer } from './context/AudioPlayerContext';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { QuranReaderView } from './components/QuranReaderView';
import { RecitersView } from './components/RecitersView';
import { BookmarksView } from './components/BookmarksView';
import { SettingsView } from './components/SettingsView';
import { FloatingAudioPlayer } from './components/FloatingAudioPlayer';
import { fetchAllSurahs } from './lib/quranApi';
import { SectionView, SurahMeta } from './types/quran';

const QuranAppShell: React.FC = () => {
  const { progress } = useAuthSync();
  const { playAyah } = useAudioPlayer();

  const [activeSection, setActiveSection] = useState<SectionView>('home');
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [loadingSurahs, setLoadingSurahs] = useState(true);

  const [selectedSurah, setSelectedSurah] = useState<number>(
    progress.lastSurah || 1
  );
  const [targetAyah, setTargetAyah] = useState<number | undefined>(
    progress.lastAyah || 1
  );
  const [readerFlags, setReaderFlags] = useState<{
    openMemorisation?: boolean;
    openTafsir?: boolean;
  }>({});

  useEffect(() => {
    fetchAllSurahs()
      .then((list) => {
        setSurahs(list);
        setLoadingSurahs(false);
      })
      .catch(() => setLoadingSurahs(false));
  }, []);

  const handleOpenSurah = useCallback(
    (
      surahNumber: number,
      ayahNumber = 1,
      options?: {
        autoPlay?: boolean;
        openMemorisation?: boolean;
        openTafsir?: boolean;
      }
    ) => {
      setSelectedSurah(surahNumber);
      setTargetAyah(ayahNumber);
      setReaderFlags({
        openMemorisation: options?.openMemorisation ?? false,
        openTafsir: options?.openTafsir ?? false,
      });
      setActiveSection('quran');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (options?.autoPlay) {
        const meta = surahs.find((s) => s.number === surahNumber);
        playAyah(surahNumber, ayahNumber, meta);
      }
    },
    [surahs, playAyah]
  );

  const handleResumeReading = useCallback(() => {
    handleOpenSurah(progress.lastSurah || 1, progress.lastAyah || 1);
  }, [handleOpenSurah, progress.lastSurah, progress.lastAyah]);

  return (
    <div className="min-h-screen bg-white text-stone-900 transition-colors dark:bg-slate-950 dark:text-stone-100">
      <Navbar
        activeSection={activeSection}
        onNavigate={(sec) => {
          setActiveSection(sec);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onResumeReading={handleResumeReading}
      />

      <main>
        {activeSection === 'home' && (
          <HomeView
            surahs={surahs}
            loadingSurahs={loadingSurahs}
            onOpenSurah={handleOpenSurah}
            onNavigate={setActiveSection}
          />
        )}

        {activeSection === 'quran' && (
          <QuranReaderView
            surahs={surahs}
            surahNumber={selectedSurah}
            targetAyah={targetAyah}
            initialOpenMemorisation={readerFlags.openMemorisation}
            initialOpenTafsir={readerFlags.openTafsir}
            onSelectSurah={(surah, ayah) => handleOpenSurah(surah, ayah ?? 1)}
          />
        )}

        {activeSection === 'reciters' && (
          <RecitersView
            surahs={surahs}
            onOpenSurah={(s, a) => handleOpenSurah(s, a)}
          />
        )}

        {activeSection === 'bookmarks' && (
          <BookmarksView
            surahs={surahs}
            onOpenSurah={(s, a) => handleOpenSurah(s, a)}
          />
        )}

        {activeSection === 'settings' && <SettingsView />}
      </main>

      <FloatingAudioPlayer
        onJumpToActiveAyah={(surah, ayah) => handleOpenSurah(surah, ayah)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthSyncProvider>
      <AudioPlayerProvider>
        <QuranAppShell />
      </AudioPlayerProvider>
    </AuthSyncProvider>
  );
}
