import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useRoom } from '../context/RoomContext';
import { useI18n } from '../context/LanguageContext';
import LanguageToggle from './LanguageToggle';
import MusicButton from './MusicButton';
import { initialOf, otherSeat } from '../gameConfig';
import { breakpoints, palette } from '../theme';
import { isMuted, toggleMuted } from '../utils/sound';
import { setMusicMuted } from '../utils/music';

const fade = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Header = styled.header`
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 4px 0 18px;

  @media (max-width: ${breakpoints.small}) {
    gap: 8px;
  }
  animation: ${fade} 0.4s ease-out both;
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`;

const BrandMark = styled.div`
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 14px;
  background: linear-gradient(145deg, #f4c36a, #e8795f);
  font-size: 22px;
  box-shadow: 0 10px 24px -12px rgba(232, 121, 95, 0.8);
`;

const BrandBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

const BrandName = styled.span`
  color: ${palette.cream};
  font-family: 'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif;
  font-size: 17px;
  letter-spacing: 0.04em;
  white-space: nowrap;

  @media (max-width: ${breakpoints.small}) {
    font-size: 15px;
  }
`;

const RoomPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  align-self: flex-start;
  padding: 2px 8px 2px 0;
  border: 0;
  background: transparent;
  color: rgba(255, 248, 236, 0.55);
  font-size: 11px;
  letter-spacing: 0.16em;
  cursor: pointer;
  transition: color 0.2s ease;

  strong {
    color: ${palette.amber};
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    letter-spacing: 0.2em;
  }

  &:hover {
    color: rgba(255, 248, 236, 0.8);
  }

  &:focus-visible {
    outline: 2px solid rgba(241, 185, 79, 0.6);
    outline-offset: 3px;
    border-radius: 6px;
  }
`;

const Copied = styled.span`
  color: ${palette.sage};
  letter-spacing: 0.08em;
  animation: ${fade} 0.2s ease-out both;
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: ${breakpoints.small}) {
    gap: 6px;
  }
`;

const Players = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(255, 248, 236, 0.05);
  border: 1px solid rgba(255, 248, 236, 0.09);
  backdrop-filter: blur(10px);

  @media (max-width: ${breakpoints.small}) {
    gap: 2px;
  }
`;

const PlayerChip = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  background: ${(props) => (props.$me ? 'rgba(255, 248, 236, 0.1)' : 'transparent')};
  color: ${(props) => (props.$empty ? 'rgba(255,248,236,0.35)' : 'rgba(255,248,236,0.82)')};
  font-size: 12px;
  white-space: nowrap;
  min-width: 0;

  @media (max-width: ${breakpoints.small}) {
    padding-right: 7px;
    span.name {
      display: none;
    }
  }
`;

const Avatar = styled.span`
  position: relative;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 50%;
  background: ${(props) => props.$color};
  color: #fffaf4;
  font-size: 12px;
  font-weight: 700;

  &::after {
    content: '';
    position: absolute;
    right: -1px;
    bottom: -1px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 2px solid #191a2c;
    background: ${(props) => (props.$online ? palette.sage : '#7c746e')};
  }
`;

const Name = styled.span`
  max-width: 92px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const IconButton = styled.button`
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 12px;
  border: 1px solid rgba(255, 248, 236, 0.1);
  background: rgba(255, 248, 236, 0.05);
  color: rgba(255, 248, 236, 0.7);
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgba(255, 248, 236, 0.1);
    color: ${palette.cream};
  }

  &:focus-visible {
    outline: 2px solid rgba(241, 185, 79, 0.6);
    outline-offset: 2px;
  }

  @media (max-width: ${breakpoints.small}) {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    font-size: 13px;
  }
`;

