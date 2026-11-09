import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { ACTIONS } from '../gameConfig';
import { breakpoints, palette, shadows } from '../theme';

const slide = keyframes`
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
`;

const Panel = styled.section`
  margin-top: 16px;
  padding: 20px clamp(16px, 2.4vw, 24px);
  border-radius: 26px;
  background: linear-gradient(160deg, rgba(255, 252, 246, 0.99), rgba(250, 241, 228, 0.99));
  color: ${palette.ink};
  box-shadow: ${shadows.card};
  border: 1px solid rgba(255, 255, 255, 0.6);

  @media (max-width: ${breakpoints.medium}) {
    padding: 16px 14px;
    border-radius: 22px;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
`;

const Title = styled.h2`
  margin: 0 0 4px;
  font-family: 'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.03em;
`;

const Sub = styled.p`
  margin: 0;
  color: ${palette.muted};
  font-size: 11px;
  line-height: 1.5;
`;

const Bonus = styled.span`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  padding: 5px 9px;
  border-radius: 999px;
  background: ${(props) => (props.$on ? 'rgba(241, 185, 79, 0.16)' : 'rgba(61, 47, 41, 0.05)')};
  color: ${(props) => (props.$on ? '#92661c' : palette.muted)};
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: ${breakpoints.small}) {
    gap: 7px;
  }
`;

const Stat = styled.div`
  padding: 11px 12px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(61, 47, 41, 0.06);
`;

const StatTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 8px;
`;

const StatName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: ${palette.inkSoft};
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
`;

const Value = styled.span`
  color: ${(props) => props.$color};
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  font-weight: 700;

  small {
    font-size: 8px;
    font-weight: 500;
    opacity: 0.6;
    margin-left: 1px;
  }
`;

const Track = styled.div`
  height: 6px;
  border-radius: 999px;
  background: rgba(61, 47, 41, 0.08);
  overflow: hidden;
`;

const Fill = styled.div`
  height: 100%;
  width: ${(props) => `${Math.max(0, Math.min(100, props.$value))}%`};
  border-radius: inherit;
  background: ${(props) => props.$color};
  transition: width 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 0 8px ${(props) => props.$glow};
`;

const BondRow = styled.div`
  margin-top: 12px;
  padding: 11px 12px;
  border-radius: 15px;
  background: linear-gradient(100deg, rgba(248, 214, 205, 0.45), rgba(251, 232, 189, 0.4));
  border: 1px solid rgba(232, 121, 95, 0.08);
`;

const BondHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
  font-size: 10.5px;

  strong {
    color: ${palette.coralDeep};
    font-size: 11.5px;
    letter-spacing: 0.02em;
  }

  span {
    color: ${palette.inkSoft};
  }

  em {
    color: ${palette.muted};
    font-style: normal;
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    font-size: 10px;
  }
`;

const BondTrack = styled(Track)`
  background: rgba(232, 121, 95, 0.12);
`;

const BondFill = styled(Fill)`
  background: linear-gradient(90deg, ${palette.coral}, ${palette.amber});
  box-shadow: 0 0 10px rgba(232, 121, 95, 0.35);
`;

const LogLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  margin: 12px 0 4px;
  padding: 0 2px;
  color: ${palette.inkSoft};
  font-size: 11px;
  animation: ${slide} 0.3s ease-out both;

  .spark {
    color: ${palette.amber};
    font-size: 12px;
  }

  .log-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const ActionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 14px 0 9px;

  h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  span {
    color: ${palette.muted};
    font-size: 10px;
  }

  @media (max-width: ${breakpoints.small}) {
    span {
      display: none;
    }
  }
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: ${breakpoints.small}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const ActionButton = styled.button`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 11px 6px 9px;
  overflow: hidden;
  border-radius: 15px;
  border: 1px solid ${(props) => (props.$tone === 'coral' ? 'rgba(232, 121, 95, 0.18)' : 'rgba(61, 47, 41, 0.08)')};
  background: ${(props) => {
    if (props.$tone === 'amber') return 'linear-gradient(165deg, #fff7e7, #fbe9c4)';
    if (props.$tone === 'coral') return 'linear-gradient(165deg, #fff0eb, #f9d9d0)';
    if (props.$tone === 'pink') return 'linear-gradient(165deg, #fff1f1, #f6dcdd)';
    return 'linear-gradient(165deg, #f2f7fb, #dce9f3)';
  }};
  color: ${palette.ink};
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  -webkit-tap-highlight-color: transparent;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 18px -14px rgba(61, 47, 41, 0.55);
    border-color: rgba(232, 121, 95, 0.26);
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(0.985);
  }

  &:focus-visible {
    outline: 3px solid rgba(232, 121, 95, 0.3);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    filter: saturate(0.55);
    opacity: 0.62;
  }

  .icon {
    font-size: 21px;
    line-height: 1.15;
  }

  .label {
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .effect {
    font-size: 9px;
    color: ${palette.muted};
    white-space: nowrap;
  }

  .cool {
    position: absolute;
    right: 5px;
    top: 5px;
    min-width: 20px;
    padding: 2px 4px;
    border-radius: 999px;
    background: rgba(61, 47, 41, 0.62);
    color: #fff8ec;
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    font-size: 8.5px;
    text-align: center;
    line-height: 1.3;
  }

  .cool-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2.5px;
    background: rgba(61, 47, 41, 0.22);
    transform-origin: left;
    transform: scaleX(${(props) => props.$coolProgress});
    transition: transform 0.25s linear;
  }
