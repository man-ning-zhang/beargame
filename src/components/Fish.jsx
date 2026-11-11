import React, { useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { palette } from '../theme';
import { useI18n } from '../context/LanguageContext';
import { playSound } from '../utils/sound';
import {
  DATE_BY_ID,
  DEFAULT_ROOM,
  PEEK_LINES,
  buildDateMenu,
  buildGestureMenu,
  dateProgression,
  momentLine,
  periodKey,
  pickRandom,
  roomForDate,
} from '../utils/dateCatalog';
import { outfitFor } from '../utils/wardrobe';
import { FishClothes, FishHat } from './OutfitArt';

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

const floatUp = keyframes`
  0% { opacity: 0; transform: translateY(0) scale(0.7); }
  18% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-96px) scale(1.15); }
`;

const PopIn = styled.div`
  position: absolute;
  left: ${(props) => (props.$date ? '26%' : '6%')};
  bottom: 1.5%;
  width: clamp(88px, 13%, 134px);
  z-index: ${(props) => (props.$date ? 6 : 5)};
  transform: translateX(${(props) => (props.$shown ? '0%' : '-185%')});
  transition:
    transform ${(props) => (props.$reduce ? 0.25 : 1.9)}s cubic-bezier(0.22, 0.8, 0.3, 1),
    left ${(props) => (props.$reduce ? 0.25 : 1.9)}s cubic-bezier(0.22, 0.8, 0.3, 1);
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

const Hearts = styled.div`
  position: absolute;
  left: 40%;
  top: 0;
  z-index: 8;
  pointer-events: none;

  span {
    position: absolute;
    font-size: 16px;
    opacity: 0;
    animation: ${floatUp} 1.5s ease-out forwards;
  }
`;

const HEART_SPOTS = [
  { left: 6, top: 30, delay: 0 },
  { left: 40, top: 12, delay: 0.12 },
  { left: 70, top: 38, delay: 0.05 },
  { left: 22, top: 0, delay: 0.2 },
  { left: 56, top: 22, delay: 0.28 },
];

/* A date plays out over three little beats before Fishy rolls home. */
const DATE_MS = 8000;

const propFloat = keyframes`
  0% { opacity: 0; transform: translateY(12px) scale(0.72) rotate(-8deg); }
  22% { opacity: 1; }
  78% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-64px) scale(1.16) rotate(8deg); }
`;

const DateProp = styled.div`
  position: absolute;
  left: 6%;
  bottom: 76%;
  z-index: 8;
  font-size: 30px;
  pointer-events: none;
  filter: drop-shadow(0 6px 10px rgba(20, 12, 20, 0.4));
  animation: ${propFloat} 2.6s ease-out both;
`;

const Suggested = styled.span`
  color: ${palette.amber};
  font-size: 9.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 148px;
`;

const Dock = styled.div`
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 9;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px 10px;
  border-radius: 16px;
  background: rgba(24, 19, 34, 0.72);
  border: 1px solid rgba(255, 248, 236, 0.14);
  backdrop-filter: blur(12px);
  box-shadow: 0 16px 30px -16px rgba(10, 8, 15, 0.65);
`;

const DockRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const DockLabel = styled.span`
  color: rgba(255, 248, 236, 0.55);
  font-size: 9.5px;
  letter-spacing: 0.05em;
  white-space: nowrap;
  margin-right: 2px;
`;

const DockBtn = styled.button`
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 50%;
  border: 1px solid rgba(255, 248, 236, 0.16);
  background: rgba(255, 248, 236, 0.08);
  font-size: 14px;
  cursor: pointer;
  position: relative;
  transition: background 0.15s ease, transform 0.15s ease;

  em {
    position: absolute;
    right: -2px;
    bottom: -3px;
    font-style: normal;
    font-size: 8px;
    color: #ffd9a3;
    background: rgba(24, 19, 34, 0.9);
    border-radius: 6px;
    padding: 0 3px;
  }

  ${(props) =>
    props.$suggested &&
    css`
      border-color: rgba(241, 185, 79, 0.7);
      background: rgba(241, 185, 79, 0.2);
      box-shadow: 0 0 0 2px rgba(241, 185, 79, 0.14);
    `}

  &:hover:not(:disabled) {
    background: rgba(255, 248, 236, 0.18);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid rgba(241, 185, 79, 0.6);
    outline-offset: 2px;
  }
