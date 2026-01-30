import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PraiseItem, PraiseCategory, Language, Theme, FontSize, FontFamily, AccentColor } from './types';
import { LANGUAGES, CATEGORIES } from './constants';
import { fetchPraisesBatch, playPraiseSpeech } from './services/geminiService';
import { MASTER_PRAISE_LIST, RawPraise } from './data/praiseList';
import LanguageSelector from './components/LanguageSelector';
import PraiseCard from './components/PraiseCard';
import MobileNav, { TabType } from './components/MobileNav';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [selectedCategory, setSelectedCategory] = useState<string>(PraiseCategory.ALL);
  const [theme, setTheme] = useState<Theme>(Theme.DAY);
  const [accentColor, setAccentColor] = useState<AccentColor>(AccentColor.INDIGO);
  const [fontSize, setFontSize] = useState<FontSize>(FontSize.MEDIUM);
  const [fontFamily, setFontFamily] = useState<FontFamily>(FontFamily.SANS);
  const [praises, setPraises] = useState<PraiseItem[]>([]);
  const [favorites, setFavorites] = useState<PraiseItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState(false);

  // Worship Player State
  const [isPlayerActive, setIsPlayerActive] = useState(false);
  const [playerLanguage, setPlayerLanguage] = useState('en');
  const [playerIndex, setPlayerIndex] = useState(0); 
  const [playerIsPlaying, setPlayerIsPlaying] = useState(false);
  const [playerLoadingItem, setPlayerLoadingItem] = useState(false);

  // Hero Shuffle
  const [heroIndexOffset, setHeroIndexOffset] = useState(0);

  const PAGE_SIZE = 10;

  // Praise & Verse of the Day logic
  const dailyPraise = useMemo(() => {
    const today = new Date().toDateString();
    let seed = 0;
    for(let i=0; i<today.length; i++) seed += today.charCodeAt(i);
    const baseIndex = seed % MASTER_PRAISE_LIST.length;
    const finalIndex = (baseIndex + heroIndexOffset + MASTER_PRAISE_LIST.length) % MASTER_PRAISE_LIST.length;
    const raw = MASTER_PRAISE_LIST[finalIndex];
    return {
      id: raw.id,
      originalText: raw.text,
      translation: raw.text,
      reference: raw.ref,
      category: raw.category
    } as PraiseItem;
  }, [heroIndexOffset]);

  const UNIFORM_GREETING = "Bless the Lord, O My Soul";
  
  const filteredCount = useMemo(() => {
    if (selectedCategory === PraiseCategory.ALL) return MASTER_PRAISE_LIST.length;
    return MASTER_PRAISE_LIST.filter(p => p.category === selectedCategory).length;
  }, [selectedCategory]);

  const TOTAL_PAGES = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));

  const currentLanguageObj = useMemo(() => 
    LANGUAGES.find(l => l.code === selectedLanguage) || LANGUAGES[0]
  , [selectedLanguage]);

  useEffect(() => {
    const savedFavs = localStorage.getItem('omnipraise_favorites');
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    }
    const savedTheme = localStorage.getItem('omnipraise_theme') as Theme;
    if (savedTheme) setTheme(savedTheme);
    const savedAccent = localStorage.getItem('omnipraise_accent') as AccentColor;
    if (savedAccent) setAccentColor(savedAccent);
    const savedSize = localStorage.getItem('omnipraise_size') as FontSize;
    if (savedSize) setFontSize(savedSize);
    const savedFont = localStorage.getItem('omnipraise_font') as FontFamily;
    if (savedFont) setFontFamily(savedFont);
  }, []);

  useEffect(() => {
    localStorage.setItem('omnipraise_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('omnipraise_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentColor);
    localStorage.setItem('omnipraise_accent', accentColor);
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.setAttribute('data-size', fontSize);
    localStorage.setItem('omnipraise_size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font', fontFamily);
    localStorage.setItem('omnipraise_font', fontFamily);
  }, [fontFamily]);

  const loadPraises = useCallback(async (p: number, l: string, c: string) => {
    if (activeTab === 'favorites' || activeTab === 'info' || searchQuery) return;
    setLoading(true);
    try {
      const data = await fetchPraisesBatch(p, l, c, PAGE_SIZE);
      setPraises(data);
    } catch (err) {
      setPraises([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    loadPraises(page, selectedLanguage, selectedCategory);
    if ((activeTab === 'home' || activeTab === 'favorites') && !searchQuery) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [page, selectedLanguage, selectedCategory, loadPraises, activeTab, searchQuery]);

  const toggleFavorite = (praise: PraiseItem) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.originalText === praise.originalText);
      if (exists) return prev.filter(f => f.originalText !== praise.originalText);
      return [...prev, praise];
    });
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === 'languages') {
      setIsLangModalOpen(true);
    } else if (tab === 'categories') {
      setIsCategoryModalOpen(true);
    } else {
      setActiveTab(tab);
      if (tab !== 'home') setShowSearch(false);
    }
  };

  const startWorship = (lang: string) => {
    setPlayerLanguage(lang);
    setPlayerIndex(0);
    setIsPlayerActive(true);
    setPlayerIsPlaying(true);
    setActiveTab('home');
  };

  const stopWorship = () => {
    setIsPlayerActive(false);
    setPlayerIsPlaying(false);
  };

  useEffect(() => {
    let active = true;
    const playSequentially = async () => {
      if (!isPlayerActive || !playerIsPlaying) return;

      const langObj = LANGUAGES.find(l => l.code === playerLanguage) || LANGUAGES[0];
      const langName = langObj.name;
      
      const rawPraise = MASTER_PRAISE_LIST[playerIndex];
      if (!rawPraise) {
        stopWorship();
        return;
      }

      setPlayerLoadingItem(true);
      let textToPlay = rawPraise.text;
      if (playerLanguage !== 'en') {
        const batchPage = Math.floor(playerIndex / 10) + 1;
        const translatedBatch = await fetchPraisesBatch(batchPage, playerLanguage, PraiseCategory.ALL, 10);
        const translatedItem = translatedBatch.find(p => p.id === rawPraise.id);
        textToPlay = translatedItem?.originalText || rawPraise.text;
      }
      
      const finalAudioText = `${textToPlay}. Reference: ${rawPraise.ref}`;
      setPlayerLoadingItem(false);

      try {
        if (!active || !playerIsPlaying) return;
        await playPraiseSpeech(finalAudioText, langName);
        if (active && playerIsPlaying) {
          setPlayerIndex(prev => (prev + 1) % MASTER_PRAISE_LIST.length);
        }
      } catch (error) {
        if (active && playerIsPlaying) {
          setPlayerIndex(prev => (prev + 1) % MASTER_PRAISE_LIST.length);
        }
      }
    };

    playSequentially();
    return () => { active = false; };
  }, [isPlayerActive, playerIsPlaying, playerIndex, playerLanguage]);

  const displayedPraises = useMemo(() => {
    if (activeTab === 'favorites') return favorites;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return MASTER_PRAISE_LIST
        .filter(p => p.text.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q))
        .map(raw => ({
          id: raw.id,
          originalText: raw.text,
          translation: raw.text,
          reference: raw.ref,
          category: raw.category
        } as PraiseItem));
    }
    return praises;
  }, [activeTab, favorites, searchQuery, praises]);

  return (
    <div className="min-h-screen theme-bg theme-text flex flex-col pb-24 transition-colors duration-500 font-sans">
      <header className="sticky top-0 z-40 theme-card backdrop-blur-xl border-b theme-border px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-2xl dynamic-accent-bg flex items-center justify-center shadow-lg shadow-accent/30">
            <i className="fas fa-book-bible text-white text-2xl"></i>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
               <i className="fas fa-cross dynamic-accent-text text-[8px]"></i>
            </div>
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter leading-none">OmniPraise</h1>
            <p className="text-[10px] theme-text-muted font-bold tracking-[0.2em] uppercase opacity-60">Divine Grace</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => setShowSearch(!showSearch)}
             className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showSearch ? 'dynamic-accent-bg text-white shadow-lg' : 'theme-bg-soft theme-text-muted'}`}
           >
             <i className="fas fa-search text-sm"></i>
           </button>
           <button 
             onClick={() => setIsLangModalOpen(true)}
             className="theme-bg-soft px-3 py-1.5 rounded-full flex items-center gap-2 border theme-border active:scale-95 transition-all"
           >
             <span className="text-xs font-black uppercase tracking-widest">{currentLanguageObj.code}</span>
             <i className="fas fa-chevron-down text-[10px] opacity-40"></i>
           </button>
        </div>
      </header>

      {showSearch && (
        <div className="px-4 py-3 theme-card border-b theme-border animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <i className="fas fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-sm theme-text-muted opacity-40"></i>
            <input 
              type="text"
              placeholder="Search 1000 praises by verse or text..."
              className="w-full theme-bg-soft rounded-2xl py-3 pl-11 pr-4 text-sm font-medium border-none focus:ring-2 ring-accent/30 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 space-y-8">
        {activeTab === 'home' && !searchQuery && (
          <section className="space-y-8 animate-in fade-in duration-500">
            <div className="px-1 text-center">
              <h2 className="text-2xl font-black tracking-widest uppercase opacity-90 italic dynamic-accent-text drop-shadow-sm">
                {UNIFORM_GREETING}
              </h2>
            </div>

            {/* Verse of the Day Hero Card */}
            <div 
              className="relative overflow-hidden rounded-[3rem] p-10 shadow-2xl border-none theme-bg-gradient group cursor-pointer active:scale-[0.99] transition-all bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800"
              onClick={() => setHeroIndexOffset(prev => prev + 1)}
            >
              <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent/20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
              
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black tracking-[0.2em] uppercase text-white ring-1 ring-white/30">Holy Spirit</span>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-bible text-white/50 text-sm"></i>
                    <i className="fas fa-cross text-white/50 text-xs"></i>
                  </div>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-3">
                    <p className="text-[11px] text-white/80 font-black uppercase tracking-[0.3em] flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      Verse of the Day
                    </p>
                    <h3 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight praise-text-dynamic block">
                      "{dailyPraise.originalText}"
                    </h3>
                  </div>

                  <div className="pt-8 border-t border-white/10">
                    <p className="text-[11px] text-white/60 font-black uppercase tracking-[0.3em] mb-3">Divine Reference</p>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                        <i className="fas fa-scroll text-white text-sm"></i>
                      </div>
                      <p className="text-2xl font-serif italic text-white/95 tracking-wide">{dailyPraise.reference}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-6">
                  <div className="flex items-center gap-3 text-white/60 hover:text-white transition-colors">
                    <i className="fas fa-arrows-rotate text-xs"></i>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Shuffle Praise</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); startWorship(selectedLanguage); }}
                    className="w-16 h-16 rounded-full bg-white text-indigo-700 flex items-center justify-center shadow-2xl active:scale-90 transition-all hover:scale-110 group"
                  >
                    <i className="fas fa-play text-xl ml-1 group-hover:scale-110 transition-transform"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Language Worship Selection */}
            <div className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40">Praise in Every Tongue</h4>
                <div className="h-[1px] flex-grow ml-6 bg-border-color opacity-20"></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                 {LANGUAGES.slice(0, 5).map(lang => (
                    <button 
                      key={lang.code}
                      onClick={() => startWorship(lang.code)}
                      className="group theme-card p-6 rounded-[2.5rem] border-2 theme-border hover:dynamic-accent-border transition-all text-left relative overflow-hidden shadow-sm hover:shadow-xl active:scale-95"
                    >
                      <div className="relative z-10 flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase opacity-40 tracking-wider group-hover:dynamic-accent-text">{lang.name}</span>
                        <span className="text-xl font-black tracking-tighter leading-none">{lang.nativeName}</span>
                      </div>
                      <div className="absolute right-4 bottom-4 w-9 h-9 rounded-2xl dynamic-accent-soft flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-3 group-hover:translate-y-0">
                        <i className="fas fa-play text-[11px]"></i>
                      </div>
                    </button>
                 ))}
                 <button 
                    onClick={() => setIsLangModalOpen(true)}
                    className="theme-card p-6 rounded-[2.5rem] border-2 theme-border flex flex-col items-center justify-center gap-3 hover:bg-accent/5 transition-all border-dashed group"
                  >
                    <i className="fas fa-language text-xl opacity-30 group-hover:dynamic-accent-text transition-all"></i>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">View All</span>
                 </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-7 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all border-2 ${
                    selectedCategory === cat 
                    ? 'dynamic-accent-bg text-white border-transparent shadow-xl shadow-accent/20 scale-105' 
                    : 'theme-bg-soft theme-text-muted theme-border hover:dynamic-accent-border'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Worship Player Overlay */}
        {isPlayerActive && (
          <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 duration-500">
            <div className="theme-card rounded-[3rem] p-6 shadow-2xl border-2 dynamic-accent-border flex items-center gap-6 backdrop-blur-xl bg-opacity-95">
              <div className="w-20 h-20 rounded-[1.75rem] dynamic-accent-bg flex items-center justify-center shadow-lg relative shrink-0">
                {playerLoadingItem ? (
                  <i className="fas fa-spinner fa-spin text-white text-3xl"></i>
                ) : (
                  <i className="fas fa-microphone-lines text-white text-3xl animate-pulse"></i>
                )}
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-4 theme-card">
                  {playerIndex + 1}
                </div>
              </div>
              <div className="flex-grow min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] dynamic-accent-text truncate mb-2">Sequential Worship • {LANGUAGES.find(l => l.code === playerLanguage)?.name}</p>
                <h5 className="text-lg font-bold truncate theme-text leading-tight tracking-tight">
                  {playerLoadingItem ? 'Preparing praise...' : MASTER_PRAISE_LIST[playerIndex]?.text}
                </h5>
                <p className="text-xs theme-text-muted opacity-60 italic mt-1">{MASTER_PRAISE_LIST[playerIndex]?.ref}</p>
              </div>
              <div className="flex items-center gap-3 pr-2">
                <button 
                  onClick={() => setPlayerIsPlaying(!playerIsPlaying)}
                  className="w-14 h-14 rounded-full theme-bg-soft flex items-center justify-center text-accent active:scale-90 transition-all border theme-border"
                >
                  <i className={`fas ${playerIsPlaying ? 'fa-pause' : 'fa-play'} text-lg`}></i>
                </button>
                <button 
                  onClick={stopWorship}
                  className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center active:scale-90 transition-all border border-rose-500/10"
                >
                  <i className="fas fa-xmark text-lg"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="space-y-6">
          <div className="flex items-center justify-between px-1 mb-2">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40">
              {activeTab === 'favorites' ? 'Saved Collections' : searchQuery ? 'Search Results' : `${selectedCategory} Collection`}
            </h4>
          </div>

          <div className="space-y-6">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="theme-card h-52 rounded-[2.5rem] animate-pulse opacity-50"></div>
              ))
            ) : displayedPraises.length > 0 ? (
              displayedPraises.map((praise) => (
                <PraiseCard 
                  key={`${praise.id}-${praise.originalText}`}
                  praise={praise}
                  isRtl={currentLanguageObj.rtl}
                  languageCode={selectedLanguage}
                  isFavorite={favorites.some(f => f.originalText === praise.originalText)}
                  onToggleFavorite={toggleFavorite}
                />
              ))
            ) : (
              <div className="text-center py-40 theme-text-muted space-y-8 opacity-50">
                <div className="w-24 h-24 rounded-full theme-bg-soft mx-auto flex items-center justify-center border-2 border-dashed theme-border">
                  <i className="fas fa-book-bible text-4xl"></i>
                </div>
                <p className="font-black text-[12px] tracking-[0.4em] uppercase">No Praises Found</p>
              </div>
            )}
          </div>

          {!loading && activeTab === 'home' && !searchQuery && (
             <div className="flex items-center justify-between pt-12 px-2 pb-16">
               <button 
                 disabled={page === 1}
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 className="flex items-center gap-5 font-black text-[11px] uppercase tracking-[0.3em] disabled:opacity-20 theme-text active:scale-95 transition-all group"
               >
                 <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
                 Prev
               </button>
               <div className="flex items-center gap-4">
                 <div className="h-1 w-10 rounded-full dynamic-accent-bg opacity-10"></div>
                 <span className="text-xs font-black tracking-[0.3em]">{page} / {TOTAL_PAGES}</span>
                 <div className="h-1 w-10 rounded-full dynamic-accent-bg opacity-10"></div>
               </div>
               <button 
                 disabled={page === TOTAL_PAGES}
                 onClick={() => setPage(p => Math.min(TOTAL_PAGES, p + 1))}
                 className="flex items-center gap-5 font-black text-[11px] uppercase tracking-[0.3em] disabled:opacity-20 theme-text active:scale-95 transition-all group"
               >
                 Next
                 <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
               </button>
             </div>
          )}
        </section>
      </main>

      <LanguageSelector 
        selectedLanguage={selectedLanguage}
        onLanguageChange={(l) => {
          setSelectedLanguage(l);
          setPage(1);
        }}
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
      />

      {activeTab === 'info' && (
        <div className="fixed inset-0 z-[70] theme-bg overflow-y-auto safe-pb p-8 animate-in slide-in-from-right duration-500">
          <div className="max-w-xl mx-auto space-y-16 pt-12 pb-40">
            <div className="flex justify-between items-center">
              <div className="w-20 h-20 rounded-[2rem] dynamic-accent-bg flex items-center justify-center shadow-2xl relative">
                <i className="fas fa-book-bible text-white text-4xl"></i>
                <i className="fas fa-cross text-white text-[12px] absolute top-4 right-4 bg-accent ring-2 ring-white/20 rounded-full p-1"></i>
              </div>
              <button onClick={() => setActiveTab('home')} className="theme-text-muted text-5xl hover:opacity-70 transition-all"><i className="fas fa-xmark"></i></button>
            </div>
            
            <div className="space-y-12">
               <div className="space-y-6">
                 <h2 className="text-6xl font-black tracking-tighter leading-none dynamic-accent-text drop-shadow-sm">Our Heart</h2>
                 <p className="theme-text-muted leading-relaxed font-medium text-2xl opacity-95">
                   OmniPraise is a spiritual companion featuring 1,000 praises dedicated to the Father, the Son, and the Holy Spirit. 
                   Spanning 18+ languages with complete Biblical references, we believe every believer should be able to worship in the language of their heart.
                 </p>
               </div>
               
               <div className="grid grid-cols-1 gap-6">
                 <div className="p-8 rounded-[3rem] theme-bg-soft border-2 theme-border flex items-start gap-8 hover:dynamic-accent-border transition-all">
                    <div className="w-16 h-16 rounded-[1.25rem] dynamic-accent-bg flex items-center justify-center shrink-0 shadow-lg">
                      <i className="fas fa-earth-americas text-white text-2xl"></i>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-black text-sm uppercase tracking-[0.3em]">Nations & Tongues</h4>
                      <p className="text-base theme-text-muted leading-relaxed">Praise Jesus and Jehovah in Telugu, Hindi, Kannada, Malayalam, Bengali, Oriya, and more.</p>
                    </div>
                 </div>
                 <div className="p-8 rounded-[3rem] theme-bg-soft border-2 theme-border flex items-start gap-8 hover:dynamic-accent-border transition-all">
                    <div className="w-16 h-16 rounded-[1.25rem] dynamic-accent-bg flex items-center justify-center shrink-0 shadow-lg">
                      <i className="fas fa-scroll text-white text-2xl"></i>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-black text-sm uppercase tracking-[0.3em]">Holy Scripture</h4>
                      <p className="text-base theme-text-muted leading-relaxed">Each of the 1,000 praises is rooted in the Living Word, ensuring theological depth and scriptural integrity.</p>
                    </div>
                 </div>
               </div>
            </div>

            <div className="space-y-12 pt-16 border-t theme-border">
               <h3 className="text-4xl font-black tracking-tighter">Personalize Your Sanctuary</h3>
               
               {/* Font Sizing Controls */}
               <div className="space-y-6">
                 <p className="text-[11px] font-black uppercase tracking-[0.4em] theme-text-muted opacity-40">Magnify Text</p>
                 <div className="flex gap-4">
                    {Object.values(FontSize).map(size => (
                      <button 
                        key={size}
                        onClick={() => setFontSize(size)}
                        className={`flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border-2 transition-all ${fontSize === size ? 'dynamic-accent-bg text-white border-transparent shadow-xl scale-105' : 'theme-bg-soft theme-border theme-text-muted'}`}
                      >
                        {size}
                      </button>
                    ))}
                 </div>
               </div>

               {/* Theme Settings */}
               <div className="space-y-6">
                 <p className="text-[11px] font-black uppercase tracking-[0.4em] theme-text-muted opacity-40">Sanctuary Light</p>
                 <div className="grid grid-cols-2 gap-5">
                   {Object.values(Theme).map(t => (
                     <button 
                       key={t}
                       onClick={() => setTheme(t)}
                       className={`py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest border-2 transition-all ${theme === t ? 'dynamic-accent-bg text-white border-transparent shadow-xl scale-105' : 'theme-bg-soft theme-border theme-text-muted'}`}
                     >
                       {t}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Font Selection */}
               <div className="space-y-6 pt-4">
                 <p className="text-[11px] font-black uppercase tracking-[0.4em] theme-text-muted opacity-40">Holy Typography</p>
                 <div className="grid grid-cols-2 gap-4">
                   {Object.values(FontFamily).map(f => (
                     <button 
                       key={f}
                       onClick={() => setFontFamily(f)}
                       className={`py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest border-2 transition-all ${fontFamily === f ? 'dynamic-accent-bg text-white border-transparent shadow-xl scale-105' : 'theme-bg-soft theme-border theme-text-muted'}`}
                       style={{ fontFamily: f === 'serif' ? 'Playfair Display' : f === 'mono' ? 'JetBrains Mono' : f === 'script' ? 'Dancing Script' : 'Inter' }}
                     >
                       {f} Style
                     </button>
                   ))}
                 </div>
               </div>

               {/* Accent Color Selection */}
               <div className="space-y-6 pt-4">
                 <p className="text-[11px] font-black uppercase tracking-[0.4em] theme-text-muted opacity-40">Sacred Glow Color</p>
                 <div className="flex gap-5 flex-wrap justify-center">
                   {Object.values(AccentColor).map(color => (
                     <button 
                       key={color}
                       onClick={() => setAccentColor(color)}
                       className={`w-14 h-14 rounded-full border-4 shadow-lg transition-all hover:scale-125 active:scale-90 ${accentColor === color ? 'border-text-main scale-125 ring-4 ring-accent/20' : 'border-transparent opacity-60'}`}
                       style={{ backgroundColor: `var(--${color}-500)` || color }}
                     />
                   ))}
                 </div>
               </div>
            </div>

            <div className="pt-24 text-center space-y-4">
              <p className="text-[12px] theme-text-muted font-black tracking-[0.6em] opacity-30 uppercase">OmniPraise • 1000 Heartfelt Praises</p>
              <p className="text-xl font-serif italic theme-text-muted opacity-80">"Let everything that has breath praise the Lord."</p>
            </div>
          </div>
        </div>
      )}

      <MobileNav activeTab={activeTab} setActiveTab={handleTabChange} />
    </div>
  );
};

export default App;