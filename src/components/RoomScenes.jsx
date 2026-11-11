import React from 'react';
import styled, { keyframes } from 'styled-components';
import { breakpoints, palette, shadows } from '../theme';
import { useI18n } from '../context/LanguageContext';
import { ROOMS, periodKey } from '../utils/dateCatalog';

/* ------------------------------------------------------------------ palettes */

export const SKY_STOPS = {
  dawn: ['#46406e', '#8a5f7e', '#d98a6a', '#f2b47e'],
  morning: ['#7fb4d9', '#a8cfe4', '#d8d3ae', '#ead9b8'],
  noon: ['#5aa7e0', '#8ec8ee', '#b8ddef', '#d5ecf2'],
  afternoon: ['#6f9fd0', '#c99a6f', '#e8b077', '#f0c184'],
  night: ['#131a33', '#273054', '#7b5a76', '#c8816d'],
};

const LIGHT = {
  dawn: { wallTop: '#65506d', wallBottom: '#433550', floor: '#5a4050', lamp: 0.72, tint: 'rgba(255,186,142,0.20)' },
  morning: { wallTop: '#656b84', wallBottom: '#484c66', floor: '#5b5060', lamp: 0.22, tint: 'rgba(255,229,186,0.14)' },
  noon: { wallTop: '#6a7691', wallBottom: '#49536d', floor: '#5d5266', lamp: 0.12, tint: 'rgba(255,244,214,0.12)' },
  afternoon: { wallTop: '#755a68', wallBottom: '#4d3a4d', floor: '#634450', lamp: 0.48, tint: 'rgba(255,188,130,0.22)' },
  night: { wallTop: '#4b3a5d', wallBottom: '#2b2238', floor: '#463348', lamp: 1, tint: 'rgba(255,205,142,0.28)' },
};

const SUN_POS = {
  dawn: { x: 220, y: 300 },
  morning: { x: 215, y: 105 },
  noon: { x: 400, y: 68 },
  afternoon: { x: 640, y: 165 },
  night: null,
};

const STARS = [
  [70, 60, 2.2, 0], [140, 110, 1.6, 0.7], [205, 48, 2, 1.4], [270, 130, 1.4, 0.3],
  [330, 70, 2.4, 1.1], [395, 36, 1.5, 0.5], [455, 118, 2, 1.8], [520, 55, 1.7, 0.2],
  [585, 100, 2.3, 1.3], [650, 42, 1.5, 0.9], [715, 125, 2, 0.4], [770, 68, 1.8, 1.6],
  [105, 175, 1.5, 1.2], [360, 175, 1.6, 0.8], [690, 190, 1.4, 0.6],
];

/* ---------------------------------------------------------------- animations */

const twinkle = keyframes`
  0%, 100% { opacity: 0.28; }
  50% { opacity: 1; }
`;

const steamRise = keyframes`
  0% { opacity: 0; transform: translateY(6px); }
  35% { opacity: 0.75; }
  100% { opacity: 0; transform: translateY(-26px); }
`;

const bulbPulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

const doorShake = keyframes`
  0%, 100% { transform: rotate(0); }
  40% { transform: rotate(1.4deg); }
  70% { transform: rotate(-1deg); }
`;

const DecorSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;

  .twinkle { animation: ${twinkle} 3.2s ease-in-out infinite; }
  .steam { animation: ${steamRise} 3.8s ease-in-out infinite; }
  .bulb { animation: ${bulbPulse} 3.6s ease-in-out infinite; }
  .fish-door { transform-origin: 95px 300px; }
  .fish-door.is-knocking { animation: ${doorShake} 0.22s ease-in-out; }