`;

export default function Fish({
  onKnock = null,
  onAction = null,
  cooldowns = {},
  clockOffset = 0,
  connected = true,
  period = 'night',
  roomId = DEFAULT_ROOM,
  onRoomChange = null,
  outfitId = 'skater',
  busy = false,
}) {
  const { t } = useI18n();
  const outfit = React.useMemo(() => outfitFor('fish', outfitId), [outfitId]);
  const [shown, setShown] = useState(false);
  const [phase, setPhase] = useState('hidden');
  const [peekLine, setPeekLine] = useState(null);
  const [waving, setWaving] = useState(false);
  const [dating, setDating] = useState(null);
  const [dateLines, setDateLines] = useState(null);
  const [dateStage, setDateStage] = useState(0);
  const [cheer, setCheer] = useState(null);
  const [hearts, setHearts] = useState(0);
  const [now, setNow] = useState(() => Date.now() + clockOffset);
  const [visitId, setVisitId] = useState(0);
  const [gestureMenu, setGestureMenu] = useState(() => buildGestureMenu());
  const [dateMenu, setDateMenu] = useState(() => buildDateMenu({ period, roomId }));
  const [idleLine, setIdleLine] = useState(null);
  const waveTimer = useRef(null);
  const dateTimers = useRef([]);
  const cheerTimer = useRef(null);
  const datingRef = useRef(null);
  const periodRef = useRef(period);

  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  useEffect(() => {
    setNow(Date.now() + clockOffset);
    const timer = window.setInterval(() => setNow(Date.now() + clockOffset), 500);
    return () => window.clearInterval(timer);
  }, [clockOffset]);

  // Every visit reshuffles the dock. The hour and the room weight the draw,
  // and actions still on cooldown are held back when there is a choice.
  useEffect(() => {
    if (!visitId) return;
    const ready = (id) => (cooldowns[id] ?? 0) <= Date.now() + clockOffset;
    setGestureMenu(buildGestureMenu());
    setDateMenu(buildDateMenu({ period, roomId, ready }));
    // Cooldowns are read once per visit on purpose, not on every state push.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId, period, roomId]);

  const dockVisible = shown && phase === 'idle' && !dating && connected;

  // While Fishy hangs around he occasionally murmurs something about the hour.
  useEffect(() => {
    if (!dockVisible) return undefined;
    let appear;
    let clear;
    const schedule = () => {
      appear = window.setTimeout(() => {
        setIdleLine(momentLine(periodRef.current));
        clear = window.setTimeout(() => {
          setIdleLine(null);
          schedule();
        }, 3600);
      }, randomBetween(9000, 16000));
    };
    schedule();
    return () => {
      window.clearTimeout(appear);
      window.clearTimeout(clear);
    };
  }, [dockVisible, visitId]);

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
        setPeekLine(Math.random() < 0.62 ? momentLine(periodRef.current) : pickRandom(PEEK_LINES));
        await sleep(2600);
        if (!alive) return;

        // Fishy stays for a while so the two of you can play with him.
        setPeekLine(null);
        setPhase('idle');
        setVisitId((count) => count + 1);
        await sleep(randomBetween(40000, 70000));
        if (!alive) return;

        // Wait for an ongoing date to finish, linger a moment, then slide home.
        while (alive && datingRef.current) {
          await sleep(400);
        }
        if (!alive) return;
        await sleep(4000);
        if (!alive) return;

        setPhase('leave');
        setShown(false);
        await sleep(prefersReducedMotion ? 250 : 1700);
        if (!alive) return;

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

  useEffect(
    () => () => {
      clearTimeout(waveTimer.current);
      dateTimers.current.forEach(clearTimeout);
      clearTimeout(cheerTimer.current);
    },
    [],
  );

  const cooldownSeconds = (id) => {
    const readyAt = cooldowns?.[id] ?? 0;
    const remaining = readyAt - now;
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  };

  const burstHearts = () => setHearts((n) => n + 1);

  const waveBriefly = () => {
    setWaving(true);
    clearTimeout(waveTimer.current);
    waveTimer.current = setTimeout(() => setWaving(false), 700);
  };

  const handleClick = () => {
    if (!shown || dating) return;
    waveBriefly();
  };

  const handleAction = (item) => {
    if (!shown || dating || !connected || busy) return;
    if (cooldownSeconds(item.id) > 0) return;

    if (DATE_BY_ID[item.id]) {
      // A date has three beats, and the pair heads to the room it belongs in.
      setDating(item.id);
      datingRef.current = item.id;
      setDateLines(dateProgression(item.id));
      setDateStage(0);
      setIdleLine(null);
      burstHearts();
      playSound('play');
      dateTimers.current.forEach(clearTimeout);
      dateTimers.current = [
        window.setTimeout(() => setDateStage(1), 3000),
        window.setTimeout(() => setDateStage(2), 5800),
        window.setTimeout(() => {
          setDating(null);
          datingRef.current = null;
          setDateLines(null);
        }, DATE_MS),
      ];
      const target = roomForDate(item.id, roomId);
      if (target !== roomId && onRoomChange) onRoomChange(target);
    } else {
      setCheer(item.id);
      burstHearts();
      waveBriefly();
      playSound('hug');
      clearTimeout(cheerTimer.current);
      cheerTimer.current = setTimeout(() => setCheer(null), 2600);
    }

    onAction && onAction(item.id);
  };

  const line = dating
    ? dateLines?.[dateStage] ?? `fish.dateLine.${dating}`
    : cheer
      ? `fish.gestureLine.${cheer}`
      : peekLine ?? (dockVisible ? idleLine : null);

  const dockButton = (item, suggested = false) => {
    const cooling = cooldownSeconds(item.id);
    const label = busy
      ? t('activity.busyButton')
      : cooling > 0
        ? t('care.cooldownTitle', { seconds: cooling })
        : t(`fish.${item.id}`);
    return (
      <DockBtn
        key={item.id}
        type="button"
        $suggested={suggested}
        disabled={cooling > 0 || busy}
        title={label}
        aria-label={suggested ? `${t('fish.suggested')} ${label}` : label}
        onClick={() => handleAction(item)}
      >
        <span aria-hidden="true">{item.icon}</span>
        {cooling > 0 && <em>{cooling}</em>}
      </DockBtn>
    );
  };

  return (
    <PopIn
      $shown={shown}
      $reduce={prefersReducedMotion}
      $date={Boolean(dating)}
      onClick={handleClick}
      role="img"
      aria-label={t('fish.name')}
    >
      {dockVisible && (
        <Dock onClick={(event) => event.stopPropagation()}>
          <DockRow>
            <DockLabel>{t(periodKey(period))}</DockLabel>
            {dateMenu.suggested && (
              <Suggested>
                {t('fish.suggested')} {t(`fish.${dateMenu.suggested}`)}
              </Suggested>
            )}
          </DockRow>
          <DockRow>
            <DockLabel>{t('fish.gestureLabel')}</DockLabel>
            {gestureMenu.map((item) => dockButton(item))}
          </DockRow>
          <DockRow>
            <DockLabel>{t('fish.dateLabel')}</DockLabel>
            {dateMenu.items.map((item) => dockButton(item, item.id === dateMenu.suggested))}
          </DockRow>
        </Dock>
      )}

      {dating && (
        <DateProp key={`${dating}-${dateStage}`} aria-hidden="true">
          {DATE_BY_ID[dating]?.prop ?? '💗'}
        </DateProp>
      )}

      {line && <Bubble key={line}>{t(line)}</Bubble>}
      {waving && <Wave aria-hidden="true">👋</Wave>}
      {hearts > 0 && (
        <Hearts key={hearts} aria-hidden="true">
          {HEART_SPOTS.map((spot, index) => (
            <span
              key={index}
              style={{
                left: spot.left,
                top: spot.top,
                animationDelay: `${spot.delay}s`,
              }}
            >
              {dating && index % 2 === 0 ? DATE_BY_ID[dating]?.prop ?? '💗' : '💗'}
            </span>
          ))}
        </Hearts>
      )}
      <Figure $phase={phase} $wave={waving}>
        <svg viewBox="0 0 120 192" aria-hidden="true">
          <defs>
            <radialGradient id="fishBody" cx="36%" cy="24%" r="82%">
              <stop offset="0%" stopColor="#f7b083" />
              <stop offset="58%" stopColor="#f0915f" />
              <stop offset="100%" stopColor="#d9703f" />
            </radialGradient>
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

          {/* the current outfit: tee / shirt, shorts / trousers, apron or bow tie */}
          <FishClothes outfit={outfit} />

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

          {/* whichever hat belongs to this outfit */}
          <FishHat hat={outfit.hat} />
        </svg>
      </Figure>
    </PopIn>
  );
}
