import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { initialOf, formatClock, otherSeat, QUICK_EMOJIS } from '../gameConfig';
import { breakpoints, palette } from '../theme';

const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;
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

const Presence = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  padding: 5px 9px;
  border-radius: 999px;
  background: ${(props) => (props.$online ? 'rgba(127, 174, 139, 0.12)' : 'rgba(61, 47, 41, 0.05)')};
  color: ${(props) => (props.$online ? '#4f7a5c' : palette.muted)};
  font-size: 9.5px;
  font-weight: 600;
  white-space: nowrap;

  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }
`;

const Messages = styled.div`
  display: flex;
  flex-direction: column;
  gap: 11px;
  height: clamp(290px, 40vh, 400px);
  padding: 15px 4px 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(61, 47, 41, 0.18) transparent;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(61, 47, 41, 0.16);
    border-radius: 999px;
  }

  @media (max-width: ${breakpoints.medium}) {
    height: 330px;
  }
`;

const Empty = styled.div`
  display: flex;
  flex: ${(props) => (props.$inline ? '0 0 auto' : '1')};
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: ${(props) => (props.$inline ? '26px 24px 8px' : '24px')};
  text-align: center;

  .bear {
    font-size: 32px;
    opacity: 0.55;
    margin-bottom: 4px;
  }

  p {
    margin: 0;
    color: ${palette.inkSoft};
    font-size: 12.5px;
  }

  small {
    color: ${palette.muted};
    font-size: 10.5px;
  }
`;

const SystemRow = styled.div`
  display: flex;
  justify-content: center;
  padding: 2px 0;
`;

const SystemPill = styled.div`
  max-width: 88%;
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(61, 47, 41, 0.05);
  color: ${palette.muted};
  font-size: 9.5px;
  line-height: 1.5;
  text-align: center;
`;

const Row = styled.div`
  display: flex;
  flex-direction: ${(props) => (props.$mine ? 'row-reverse' : 'row')};
  align-items: flex-end;
  gap: 7px;
  animation: ${rise} 0.24s ease-out both;
`;

const Avatar = styled.div`
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  flex: none;
  border-radius: 50%;
  background: ${(props) => (props.$mine ? '#d9785f' : '#7f9fbf')};
  color: #fffaf4;
  font-size: 10.5px;
  font-weight: 700;
  margin-bottom: 2px;
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${(props) => (props.$mine ? 'flex-end' : 'flex-start')};
  gap: 4px;
  max-width: 78%;
  min-width: 0;
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 3px;
  color: ${palette.muted};
  font-size: 9px;

  strong {
    color: ${palette.inkSoft};
    font-weight: 600;
    font-size: 9.5px;
  }
`;

const Bubble = styled.div`
  max-width: 100%;
  padding: ${(props) => (props.$emoteOnly ? '6px 10px' : '9px 12px')};
  border-radius: ${(props) => (props.$mine ? '15px 15px 4px 15px' : '15px 15px 15px 4px')};
  background: ${(props) =>
    props.$mine ? 'linear-gradient(145deg, #e8795f, #d96951)' : 'rgba(255, 255, 255, 0.82)'};
  color: ${(props) => (props.$mine ? '#fffaf4' : palette.ink)};
  border: 1px solid ${(props) => (props.$mine ? 'rgba(207, 94, 70, 0.15)' : 'rgba(61, 47, 41, 0.07)')};
  box-shadow: ${(props) =>
    props.$mine ? '0 6px 14px -10px rgba(207, 94, 70, 0.55)' : '0 5px 12px -10px rgba(61, 47, 41, 0.4)'};
  font-size: 12.5px;
  line-height: 1.55;
  word-break: break-word;
  overflow-wrap: anywhere;

  .emote {
    display: block;
    font-size: 27px;
    line-height: 1.2;
  }

  .text {
    display: block;
    white-space: pre-wrap;
  }

  .emote + .text {
    margin-top: 2px;
    font-size: 11.5px;
  }
`;

const Composer = styled.form`
  padding-top: 12px;
  border-top: 1px solid ${palette.line};
`;

const EmojiRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;

  span.label {
    margin-right: 3px;
    color: ${palette.muted};
    font-size: 9.5px;
    letter-spacing: 0.04em;
  }

  @media (max-width: ${breakpoints.small}) {
    gap: 2px;
  }
`;