`;

/* ------------------------------------------------------------ shared pieces */

function SkyLayer({ night, sun, width = 800, height = 500, x = 0, y = 0 }) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="url(#rs-sky)" />
      {night ? (
        <g>
          <circle cx={x + width * 0.78} cy={y + height * 0.2} r={width * 0.055} fill="#fff4d6" opacity="0.95" />
          <circle cx={x + width * 0.78} cy={y + height * 0.2} r={width * 0.09} fill="#ffedbe" opacity="0.14" />
          {STARS.map(([sx, sy, r, delay], index) => (
            <circle
              key={index}
              className="twinkle"
              cx={x + sx * (width / 800)}
              cy={y + sy * (height / 500)}
              r={r * (width / 800)}
              fill="#fff6dd"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </g>
      ) : (
        <g>
          <circle cx={x + sun.x * (width / 800)} cy={y + sun.y * (height / 500)} r={width * 0.11} fill="#ffe0a4" opacity="0.16" />
          <circle cx={x + sun.x * (width / 800)} cy={y + sun.y * (height / 500)} r={width * 0.048} fill="#fff2cd" opacity="0.92" />
        </g>
      )}
    </g>
  );
}

function IndoorShell({ light, night, doorClass }) {
  return (
    <g>
      <rect x="0" y="0" width="800" height="500" fill="url(#rs-wall)" />
      {/* wall panel lines */}
      {[110, 220, 330].map((line) => (
        <line key={line} x1="0" y1={line} x2="800" y2={line} stroke="#ffffff" strokeOpacity="0.045" strokeWidth="1.5" />
      ))}
      {/* warm pool of light from the ceiling lamp */}
      <ellipse cx="400" cy="175" rx="330" ry="210" fill="url(#rs-lampglow)" opacity={night ? 0.85 : 0.4} />
      {/* floor */}
      <rect x="0" y="392" width="800" height="108" fill={light.floor} />
      <rect x="0" y="388" width="800" height="7" fill="#2a2030" opacity="0.5" />
      {[120, 300, 500, 680].map((line) => (
        <line key={line} x1={line} y1="395" x2={line - 26} y2="500" stroke="#ffffff" strokeOpacity="0.055" strokeWidth="2" />
      ))}
      {/* the door Fishy slips in through */}
      <g className={doorClass}>
        <rect x="24" y="158" width="130" height="234" rx="7" fill="#6a4636" stroke="#39251d" strokeWidth="3" />
        <rect x="36" y="172" width="106" height="96" rx="4" fill="none" stroke="#a67656" strokeWidth="3" opacity="0.65" />
        <rect x="36" y="280" width="106" height="96" rx="4" fill="none" stroke="#a67656" strokeWidth="3" opacity="0.65" />
        <circle cx="136" cy="278" r="6" fill="#f1cf8b" stroke="#a6803f" strokeWidth="2" />
      </g>
      {/* ceiling lamp */}
      <line x1="400" y1="0" x2="400" y2="42" stroke="#d9c8ab" strokeWidth="2" opacity="0.5" />
      <path d="M362 62 Q400 30 438 62 Z" fill="#e4cba1" opacity="0.9" />
      <circle className="bulb" cx="400" cy="66" r="9" fill="#ffe6b0" opacity={0.45 + light.lamp * 0.55} />
      <ellipse cx="400" cy="70" rx="70" ry="26" fill="#ffdfa0" opacity={light.lamp * 0.16} />
    </g>
  );
}

function WindowBox({ x, y, w, h, period, night, sun, curtain = true }) {
  return (
    <g>
      <rect x={x - 8} y={y - 8} width={w + 16} height={h + 16} rx="10" fill="#f7edda" opacity="0.92" />
      <svg x={x} y={y} width={w} height={h} viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
        <SkyLayer night={night} sun={sun} />
      </svg>
      {period === 'night' && <rect x={x} y={y} width={w} height={h} fill="#6b7fc0" opacity="0.12" />}
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="#f7edda" strokeWidth="7" />
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke="#f7edda" strokeWidth="7" />
      {curtain && (
        <g>
          <path d={`M${x - 14} ${y - 12} Q${x + 18} ${y + h / 2} ${x - 14} ${y + h + 12} Z`} fill="#b98b9b" opacity="0.75" />
          <path d={`M${x + w + 14} ${y - 12} Q${x + w - 18} ${y + h / 2} ${x + w + 14} ${y + h + 12} Z`} fill="#b98b9b" opacity="0.75" />
        </g>
      )}
      <rect x={x - 12} y={y + h} width={w + 24} height="9" rx="3" fill="#e8d8be" />
    </g>
  );
}

/* --------------------------------------------------------------- the rooms */

function Kitchen({ light, night, sun, period, doorClass }) {
  return (
    <g>
      <IndoorShell light={light} night={night} doorClass={doorClass} />
      {/* tiled backsplash */}
      {[215, 265, 315].map((line) => (
        <line key={line} x1="175" y1={line} x2="760" y2={line} stroke="#ffffff" strokeOpacity="0.09" strokeWidth="2" />
      ))}
      {/* upper cabinets */}
      {[
        [180, 70, 150, 100],
        [470, 70, 150, 100],
        [630, 70, 130, 100],
      ].map(([x, y, w, h], index) => (
        <g key={index}>
          <rect x={x} y={y} width={w} height={h} rx="7" fill="#a97a58" stroke="#7d553c" strokeWidth="3" />
          <line x1={x + w / 2} y1={y + 8} x2={x + w / 2} y2={y + h - 8} stroke="#7d553c" strokeWidth="2" opacity="0.7" />
          <rect x={x + w / 2 - 14} y={y + h - 30} width="6" height="16" rx="3" fill="#f0d9ae" />
          <rect x={x + w / 2 + 8} y={y + h - 30} width="6" height="16" rx="3" fill="#f0d9ae" />
        </g>
      ))}
      <WindowBox x={348} y={78} w={104} h={92} period={period} night={night} sun={sun} curtain={false} />
      {/* counter + lower cabinets */}
      <rect x="175" y="320" width="600" height="16" rx="5" fill="#e9dcc2" />
      <rect x="180" y="336" width="590" height="58" rx="5" fill="#8f6749" stroke="#6d4b35" strokeWidth="2" />
      {[280, 400, 520, 640].map((x) => (
        <line key={x} x1={x} y1="340" x2={x} y2="390" stroke="#6d4b35" strokeWidth="2" opacity="0.8" />
      ))}
      {/* pot on the stove */}
      <rect x="530" y="286" width="86" height="34" rx="8" fill="#5d6a78" stroke="#3f4a56" strokeWidth="3" />
      <rect x="524" y="282" width="98" height="8" rx="4" fill="#8594a2" />
      <circle cx="573" cy="276" r="6" fill="#8594a2" />
      {[0, 1, 2].map((index) => (
        <path
          key={index}
          className="steam"
          d={`M${548 + index * 24} 272 q-8 -12 0 -22 q8 -10 0 -20`}
          stroke="#fff6e6"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.5"
          style={{ animationDelay: `${index * 0.9}s` }}
        />
      ))}
      {/* jars + hanging utensils */}
      <rect x="196" y="296" width="22" height="24" rx="3" fill="#d9b98b" />
      <rect x="226" y="290" width="20" height="30" rx="3" fill="#a9c5a6" />
      <rect x="254" y="298" width="18" height="22" rx="3" fill="#d99a83" />
      {[0, 1, 2].map((index) => (
        <g key={index}>
          <line x1={668 + index * 26} y1="182" x2={668 + index * 26} y2="214" stroke="#e8dcc2" strokeWidth="2" />
          <circle cx={668 + index * 26} cy="220" r="8" fill="none" stroke="#cfd6dd" strokeWidth="3" />
        </g>
      ))}
      {/* little bowl of fruit */}
      <path d="M430 320 q30 -20 60 0 Z" fill="#c9836a" />
      <circle cx="448" cy="310" r="9" fill="#e8a45b" />
      <circle cx="466" cy="307" r="9" fill="#d6c263" />
      <circle cx="478" cy="312" r="8" fill="#e0865f" />
    </g>
  );
}

function Bath({ light, night, sun, period, doorClass }) {
  return (
    <g>
      <IndoorShell light={light} night={night} doorClass={doorClass} />
      {/* tile grid */}
      {[70, 140, 210, 280, 350].map((line) => (
        <line key={`h${line}`} x1="160" y1={line} x2="800" y2={line} stroke="#ffffff" strokeOpacity="0.09" strokeWidth="2" />
      ))}
      {[220, 300, 380, 460, 540, 620, 700].map((line) => (
        <line key={`v${line}`} x1={line} y1="40" x2={line} y2="390" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="2" />
      ))}
      {/* frosted window */}
      <WindowBox x={618} y={66} w={120} h={110} period={period} night={night} sun={sun} curtain={false} />
      {/* mirror */}
      <rect x="290" y="58" width="190" height="150" rx="12" fill="#f1e3cb" stroke="#c9ad87" strokeWidth="5" />
      <rect x="300" y="68" width="170" height="130" rx="8" fill="#9fc4d0" opacity="0.85" />
      <path d="M312 186 L388 76 L420 76 L344 186 Z" fill="#ffffff" opacity="0.22" />
      <rect x="278" y="206" width="214" height="12" rx="4" fill="#d9c1a0" />
      {/* bottles on the shelf */}
      <rect x="306" y="188" width="14" height="18" rx="3" fill="#e8a6a0" />
      <rect x="326" y="182" width="12" height="24" rx="3" fill="#a7c7b6" />
      <rect x="452" y="186" width="16" height="20" rx="3" fill="#c3b2dc" />
      {/* towel rack */}
      <line x1="176" y1="112" x2="270" y2="112" stroke="#d9c8ab" strokeWidth="5" strokeLinecap="round" />
      <path d="M188 112 h34 v96 q-17 8 -34 0 Z" fill="#e5a08e" opacity="0.92" />
      <path d="M228 112 h34 v78 q-17 8 -34 0 Z" fill="#8fb2cf" opacity="0.92" />
      {/* bathtub */}
      <path d="M498 292 h250 q14 0 14 18 v54 q0 34 -34 34 H532 q-34 0 -34 -34 v-54 q0 -18 14 -18 Z" fill="#f6f1e7" stroke="#c9c3b6" strokeWidth="3" />
      <rect x="486" y="306" width="274" height="46" rx="8" fill="#a8d2dc" opacity="0.9" />
      <path d="M486 318 q34 -10 68 0 t68 0 t68 0 t70 0" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.55" />
      {[540, 578, 622, 668, 712].map((cx, index) => (
        <circle key={cx} className="steam" cx={cx} cy={298 - (index % 2) * 8} r={7 + (index % 3) * 2} fill="#ffffff" opacity="0.55" style={{ animationDelay: `${index * 0.7}s` }} />
      ))}
      <rect x="470" y="394" width="18" height="14" rx="4" fill="#cfc7b8" />
      <rect x="756" y="394" width="18" height="14" rx="4" fill="#cfc7b8" />
      {/* rubber duck */}
      <ellipse cx="700" cy="298" rx="16" ry="10" fill="#f5cf62" />
      <circle cx="710" cy="286" r="9" fill="#f5cf62" />
      <path d="M718 285 l10 3 l-10 3 Z" fill="#e8924f" />
      <circle cx="712" cy="283" r="1.8" fill="#4a3524" />
      {/* bath mat */}
      <ellipse cx="360" cy="450" rx="120" ry="24" fill="#d8b6b0" opacity="0.5" />
    </g>
  );
}

function Garden({ night, sun, doorClass }) {
  return (
    <g>
      <SkyLayer night={night} sun={sun} />
      {/* distant hills */}
      <path d="M0 330 Q140 262 280 322 Q420 260 560 318 Q690 268 800 320 V500 H0 Z" fill={night ? '#2f3a52' : '#7a9b82'} opacity="0.85" />
      <path d="M0 366 Q180 316 340 360 Q520 310 680 358 Q750 340 800 356 V500 H0 Z" fill={night ? '#263149' : '#62866d'} />
      {/* lawn */}
      <rect x="0" y="382" width="800" height="118" fill={night ? '#223347' : '#6f9a6a'} />
      <path d="M0 382 Q200 370 400 382 T800 382" stroke={night ? '#3b5570' : '#8fb584'} strokeWidth="6" fill="none" opacity="0.7" />
      {/* picket fence */}
      {Array.from({ length: 17 }, (_, index) => 40 + index * 46).map((x) => (
        <g key={x}>
          <rect x={x} y="316" width="16" height="86" rx="4" fill="#f0e3ca" />
          <path d={`M${x} 316 l8 -12 l8 12 Z`} fill="#f0e3ca" />
        </g>
      ))}
      <rect x="30" y="338" width="750" height="9" rx="4" fill="#e2d2b6" />
      <rect x="30" y="372" width="750" height="9" rx="4" fill="#e2d2b6" />
      {/* little gate Fishy comes through */}
      <g className={doorClass}>
        <rect x="30" y="300" width="118" height="104" rx="6" fill="#efe1c6" opacity="0.95" stroke="#c9b795" strokeWidth="3" />
        {[52, 78, 104, 130].map((x) => (
          <line key={x} x1={x} y1="306" x2={x} y2="398" stroke="#c9b795" strokeWidth="5" />
        ))}
        <circle cx="136" cy="352" r="5" fill="#c08f52" />
      </g>
      {/* tree on the right */}
      <rect x="672" y="228" width="30" height="176" rx="8" fill="#7a5a42" />
      <circle cx="650" cy="212" r="62" fill={night ? '#2c4a52' : '#5f8f63'} />
      <circle cx="716" cy="196" r="56" fill={night ? '#33545c' : '#6b9d6c'} />
      <circle cx="686" cy="156" r="58" fill={night ? '#294650' : '#77ab73'} />
      <circle cx="742" cy="240" r="42" fill={night ? '#2c4a52' : '#5f8f63'} />
      {/* flower beds */}
      {[
        [210, 424], [258, 438], [306, 426], [360, 442], [414, 428],
        [470, 440], [524, 426], [578, 442], [182, 452], [330, 462], [492, 460],
      ].map(([cx, cy], index) => (
        <g key={index}>
          <circle cx={cx} cy={cy} r="9" fill={night ? '#46606a' : '#4d7d55'} />
          <circle cx={cx} cy={cy - 12} r="8" fill={index % 3 === 0 ? '#f0a8a0' : index % 3 === 1 ? '#f3d27f' : '#c9a8dd'} opacity={night ? 0.55 : 0.95} />
          <circle cx={cx} cy={cy - 12} r="3" fill="#fff2cc" />
        </g>
      ))}
      {/* butterflies by day, fireflies after dark */}
      {night
        ? [230, 380, 520, 620, 300, 560].map((cx, index) => (
            <circle key={cx} className="twinkle" cx={cx} cy={250 + (index % 3) * 46} r="4" fill="#ffe9a8" style={{ animationDelay: `${index * 0.5}s` }} />
          ))
        : [270, 500, 610].map((cx, index) => (
            <g key={cx} opacity="0.85">
              <ellipse cx={cx - 7} cy={250 + index * 34} rx="8" ry="5" transform={`rotate(-28 ${cx - 7} ${250 + index * 34})`} fill="#f6d79b" />
              <ellipse cx={cx + 7} cy={250 + index * 34} rx="8" ry="5" transform={`rotate(28 ${cx + 7} ${250 + index * 34})`} fill="#f6d79b" />
            </g>
          ))}
      {/* stepping stones */}
      {[300, 380, 460].map((cx, index) => (
        <ellipse key={cx} cx={cx} cy={470 - index * 12} rx="30" ry="11" fill="#d9cfae" opacity="0.65" />
      ))}
    </g>
  );
}

function Bedroom({ light, night, sun, period, doorClass }) {
  return (
    <g>
      <IndoorShell light={light} night={night} doorClass={doorClass} />
      {/* moonlight / daylight pouring through the window */}
      {night && <path d="M330 178 L500 178 L590 392 L230 392 Z" fill="#cdd8ff" opacity="0.07" />}
      <WindowBox x={320} y={58} w={170} h={126} period={period} night={night} sun={sun} />
      {/* bed */}
      <rect x="500" y="256" width="278" height="66" rx="12" fill="#9c7459" />
      <rect x="506" y="262" width="266" height="54" rx="9" fill="#b58a68" />
      <rect x="492" y="316" width="294" height="76" rx="12" fill="#f4ead8" stroke="#d7c6ad" strokeWidth="3" />
      <path d="M492 340 h294 v44 q0 8 -8 8 H500 q-8 0 -8 -8 Z" fill="#8fa9c4" />
      <rect x="516" y="306" width="86" height="30" rx="12" fill="#fff8ec" />
      <rect x="608" y="310" width="72" height="26" rx="11" fill="#e9d7bc" />
      <rect x="500" y="390" width="14" height="14" rx="3" fill="#7a5a42" />
      <rect x="766" y="390" width="14" height="14" rx="3" fill="#7a5a42" />
      {/* nightstand + lamp */}
      <rect x="424" y="326" width="66" height="68" rx="6" fill="#a37856" stroke="#7b563d" strokeWidth="2" />
      <line x1="430" y1="358" x2="484" y2="358" stroke="#7b563d" strokeWidth="2" opacity="0.7" />
      <rect x="452" y="290" width="10" height="36" rx="3" fill="#d8c4a2" />
      <path d="M436 292 h42 l-8 -30 h-26 Z" fill="#f0d7a6" opacity="0.95" />
      <ellipse cx="457" cy="298" rx="48" ry="26" fill="#ffd88f" opacity={0.12 + light.lamp * 0.3} />
      {/* bookshelf on the left */}
      <rect x="168" y="112" width="128" height="250" rx="6" fill="#8c6349" stroke="#6b4835" strokeWidth="3" />
      {[176, 240, 304].map((y) => (
        <line key={y} x1="172" y1={y} x2="292" y2={y} stroke="#6b4835" strokeWidth="5" />
      ))}
      {[
        [180, '#d79a86'], [194, '#e8c987'], [208, '#91b1c8'], [224, '#b7a2cd'], [240, '#e6b18d'],
        [182, '#9fc0a8'], [198, '#d5a2a9'], [214, '#e4cf98'], [232, '#8fa9c4'], [250, '#cc9a76'],
      ].map(([x, fill], index) => (
        <rect key={index} x={x} y={index < 5 ? 138 : 202} width="12" height={index < 5 ? 38 : 36} rx="2" fill={fill} />
      ))}
      {/* rug */}
      <ellipse cx="360" cy="452" rx="150" ry="30" fill="#c99e9c" opacity="0.35" />
      {/* sleepy zzz at night */}
      {night && <text x="600" y="232" fontSize="26" fill="#ffe4ac" opacity="0.7" className="twinkle">z z z</text>}
    </g>
  );
}

function Rooftop({ night, sun, doorClass }) {
  return (
    <g>
      <SkyLayer night={night} sun={sun} />
      {/* city skyline */}
      {[
        [20, 288, 70, 110], [95, 310, 54, 88], [155, 268, 62, 130], [222, 300, 48, 98],
        [276, 250, 70, 148], [352, 292, 56, 106], [414, 274, 64, 124], [484, 306, 50, 92],
        [540, 262, 66, 136], [612, 296, 58, 102], [676, 272, 60, 126], [742, 300, 58, 98],
      ].map(([x, y, w, h], index) => (
        <g key={index}>
          <rect x={x} y={y} width={w} height={h} fill={night ? '#222b47' : '#5c6b86'} opacity="0.9" />
          {night &&
            [0, 1, 2].map((row) =>
              [0, 1].map((col) => (
                <rect
                  key={`${row}-${col}`}
                  x={x + 10 + col * 21}
                  y={y + 14 + row * 26}
                  width="9"
                  height="12"
                  rx="1"
                  fill="#ffd992"
                  opacity={(index + row + col) % 3 === 0 ? 0.75 : 0.28}
                />
              )),
            )}
        </g>
      ))}
      {/* roof deck */}
      <rect x="0" y="398" width="800" height="102" fill={night ? '#39334c' : '#8b7b7a'} />
      {[100, 240, 380, 520, 660].map((x) => (
        <line key={x} x1={x} y1="400" x2={x - 24} y2="500" stroke="#ffffff" strokeOpacity="0.09" strokeWidth="2" />
      ))}
      {/* railing */}
      <rect x="0" y="356" width="800" height="10" rx="4" fill="#d8c9b0" opacity="0.9" />
      {Array.from({ length: 15 }, (_, index) => 26 + index * 54).map((x) => (
        <rect key={x} x={x} y="360" width="8" height="46" rx="3" fill="#c9b99e" opacity="0.85" />
      ))}
      {/* string lights */}
      <path d="M0 46 Q200 118 400 66 T800 78" stroke="rgba(255,241,214,0.45)" strokeWidth="2" fill="none" />
      {[60, 150, 240, 330, 420, 510, 600, 690, 770].map((x, index) => (
        <circle
          key={x}
          className="bulb"
          cx={x}
          cy={x < 400 ? 60 + Math.sin(x / 90) * 32 : 72 - Math.sin(x / 90) * 10}
          r="6"
          fill="#ffdf9b"
          opacity={night ? 0.95 : 0.5}
          style={{ animationDelay: `${index * 0.3}s` }}
        />
      ))}
      {/* access door Fishy slips through */}
      <g className={doorClass}>
        <rect x="26" y="218" width="120" height="182" rx="7" fill="#7b5c4b" stroke="#463229" strokeWidth="3" />
        <rect x="40" y="232" width="92" height="154" rx="4" fill="none" stroke="#a37c60" strokeWidth="3" opacity="0.6" />
        <circle cx="132" cy="312" r="6" fill="#f1cf8b" stroke="#a6803f" strokeWidth="2" />
      </g>
      {/* potted plants */}
      {[180, 660].map((x) => (
        <g key={x}>
          <path d={`M${x - 26} 366 h52 l-7 36 h-38 Z`} fill="#b9765c" />
          <circle cx={x - 12} cy={344} r="20" fill={night ? '#2f4c50' : '#689467'} />
          <circle cx={x + 14} cy={336} r="22" fill={night ? '#35565a' : '#78a472'} />
          <circle cx={x} cy={320} r="18" fill={night ? '#2b4549' : '#87b27c'} />
        </g>
      ))}
      {/* little bench */}
      <rect x="540" y="332" width="180" height="12" rx="4" fill="#b58b62" />
      <rect x="540" y="300" width="180" height="10" rx="4" fill="#b58b62" />
      <rect x="552" y="344" width="10" height="56" fill="#8a6749" />
      <rect x="698" y="344" width="10" height="56" fill="#8a6749" />
      {/* telescope at night */}
      {night && (
        <g>
          <rect x="270" y="352" width="6" height="48" fill="#9aa3b2" />
          <rect x="248" y="330" width="52" height="14" rx="6" fill="#c3ccda" transform="rotate(-22 274 337)" />
          <circle cx="296" cy="324" r="7" fill="#e6edf6" opacity="0.7" />
        </g>
      )}
    </g>
  );
}

function Closet({ light, night, sun, period, doorClass }) {
  const hangers = [
    { x: 224, color: '#e88a72', edge: '#c95e49', shape: 'scarf' },
    { x: 268, color: '#f8d477', edge: '#dfa746', shape: 'coat' },
    { x: 312, color: '#b6ddc9', edge: '#6fae97', shape: 'sweater' },
    { x: 356, color: '#4a557d', edge: '#2b3557', shape: 'tux' },
  ];
  return (
    <g>
      <IndoorShell light={light} night={night} doorClass={doorClass} />
      {/* wallpaper stripes */}
      {Array.from({ length: 20 }, (_, index) => 160 + index * 32).map((x) => (
        <line key={x} x1={x} y1="40" x2={x} y2="388" stroke="#ffffff" strokeOpacity="0.035" strokeWidth="10" />
      ))}
      <WindowBox x={620} y={64} w={116} h={104} period={period} night={night} sun={sun} curtain={false} />
      {/* the big wardrobe, one door open */}
      <rect x="176" y="86" width="252" height="308" rx="10" fill="#8c6349" stroke="#5d3f2e" strokeWidth="4" />
      <rect x="188" y="98" width="112" height="284" rx="5" fill="#a87a58" stroke="#6b4835" strokeWidth="2" />
      <rect x="306" y="98" width="110" height="284" rx="5" fill="#3c2c33" />
      <rect x="312" y="104" width="98" height="272" rx="4" fill="#513b42" />
      {/* mirror on the closed door */}
      <rect x="198" y="116" width="92" height="228" rx="7" fill="#b9d2d8" stroke="#e9d8ba" strokeWidth="5" />
      <path d="M206 300 L262 124 L286 124 L230 300 Z" fill="#ffffff" opacity="0.18" />
      <circle cx="282" cy="352" r="4" fill="#f1cf8b" />
      {/* hanging rail + four little outfits */}
      <line x1="316" y1="130" x2="406" y2="130" stroke="#d9c8ab" strokeWidth="4" strokeLinecap="round" />
      {hangers.map(({ x, color, edge, shape }) => (
        <g key={x}>
          <path d={`M${x} 130 a3 3 0 1 1 2.6 3 c0 2.4 -2.6 2.4 -2.6 5`} fill="none" stroke="#d9c8ab" strokeWidth="1.6" />
          <path d={`M${x} 138 l-12 9 l5 6 l5 -4 l0 42 l4 0 l0 -42 l5 4 l5 -6 Z`} fill={color} stroke={edge} strokeWidth="1.4" strokeLinejoin="round" />
          {shape === 'scarf' && <path d={`M${x - 6} 145 q6 8 12 0`} stroke={edge} strokeWidth="2" fill="none" />}
          {shape === 'tux' && <path d={`M${x - 3} 145 L${x} 160 L${x + 3} 145 Z`} fill="#fff8ec" />}
          {shape === 'sweater' && <path d={`M${x - 4} 142 L${x} 148 L${x + 4} 142`} stroke={edge} strokeWidth="2" fill="none" />}
          {shape === 'coat' && <circle cx={x} cy="166" r="2" fill="#6f97c4" />}
        </g>
      ))}
      {/* shoe shelf at the bottom of the wardrobe */}
      <rect x="312" y="336" width="98" height="6" rx="2" fill="#d9c8ab" />
      <path d="M320 336 h20 v-10 q0 -6 -6 -6 h-8 q-6 0 -6 6 Z" fill="#e88a72" />
      <path d="M348 336 h20 v-10 q0 -6 -6 -6 h-8 q-6 0 -6 6 Z" fill="#6f97c4" />
      {/* open rail on the right with folded clothes */}
      <line x1="486" y1="150" x2="764" y2="150" stroke="#d9c8ab" strokeWidth="5" strokeLinecap="round" />
      <rect x="480" y="150" width="7" height="212" rx="3" fill="#a87a58" />
      <rect x="762" y="150" width="7" height="212" rx="3" fill="#a87a58" />
      {[
        [506, '#fbf0df', '#e0c9a6'], [548, '#c6d8f2', '#87a4d4'],
        [590, '#fff7f2', '#e0c0ba'], [632, '#b6ddc9', '#6fae97'],
        [674, '#cd7f83', '#a35f66'], [716, '#f8d477', '#dfa746'],
      ].map(([x, fill, edge], index) => (
        <g key={x}>
          <path d={`M${x + 16} 150 a3 3 0 1 1 2.6 3 c0 2.4 -2.6 2.4 -2.6 5`} fill="none" stroke="#d9c8ab" strokeWidth="1.5" />
          <rect x={x} y="158" width="32" height={index % 2 ? 52 : 44} rx="5" fill={fill} stroke={edge} strokeWidth="1.4" />
          <line x1={x + 4} y1="166" x2={x + 28} y2="166" stroke={edge} strokeWidth="1.4" opacity="0.7" />
        </g>
      ))}
      {/* shelf with folded towels and a hat box */}
      <rect x="480" y="252" width="288" height="9" rx="3" fill="#a87a58" />
      {[496, 542, 588].map((x, index) => (
        <rect key={x} x={x} y={228 - index * 2} width="40" height="24" rx="4" fill={['#e5a08e', '#8fb2cf', '#f0d7a6'][index]} />
      ))}
      <rect x="666" y="214" width="66" height="38" rx="6" fill="#c9a8dd" stroke="#a586bd" strokeWidth="2" />
      <path d="M666 226 h66" stroke="#a586bd" strokeWidth="2" opacity="0.6" />
      {/* stool + rug */}
      <ellipse cx="560" cy="452" rx="190" ry="30" fill="#c99e9c" opacity="0.38" />
      <rect x="444" y="368" width="104" height="13" rx="6" fill="#a87a58" />
      <rect x="452" y="381" width="9" height="52" rx="3" fill="#7a5a42" />
      <rect x="531" y="381" width="9" height="52" rx="3" fill="#7a5a42" />
      <path d="M452 376 q48 -14 96 0" stroke="#f1d7bb" strokeWidth="4" fill="none" opacity="0.7" />
      {/* sparkles because trying things on is fun */}
      {[[470, 96], [746, 196], [432, 118]].map(([cx, cy], index) => (
        <path key={cx} className="twinkle" d={`M${cx} ${cy - 7} l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z`} fill="#ffe6b0" style={{ animationDelay: `${index * 0.8}s` }} />
      ))}
    </g>
  );
}

function Market({ night, sun, doorClass }) {
  const produce = [
    { x: 250, color: '#e8a45b', kind: 'round' },
    { x: 320, color: '#d96f5c', kind: 'round' },
    { x: 390, color: '#8fb26b', kind: 'leaf' },
    { x: 460, color: '#f3d27f', kind: 'round' },
    { x: 530, color: '#c47a9b', kind: 'leaf' },
  ];
  return (
    <g>
      <SkyLayer night={night} sun={sun} />
      {/* far storefronts */}
      <rect x="0" y="248" width="800" height="150" fill={night ? '#2c334f' : '#d8c4a7'} opacity="0.7" />
      {/* striped awning */}
      <path d="M0 40 H800 L770 108 H30 Z" fill="#f6ead4" />
      {Array.from({ length: 16 }, (_, index) => index * 50).map((x, index) => (
        <path key={x} d={`M${x} 40 H${x + 25} L${x + 23} 108 H${x + 1} Z`} fill={index % 2 ? '#e88a72' : '#f6ead4'} opacity="0.9" />
      ))}
      <path d="M30 108 Q400 128 770 108" stroke="#d4b894" strokeWidth="5" fill="none" />
      {/* hanging bulbs */}
      {[110, 230, 350, 470, 590, 710].map((x, index) => (
        <g key={x}>
          <line x1={x} y1="108" x2={x} y2="132" stroke="#d9c8ab" strokeWidth="1.6" />
          <circle className="bulb" cx={x} cy="137" r="7" fill="#ffdf9b" opacity={night ? 0.95 : 0.55} style={{ animationDelay: `${index * 0.4}s` }} />
        </g>
      ))}
      {/* back shelves */}
      <rect x="176" y="212" width="572" height="16" rx="4" fill="#a87a58" />
      <rect x="176" y="300" width="572" height="16" rx="4" fill="#a87a58" />
      {[
        [196, '#e9d3a8'], [242, '#c9a8dd'], [288, '#a7c7b6'], [334, '#e8a6a0'],
        [380, '#f0d7a6'], [426, '#9fc0a8'], [472, '#d5a2a9'], [518, '#e4cf98'],
        [564, '#8fa9c4'], [610, '#cc9a76'], [656, '#b7a2cd'], [702, '#e6b18d'],
      ].map(([x, fill], index) => (
        <rect key={x} x={x} y={index % 2 ? 176 : 184} width="30" height={index % 2 ? 36 : 28} rx="3" fill={fill} stroke="#8a6a4e" strokeWidth="1.4" />
      ))}
      {/* crates of produce */}
      {produce.map(({ x, color, kind }) => (
        <g key={x}>
          <path d={`M${x - 34} 300 h68 l-7 -40 h-54 Z`} fill="#b98b60" stroke="#8a6a4e" strokeWidth="2" />
          {kind === 'round' ? (
            <g>
              {[0, 1, 2].map((index) => (
                <circle key={index} cx={x - 20 + index * 20} cy={272 - (index % 2) * 5} r="12" fill={color} />
              ))}
            </g>
          ) : (
            <g>
              {[0, 1, 2].map((index) => (
                <path key={index} d={`M${x - 26 + index * 20} 278 q6 -24 20 -22 q-4 18 -8 22 Z`} fill={color} />
              ))}
            </g>
          )}
        </g>
      ))}
      {/* little chalkboard price sign */}
      <rect x="596" y="330" width="118" height="60" rx="6" fill="#3f5148" stroke="#a87a58" strokeWidth="5" transform="rotate(-3 655 360)" />
      <line x1="610" y1="348" x2="698" y2="346" stroke="#f6ead4" strokeWidth="2" opacity="0.75" />
      <line x1="610" y1="362" x2="676" y2="360" stroke="#f6ead4" strokeWidth="2" opacity="0.55" />
      {/* floor + tiles */}
      <rect x="0" y="392" width="800" height="108" fill={night ? '#3b3a4e' : '#c8b394'} />
      {[0, 120, 240, 360, 480, 600, 720].map((x) => (
        <line key={x} x1={x} y1="392" x2={x - 30} y2="500" stroke="#ffffff" strokeOpacity="0.09" strokeWidth="2" />
      ))}
      <line x1="0" y1="444" x2="800" y2="444" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="2" />
      {/* the door Fishy comes through */}
      <g className={doorClass}>
        <rect x="28" y="212" width="120" height="180" rx="6" fill="#8c6349" stroke="#5d3f2e" strokeWidth="3" />
        <rect x="40" y="224" width="96" height="156" rx="4" fill="#a4c6cf" opacity="0.7" stroke="#5d3f2e" strokeWidth="2" />
        <circle cx="132" cy="306" r="6" fill="#f1cf8b" stroke="#a6803f" strokeWidth="2" />
      </g>
      {/* shopping basket with a baguette and greens */}
      <g>
        <path d="M650 392 q-12 -44 12 -44 q24 0 12 44" fill="none" stroke="#b98b60" strokeWidth="5" />
        <path d="M612 392 h96 l-10 -58 h-76 Z" fill="#c9996b" stroke="#8a6a4e" strokeWidth="3" />
        {[626, 646, 666, 686].map((x) => (
          <line key={x} x1={x} y1="338" x2={x + 4} y2="388" stroke="#8a6a4e" strokeWidth="2" opacity="0.55" />
        ))}
        <path d="M676 334 q10 -56 20 -58 q-4 34 -8 58 Z" fill="#e6bd7d" stroke="#c69a5c" strokeWidth="2" />
        <path d="M628 334 q-16 -30 -2 -40 q10 16 12 40 Z" fill="#7fa46c" />
        <circle cx="646" cy="326" r="12" fill="#d96f5c" />
        <circle cx="666" cy="330" r="10" fill="#f3d27f" />
      </g>
      {/* a stray shopping list */}
      <rect x="196" y="404" width="62" height="76" rx="4" fill="#fff8ec" transform="rotate(-8 227 442)" opacity="0.92" />
      {[418, 432, 446].map((y, index) => (
        <line key={y} x1="206" y1={y} x2={index === 2 ? 232 : 248} y2={y - 2} stroke="#c9a98a" strokeWidth="2" opacity="0.8" />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ public */

/** Full-bleed illustration for the current room. Living keeps the original
 *  window-and-rug scene, so this returns null there. */
/* Memoised: this whole illustration is a few hundred SVG nodes and it only
   depends on three primitives. Room state arriving every few seconds should not
   rebuild it. */
export const RoomDecor = React.memo(function RoomDecor({ roomId, period = 'night', knock = false }) {
  const light = LIGHT[period] ?? LIGHT.night;
  const night = period === 'night';
  const sun = SUN_POS[period] ?? SUN_POS.noon;
  const doorClass = `fish-door${knock ? ' is-knocking' : ''}`;

  if (roomId === 'living') return null;

  return (
    <DecorSvg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="rs-sky" x1="0" y1="0" x2="0" y2="1">
          {(SKY_STOPS[period] ?? SKY_STOPS.night).map((color, index, list) => (
            <stop key={color} offset={`${(index / (list.length - 1)) * 100}%`} stopColor={color} />
          ))}
        </linearGradient>
        <linearGradient id="rs-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light.wallTop} />
          <stop offset="100%" stopColor={light.wallBottom} />
        </linearGradient>
        <radialGradient id="rs-lampglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffdca0" stopOpacity={light.lamp * 0.26} />
          <stop offset="100%" stopColor="#ffdca0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {roomId === 'kitchen' && <Kitchen light={light} night={night} sun={sun} period={period} doorClass={doorClass} />}
      {roomId === 'bath' && <Bath light={light} night={night} sun={sun} period={period} doorClass={doorClass} />}
      {roomId === 'garden' && <Garden night={night} sun={sun} doorClass={doorClass} />}
      {roomId === 'bedroom' && <Bedroom light={light} night={night} sun={sun} period={period} doorClass={doorClass} />}
      {roomId === 'rooftop' && <Rooftop night={night} sun={sun} doorClass={doorClass} />}
      {roomId === 'closet' && <Closet light={light} night={night} sun={sun} period={period} doorClass={doorClass} />}
      {roomId === 'market' && <Market night={night} sun={sun} doorClass={doorClass} />}
    </DecorSvg>
  );
});

/* ------------------------------------------------------------- room picker */

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 18px;
  background: rgba(24, 19, 34, 0.55);
  border: 1px solid rgba(255, 248, 236, 0.1);
  box-shadow: ${shadows.card};
  backdrop-filter: blur(12px);

  @media (max-width: ${breakpoints.medium}) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
`;