`;

export default function CarePanel({ room, connected, clockOffset, onAction }) {
  const [now, setNow] = useState(() => Date.now() + clockOffset);

  useEffect(() => {
    setNow(Date.now() + clockOffset);
    const timer = window.setInterval(() => setNow(Date.now() + clockOffset), 250);
    return () => window.clearInterval(timer);
  }, [clockOffset]);

  const latest = room.log?.[0];
  const stats = [
    {
      id: 'fullness',
      icon: '🍯',
      label: '饱腹',
      value: room.stats.fullness,
      color: palette.amber,
      glow: 'rgba(241,185,79,0.4)',
    },
    {
      id: 'mood',
      icon: '💛',
      label: '心情',
      value: room.stats.mood,
      color: palette.coral,
      glow: 'rgba(232,121,95,0.35)',
    },
    {
      id: 'energy',
      icon: '🌙',
      label: '精力',
      value: room.stats.energy,
      color: palette.sky,
      glow: 'rgba(143,182,217,0.35)',
    },
  ];

  return (
    <Panel>
      <Head>
        <div>
          <Title>今天的小熊</Title>
          <Sub>你们离开时它会打盹，所以不用太担心。</Sub>
        </div>
        <Bonus $on={room.together}>{room.together ? '✦ 陪伴加成' : '· 慢慢陪伴'}</Bonus>
      </Head>

      <StatsGrid>
        {stats.map((stat) => (
          <Stat key={stat.id}>
            <StatTop>
              <StatName>
                <span aria-hidden="true">{stat.icon}</span>
                {stat.label}
              </StatName>
              <Value $color={stat.color}>
                {Math.round(stat.value)}
                <small>%</small>
              </Value>
            </StatTop>
            <Track
              role="progressbar"
              aria-label={stat.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(stat.value)}
            >
              <Fill $value={stat.value} $color={stat.color} $glow={stat.glow} />
            </Track>
          </Stat>
        ))}
      </StatsGrid>

      <BondRow>
        <BondHead>
          <span>
            亲密度 · <strong>{room.bond.name}</strong>
          </span>
          <em>
            {room.bond.next ? `${room.bond.points} / ${room.bond.next}` : `${room.bond.points} · 满格`}
          </em>
        </BondHead>
        <BondTrack
          role="progressbar"
          aria-label={`亲密度 ${room.bond.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(room.bond.progress * 100)}
        >
          <BondFill $value={room.bond.progress * 100} />
        </BondTrack>
      </BondRow>

      <LogLine key={latest?.id ?? 'quiet'}>
        <span className="spark" aria-hidden="true">
          ✦
        </span>
        <span className="log-text">{latest?.text ?? '小熊正在等你们一起玩。'}</span>
      </LogLine>

      <ActionHead>
        <h3>陪它做点什么</h3>
        <span>点击小熊，也能摸摸它的头</span>
      </ActionHead>

      <Actions>
        {ACTIONS.map((action) => {
          const readyAt = room.cooldowns?.[action.id] ?? 0;
          const remaining = Math.max(0, readyAt - now);
          const cooling = remaining > 0;
          const progress = cooling ? Math.min(1, remaining / (action.cooldown * 1000)) : 0;
          return (
            <ActionButton
              key={action.id}
              type="button"
              $tone={action.tone}
              $coolProgress={progress}
              onClick={() => onAction(action.id)}
              disabled={!connected || cooling}
              title={cooling ? `${Math.ceil(remaining / 1000)} 秒后可以再来一次` : action.effect}
            >
              <span className="icon" aria-hidden="true">
                {action.icon}
              </span>
              <span className="label">{action.label}</span>
              <span className="effect">{action.effect}</span>
              {cooling && <span className="cool">{Math.ceil(remaining / 1000)}s</span>}
              {cooling && <span className="cool-bar" aria-hidden="true" />}
            </ActionButton>
          );
        })}
      </Actions>
    </Panel>
  );
}
