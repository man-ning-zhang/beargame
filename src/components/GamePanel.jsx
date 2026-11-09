import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { initialOf, otherSeat, symbolFor } from '../gameConfig';
import { breakpoints, palette } from '../theme';

const markIn = keyframes`
  0% { opacity: 0; transform: scale(0.5) rotate(-8deg); }
  70% { transform: scale(1.08) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.45; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
`;

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  color: ${palette.ink};
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 2px 13px;
  border-bottom: 1px solid ${palette.line};
`;

const Title = styled.h2`
  margin: 0 0 3px;
  font-family: 'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.03em;
`;

const Sub = styled.p`
  margin: 0;
  color: ${palette.muted};
  font-size: 10.5px;
`;

const Round = styled.span`
  margin-top: 3px;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(61, 47, 41, 0.05);
  color: ${palette.muted};
  font-size: 9.5px;
  font-weight: 600;
  white-space: nowrap;
`;

const Scoreboard = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 16px 10px 12px;
`;

const Player = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: ${palette.inkSoft};

  .name {
    max-width: 72px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 10.5px;
  }
`;

const Avatar = styled.span`
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 50%;
  background: ${(props) => props.$color};
  color: #fffaf4;
  font-size: 10.5px;
  font-weight: 700;
`;

const Score = styled.span`
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 24px;
  font-weight: 700;
  color: ${(props) => props.$me ? palette.coral : palette.ink};
  line-height: 1;
`;

const Colon = styled.span`
  color: ${palette.muted};
  font-size: 13px;
  opacity: 0.5;
`;

const BoardWrap = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  padding: 2px 0 4px;
`;

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: min(308px, 100%);
  aspect-ratio: 1;
  padding: 9px;
  border-radius: 22px;
  background:
    linear-gradient(145deg, rgba(123, 91, 140, 0.12), rgba(232, 121, 95, 0.08)),
    rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(61, 47, 41, 0.07);
  box-shadow: inset 0 2px 8px rgba(61, 47, 41, 0.05);

  @media (max-width: ${breakpoints.small}) {
    width: min(280px, 100%);
    gap: 6px;
  }
`;

const Cell = styled.button`
  position: relative;
  display: grid;
  place-items: center;
  border-radius: 15px;
  border: 1px solid ${(props) => (props.$win ? 'rgba(241, 185, 79, 0.55)' : 'rgba(61, 47, 41, 0.07)')};
  background: ${(props) =>
    props.$win
      ? 'linear-gradient(150deg, rgba(251, 232, 189, 0.95), rgba(246, 213, 148, 0.9))'
      : 'rgba(255, 252, 246, 0.9)'};
  cursor: ${(props) => (props.$playable ? 'pointer' : 'default')};
  transition: background 0.16s ease, transform 0.16s ease, border-color 0.16s ease;
  -webkit-tap-highlight-color: transparent;
  box-shadow: ${(props) => (props.$last ? '0 0 0 2px rgba(232, 121, 95, 0.22)' : 'none')};

  &:hover:not(:disabled) {
    background: #fff;
    border-color: rgba(232, 121, 95, 0.28);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 3px solid rgba(232, 121, 95, 0.28);
    outline-offset: 1px;
  }

  &:disabled {
    cursor: default;
  }

  svg {
    width: 54%;
    height: 54%;
    overflow: visible;
  }

  .mark {
    animation: ${markIn} 0.22s ease-out both;
  }
`;

const Status = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 34px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 12px;
  background: ${(props) => {
    if (props.$win) return 'rgba(241, 185, 79, 0.16)';
    if (props.$myTurn) return 'rgba(232, 121, 95, 0.09)';
    return 'rgba(61, 47, 41, 0.04)';
  }};
  color: ${(props) => {
    if (props.$win) return '#8a5c15';
    if (props.$myTurn) return palette.coralDeep;
    return palette.inkSoft;
  }};
  font-size: 11.5px;
  font-weight: 600;
  text-align: center;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    flex: none;
    border-radius: 50%;
    background: currentColor;
    ${(props) =>
      props.$active &&
      css`
        animation: ${pulse} 1.6s ease-in-out infinite;
      `}
  }
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
`;

const Note = styled.p`
  margin: 0;
  color: ${palette.muted};
  font-size: 9.5px;
  line-height: 1.5;

  @media (max-width: ${breakpoints.small}) {
    display: none;
  }
`;

