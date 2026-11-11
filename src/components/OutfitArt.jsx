import React from 'react';
import { BEAR_OUTFITS, FISH_OUTFITS } from '../utils/wardrobe';

/**
 * Every stitch of clothing the pair owns lives here as data-driven SVG. Bear
 * and Fishy keep their own shapes and faces, only these fragments are swapped,
 * so adding an outfit never means redrawing a character.
 */

function starPath(cx, cy, radius) {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? radius : radius * 0.45;
    points.push(`${(cx + Math.cos(angle) * r).toFixed(1)} ${(cy + Math.sin(angle) * r).toFixed(1)}`);
  }
  return `M ${points.join(' L ')} Z`;
}

/* ------------------------------------------------------------------ the bear */

function BearHeadwear({ kind, colors, accent }) {
  if (kind === 'hood') {
    return (
      <g>
        <path
          d="M56 84 Q58 26 130 24 Q202 26 204 84 L188 84 Q184 44 130 42 Q76 44 72 84 Z"
          fill={colors.dark}
        />
        <path d="M62 80 Q64 32 130 30 Q196 32 198 80" stroke={colors.trim} strokeWidth="4" fill="none" opacity="0.8" />
        <path d="M56 84 Q130 96 204 84" stroke={colors.light} strokeWidth="3" fill="none" opacity="0.75" />
      </g>
    );
  }
  if (kind === 'beanie') {
    return (
      <g>
        <path d="M70 64 Q78 20 130 18 Q182 20 190 64 Z" fill={colors.dark} />
        <rect x="68" y="58" width="124" height="15" rx="7" fill={colors.trim} />
        <circle cx="130" cy="14" r="12" fill={colors.trim} />
        {[86, 106, 130, 154, 174].map((x) => (
          <line key={x} x1={x} y1="34" x2={x} y2="58" stroke={colors.light} strokeWidth="2" opacity="0.5" />
        ))}
      </g>
    );
  }
  if (kind === 'tophat') {
    return (
      <g>
        <rect x="96" y="12" width="68" height="44" rx="5" fill={colors.dark} />
        <rect x="96" y="44" width="68" height="10" fill={accent} opacity="0.85" />
        <rect x="82" y="54" width="96" height="10" rx="5" fill={colors.dark} />
        <path d="M100 20 h10 v30 h-10 Z" fill="#ffffff" opacity="0.08" />
      </g>
    );
  }
  return null;
}

export function BearClothes({ uid, outfit }) {
  const { colors, shape, headwear, accent, charm } = outfit;
  const gradientId = `bear-outfit-${uid}`;
  const fill = `url(#${gradientId})`;

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.light} />
          <stop offset="100%" stopColor={colors.dark} />
        </linearGradient>
      </defs>

      {shape === 'scarf' && (
        <g>
          <path d="M82 178 Q130 198 178 178 L174 192 Q130 213 86 192 Z" fill={fill} />
          <path d="M82 178 Q130 198 178 178" stroke={colors.trim} strokeWidth="3" fill="none" opacity="0.55" />
          {charm === 'heart' && (
            <g transform="translate(130 196)">
              <path
                d="M0 8 C-9 -1, -15 -7, -9 -13 C-4 -18, 0 -13, 0 -10 C0 -13, 4 -18, 9 -13 C15 -7, 9 -1, 0 8 Z"
                fill="#f1b94f"
              />
            </g>
          )}
        </g>
      )}

      {shape === 'raincoat' && (
        <g>
          <path d="M76 178 Q130 196 184 178 L190 240 Q130 264 70 240 Z" fill={fill} />
          <path d="M112 180 L130 198 L148 180" stroke={colors.trim} strokeWidth="5" fill="none" strokeLinejoin="round" />
          <path d="M130 198 L130 252" stroke={colors.dark} strokeWidth="2" opacity="0.55" />
          {[208, 226, 244].map((y) => (
            <circle key={y} cx="137" cy={y} r="3.2" fill={accent} />
          ))}
          <path d="M84 218 q14 8 28 0 M148 218 q14 8 28 0" stroke={colors.dark} strokeWidth="2.5" fill="none" opacity="0.45" />
          <path d="M76 236 Q130 258 184 236" stroke={colors.trim} strokeWidth="3" fill="none" opacity="0.6" />
        </g>
      )}

      {shape === 'sweater' && (
        <g>
          <path d="M76 178 Q130 196 184 178 L190 240 Q130 264 70 240 Z" fill={fill} />
          <path d="M108 178 L130 204 L152 178" stroke={colors.trim} strokeWidth="7" fill="none" strokeLinejoin="round" />
          <path d="M70 236 Q130 260 190 236 L188 244 Q130 268 72 244 Z" fill={colors.dark} opacity="0.65" />
          {[82, 96, 110, 124, 138, 152, 166, 180].map((x) => (
            <line key={x} x1={x} y1="238" x2={x} y2="250" stroke={colors.trim} strokeWidth="2" opacity="0.45" />
          ))}
          <path d={starPath(130, 223, 11)} fill={accent} opacity="0.85" />
        </g>
      )}

      {shape === 'tux' && (
        <g>
          <path d="M76 178 Q130 196 184 178 L190 240 Q130 264 70 240 Z" fill={fill} />
          <path d="M112 178 L130 226 L148 178 Z" fill="#fff8ec" />
          <path d="M76 178 L112 178 L130 226 L94 204 Z" fill={colors.trim} opacity="0.9" />
          <path d="M184 178 L148 178 L130 226 L166 204 Z" fill={colors.trim} opacity="0.9" />
          <g transform="translate(130 190)">
            <path d="M-4 -8 L-20 -15 L-20 1 L-4 -4 Z" fill={accent} />
            <path d="M4 -8 L20 -15 L20 1 L4 -4 Z" fill={accent} />
            <circle cx="0" cy="-6" r="4.5" fill={colors.dark} />
          </g>
          {[222, 238].map((y) => (
            <circle key={y} cx="130" cy={y} r="3" fill={colors.trim} />
          ))}
        </g>
      )}

      <BearHeadwear kind={headwear} colors={colors} accent={accent} />
    </g>
  );
}

