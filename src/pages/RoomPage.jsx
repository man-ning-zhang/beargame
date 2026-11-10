import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import CarePanel from '../components/CarePanel';
import ChatPanel from '../components/ChatPanel';
import GamePanel from '../components/GamePanel';
import RoomHeader from '../components/RoomHeader';
import Scene from '../components/Scene';
import StudyPanel from '../components/StudyPanel';
import { useRoom } from '../context/RoomContext';
import { useI18n } from '../context/LanguageContext';
import { playSound } from '../utils/sound';
import { breakpoints, palette, shadows } from '../theme';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Page = styled.div`
  position: relative;
  z-index: 1;
  animation: ${fadeUp} 0.5s ease-out both;
`;

const Banner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 9px 16px;
  border-radius: 999px;
  background: rgba(241, 185, 79, 0.12);
  border: 1px solid rgba(241, 185, 79, 0.24);
  color: #f4cf8d;
  font-size: 11.5px;
  animation: ${slideDown} 0.25s ease-out both;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    animation: ${slideDown} 1s ease-in-out infinite alternate;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.28fr) minmax(330px, 0.88fr);
  gap: 18px;
  align-items: start;

  @media (max-width: ${breakpoints.wide}) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const Main = styled.div`
  min-width: 0;
`;

const Side = styled.aside`
  min-width: 0;
  position: sticky;
  top: 16px;

  @media (max-width: ${breakpoints.wide}) {
    position: static;
  }
`;

const SideCard = styled.div`
  padding: 18px 18px 16px;
  border-radius: 28px;
  background: linear-gradient(160deg, rgba(255, 252, 246, 0.99), rgba(250, 241, 228, 0.99));
  color: ${palette.ink};
  box-shadow: ${shadows.card};
  border: 1px solid rgba(255, 255, 255, 0.6);

  @media (max-width: ${breakpoints.medium}) {
    padding: 15px 14px 14px;
    border-radius: 23px;
  }
`;

const Tabs = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 3px;
  margin-bottom: 14px;
  padding: 4px;
  border-radius: 14px;
  background: rgba(61, 47, 41, 0.055);
`;

const Tab = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 36px;
  padding: 0 2px;
  border: 0;
  border-radius: 11px;
  background: ${(props) => (props.$active ? 'rgba(255, 255, 255, 0.94)' : 'transparent')};
  color: ${(props) => (props.$active ? palette.ink : palette.muted)};
  font-size: 11px;
  white-space: nowrap;
  font-weight: ${(props) => (props.$active ? 700 : 500)};
  cursor: pointer;
  box-shadow: ${(props) => (props.$active ? '0 5px 12px -8px rgba(61, 47, 41, 0.35)' : 'none')};
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    color: ${palette.ink};
  }

  &:focus-visible {
    outline: 2px solid rgba(232, 121, 95, 0.35);
    outline-offset: 1px;
  }

  .icon {
    font-size: 13px;
  }
`;

const Badge = styled.span`
  display: grid;
  place-items: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: ${palette.coral};
  color: #fffaf4;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
`;

const TabBody = styled.div`
  min-height: 0;
`;

const AsideNote = styled.p`
  margin: 12px 4px 0;
  color: rgba(255, 248, 236, 0.34);
  font-size: 9.5px;
  line-height: 1.65;
  text-align: center;
`;

const Foot = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 26px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 248, 236, 0.07);
  color: rgba(255, 248, 236, 0.28);
  font-size: 9.5px;
  letter-spacing: 0.06em;

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  @media (max-width: ${breakpoints.small}) {
    justify-content: center;
  }