const BarLead = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: none;
  min-width: 92px;

  span.title {
    color: rgba(255, 248, 236, 0.9);
    font-size: 12px;
    font-weight: 600;
  }

  span.period {
    color: ${palette.amber};
    font-size: 10px;
    letter-spacing: 0.04em;
  }

  @media (max-width: ${breakpoints.medium}) {
    flex-direction: row;
    align-items: baseline;
    gap: 8px;
  }
`;

const Chips = styled.div`
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 7px 11px;
  border-radius: 999px;
  border: 1px solid
    ${(props) => (props.$active ? 'rgba(241, 185, 79, 0.62)' : 'rgba(255, 248, 236, 0.12)')};
  background: ${(props) => (props.$active ? 'rgba(241, 185, 79, 0.16)' : 'rgba(255, 248, 236, 0.05)')};
  color: ${(props) => (props.$active ? '#ffe6b4' : 'rgba(255, 248, 236, 0.68)')};
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, transform 0.15s ease, color 0.15s ease;

  span:first-child { font-size: 14px; line-height: 1; }

  &:hover { transform: translateY(-1px); background: rgba(255, 248, 236, 0.12); }
  &:focus-visible { outline: 2px solid rgba(241, 185, 79, 0.6); outline-offset: 2px; }

  @media (max-width: ${breakpoints.small}) {
    padding: 7px 9px;
    span.label { display: none; }
  }
`;

const RoomTip = styled.span`
  flex: none;
  max-width: 190px;
  color: rgba(255, 248, 236, 0.4);
  font-size: 10px;
  line-height: 1.4;
  text-align: right;

  @media (max-width: ${breakpoints.wide}) {
    display: none;
  }
`;

/** The little floor-plan strip that sits right under the scene card. */
export function RoomSwitcher({ current, period, onChange }) {
  const { t } = useI18n();
  return (
    <Bar>
      <BarLead>
        <span className="title">{t('house.title')}</span>
        <span className="period">{t(periodKey(period))}</span>
      </BarLead>
      <Chips role="tablist" aria-label={t('house.title')}>
        {ROOMS.map((room) => (
          <Chip
            key={room.id}
            type="button"
            role="tab"
            aria-selected={current === room.id}
            $active={current === room.id}
            title={t(room.labelKey)}
            aria-label={t(room.labelKey)}
            onClick={() => onChange(room.id)}
          >
            <span aria-hidden="true">{room.icon}</span>
            <span className="label">{t(room.labelKey)}</span>
          </Chip>
        ))}
      </Chips>
      <RoomTip>{t(`house.tip.${current}`)}</RoomTip>
    </Bar>
  );
}
