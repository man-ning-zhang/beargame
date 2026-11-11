import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import Bear from './Bear';
import Fish from './Fish';
import { breakpoints, palette, shadows } from '../theme';
import { useI18n } from '../context/LanguageContext';

const twinkle = keyframes`
  0%, 100% { opacity: 0.25; }
  50% { opacity: 1; }
`;

const bubbleIn = keyframes`
  0% { opacity: 0; transform: translate(-50%, 8px) scale(0.94); }
  100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
`;

const bulbGlow = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
`;

const SceneCard = styled.section`
  position: relative;
  height: clamp(390px, 45vw, 500px);
  border-radius: 32px;
  overflow: hidden;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(255, 218, 166, 0.14), transparent 58%),
    linear-gradient(180deg, #4b3a5d 0%, #3c304d 52%, #2b2238 100%);
  box-shadow: ${shadows.card};
  border: 1px solid rgba(255, 248, 236, 0.1);
  isolation: isolate;

  @media (max-width: ${breakpoints.medium}) {
    height: 420px;
    border-radius: 26px;
  }
`;

const WallGlow = styled.div`
  position: absolute;
  inset: 0;
  background:
    radial-gradient(60% 45% at 50% 44%, rgba(255, 214, 150, 0.13), transparent 70%),
    radial-gradient(70% 55% at 15% 100%, rgba(0, 0, 0, 0.24), transparent 70%);
  pointer-events: none;
`;

const Window = styled.div`
  position: absolute;
  left: 50%;
  top: 9%;
  width: 58%;
  height: 63%;
  transform: translateX(-50%);
  border-radius: 150px 150px 16px 16px;
  border: 9px solid rgba(255, 246, 230, 0.88);
  background: #1a223c;
  box-shadow:
    0 0 0 4px rgba(80, 56, 68, 0.22),
    0 24px 60px -20px rgba(0, 0, 0, 0.8),
    inset 0 0 50px rgba(0, 0, 0, 0.4);
  overflow: hidden;

  @media (max-width: ${breakpoints.medium}) {
    width: 70%;
    height: 60%;
    top: 10%;
    border-width: 7px;
  }
`;

const Sky = styled.div`
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 60% 0%, rgba(255, 210, 148, 0.1), transparent 55%),
    linear-gradient(180deg, #131a33 0%, #273054 46%, #7b5a76 74%, #c8816d 100%);
`;

const Moon = styled.div`
  position: absolute;
  top: 16%;
  right: 17%;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, #fff8e4, #f4dba6 58%, #e4bd7a 100%);
  box-shadow:
    0 0 24px rgba(255, 231, 176, 0.55),
    0 0 70px rgba(255, 220, 150, 0.28);

  @media (max-width: ${breakpoints.medium}) {
    width: 44px;
    height: 44px;
  }
`;

const Star = styled.span`
  position: absolute;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 50%;
  background: #fff4da;
  box-shadow: 0 0 ${(props) => props.$size * 3}px rgba(255, 244, 218, 0.7);
  animation: ${twinkle} ${(props) => props.$dur}s ease-in-out infinite;
  animation-delay: ${(props) => props.$delay}s;
`;

const Hills = styled.div`
  position: absolute;
  left: -10%;
  right: -10%;
  bottom: -12%;
  height: 46%;
`;

const HillBack = styled.div`
  position: absolute;
  left: 4%;
  right: -8%;
  bottom: 8%;
  height: 76%;
  border-radius: 50% 50% 0 0;
  background: #2c2a47;
  opacity: 0.9;
`;

const HillFront = styled.div`
  position: absolute;
  left: -12%;
  right: 18%;
  bottom: -8%;
  height: 64%;
  border-radius: 50% 50% 0 0;
  background: #202039;
`;

const WindowBarV = styled.div`
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 4px;
  transform: translateX(-50%);
  background: rgba(255, 246, 230, 0.72);
  box-shadow: 0 0 0 1px rgba(70, 45, 55, 0.12);
`;

const WindowBarH = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 56%;
  height: 4px;
  background: rgba(255, 246, 230, 0.72);
  box-shadow: 0 0 0 1px rgba(70, 45, 55, 0.12);
`;

const Sill = styled.div`
  position: absolute;
  left: 50%;
  top: 70.4%;
  width: 64%;
  height: 13px;
  transform: translateX(-50%);
  border-radius: 7px;
  background: linear-gradient(180deg, #fdf2df, #dfc8a9);
  box-shadow: 0 8px 16px rgba(20, 12, 20, 0.28);

  @media (max-width: ${breakpoints.medium}) {
    width: 76%;
  }
`;

const Lights = styled.svg`
  position: absolute;
  top: -2px;
  left: 0;
  width: 100%;
  height: 76px;
  overflow: visible;
  pointer-events: none;
`;

const Bulb = styled.circle`
  animation: ${bulbGlow} ${(props) => props.$dur}s ease-in-out infinite;
  animation-delay: ${(props) => props.$delay}s;
`;

const Floor = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 27%;
  background:
    linear-gradient(180deg, rgba(34, 22, 32, 0.2), rgba(20, 13, 22, 0.1)),
    repeating-linear-gradient(90deg, #5a414a 0 84px, #553d46 84px 86px),
    #5a414a;
  box-shadow: inset 0 14px 28px rgba(20, 12, 20, 0.22);
`;

const Rug = styled.div`
  position: absolute;
  left: 50%;
  bottom: 3.5%;
  width: 68%;
  height: 54px;
  transform: translateX(-50%);
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 50% 40%, rgba(255, 179, 136, 0.3), transparent 62%),
    linear-gradient(180deg, #8b5c58, #6e474b);
  border: 2px solid rgba(255, 220, 190, 0.18);
  box-shadow: 0 18px 26px -18px rgba(0, 0, 0, 0.7);
`;

const Plant = styled.svg`
  position: absolute;
  left: 4.5%;
  bottom: 7%;
  width: 92px;
  height: 128px;
  z-index: 2;
  opacity: 0.95;

  @media (max-width: ${breakpoints.medium}) {
    width: 70px;
    height: 100px;
    left: 2%;
  }
`;

const Books = styled.div`
  position: absolute;
  right: 5%;
  bottom: 8%;
  z-index: 2;
  display: flex;
  flex-direction: column-reverse;
  gap: 3px;
  transform: rotate(-2deg);

  span {
    display: block;
    height: 10px;
    border-radius: 3px;
    box-shadow: 0 3px 5px rgba(0, 0, 0, 0.25);
  }

  span:nth-child(1) {
    width: 58px;
    background: #b96b5e;
  }
  span:nth-child(2) {
    width: 48px;
    background: #d8b06f;
  }
  span:nth-child(3) {
    width: 54px;
    background: #79968f;
  }

  @media (max-width: ${breakpoints.medium}) {
    right: 3%;
    bottom: 6%;
    span {
      height: 8px;
    }
    span:nth-child(1) {
      width: 44px;
    }
    span:nth-child(2) {
      width: 38px;
    }
    span:nth-child(3) {
      width: 42px;
    }
  }
`;

const knockShake = keyframes`
  0%, 100% { transform: translateX(0) rotate(0); }
  20% { transform: translateX(-2px) rotate(-0.6deg); }
  40% { transform: translateX(2px) rotate(0.6deg); }
  60% { transform: translateX(-1.5px) rotate(-0.4deg); }
  80% { transform: translateX(1.5px) rotate(0.4deg); }
`;

const Door = styled.div`
  position: absolute;
  left: 5.5%;
  top: 30%;
  width: 13.5%;
  height: 43%;
  z-index: 1;
  border-radius: 8px 8px 3px 3px;
  background: linear-gradient(180deg, #6e4a39, #573829);
  border: 2px solid rgba(40, 24, 18, 0.5);
  box-shadow:
    inset 0 0 0 3px rgba(255, 235, 210, 0.06),
    inset 0 10px 22px rgba(0, 0, 0, 0.32),
    0 12px 20px -12px rgba(0, 0, 0, 0.55);
  transform-origin: left center;

  &::before {
    content: '';
    position: absolute;
    left: 13%;
    right: 13%;
    top: 9%;
    height: 33%;
    border-radius: 5px;
    background: linear-gradient(180deg, #7a5544, #5c3c2e);
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.32);
  }

  &::after {
    content: '';
    position: absolute;
    left: 13%;
    right: 13%;
    bottom: 8%;
    height: 34%;
    border-radius: 5px;
    background: linear-gradient(180deg, #7a5544, #5c3c2e);
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.32);
  }

  &.is-knocking {
    animation: ${knockShake} 0.22s ease-in-out;
  }
`;

const Knob = styled.div`
  position: absolute;
  right: 13%;
  top: 51%;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffe2a6, #c79f4c);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
`;

const BondPill = styled.div`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  border-radius: 999px;
  background: rgba(24, 19, 34, 0.52);
  border: 1px solid rgba(255, 248, 236, 0.14);
  backdrop-filter: blur(12px);
  color: rgba(255, 248, 236, 0.9);
  font-size: 11.5px;

  strong {
    font-size: 12px;
    color: ${palette.amber};
  }

  span.level {
    color: rgba(255, 248, 236, 0.5);
    font-size: 10px;
    letter-spacing: 0.08em;
  }

  @media (max-width: ${breakpoints.small}) {
    top: 12px;
    left: 12px;
    padding: 7px 11px;
  }
`;

const Together = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border-radius: 999px;
  background: ${(props) => (props.$together ? 'rgba(241, 185, 79, 0.16)' : 'rgba(24, 19, 34, 0.45)')};
  border: 1px solid ${(props) => (props.$together ? 'rgba(241, 185, 79, 0.3)' : 'rgba(255, 248, 236, 0.1)')};
  backdrop-filter: blur(12px);
  color: ${(props) => (props.$together ? '#ffe0a3' : 'rgba(255, 248, 236, 0.55)')};
  font-size: 10.5px;
  letter-spacing: 0.03em;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 8px currentColor;
  }

  @media (max-width: ${breakpoints.small}) {
    top: 12px;
    right: 12px;
    padding: 7px 10px;
  }
`;

const BearSpot = styled.div`
  position: absolute;
  left: 50%;
  bottom: 2%;
  transform: translateX(-50%);
  width: min(330px, 64%);
  z-index: 4;

  @media (max-width: ${breakpoints.medium}) {
    width: min(285px, 72%);
    bottom: 1%;
  }
`;

const Bubble = styled.div`
  position: absolute;
  left: 50%;
  top: 18%;
  z-index: 8;
  min-width: 92px;
  max-width: min(250px, 62%);
  padding: 11px 15px 12px;
  border-radius: 17px;
  background: rgba(255, 250, 242, 0.98);
  color: ${palette.ink};
  box-shadow: 0 16px 30px -16px rgba(10, 8, 15, 0.6);
  animation: ${bubbleIn} 0.28s ease-out both;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -6px;
    width: 13px;
    height: 13px;
    transform: translateX(-50%) rotate(45deg);
    border-radius: 2px;
    background: inherit;
  }

  .bubble-name {
    display: block;
    margin-bottom: 3px;
    color: ${palette.coralDeep};
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .bubble-text {
    display: block;
    font-size: 12.5px;
    line-height: 1.55;
    word-break: break-word;
  }

  .bubble-emote {
    display: block;
    font-size: 30px;
    line-height: 1.2;
    text-align: center;
  }

  @media (max-width: ${breakpoints.small}) {
    top: 16%;
    max-width: 68%;
    padding: 9px 12px 10px;
    .bubble-text {
      font-size: 11.5px;
    }
  }
`;

const Hint = styled.div`
  position: absolute;
  right: 14px;
  bottom: 10px;
  z-index: 6;
  color: rgba(255, 248, 236, 0.36);
  font-size: 10px;
  letter-spacing: 0.04em;
  pointer-events: none;

  @media (max-width: ${breakpoints.small}) {
    display: none;
  }
`;

const MoodNote = styled.div`
  position: absolute;
  left: 16px;
  bottom: 12px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgba(255, 248, 236, 0.5);
  font-size: 10.5px;
  pointer-events: none;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${(props) => props.$color};
    box-shadow: 0 0 8px ${(props) => props.$color};
  }

  @media (max-width: ${breakpoints.small}) {
    left: 12px;
  }
`;

const STARS = [
  { left: '14%', top: '18%', size: 2.6, dur: 4.2, delay: 0.2 },
  { left: '27%', top: '34%', size: 1.7, dur: 3.4, delay: 1.1 },
  { left: '38%', top: '12%', size: 2.2, dur: 5.1, delay: 0.7 },
  { left: '47%', top: '44%', size: 1.5, dur: 4.6, delay: 1.9 },
  { left: '58%', top: '20%', size: 2.4, dur: 3.8, delay: 0.4 },
  { left: '72%', top: '42%', size: 1.6, dur: 4.9, delay: 1.4 },
  { left: '83%', top: '16%', size: 2.1, dur: 4.1, delay: 2.2 },
  { left: '21%', top: '52%', size: 1.4, dur: 3.6, delay: 0.9 },
  { left: '64%', top: '55%', size: 1.8, dur: 5.4, delay: 2.6 },
  { left: '78%', top: '66%', size: 1.5, dur: 3.9, delay: 1.2 },
  { left: '9%', top: '38%', size: 1.9, dur: 4.4, delay: 0.6 },
  { left: '91%', top: '48%', size: 1.4, dur: 4.8, delay: 1.7 },
];

const BULBS = [
  { x: 40, y: 24, delay: 0.1 },
  { x: 108, y: 40, delay: 0.6 },
  { x: 176, y: 31, delay: 1.1 },
  { x: 244, y: 47, delay: 0.3 },
  { x: 312, y: 55, delay: 0.9 },
  { x: 380, y: 47, delay: 1.5 },
  { x: 448, y: 30, delay: 0.5 },
  { x: 516, y: 40, delay: 1.2 },
  { x: 580, y: 23, delay: 0.2 },
];

function moodCopy(mood) {
  if (mood >= 80) return { key: 'scene.mood.high', color: '#f1b94f' };
  if (mood >= 55) return { key: 'scene.mood.good', color: '#7fae8b' };
  if (mood >= 30) return { key: 'scene.mood.low', color: '#e8a06a' };
  return { key: 'scene.mood.sad', color: '#e8795f' };
}

export default function Scene({ room, me, bubble, reaction, onPet, connected }) {
  const { t } = useI18n();
  const mood = moodCopy(room.stats.mood);
  const bubbleIsMine = bubble?.seat === me;

  const [knock, setKnock] = useState(false);
  const knockTimer = useRef(null);
  const handleKnock = useCallback(() => {
    setKnock(true);
    clearTimeout(knockTimer.current);
    knockTimer.current = setTimeout(() => setKnock(false), 220);
  }, []);
  useEffect(() => () => clearTimeout(knockTimer.current), []);

  return (
    <SceneCard>
      <WallGlow />

      <Window>
        <Sky>
          <Moon />
          {STARS.map((star, index) => (
            <Star
              key={index}
              $size={star.size}
              $dur={star.dur}
              $delay={star.delay}
              style={{ left: star.left, top: star.top }}
            />
          ))}
          <Hills>
            <HillBack />
            <HillFront />
          </Hills>
        </Sky>
        <WindowBarV />
        <WindowBarH />
      </Window>
      <Sill />

      <Lights viewBox="0 0 600 80" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0 18 Q 80 58 160 32 T 320 44 T 480 30 T 600 38"
          fill="none"
          stroke="rgba(255, 241, 214, 0.36)"
          strokeWidth="1.4"
        />
        {BULBS.map((bulb, index) => (
          <g key={index}>
            <Bulb
              cx={bulb.x}
              cy={bulb.y}
              r="9"
              fill="rgba(241, 185, 79, 0.12)"
              $dur={3 + (index % 3)}
              $delay={bulb.delay}
            />
            <circle cx={bulb.x} cy={bulb.y} r="3.2" fill="#ffe2a6" />
          </g>
        ))}
      </Lights>

      <Floor />
      <Rug />

      <Plant viewBox="0 0 100 140" aria-hidden="true">
        <ellipse cx="50" cy="132" rx="27" ry="5" fill="rgba(0,0,0,0.22)" />
        <path d="M34 92 h32 l-5 38 q-11 6 -22 0 Z" fill="#b7745f" />
        <path d="M34 92 h32 l-2 9 H36 Z" fill="#cf8b72" />
        <path d="M50 92 V58" stroke="#5e7a5a" strokeWidth="3" strokeLinecap="round" />
        <path d="M50 73 Q 28 68 24 50 Q 44 48 50 66" fill="#698b64" />
        <path d="M50 63 Q 71 55 77 38 Q 56 39 50 56" fill="#7c9e73" />
        <path d="M50 83 Q 33 80 28 68 Q 44 67 50 78" fill="#5d7c59" />
        <path d="M50 54 Q 52 36 66 28 Q 70 46 54 54" fill="#8cac80" />
      </Plant>

      <Books aria-hidden="true">
        <span />
        <span />
        <span />
      </Books>

      <Door className={knock ? 'is-knocking' : ''} aria-hidden="true">
        <Knob />
      </Door>

      <BondPill>
        <span aria-hidden="true">❤️</span>
        <strong>{t(`bond.level.${room.bond.level}`)}</strong>
        <span className="level">{t('bond.short', { level: room.bond.level })}</span>
      </BondPill>

      <Together $together={room.together}>
        {room.players.guest && room.players.host
          ? room.together
            ? t('scene.together')
            : t('scene.waitingBack')
          : t('scene.waitingIn')}
      </Together>

      {bubble && (
        <Bubble key={bubble.id}>
          <span className="bubble-name">
            {bubbleIsMine ? t('scene.bubbleYou') : bubble.name}
          </span>
          {bubble.emote ? (
            <span className="bubble-emote" aria-hidden="true">
              {bubble.emote}
            </span>
          ) : (
            <span className="bubble-text">
              {bubble.text || (bubble.music ? t('scene.sharedSong') : '')}
            </span>
          )}
        </Bubble>
      )}

      <BearSpot>
        <Bear stats={room.stats} reaction={reaction} onPet={onPet} disabled={!connected} />
      </BearSpot>

      <Fish onKnock={handleKnock} />

      <MoodNote $color={mood.color}>{t(mood.key)}</MoodNote>
      <Hint>{t('scene.hint')}</Hint>
    </SceneCard>
  );
}