const Rematch = styled.button`
  flex: none;
  padding: 9px 14px;
  border-radius: 12px;
  border: 0;
  background: linear-gradient(145deg, ${palette.coral}, ${palette.coralDeep});
  color: #fffaf4;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 16px -11px rgba(207, 94, 70, 0.8);
  transition: transform 0.16s ease, opacity 0.16s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const Waiting = styled.div`
  position: absolute;
  inset: 9px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border-radius: 17px;
  background: rgba(255, 248, 236, 0.82);
  backdrop-filter: blur(3px);
  color: ${palette.inkSoft};
  font-size: 12px;
  text-align: center;

  strong {
    font-size: 13px;
  }

  small {
    color: ${palette.muted};
    font-size: 10px;
  }
`;

function Mark({ value }) {
  if (value === 'X') {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true" className="mark">
        <path
          d="M 8 8 L 32 32 M 32 8 L 8 32"
          stroke={palette.coral}
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }
  if (value === 'O') {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true" className="mark">
        <circle cx="20" cy="20" r="12" fill="none" stroke="#5f8eae" strokeWidth="5.5" />
      </svg>
    );
  }
  return null;
}

export default function GamePanel({ room, me, connected, onMove, onRematch }) {
  const game = room.game;
  const partnerSeat = otherSeat(me);
  const partner = room.players?.[partnerSeat];
  const bothHere = Boolean(room.players?.host?.online && room.players?.guest?.online);
  const myTurn = game.turn === me && !game.winner;
  const playable = Boolean(connected && bothHere && myTurn && !game.winner);
  const mySymbol = symbolFor(me);
  const myScore = game.scores?.[me] ?? 0;
  const theirScore = game.scores?.[partnerSeat] ?? 0;
  const iWon = game.winner === me;
  const partnerWon = game.winner === partnerSeat;
  const draw = game.winner === 'draw';

  const statusText = () => {
    if (iWon) return '你赢啦，去讨一个晚安故事吧 🎉';
    if (partnerWon) return 'TA 赢啦，这局算 TA 的';
    if (draw) return '平局，谁也没让着谁';
    if (!partner) return '等 TA 推门进来，才能开局';
    if (!partner.online) return '等 TA 回到小屋，棋局先留在这里';
    if (myTurn) return `轮到你落子 · 你是 ${mySymbol}`;
    return `等 TA 落子 · TA 是 ${symbolFor(partnerSeat)}`;
  };

  return (
    <Wrap>
      <Head>
        <div>
          <Title>三子连珠</Title>
          <Sub>井字棋 · 输的人负责明天的早餐</Sub>
        </div>
        <Round>第 {game.round} 局</Round>
      </Head>

      <Scoreboard>
        <Player>
          <Avatar $color="#d9785f">{initialOf(room.players?.[me]?.name)}</Avatar>
          <div>
            <div className="name">你 · {mySymbol}</div>
            <Score $me>{myScore}</Score>
          </div>
        </Player>
        <Colon>:</Colon>
        <Player>
          <div style={{ textAlign: 'right' }}>
            <div className="name">{partner?.name || 'TA'} · {symbolFor(partnerSeat)}</div>
            <Score>{theirScore}</Score>
          </div>
          <Avatar $color="#7f9fbf">{initialOf(partner?.name)}</Avatar>
        </Player>
      </Scoreboard>

      <BoardWrap>
        <Board role="grid" aria-label="井字棋棋盘">
          {game.board.map((value, index) => {
            const winning = game.line.includes(index);
            const last = game.lastMove?.index === index;
            const canPlay = playable && !value;
            return (
              <Cell
                key={index}
                type="button"
                role="gridcell"
                $win={winning}
                $last={last}
                $playable={canPlay}
                onClick={() => onMove(index)}
                disabled={!canPlay}
                aria-label={`第 ${Math.floor(index / 3) + 1} 行第 ${(index % 3) + 1} 列${
                  value ? `，${value}` : ''
                }`}
              >
                <Mark value={value} />
              </Cell>
            );
          })}
        </Board>
        {!bothHere && (
          <Waiting>
            <strong>棋盘在等另一个人</strong>
            <small>{partner ? 'TA 暂时离开了小屋' : '把房间号发给 TA 吧'}</small>
          </Waiting>
        )}
      </BoardWrap>

      <Status $win={iWon || partnerWon || draw} $myTurn={myTurn} $active={myTurn || (!game.winner && bothHere)}>
        {statusText()}
      </Status>

      <Footer>
        <Note>三子连珠就赢。赢的人，可以点一首晚安曲。</Note>
        {game.winner ? (
          <Rematch type="button" onClick={onRematch} disabled={!connected || !bothHere}>
            再来一局
          </Rematch>
        ) : (
          <Rematch type="button" disabled>
            对局中
          </Rematch>
        )}
      </Footer>
    </Wrap>
  );
}
