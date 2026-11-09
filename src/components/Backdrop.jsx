import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { palette } from '../theme';

const twinkle = keyframes`
  0%, 100% { opacity: 0.18; transform: scale(0.85); }
  50% { opacity: 0.9; transform: scale(1.15); }
`;

const drift = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(2%, -2%, 0) scale(1.05); }
`;

const Root = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(1200px 800px at 12% -10%, rgba(123, 91, 140, 0.28), transparent 60%),
    radial-gradient(1000px 700px at 95% 5%, rgba(232, 121, 95, 0.16), transparent 60%),
    linear-gradient(180deg, #10111d 0%, ${palette.night} 45%, #0c0d17 100%);
`;

const Aurora = styled.div`
  position: absolute;
  width: 52vw;
  height: 52vw;
  min-width: 420px;
  min-height: 420px;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.5;
  animation: ${drift} 22s ease-in-out infinite;
`;

const AuroraOne = styled(Aurora)`
  top: -22%;
  left: -12%;
  background: radial-gradient(circle, rgba(123, 91, 140, 0.55), transparent 66%);
`;

const AuroraTwo = styled(Aurora)`
  right: -18%;
  bottom: -30%;
  background: radial-gradient(circle, rgba(232, 121, 95, 0.3), transparent 68%);
  animation-delay: -9s;
`;

const MoonGlow = styled.div`
  position: absolute;
  top: 4%;
  right: 9%;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 232, 190, 0.13), transparent 68%);
  filter: blur(18px);
`;

const Star = styled.span`
  position: absolute;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 50%;
  background: #fff6dd;
  box-shadow: 0 0 ${(props) => props.$size * 2.5}px rgba(255, 236, 197, 0.55);
  animation: ${twinkle} ${(props) => props.$duration}s ease-in-out infinite;
  animation-delay: ${(props) => props.$delay}s;
`;

const Vignette = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 40%, transparent 38%, rgba(5, 6, 12, 0.55) 100%);
`;

export default function Backdrop() {
  const stars = useMemo(
    () =>
      Array.from({ length: 58 }, (_, index) => ({
        id: index,
        size: Math.random() * 2.2 + 0.8,
        left: Math.random() * 100,
        top: Math.random() * 88,
        duration: Math.random() * 4 + 3,
        delay: Math.random() * 5,
      })),
    [],
  );

  return (
    <Root aria-hidden="true">
      <AuroraOne />
      <AuroraTwo />
      <MoonGlow />
      {stars.map((star) => (
        <Star
          key={star.id}
          $size={star.size}
          $duration={star.duration}
          $delay={star.delay}
          style={{ left: `${star.left}%`, top: `${star.top}%` }}
        />
      ))}
      <Vignette />
    </Root>
  );
}
