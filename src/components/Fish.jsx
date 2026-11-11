import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { palette } from '../theme';
import { useI18n } from '../context/LanguageContext';
import { playSound } from '../utils/sound';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomBetween = (min, max) => Math.min(max, Math.max(min, min + Math.random() * (max - min)));

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const bob = keyframes`
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-4px) rotate(0.6deg); }
`;

const knock = keyframes`
  0%, 100% { transform: translateX(0) rotate(0); }
  14% { transform: translateX(7px) rotate(-3.5deg); }
  28% { transform: translateX(0) rotate(0); }
  46% { transform: translateX(7px) rotate(-3.5deg); }
  60% { transform: translateX(0) rotate(0); }
  78% { transform: translateX(7px) rotate(-3.5deg); }
`;

const lean = keyframes`
  0%, 100% { transform: rotate(0) translateX(0); }
  40%, 70% { transform: rotate(-4deg) translateX(3px); }
`;

const wave = keyframes`
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(10deg); }
  55% { transform: rotate(-8deg); }
  80% { transform: rotate(6deg); }
`;

const PopIn = styled.div`
  position: absolute;
  left: 6%;
  bottom: 1.5%;
  width: clamp(88px, 13%, 134px);
  z-index: 5;
  transform: translateX(${(props) => (props.$shown ? '0%' : '-185%')});
  transition: transform ${(props) => (props.$reduce ? 0.25 : 1.9)}s cubic-bezier(0.22, 0.8, 0.3, 1);
  pointer-events: ${(props) => (props.$shown ? 'auto' : 'none')};
  filter: drop-shadow(0 12px 14px rgba(20, 12, 20, 0.28));
`;

const Figure = styled.div`
  width: 100%;
  transform-origin: 50% 92%;
  ${(props) => {
    if (props.$phase === 'knock') return `animation: ${knock} 1.25s ease-in-out both;`;
    if (props.$phase === 'peek') return `animation: ${lean} 2.6s ease-in-out both;`;
    if (props.$wave) return `animation: ${wave} 0.7s ease-in-out both;`;
    return `animation: ${bob} 3.4s ease-in-out infinite;`;
  }}

  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
`;

const Bubble = styled.div`
  position: absolute;
  left: 62%;
  bottom: 86%;
  z-index: 7;
  max-width: 150px;
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(255, 250, 242, 0.97);
  color: ${palette.ink};
  font-size: 11.5px;
  line-height: 1.4;
  white-space: nowrap;
  box-shadow: 0 12px 24px -14px rgba(10, 8, 15, 0.6);
  animation: ${bob} 2.2s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    left: 18%;
    bottom: -5px;
    width: 11px;
    height: 11px;
    transform: translateX(-50%) rotate(45deg);
    border-radius: 2px;
    background: inherit;
  }
`;

const Wave = styled.div`
  position: absolute;
  right: 4%;
  top: 6%;
  font-size: 22px;
  animation: ${bob} 0.7s ease-in-out both;
  pointer-events: none;
`;

const PEEK_LINES = ['fish.peek1', 'fish.peek2', 'fish.peek3'];

