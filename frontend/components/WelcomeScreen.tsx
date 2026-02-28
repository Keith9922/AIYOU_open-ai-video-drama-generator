/**
 * AIYOU 漫剧生成平台 - 欢迎屏幕组件
 *
 * @developer 光波 (a@ggbo.com)
 * @copyright Copyright (c) 2025 光波. All rights reserved.
 */

// components/WelcomeScreen.tsx
import React from 'react';
import { useLanguage } from '../src/i18n/LanguageContext';
import { Galaxy } from './Galaxy';

interface WelcomeScreenProps {
  visible: boolean;
}

/**
 * 欢迎屏幕组件
 * 在画布为空时显示
 */
export const WelcomeScreen: React.FC<WelcomeScreenProps> = React.memo(({ visible }) => {
  const { t } = useLanguage();

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] z-50 pointer-events-none ${
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
      }`}
    >
      {/* 背景星空 */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Galaxy
          focal={[0.5, 0.5]}
          rotation={[1.0, 0.0]}
          starSpeed={0.5}
          density={1.2}
          hueShift={280}
          disableAnimation={false}
          speed={0.7}
          mouseInteraction={true}
          glowIntensity={0.6}
          saturation={0.6}
          mouseRepulsion={true}
          twinkleIntensity={0.3}
          rotationSpeed={0.1}
          repulsionStrength={2}
          autoCenterRepulsion={0}
          transparent={false}
        />
      </div>

      {/* 标题 */}
      <div className="flex flex-col items-center justify-center mb-10 select-none animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="relative mb-8">
          <img
            src="/logo.png"
            alt="AIYOU Logo"
            className="h-40 md:h-52 object-contain drop-shadow-2xl"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          <span className="text-xl md:text-2xl font-bold tracking-[0.3em] text-white animate-[glow_2s_ease-in-out_infinite]">
            {t.welcome}
          </span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent via-cyan-500/50 to-transparent"></div>
        </div>

        <style>{`
          @keyframes glow {
            0%, 100% {
              text-shadow: 0 0 20px rgba(34, 211, 238, 0.3),
                           0 0 40px rgba(34, 211, 238, 0.2),
                           0 0 60px rgba(34, 211, 238, 0.1);
            }
            50% {
              text-shadow: 0 0 30px rgba(34, 211, 238, 0.6),
                           0 0 60px rgba(34, 211, 238, 0.4),
                           0 0 90px rgba(34, 211, 238, 0.2);
            }
          }
        `}</style>
      </div>
    </div>
  );
});
