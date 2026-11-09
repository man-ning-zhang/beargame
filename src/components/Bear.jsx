import React, { useId, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { palette } from '../theme';

const breathe = keyframes`
  0%, 100% { transform: scale(1) translateY(0); }
  50% { transform: scale(1.018) translateY(-2px); }
`;

const hop = keyframes`
  0%, 100% { transform: translateY(0) rotate(0); }
  30% { transform: translateY(-12px) rotate(-2deg); }
  58% { transform: translateY(0) rotate(0); }
  72% { transform: translateY(-5px) rotate(1deg); }
`;

const wiggle = keyframes`
  0%, 100% { transform: rotate(0) translateY(0); }
  20% { transform: rotate(-5deg) translateY(-3px); }
  45% { transform: rotate(5deg) translateY(-1px); }
  70% { transform: rotate(-3deg) translateY(-2px); }
`;

const squish = keyframes`
  0%, 100% { transform: scale(1, 1); }
  35% { transform: scale(1.045, 0.95); }
  65% { transform: scale(0.98, 1.03); }
`;

const doze = keyframes`
  0%, 100% { transform: rotate(0) translateY(0); }
  50% { transform: rotate(-2.5deg) translateY(3px); }
`;

const floatHeart = keyframes`
  0% { opacity: 0; transform: translateY(8px) scale(0.6); }
  18% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-74px) scale(1.12) rotate(10deg); }
`;

const floatZ = keyframes`
  0% { opacity: 0; transform: translate(0, 6px) scale(0.8); }
  25% { opacity: 0.9; }
  100% { opacity: 0; transform: translate(12px, -28px) scale(1.2); }
`;

const Shell = styled.div`
  position: relative;
  width: min(300px, 86%);
  margin: 0 auto;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
`;

const PetButton = styled.button`
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 45%;
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.985);
  }

  &:focus-visible {
    outline: 3px solid ${palette.amber};
    outline-offset: 8px;
  }

  &:hover .bear-figure {
    filter: drop-shadow(0 18px 22px rgba(40, 20, 15, 0.22));
  }
`;

const FigureWrap = styled.div`
  position: relative;
  filter: drop-shadow(0 16px 20px rgba(40, 20, 15, 0.18));
  transition: filter 0.25s ease;

  .bear-figure {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .breathe {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    animation: ${breathe} 4.2s ease-in-out infinite;
  }

  &.is-feed .bear-figure {
    animation: ${hop} 0.7s ease-out;
  }

  &.is-play .bear-figure {
    animation: ${wiggle} 0.7s ease-in-out;
  }

  &.is-hug .bear-figure {
    animation: ${squish} 0.8s ease-in-out;
  }

  &.is-sleep .bear-figure {
    animation: ${doze} 1.5s ease-in-out;
  }

  &.is-pet .bear-figure {
    animation: ${hop} 0.5s ease-out;
  }

  .zzz {
    animation: ${floatZ} 2.4s ease-out infinite;
    transform-box: fill-box;
  }

  .zzz-two {
    animation-delay: 1.1s;
  }

  .tummy-rumble {
    animation: ${wiggle} 2.2s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: 50% 50%;
  }
`;

const Particles = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;

  span {
    position: absolute;
    font-size: ${(props) => props.$size || 18}px;
    animation: ${floatHeart} 1.45s ease-out forwards;
    opacity: 0;
    will-change: transform, opacity;
  }
`;

const POSITIONS = [
  { left: '18%', top: '46%', delay: '0s' },
  { left: '72%', top: '40%', delay: '0.08s' },
  { left: '30%', top: '32%', delay: '0.16s' },
  { left: '64%', top: '55%', delay: '0.04s' },
  { left: '46%', top: '28%', delay: '0.22s' },
];

const REACTION_ICONS = {
  feed: ['🍯', '✨', '🍯', '💛', '✨'],
  play: ['🧶', '✨', '💫', '🧶', '✨'],
  hug: ['💗', '💛', '💗', '✨', '💗'],
  sleep: ['💤', '✨', '💤', '🌙', '✨'],
  pet: ['💛', '✨', '💗', '✨', '💛'],
};

export default function Bear({ stats = {}, reaction = null, onPet = null, disabled = false }) {
  const uid = useId().replace(/:/g, '');
  const mood = stats.mood ?? 76;
  const fullness = stats.fullness ?? 72;
  const energy = stats.energy ?? 70;

  const sleeping = reaction?.type === 'sleep' || (energy < 20 && reaction?.type !== 'feed');
  const sad = !sleeping && mood < 38;
  const happy = !sleeping && mood >= 68;
  const hungry = !sleeping && fullness < 26;

  const icons = useMemo(() => REACTION_ICONS[reaction?.type] ?? null, [reaction?.type]);
  const figureClass = reaction?.type ? `is-${reaction.type}` : '';

  const eyes = () => {
    if (sleeping) {
      return (
        <g stroke="#3a2621" strokeWidth="4.6" strokeLinecap="round" fill="none">
          <path d="M 91 112 Q 103 121 115 112" />
          <path d="M 145 112 Q 157 121 169 112" />
        </g>
      );
    }
    if (happy) {
      return (
        <g stroke="#3a2621" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M 91 114 Q 103 101 115 114" />
          <path d="M 145 114 Q 157 101 169 114" />
        </g>
      );
    }
    return (
      <g>
        <ellipse cx="103" cy="112" rx="7.2" ry="8.4" fill="#3a2621" />
        <ellipse cx="157" cy="112" rx="7.2" ry="8.4" fill="#3a2621" />
        <circle cx="105.4" cy="109" r="2.5" fill="#fff8ec" opacity="0.95" />
        <circle cx="159.4" cy="109" r="2.5" fill="#fff8ec" opacity="0.95" />
        {sad && (
          <g stroke="#3a2621" strokeWidth="3.4" strokeLinecap="round" opacity="0.75">
            <path d="M 91 96 Q 103 91 114 97" />
            <path d="M 146 97 Q 157 91 169 96" />
          </g>
        )}
      </g>
    );
  };

  const mouth = () => {
    if (sleeping) {
      return (
        <ellipse cx="130" cy="158" rx="5.5" ry="6.5" fill="#5a352d">
          <animate attributeName="ry" values="4.4;6.6;4.4" dur="3.2s" repeatCount="indefinite" />
        </ellipse>
      );
    }
    if (happy) {
      return (
        <g>
          <path d="M 109 151 Q 130 176 151 151 Q 130 160 109 151 Z" fill="#5a352d" />
          <path d="M 120 161 Q 130 167 140 161 Q 130 172 120 161 Z" fill="#eb9b93" />
        </g>
      );
    }
    if (sad || hungry) {
      return (
        <g>
          <path
            d="M 115 163 Q 122 154 130 161 Q 138 168 145 159"
            stroke="#5a352d"
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="none"
          />
          {hungry && (
            <text x="197" y="242" fontSize="13" fill="#7c5a47" fontFamily="inherit" className="zzz">
              咕…
            </text>
          )}
        </g>
      );
    }
    return (
      <path
        d="M 118 156 Q 130 165 142 156"
        stroke="#5a352d"
        strokeWidth="3.6"
        strokeLinecap="round"
        fill="none"
      />
    );
  };

  const svg = (
    <svg
      className="bear-figure"
      viewBox="0 0 260 285"
      role="img"
      aria-label={onPet ? '摸摸小熊' : '一只毛茸茸的小熊'}
    >
      <defs>
        <radialGradient id={`fur-${uid}`} cx="34%" cy="22%" r="85%">
          <stop offset="0%" stopColor="#c9956b" />
          <stop offset="55%" stopColor="#b07c55" />
          <stop offset="100%" stopColor="#8f5d3d" />
        </radialGradient>
        <radialGradient id={`belly-${uid}`} cx="42%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fbe8ce" />
          <stop offset="100%" stopColor="#e8c9a6" />
        </radialGradient>
        <linearGradient id={`scarf-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e88a72" />
          <stop offset="100%" stopColor="#c95e49" />
        </linearGradient>
      </defs>

      <ellipse cx="130" cy="269" rx="77" ry="12" fill="rgba(31, 18, 26, 0.2)" />

      <g className="breathe">
        <circle cx="201" cy="231" r="18" fill="#a9744f" />
        <ellipse cx="96" cy="259" rx="29" ry="18" fill="#8f5d3d" />
        <ellipse cx="164" cy="259" rx="29" ry="18" fill="#8f5d3d" />
        <ellipse cx="96" cy="262" rx="18" ry="10" fill="#f2d6b8" opacity="0.55" />
        <ellipse cx="164" cy="262" rx="18" ry="10" fill="#f2d6b8" opacity="0.55" />

        <ellipse cx="130" cy="218" rx="73" ry="58" fill={`url(#fur-${uid})`} />
        <ellipse cx="130" cy="228" rx="46" ry="39" fill={`url(#belly-${uid})`} />
        <ellipse cx="62" cy="213" rx="20" ry="34" fill="#a9744f" transform="rotate(18 62 213)" />
        <ellipse cx="198" cy="213" rx="20" ry="34" fill="#a9744f" transform="rotate(-18 198 213)" />

        <g className={hungry ? 'tummy-rumble' : ''}>
          <path
            d="M 119 232 q 5 -5 11 0 q 6 5 11 0"
            stroke="#cc9f78"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            opacity="0.55"
          />
        </g>

        <circle cx="68" cy="72" r="26" fill="#8f5d3d" />
        <circle cx="68" cy="72" r="14" fill="#e7b39a" />
        <circle cx="192" cy="72" r="26" fill="#8f5d3d" />
        <circle cx="192" cy="72" r="14" fill="#e7b39a" />

        <circle cx="130" cy="121" r="72" fill={`url(#fur-${uid})`} />
        <path
          d="M 111 53 q 8 -10 18 -3 q 9 -9 19 1"
          stroke="#b07c55"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity="0.55"
        />

        <ellipse cx="130" cy="146" rx="41" ry="30" fill="#f6ddc1" />
        <ellipse cx="88" cy="144" rx="13" ry="8" fill="#e78f7d" opacity="0.32" />
        <ellipse cx="172" cy="144" rx="13" ry="8" fill="#e78f7d" opacity="0.32" />

        {eyes()}

        <ellipse cx="130" cy="137" rx="10.5" ry="7.4" fill="#3a2621" />
        <ellipse cx="127" cy="134.6" rx="3.2" ry="2.1" fill="#fff8ec" opacity="0.65" />

        {mouth()}

        <path
          d="M 82 178 Q 130 198 178 178 L 174 192 Q 130 213 86 192 Z"
          fill={`url(#scarf-${uid})`}
        />
        <path d="M 82 178 Q 130 198 178 178" stroke="#f4b7a4" strokeWidth="3" fill="none" opacity="0.55" />
        <g transform="translate(130 196)">
          <path
            d="M 0 8 C -9 -1, -15 -7, -9 -13 C -4 -18, 0 -13, 0 -10 C 0 -13, 4 -18, 9 -13 C 15 -7, 9 -1, 0 8 Z"
            fill="#f1b94f"
          />
        </g>

        {happy && (
          <g fill="#ffe1a1" opacity="0.9">
            <path d="M 38 96 l 2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 Z" />
            <path d="M 226 118 l 2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" />
          </g>
        )}

        {sleeping && (
          <g fill="#fff8ec" fontFamily="inherit" fontWeight="600" opacity="0.9">
            <text x="198" y="74" fontSize="18" className="zzz">
              z
            </text>
            <text x="214" y="54" fontSize="22" className="zzz zzz-two">
              Z
            </text>
          </g>
        )}
      </g>
    </svg>
  );

  return (
    <Shell>
      <PetButton
        type="button"
        onClick={onPet || undefined}
        disabled={!onPet || disabled}
        aria-label={onPet ? '摸摸小熊' : undefined}
        style={!onPet ? { cursor: 'default' } : undefined}
      >
        <FigureWrap key={reaction?.id ?? 'idle'} className={figureClass}>
          {svg}
        </FigureWrap>
      </PetButton>
      {icons && (
        <Particles $size={reaction?.type === 'sleep' ? 20 : 18} aria-hidden="true">
          {icons.map((icon, index) => {
            const position = POSITIONS[index % POSITIONS.length];
            return (
              <span
                key={`${icon}-${index}`}
                style={{
                  left: position.left,
                  top: position.top,
                  animationDelay: position.delay,
                }}
              >
                {icon}
              </span>
            );
          })}
        </Particles>
      )}
    </Shell>
  );
}