export default function Fish({ onKnock = null }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  const [phase, setPhase] = useState('hidden');
  const [peekLine, setPeekLine] = useState(null);
  const [waving, setWaving] = useState(false);
  const waveTimer = useRef(null);

  useEffect(() => {
    let alive = true;

    const loop = async () => {
      while (alive) {
        await sleep(randomBetween(35000, 80000));
        if (!alive) return;

        setShown(true);
        setPhase('arrive');
        await sleep(prefersReducedMotion ? 250 : 2000);
        if (!alive) return;

        setPhase('knock');
        for (let tap = 0; tap < 3; tap += 1) {
          playSound('knock');
          onKnock && onKnock();
          await sleep(430);
          if (!alive) return;
        }

        setPhase('peek');
        setPeekLine(PEEK_LINES[Math.floor(Math.random() * PEEK_LINES.length)]);
        await sleep(2600);
        if (!alive) return;

        setPhase('leave');
        setShown(false);
        await sleep(prefersReducedMotion ? 250 : 1700);
        if (!alive) return;

        setPeekLine(null);
        setPhase('hidden');
      }
    };

    const firstVisit = setTimeout(() => {
      if (alive) loop();
    }, randomBetween(9000, 18000));

    return () => {
      alive = false;
      clearTimeout(firstVisit);
    };
  }, [onKnock]);

  const handleClick = () => {
    if (!shown) return;
    setWaving(true);
    clearTimeout(waveTimer.current);
    waveTimer.current = setTimeout(() => setWaving(false), 700);
  };

  return (
    <PopIn
      $shown={shown}
      $reduce={prefersReducedMotion}
      onClick={handleClick}
      role="img"
      aria-label={t('fish.name')}
    >
      {phase === 'peek' && peekLine && <Bubble>{t(peekLine)}</Bubble>}
      {waving && <Wave aria-hidden="true">👋</Wave>}
      <Figure $phase={phase} $wave={waving}>
        <svg viewBox="0 0 120 178" aria-hidden="true">
          <defs>
            <radialGradient id="fishBody" cx="36%" cy="24%" r="82%">
              <stop offset="0%" stopColor="#f7b083" />
              <stop offset="58%" stopColor="#f0915f" />
              <stop offset="100%" stopColor="#d9703f" />
            </radialGradient>
            <linearGradient id="fishTee" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbf0df" />
              <stop offset="100%" stopColor="#ecd9bf" />
            </linearGradient>
            <linearGradient id="fishCap" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6f97c4" />
              <stop offset="100%" stopColor="#4f769f" />
            </linearGradient>
          </defs>

          {/* tail fin poking out below the tee */}
          <path d="M60 132 L40 172 L60 160 L80 172 Z" fill="#e07f4d" opacity="0.92" />

          {/* little fin-feet */}
          <ellipse cx="49" cy="142" rx="10" ry="6" fill="#e07f4d" />
          <ellipse cx="71" cy="142" rx="10" ry="6" fill="#e07f4d" />

          {/* body */}
          <ellipse cx="60" cy="82" rx="33" ry="54" fill="url(#fishBody)" />
          <ellipse cx="60" cy="98" rx="21" ry="34" fill="#ffd9b8" opacity="0.55" />

          {/* side fins (arms) tucked under the sleeves */}
          <ellipse cx="26" cy="100" rx="11" ry="18" fill="#e88a55" transform="rotate(18 26 100)" />
          <ellipse cx="94" cy="100" rx="11" ry="18" fill="#e88a55" transform="rotate(-18 94 100)" />

          {/* face */}
          <g>
            <circle cx="49" cy="54" r="8.5" fill="#fff8ec" />
            <circle cx="71" cy="54" r="8.5" fill="#fff8ec" />
            <circle cx="50.5" cy="55.5" r="4.4" fill="#3a2621" />
            <circle cx="72.5" cy="55.5" r="4.4" fill="#3a2621" />
            <circle cx="52" cy="53.6" r="1.5" fill="#fff8ec" />
            <circle cx="74" cy="53.6" r="1.5" fill="#fff8ec" />
            <ellipse cx="40" cy="66" rx="5" ry="3.4" fill="#f2a48a" opacity="0.5" />
            <ellipse cx="80" cy="66" rx="5" ry="3.4" fill="#f2a48a" opacity="0.5" />
            <path d="M48 68 Q60 78 72 68" stroke="#5a352d" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>

          {/* baggy American tee */}
          <path d="M16 72 h88 a18 18 0 0 1 18 18 v34 a18 18 0 0 1 -18 18 h-88 a18 18 0 0 1 -18 -18 v-34 a18 18 0 0 1 18 -18 Z" fill="url(#fishTee)" />
          <rect x="6" y="92" width="24" height="42" rx="12" fill="url(#fishTee)" />
          <rect x="90" y="92" width="24" height="42" rx="12" fill="url(#fishTee)" />
          <path d="M44 74 Q60 86 76 74" stroke="#d9c3a3" strokeWidth="3" fill="none" opacity="0.7" />
          <rect x="46" y="104" width="28" height="24" rx="6" fill="#e6d2b4" opacity="0.8" />
          {/* little star print */}
          <path
            d="M60 84 l2.4 5.4 5.9 0.5 -4.5 3.9 1.4 5.8 -5.2 -3.1 -5.2 3.1 1.4 -5.8 -4.5 -3.9 5.9 -0.5 Z"
            fill="#e8795f"
            opacity="0.85"
          />

          {/* backwards denim cap */}
          <path d="M36 42 A24 24 0 0 1 84 42 Z" fill="url(#fishCap)" />
          <rect x="16" y="38" width="18" height="9" rx="4" fill="#4f769f" />
          <circle cx="60" cy="20" r="3" fill="#3f6286" />
        </svg>
      </Figure>
    </PopIn>
  );
}