`;

export default function RoomPage() {
  const {
    room,
    me,
    status,
    connected,
    clockOffset,
    doAction,
    sendChat,
    makeMove,
    rematch,
    gradeCard,
    setStudyLevel,
    setStudyLang,
    setStudyLimit,
    cloze,
    clozeResult,
    requestCloze,
    answerCloze,
    saveNote,
    removeNote,
    toggleNoteStudy,
  } = useRoom();
  const { t } = useI18n();

  const [tab, setTab] = useState('chat');
  const [reaction, setReaction] = useState(null);
  const [bubble, setBubble] = useState(null);
  const [seenChatId, setSeenChatId] = useState(0);

  const lastLogId = useRef(0);
  const lastChatId = useRef(0);
  const lastWinner = useRef(null);

  const latestLogId = room?.log?.[0]?.id ?? 0;
  const latestChat = room?.chat?.length ? room.chat[room.chat.length - 1] : null;
  const latestChatId = latestChat?.id ?? 0;

  // When a room is first opened (or a different room is joined), remember what
  // is already on screen so old messages do not replay as a burst of animations.
  useEffect(() => {
    lastLogId.current = room?.log?.[0]?.id ?? 0;
    lastChatId.current = room?.chat?.length ? room.chat[room.chat.length - 1].id : 0;
    lastWinner.current = room?.game?.winner ?? null;
    // Only re-baseline when the room itself changes, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code]);

  useEffect(() => {
    if (!room?.log?.length) return;
    const latest = room.log[0];
    if (latest.id === lastLogId.current) return;
    lastLogId.current = latest.id;
    setReaction({ type: latest.action, id: latest.id });
    playSound(latest.action);
    // Only the newest log entry matters for the reaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestLogId]);

  useEffect(() => {
    if (!reaction) return undefined;
    const timer = window.setTimeout(() => setReaction(null), 1600);
    return () => window.clearTimeout(timer);
  }, [reaction]);

  useEffect(() => {
    if (!latestChat) return;
    if (latestChat.id === lastChatId.current) return;
    lastChatId.current = latestChat.id;
    if (latestChat.kind === 'system') return;
    setBubble(latestChat);
    playSound(latestChat.seat === me ? 'sent' : 'message');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestChatId, me]);

  useEffect(() => {
    if (!bubble) return undefined;
    const timer = window.setTimeout(() => setBubble(null), 4600);
    return () => window.clearTimeout(timer);
  }, [bubble]);

  useEffect(() => {
    if (tab === 'chat' && latestChatId) setSeenChatId(latestChatId);
  }, [tab, latestChatId]);

  const winner = room?.game?.winner ?? null;
  useEffect(() => {
    if (winner && winner !== lastWinner.current) {
      if (winner === me) playSound('win');
      else playSound('softWin');
    }
    lastWinner.current = winner;
  }, [winner, me]);

  if (!room || !me) return null;

  const chatMessages = (room.chat || []).filter((message) => message.kind === 'chat');
  const unread =
    tab === 'chat'
      ? 0
      : chatMessages.filter((message) => message.seat !== me && message.id > seenChatId).length;
  const reconnecting = status === 'reconnecting' || !connected;

  return (
    <Page>
      <RoomHeader />

      {reconnecting && (
        <Banner role="status">
          {t('room.reconnectBanner')}
        </Banner>
      )}

      <Grid>
        <Main>
          <Scene
            room={room}
            me={me}
            bubble={bubble}
            reaction={reaction}
            onPet={() => doAction('pet')}
            connected={connected}
          />
          <CarePanel
            room={room}
            connected={connected}
            clockOffset={clockOffset}
            onAction={doAction}
          />
        </Main>

        <Side>
          <SideCard>
            <Tabs role="tablist" aria-label={t('tabs.aria')}>
              <Tab
                type="button"
                role="tab"
                aria-selected={tab === 'chat'}
                $active={tab === 'chat'}
                onClick={() => setTab('chat')}
              >
                <span className="icon" aria-hidden="true">
                  💬
                </span>
                {t('tabs.chat')}
                {unread > 0 && <Badge>{unread > 9 ? '9+' : unread}</Badge>}
              </Tab>
              <Tab
                type="button"
                role="tab"
                aria-selected={tab === 'game'}
                $active={tab === 'game'}
                onClick={() => setTab('game')}
              >
                <span className="icon" aria-hidden="true">
                  🎲
                </span>
                {t('tabs.game')}
              </Tab>
              <Tab
                type="button"
                role="tab"
                aria-selected={tab === 'study'}
                $active={tab === 'study'}
                onClick={() => setTab('study')}
              >
                <span className="icon" aria-hidden="true">
                  📖
                </span>
                {t('tabs.study')}
              </Tab>
            </Tabs>

            <TabBody>
              {tab === 'chat' && (
                <ChatPanel room={room} me={me} connected={connected} onSend={sendChat} />
              )}
              {tab === 'game' && (
                <GamePanel
                  room={room}
                  me={me}
                  connected={connected}
                  onMove={makeMove}
                  onRematch={rematch}
                />
              )}
              {tab === 'study' && (
                <StudyPanel
                  room={room}
                  connected={connected}
                  onGrade={gradeCard}
                  onLevel={setStudyLevel}
                  onLang={setStudyLang}
                  onLimit={setStudyLimit}
                  cloze={cloze}
                  clozeResult={clozeResult}
                  onRequestCloze={requestCloze}
                  onAnswerCloze={answerCloze}
                  onSaveNote={saveNote}
                  onRemoveNote={removeNote}
                  onToggleNoteStudy={toggleNoteStudy}
                />
              )}
            </TabBody>
          </SideCard>

          <AsideNote>
            {t('room.aside1', { code: room.code })}
            <br />
            {t('room.aside2')}
          </AsideNote>
        </Side>

        <Foot style={{ gridColumn: '1 / -1' }}>
          <span>🐻 Bear Together</span>
          <span>{t('room.footerNote')}</span>
        </Foot>
      </Grid>
    </Page>
  );
}