/* ------------------------------------------------------------------- the fish */

function FishPrint({ print, color }) {
  if (print === 'star') return <path d={starPath(60, 79, 7)} fill={color} opacity="0.85" />;
  if (print === 'stars') {
    return (
      <g fill={color} opacity="0.9">
        <path d={starPath(51, 76, 4)} />
        <path d={starPath(70, 89, 5)} />
        <path d={starPath(56, 100, 3.5)} />
      </g>
    );
  }
  return null;
}

function FishTop({ outfit }) {
  const { top, shape } = outfit;
  return (
    <g>
      <path
        d="M41 60 L79 60 L79 114 Q60 120 41 114 Z"
        fill="url(#fishTop)"
        stroke={top.edge}
        strokeWidth="1.6"
      />
      <path
        d="M41 60 Q13 66 13 85 Q13 94 22 94 Q31 94 42 82 Z"
        fill="url(#fishTop)"
        stroke={top.edge}
        strokeWidth="1.6"
      />
      <path
        d="M79 60 Q107 66 107 85 Q107 94 98 94 Q89 94 78 82 Z"
        fill="url(#fishTop)"
        stroke={top.edge}
        strokeWidth="1.6"
      />
      {shape === 'shirt' ? (
        <g>
          <path d="M48 60 L60 72 L60 60 Z" fill={top.edge} opacity="0.9" />
          <path d="M72 60 L60 72 L60 60 Z" fill={top.edge} opacity="0.9" />
          <path d="M60 72 L60 114" stroke={top.edge} strokeWidth="1.6" />
          {[80, 92, 104].map((y) => (
            <circle key={y} cx="60" cy={y} r="1.8" fill={top.edge} />
          ))}
          <path d="M52 68 L60 73 L52 78 Z M68 68 L60 73 L68 78 Z" fill="#cf5e46" />
          <circle cx="60" cy="73" r="3" fill="#a9473c" />
        </g>
      ) : (
        <path d="M48 60 Q60 71 72 60" stroke={top.edge} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}
      <path d="M42 111 Q60 117 78 111" stroke={top.edge} strokeWidth="2" fill="none" opacity="0.7" />
      <FishPrint print={top.print} color={top.printColor} />
    </g>
  );
}

function FishBottom({ outfit }) {
  const { bottom } = outfit;
  const long = bottom.shape === 'pants';
  const hem = long ? 144 : 134;
  return (
    <g>
      <path
        d={`M41 110 L79 110 L77 ${hem} Q60 ${hem + 6} 43 ${hem} Z`}
        fill="url(#fishBottom)"
        stroke={bottom.edge}
        strokeWidth="1.4"
      />
      <rect x="40" y="108" width="40" height="8" rx="3.5" fill={bottom.dark} />
      <path d={`M60 116 L60 ${hem - 2}`} stroke="#dce9f8" strokeWidth="1.2" opacity="0.55" />
      <path d="M48 116 L52 116 M68 116 L72 116" stroke="#dce9f8" strokeWidth="1.2" opacity="0.5" />
      {long && <path d={`M42 ${hem - 8} Q60 ${hem - 2} 78 ${hem - 8}`} stroke={bottom.edge} strokeWidth="2" fill="none" opacity="0.6" />}
    </g>
  );
}

function FishExtra({ extra }) {
  if (extra === 'apron') {
    return (
      <g>
        <path d="M48 86 L72 86" stroke="#e5d9c4" strokeWidth="3" fill="none" />
        <path d="M47 88 L73 88 L78 130 Q60 137 42 130 Z" fill="#d9705e" stroke="#b9564a" strokeWidth="1.4" />
        <path d="M50 106 Q60 111 70 106" stroke="#f6d2c6" strokeWidth="1.6" fill="none" opacity="0.8" />
      </g>
    );
  }
  return null;
}

export function FishClothes({ outfit }) {
  const { top, bottom } = outfit;
  return (
    <g>
      <defs>
        <linearGradient id="fishTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top.light} />
          <stop offset="100%" stopColor={top.dark} />
        </linearGradient>
        <linearGradient id="fishBottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bottom.light} />
          <stop offset="100%" stopColor={bottom.dark} />
        </linearGradient>
      </defs>
      <FishTop outfit={outfit} />
      <FishBottom outfit={outfit} />
      <FishExtra extra={outfit.extra} />
    </g>
  );
}

export function FishHat({ hat }) {
  return (
    <g>
      <defs>
        <linearGradient id="fishHat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={hat.light} />
          <stop offset="100%" stopColor={hat.dark} />
        </linearGradient>
      </defs>
      {hat.shape === 'cap' && (
        <g>
          <path d="M36 32 A24 24 0 0 1 84 32 Z" fill="url(#fishHat)" />
          <rect x="16" y="28" width="18" height="9" rx="4" fill={hat.dark} />
          <circle cx="60" cy="10" r="3" fill={hat.dark} />
        </g>
      )}
      {hat.shape === 'toque' && (
        <g>
          <path d="M34 34 Q27 12 44 14 Q48 2 60 6 Q74 2 78 14 Q95 12 88 34 Z" fill="url(#fishHat)" stroke={hat.dark} strokeWidth="1.4" />
          <rect x="33" y="30" width="56" height="11" rx="3" fill={hat.light} stroke={hat.dark} strokeWidth="1.4" />
          <line x1="48" y1="32" x2="48" y2="40" stroke={hat.dark} strokeWidth="1" opacity="0.4" />
          <line x1="72" y1="32" x2="72" y2="40" stroke={hat.dark} strokeWidth="1" opacity="0.4" />
        </g>
      )}
      {hat.shape === 'nightcap' && (
        <g>
          <path d="M32 34 Q58 2 88 30 Q74 42 60 34 Q46 42 32 34 Z" fill="url(#fishHat)" stroke={hat.dark} strokeWidth="1.4" />
          <rect x="32" y="30" width="52" height="8" rx="4" fill={hat.light} />
          <circle cx="88" cy="29" r="6" fill="#fff3d4" />
          <path d={starPath(52, 20, 4)} fill="#f6d47b" />
        </g>
      )}
      {hat.shape === 'beret' && (
        <g>
          <path d="M32 34 Q40 12 64 13 Q88 14 90 34 Z" fill="url(#fishHat)" stroke={hat.dark} strokeWidth="1.4" />
          <path d="M30 33 Q60 42 92 33" stroke={hat.dark} strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="64" cy="12" r="3" fill={hat.dark} />
        </g>
      )}
    </g>
  );
}

/* -------------------------------------------------------- hanger previews */

/** A tiny hanger so the wardrobe stays readable even when Fishy is away. */
export function OutfitSwatch({ who, outfit }) {
  const isBear = who === 'bear';
  const topLight = isBear ? outfit.colors.light : outfit.top.light;
  const topDark = isBear ? outfit.colors.dark : outfit.top.dark;
  const bottomLight = isBear ? outfit.colors.dark : outfit.bottom.light;
  const edge = isBear ? outfit.colors.trim : outfit.top.edge;
  const hatColor = isBear ? outfit.colors.dark : outfit.hat.light;

  return (
    <svg viewBox="0 0 48 56" width="46" height="52" aria-hidden="true">
      <path d="M24 9 a3.2 3.2 0 1 1 2.8 3.2 c0 2.4 -2.8 2.2 -2.8 5" fill="none" stroke="#9a8470" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M24 17 L7 25 L13 30 L18 27 L18 38 L30 38 L30 27 L35 30 L41 25 Z" fill={topLight} stroke={edge} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M18 35 L30 35 L30 39 L18 39 Z" fill={topDark} opacity="0.55" />
      <path d="M18 39 L30 39 L29 50 L19 50 Z" fill={bottomLight} stroke={edge} strokeWidth="1.1" />
      <circle cx="37" cy="12" r="5" fill={hatColor} stroke={edge} strokeWidth="1" />
      {!isBear && outfit.top.print !== 'none' && <circle cx="24" cy="30" r="2.6" fill={outfit.top.printColor} />}
    </svg>
  );
}

export const SWATCH_OUTFITS = { bear: BEAR_OUTFITS, fish: FISH_OUTFITS };

/* ------------------------------------------------------- try-on mirror */

/**
 * A tiny full-body stand-in for each character, drawn in the colours of the
 * outfit they are currently wearing. It lives inside the wardrobe card so the
 * change is visible right where the hanger was tapped, without scrolling back
 * up to the scene. Deliberately plain: solid fills, no gradients, no shared ids.
 */
export function TryOnPreview({ who, outfit }) {
  if (who === 'bear') {
    const { colors, shape, headwear, accent } = outfit;
    return (
      <svg viewBox="0 0 100 118" width="62" height="72" role="img" aria-hidden="true">
        <circle cx="28" cy="26" r="9" fill="#8f5d3d" />
        <circle cx="28" cy="26" r="4.6" fill="#e7b39a" />
        <circle cx="72" cy="26" r="9" fill="#8f5d3d" />
        <circle cx="72" cy="26" r="4.6" fill="#e7b39a" />

        <ellipse cx="50" cy="95" rx="24" ry="21" fill="#b07c55" />
        <circle cx="50" cy="48" r="24" fill="#b07c55" />
        <ellipse cx="50" cy="58" rx="13" ry="10" fill="#f6ddc1" />
        <ellipse cx="50" cy="55" rx="4" ry="3" fill="#3a2621" />
        <circle cx="41" cy="44" r="2.6" fill="#3a2621" />
        <circle cx="59" cy="44" r="2.6" fill="#3a2621" />

        {shape === 'scarf' ? (
          <g>
            <path d="M35 74 Q50 82 65 74 L64 80 Q50 88 36 80 Z" fill={colors.dark} />
            <path d="M35 74 Q50 82 65 74" stroke={colors.trim} strokeWidth="1.6" fill="none" />
            <path
              d="M50 82 C46 78, 43 75, 46 72 C48 70, 50 72, 50 74 C50 72, 52 70, 54 72 C57 75, 54 78, 50 82 Z"
              fill="#f1b94f"
            />
          </g>
        ) : (
          <g>
            <path
              d="M28 74 Q50 84 72 74 L74 106 Q50 112 26 106 Z"
              fill={colors.light}
              stroke={colors.dark}
              strokeWidth="1.4"
            />
            {shape === 'raincoat' && (
              <g>
                <path d="M42 75 L50 84 L58 75" stroke={colors.trim} strokeWidth="2.4" fill="none" />
                <line x1="50" y1="84" x2="50" y2="104" stroke={colors.dark} strokeWidth="1.2" opacity="0.6" />
                {[92, 100].map((y) => (
                  <circle key={y} cx="54" cy={y} r="1.8" fill={accent} />
                ))}
              </g>
            )}
            {shape === 'sweater' && (
              <g>
                <path d="M40 74 L50 88 L60 74" stroke={colors.trim} strokeWidth="3.4" fill="none" />
                <path d={starPath(50, 96, 6.5)} fill={accent} opacity="0.9" />
              </g>
            )}
            {shape === 'tux' && (
              <g>
                <path d="M42 74 L50 92 L58 74 Z" fill="#fff8ec" />
                <path d="M44 80 L38 76 L38 84 Z M56 80 L62 76 L62 84 Z" fill={accent} />
              </g>
            )}
          </g>
        )}

        {headwear === 'hood' && (
          <path
            d="M27 46 Q28 20 50 19 Q72 20 73 46 L64 46 Q62 30 50 29 Q38 30 36 46 Z"
            fill={colors.dark}
          />
        )}
        {headwear === 'beanie' && (
          <g>
            <path d="M33 36 Q36 13 50 11 Q64 13 67 36 Z" fill={colors.dark} />
            <rect x="32" y="33" width="36" height="7" rx="3.5" fill={colors.trim} />
            <circle cx="50" cy="9" r="4.6" fill={colors.trim} />
          </g>
        )}
        {headwear === 'tophat' && (
          <g>
            <rect x="39" y="4" width="22" height="18" rx="2.5" fill={colors.dark} />
            <rect x="39" y="16" width="22" height="5" fill={accent} opacity="0.9" />
            <rect x="31" y="21" width="38" height="5" rx="2.5" fill={colors.dark} />
          </g>
        )}
      </svg>
    );
  }

  const { top, bottom, hat, extra } = outfit;
  return (
    <svg viewBox="0 0 100 118" width="62" height="72" role="img" aria-hidden="true">
      <ellipse cx="50" cy="72" rx="27" ry="34" fill="#f2a869" />
      <path d="M26 60 Q12 46 12 30 Q26 34 32 46" fill="#e8964f" />
      <path d="M74 60 Q88 46 88 30 Q74 34 68 46" fill="#e8964f" />
      <circle cx="41" cy="58" r="3.4" fill="#3a2621" />
      <circle cx="59" cy="58" r="3.4" fill="#3a2621" />
      <circle cx="42.2" cy="56.8" r="1.1" fill="#fff8ec" />
      <circle cx="60.2" cy="56.8" r="1.1" fill="#fff8ec" />
      <ellipse cx="34" cy="68" rx="5" ry="3" fill="#e8795f" opacity="0.35" />
      <ellipse cx="66" cy="68" rx="5" ry="3" fill="#e8795f" opacity="0.35" />
      <path d="M45 70 Q50 74 55 70" stroke="#a4592f" strokeWidth="2" fill="none" strokeLinecap="round" />

      <path d="M32 54 L68 54 L68 84 Q50 90 32 84 Z" fill={top.light} stroke={top.edge} strokeWidth="1.4" />
      <path d="M32 54 Q22 57 22 66 Q22 70 26 70 Q30 70 33 64 Z" fill={top.light} stroke={top.edge} strokeWidth="1.4" />
      <path d="M68 54 Q78 57 78 66 Q78 70 74 70 Q70 70 67 64 Z" fill={top.light} stroke={top.edge} strokeWidth="1.4" />
      {top.print === 'star' && <path d={starPath(50, 66, 4.4)} fill={top.printColor} />}
      {top.print === 'stars' && (
        <g fill={top.printColor}>
          <path d={starPath(44, 62, 2.6)} />
          <path d={starPath(58, 72, 3)} />
        </g>
      )}
      {outfit.shape === 'shirt' && (
        <g>
          <path d="M45 54 L50 62 L55 54 Z" fill={top.edge} opacity="0.85" />
          <path d="M47 60 L50 63 L53 60 L50 58 Z" fill="#cf5e46" />
        </g>
      )}

      <path
        d={`M32 82 L68 82 L${bottom.shape === 'pants' ? 67 : 65} ${bottom.shape === 'pants' ? 108 : 100} Q50 ${bottom.shape === 'pants' ? 113 : 105} ${bottom.shape === 'pants' ? 33 : 35} ${bottom.shape === 'pants' ? 108 : 100} Z`}
        fill={bottom.light}
        stroke={bottom.edge}
        strokeWidth="1.3"
      />
      <rect x="31" y="80" width="38" height="6" rx="3" fill={bottom.dark} />

      {extra === 'apron' && (
        <path d="M38 66 L62 66 L66 96 Q50 101 34 96 Z" fill="#d9705e" stroke="#b9564a" strokeWidth="1.2" />
      )}

      {hat.shape === 'cap' && (
        <g>
          <path d="M30 40 A20 20 0 0 1 70 40 Z" fill={hat.light} />
          <rect x="14" y="37" width="15" height="7" rx="3.5" fill={hat.dark} />
        </g>
      )}
      {hat.shape === 'toque' && (
        <g>
          <path d="M29 40 Q24 22 38 24 Q41 14 50 17 Q61 14 64 24 Q78 22 71 40 Z" fill={hat.light} stroke={hat.dark} strokeWidth="1.2" />
          <rect x="28" y="37" width="44" height="8" rx="2.5" fill={hat.light} stroke={hat.dark} strokeWidth="1.2" />
        </g>
      )}
      {hat.shape === 'nightcap' && (
        <g>
          <path d="M28 40 Q46 16 70 36 Q60 45 50 38 Q40 45 28 40 Z" fill={hat.light} stroke={hat.dark} strokeWidth="1.2" />
          <circle cx="71" cy="35" r="4.6" fill="#fff3d4" />
        </g>
      )}
      {hat.shape === 'beret' && (
        <g>
          <path d="M29 40 Q34 22 52 23 Q70 24 71 40 Z" fill={hat.light} stroke={hat.dark} strokeWidth="1.2" />
          <path d="M27 39 Q50 46 73 39" stroke={hat.dark} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
