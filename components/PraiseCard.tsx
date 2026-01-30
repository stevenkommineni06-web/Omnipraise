
import React, { useState, useRef, useEffect } from 'react';
import { PraiseItem } from '../types';
import { playPraiseSpeech } from '../services/geminiService';
import { LANGUAGES } from '../constants';

interface Props {
  praise: PraiseItem;
  isRtl?: boolean;
  languageCode: string;
  isFavorite: boolean;
  onToggleFavorite: (praise: PraiseItem) => void;
}

const PraiseCard: React.FC<Props> = ({ praise, isRtl, languageCode, isFavorite, onToggleFavorite }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBufferLoading, setIsBufferLoading] = useState(false);
  
  // Swipe Logic
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const threshold = 100;

  const languageName = LANGUAGES.find(l => l.code === languageCode)?.name || 'English';

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying || isBufferLoading) return;
    
    setIsBufferLoading(true);
    try {
      // Include the scripture reference in the spoken text
      const spokenTextWithRef = `${praise.originalText}. Reference: ${praise.reference}`;
      await playPraiseSpeech(spokenTextWithRef, languageName);
      setIsPlaying(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsBufferLoading(false);
      setIsPlaying(false);
    }
  };

  const handleShare = async () => {
    const shareText = `"${praise.originalText}"\n\n— ${praise.reference}\n\nShared from OmniPraise`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'OmniPraise - Praise of the Day',
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        // Simple visual feedback could be added here
      } catch (err) {
        console.error("Clipboard failed:", err);
      }
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Dampen the swipe after threshold
    const dampenedDiff = Math.abs(diff) > threshold 
      ? (diff > 0 ? threshold + (diff - threshold) * 0.2 : -threshold + (diff + threshold) * 0.2)
      : diff;
      
    setSwipeOffset(dampenedDiff);
  };

  const onTouchEnd = () => {
    setIsSwiping(false);
    if (swipeOffset > threshold) {
      onToggleFavorite(praise);
    } else if (swipeOffset < -threshold) {
      handleShare();
    }
    setSwipeOffset(0);
  };

  // Determine background color and icon based on swipe direction
  const getActionOverlay = () => {
    if (swipeOffset === 0) return null;
    const opacity = Math.min(Math.abs(swipeOffset) / threshold, 1);
    
    if (swipeOffset > 0) {
      return (
        <div 
          className="absolute inset-0 flex items-center justify-start pl-8 rounded-2xl bg-rose-500 transition-opacity"
          style={{ opacity: opacity * 0.8 }}
        >
          <i className="fas fa-heart text-white text-2xl"></i>
        </div>
      );
    } else {
      return (
        <div 
          className="absolute inset-0 flex items-center justify-end pr-8 rounded-2xl bg-indigo-500 transition-opacity"
          style={{ opacity: opacity * 0.8 }}
        >
          <i className="fas fa-share-nodes text-white text-2xl"></i>
        </div>
      );
    }
  };

  return (
    <div className="relative group touch-pan-y">
      {/* Swipe Action Backgrounds */}
      {getActionOverlay()}

      {/* Main Card */}
      <div 
        className="theme-card rounded-[2.5rem] p-8 shadow-md border-2 theme-border transition-all duration-300 relative z-10 select-none overflow-hidden flex flex-col gap-5 hover:shadow-xl hover:dynamic-accent-border"
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Top Header Row */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 dynamic-accent-soft rounded-xl text-[10px] font-black tracking-widest uppercase">
              Praise #{praise.id}
            </span>
            {isFavorite && (
               <i className="fas fa-heart text-rose-500 text-[10px] animate-pulse"></i>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              className="flex items-center justify-center w-10 h-10 rounded-2xl transition-all theme-bg theme-text-muted border-2 theme-border hover:opacity-70 active:scale-90"
              title="Share Praise"
            >
              <i className="fas fa-share-nodes text-[14px]"></i>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(praise); }}
              className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all border-2 ${
                isFavorite 
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-sm' 
                  : 'theme-bg theme-text-muted theme-border hover:text-rose-400'
              } active:scale-90`}
              title={isFavorite ? "Unfavorite" : "Favorite"}
            >
              <i className={`${isFavorite ? 'fas' : 'far'} fa-heart text-[14px]`}></i>
            </button>
            
            <button 
              onClick={handleSpeak}
              className={`flex items-center justify-center w-12 h-12 rounded-[1.25rem] transition-all shadow-lg active:scale-90 ${
                isPlaying 
                  ? 'dynamic-accent-bg' 
                  : 'dynamic-accent-soft hover:opacity-80'
              }`}
              title="Listen"
            >
              {isBufferLoading ? (
                <i className="fas fa-spinner fa-spin text-sm"></i>
              ) : isPlaying ? (
                <i className="fas fa-volume-up text-sm"></i>
              ) : (
                <i className="fas fa-play text-xs ml-1"></i>
              )}
            </button>
          </div>
        </div>
        
        {/* Praise Text Area */}
        <div className={`${isRtl ? 'text-right' : 'text-left'} space-y-4 pointer-events-none`}>
          <h3 
            className={`praise-text-dynamic font-black theme-text leading-tight tracking-tight ${isRtl ? 'font-arabic' : ''}`} 
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            "{praise.originalText}"
          </h3>
          
          {praise.phonetic && (
            <div className="flex items-center gap-2">
              <div className="w-1 h-3 rounded-full dynamic-accent-bg opacity-30"></div>
              <p className="dynamic-accent-text text-[12px] font-bold italic tracking-wide opacity-80">
                {praise.phonetic}
              </p>
            </div>
          )}
          
          {praise.translation !== praise.originalText && (
            <p className="trans-text-dynamic theme-text-muted leading-relaxed font-semibold opacity-70">
              {praise.translation}
            </p>
          )}
        </div>

        {/* Footer / Reference Section */}
        <div className="flex items-center justify-between pt-5 mt-2 border-t-2 theme-border pointer-events-none">
          <div className="flex items-center gap-3 px-1">
             <div className="w-8 h-8 rounded-xl dynamic-accent-soft flex items-center justify-center">
               <i className="fas fa-cross text-xs"></i>
             </div>
             <span className="ref-text-dynamic theme-text font-black tracking-tighter text-lg underline decoration-accent/10 decoration-4 underline-offset-8">
               {praise.reference}
             </span>
          </div>
          <div className="px-3 py-1 rounded-xl dynamic-accent-soft text-[9px] font-black uppercase tracking-widest opacity-60">
            {praise.category}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PraiseCard;