const LeaveButton = styled(IconButton)`
  width: auto;
  padding: 0 13px;
  font-size: 12px;
  color: ${(props) => (props.$confirm ? '#ffb4a2' : 'rgba(255, 248, 236, 0.62)')};
  border-color: ${(props) => (props.$confirm ? 'rgba(232, 121, 95, 0.5)' : 'rgba(255, 248, 236, 0.1)')};
  background: ${(props) => (props.$confirm ? 'rgba(232, 121, 95, 0.14)' : 'rgba(255, 248, 236, 0.05)')};

  .leave-icon {
    display: none;
  }

  @media (max-width: ${breakpoints.small}) {
    padding: 0 9px;
    font-size: 0;

    .leave-icon {
      display: inline;
      font-size: 16px;
      line-height: 1;
    }

    .leave-text {
      display: none;
    }
  }
`;

function fallbackCopy(text) {
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  } catch {
    // Copy is a convenience only.
  }
}

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    return;
  }
  fallbackCopy(text);
}

export default function RoomHeader() {
  const { room, me, leave, status } = useRoom();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const copyTimer = useRef(null);
  const confirmTimer = useRef(null);

  useEffect(
    () => () => {
      window.clearTimeout(copyTimer.current);
      window.clearTimeout(confirmTimer.current);
    },
    [],
  );

  if (!room) return null;

  const partnerSeat = otherSeat(me);
  const partner = room.players?.[partnerSeat] ?? null;
  const mine = room.players?.[me] ?? null;

  const handleCopy = () => {
    copyText(room.code);
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const handleLeave = () => {
    if (!confirming) {
      setConfirming(true);
      window.clearTimeout(confirmTimer.current);
      confirmTimer.current = window.setTimeout(() => setConfirming(false), 3200);
      return;
    }
    window.clearTimeout(confirmTimer.current);
    leave();
  };

  return (
    <Header>
      <Left>
        <BrandMark aria-hidden="true">🐻</BrandMark>
        <BrandBlock>
          <BrandName>{t('brand.name')}</BrandName>
          <RoomPill
            type="button"
            onClick={handleCopy}
            title={t('room.copyTitle')}
            aria-label={t('room.copyAria', { code: room.code })}
          >
            {t('room.codeLabel')} <strong>{room.code}</strong>
            {copied ? <Copied>{t('room.copied')}</Copied> : <span aria-hidden="true">⧉</span>}
          </RoomPill>
        </BrandBlock>
      </Left>

      <Right>
        <Players>
          <PlayerChip $me>
            <Avatar $color="#d9785f" $online={Boolean(mine?.online)}>
              {initialOf(mine?.name)}
            </Avatar>
            <Name className="name">{mine?.name || t('room.you')}</Name>
          </PlayerChip>
          {partner ? (
            <PlayerChip>
              <Avatar $color="#7f9fbf" $online={Boolean(partner.online)}>
                {initialOf(partner.name)}
              </Avatar>
              <Name className="name">{partner.name}</Name>
            </PlayerChip>
          ) : (
            <PlayerChip $empty>
              <Avatar $color="#4a495c" $online={false}>
                ?
              </Avatar>
              <Name className="name">{t('room.waiting')}</Name>
            </PlayerChip>
          )}
        </Players>

        <LanguageToggle />

        <MusicButton />

        <IconButton
          type="button"
          onClick={() => {
            const next = toggleMuted();
            setMutedState(next);
            // One switch for all sound: muting also silences the music.
            setMusicMuted(next);
          }}
          title={muted ? t('room.soundOn') : t('room.soundOff')}
          aria-label={muted ? t('room.soundOn') : t('room.soundOff')}
          aria-pressed={!muted}
        >
          {muted ? '🔇' : '🔊'}
        </IconButton>

        <LeaveButton
          type="button"
          $confirm={confirming}
          onClick={handleLeave}
          disabled={status === 'reconnecting'}
          title={t('room.leaveTitle')}
          aria-label={t('room.leaveTitle')}
        >
          <span className="leave-icon" aria-hidden="true">
            {confirming ? '✓' : '×'}
          </span>
          <span className="leave-text">{confirming ? t('room.leaveConfirm') : t('room.leave')}</span>
        </LeaveButton>
      </Right>
    </Header>
  );
}
