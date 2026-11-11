import React, { useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
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
    if (props.$phase === 'knock') return css`animation: ${knock} 1.25s ease-in-out both;`;
    if (props.$phase === 'peek') return css`animation: ${lean} 2.6s ease-in-out both;`;
    if (props.$wave) return css`animation: ${wave} 0.7s ease-in-out both;`;
    return css`animation: ${bob} 3.4s ease-in-out infinite;`;
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
        <svg viewBox="0 0 120 192" aria-hidden="true">
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
            <linearGradient id="fishShorts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6f97c4" />
              <stop offset="100%" stopColor="#456a99" />
            </linearGradient>
            <linearGradient id="skateDeck" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7b6cf0" />
              <stop offset="100%" stopColor="#574bc2" />
            </linearGradient>
          </defs>

          {/* skateboard — deck is wider than the body so it clearly reads as a board */}
          <rect x="6" y="150" width="108" height="12" rx="6" fill="url(#skateDeck)" />
          <rect x="6" y="150" width="108" height="4" rx="2" fill="#ffffff" opacity="0.25" />
          <rect x="27" y="160" width="9" height="7" rx="2" fill="#9aa0b5" />
          <rect x="84" y="160" width="9" height="7" rx="2" fill="#9aa0b5" />
          <circle cx="31" cy="171" r="8" fill="#f4e9d0" stroke="#cbb48f" strokeWidth="2.5" />
          <circle cx="90" cy="171" r="8" fill="#f4e9d0" stroke="#cbb48f" strokeWidth="2.5" />
          <circle cx="31" cy="171" r="2.6" fill="#9a8a66" />
          <circle cx="90" cy="171" r="2.6" fill="#9a8a66" />

          {/* tail fin tucked behind the lower body */}
          <path d="M84 110 q16 2 21 19 q-15 -1 -23 -7 Z" fill="#e07f4d" opacity="0.85" />

          {/* fin-feet planted on the deck */}
          <ellipse cx="49" cy="147" rx="12" ry="7" fill="#e88a55" />
          <ellipse cx="71" cy="147" rx="12" ry="7" fill="#e88a55" />

          {/* body */}
          <ellipse cx="60" cy="72" rx="30" ry="46" fill="url(#fishBody)" />
          <ellipse cx="60" cy="86" rx="18" ry="27" fill="#ffd9b8" opacity="0.5" />

          {/* tee torso */}
          <path
            d="M41 60 L79 60 L79 114 Q60 120 41 114 Z"
            fill="url(#fishTee)"
            stroke="#e0c9a6"
            strokeWidth="1.6"
          />
          {/* short sleeves — clearly bulge out past the shoulders */}
          <path
            d="M41 60 Q13 66 13 85 Q13 94 22 94 Q31 94 42 82 Z"
            fill="url(#fishTee)"
            stroke="#e0c9a6"
            strokeWidth="1.6"
          />
          <path
            d="M79 60 Q107 66 107 85 Q107 94 98 94 Q89 94 78 82 Z"
            fill="url(#fishTee)"
            stroke="#e0c9a6"
            strokeWidth="1.6"
          />
          {/* crew-neck collar */}
          <path d="M48 60 Q60 71 72 60" stroke="#d9c3a3" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          {/* hem line */}
          <path d="M42 111 Q60 117 78 111" stroke="#e0c9a6" strokeWidth="2" fill="none" opacity="0.7" />
          {/* little star print on the chest */}
          <path
            d="M60 74 l2.4 5.4 5.9 0.5 -4.5 3.9 1.4 5.8 -5.2 -3.1 -5.2 3.1 1.4 -5.8 -4.5 -3.9 5.9 -0.5 Z"
            fill="#e8795f"
            opacity="0.85"
          />

          {/* denim shorts */}
          <path
            d="M41 110 L79 110 L77 134 Q60 140 43 134 Z"
            fill="url(#fishShorts)"
            stroke="#3c5f8c"
            strokeWidth="1.4"
          />
          {/* waistband */}
          <rect x="40" y="108" width="40" height="8" rx="3.5" fill="#456a99" />
          {/* center seam + pocket stitches */}
          <path d="M60 116 L60 134" stroke="#cdddf0" strokeWidth="1.2" opacity="0.6" />
          <path d="M48 116 L52 116 M68 116 L72 116" stroke="#cdddf0" strokeWidth="1.2" opacity="0.5" />

          {/* little fin-hands peeking from the sleeve cuffs */}
          <ellipse cx="15" cy="87" rx="7" ry="5" fill="#e88a55" transform="rotate(62 15 87)" />
          <ellipse cx="105" cy="87" rx="7" ry="5" fill="#e88a55" transform="rotate(-62 105 87)" />

          {/* face */}
          <g>
            <circle cx="49" cy="44" r="8.5" fill="#fff8ec" />
            <circle cx="71" cy="44" r="8.5" fill="#fff8ec" />
            <circle cx="50.5" cy="45.5" r="4.4" fill="#3a2621" />
            <circle cx="72.5" cy="45.5" r="4.4" fill="#3a2621" />
            <circle cx="52" cy="43.6" r="1.5" fill="#fff8ec" />
            <circle cx="74" cy="43.6" r="1.5" fill="#fff8ec" />
            <ellipse cx="40" cy="56" rx="5" ry="3.4" fill="#f2a48a" opacity="0.5" />
            <ellipse cx="80" cy="56" rx="5" ry="3.4" fill="#f2a48a" opacity="0.5" />
            <path d="M48 58 Q60 68 72 58" stroke="#5a352d" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>

          {/* backwards denim cap */}
          <path d="M36 32 A24 24 0 0 1 84 32 Z" fill="url(#fishCap)" />
          <rect x="16" y="28" width="18" height="9" rx="4" fill="#4f769f" />
          <circle cx="60" cy="10" r="3" fill="#3f6286" />
        </svg>
      </Figure>
    </PopIn>
  );
}