const EmojiButton = styled.button`
  display: grid;
  place-items: center;
  width: 30px;
  height: 28px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover:not(:disabled) {
    background: rgba(61, 47, 41, 0.06);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: scale(0.94);
  }

  &:focus-visible {
    outline: 2px solid rgba(232, 121, 95, 0.4);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  height: 42px;
  padding: 0 13px;
  border-radius: 13px;
  border: 1px solid ${palette.line};
  background: rgba(255, 255, 255, 0.72);
  color: ${palette.ink};
  font-size: 12.5px;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;

  &::placeholder {
    color: ${palette.muted};
  }

  &:focus {
    background: #fff;
    border-color: rgba(232, 121, 95, 0.45);
    box-shadow: 0 0 0 3px rgba(232, 121, 95, 0.08);
  }

  &:disabled {
    opacity: 0.55;
  }
`;

const Send = styled.button`
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: none;
  border: 0;
  border-radius: 13px;
  background: linear-gradient(145deg, ${palette.coral}, ${palette.coralDeep});
  color: #fffaf4;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 8px 16px -10px rgba(207, 94, 70, 0.7);
  transition: transform 0.18s ease, opacity 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: scale(0.96);
  }

  &:focus-visible {
    outline: 3px solid rgba(232, 121, 95, 0.3);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const Hint = styled.p`
  margin: 7px 0 0;
  color: ${palette.muted};
  font-size: 9px;
  text-align: right;
`;

export default function ChatPanel({ room, me, connected, onSend }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const partnerSeat = otherSeat(me);
  const partner = room.players?.[partnerSeat];
  const messages = room.chat || [];
  const hasChat = messages.some((message) => message.kind === 'chat');

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    if (onSend(clean, '')) {
      setText('');
      inputRef.current?.focus();
    }
  };

  const sendEmote = (emoji) => {
    onSend('', emoji);
    inputRef.current?.focus();
  };

  return (
    <Wrap>
      <Head>
        <div>
          <Title>悄悄话</Title>
          <Sub>只有你们两个人看得到</Sub>
        </div>
        <Presence $online={Boolean(partner?.online)}>
          {partner ? (partner.online ? 'TA 在线' : 'TA 暂时离开') : '等 TA 进来'}
        </Presence>
      </Head>

      <Messages ref={listRef} aria-live="polite" aria-label="聊天消息">
        {messages.length === 0 ? (
          <Empty>
            <span className="bear" aria-hidden="true">
              🐻
            </span>
            <p>这里还很安静。</p>
            <small>说一句“晚安”，或者先摸摸小熊。</small>
          </Empty>
        ) : (
          messages.map((message) => {
            if (message.kind === 'system') {
              return (
                <SystemRow key={message.id}>
                  <SystemPill>{message.text}</SystemPill>
                </SystemRow>
              );
            }
            const mine = message.seat === me;
            return (
              <Row key={message.id} $mine={mine}>
                <Avatar $mine={mine} aria-hidden="true">
                  {initialOf(message.name)}
                </Avatar>
                <Stack $mine={mine}>
                  <Meta>
                    {!mine && <strong>{message.name}</strong>}
                    <span>{formatClock(message.at)}</span>
                  </Meta>
                  <Bubble $mine={mine} $emoteOnly={Boolean(message.emote && !message.text)}>
                    {message.emote && (
                      <span className="emote" aria-hidden="true">
                        {message.emote}
                      </span>
                    )}
                    {message.text && <span className="text">{message.text}</span>}
                  </Bubble>
                </Stack>
              </Row>
            );
          })
        )}
        {messages.length > 0 && !hasChat && (
          <Empty $inline>
            <span className="bear" aria-hidden="true">
              🐻
            </span>
            <p>还没有悄悄话。</p>
            <small>先打个招呼，或者发一个表情给 TA。</small>
          </Empty>
        )}
      </Messages>

      <Composer onSubmit={handleSubmit}>
        <EmojiRow>
          <span className="label">快速回应</span>
          {QUICK_EMOJIS.map((emoji) => (
            <EmojiButton
              key={emoji}
              type="button"
              onClick={() => sendEmote(emoji)}
              disabled={!connected}
              aria-label={`发送 ${emoji}`}
            >
              {emoji}
            </EmojiButton>
          ))}
        </EmojiRow>
        <InputRow>
          <Input
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={connected ? '和 TA 说点什么…' : '正在重新连接…'}
            maxLength={120}
            disabled={!connected}
            aria-label="聊天输入框"
          />
          <Send type="submit" disabled={!connected || !text.trim()} aria-label="发送消息">
            ↑
          </Send>
        </InputRow>
        <Hint>按 Enter 发送 · 一次最多 120 个字</Hint>
      </Composer>
    </Wrap>
  );
}
