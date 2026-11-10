import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useI18n } from '../context/LanguageContext';
import { palette } from '../theme';
import { StrokeBoard } from './WritingModal';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-top: 13px;
  color: ${palette.ink};
`;

const Progress = styled.p`
  margin: 0;
  color: ${palette.muted};
  font-size: 9.5px;
  letter-spacing: 0.04em;
`;

const Word = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 2px 0 9px;

  strong {
    font-family: 'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  span {
    color: ${palette.coralDeep};
    font-size: 10.5px;
  }

  em {
    color: ${palette.muted};
    font-size: 9.5px;
    font-style: normal;
  }
`;

const Next = styled.button`
  width: 100%;
  height: 36px;
  margin-top: 11px;
  border: 0;
  border-radius: 11px;
  background: linear-gradient(145deg, ${palette.coral}, ${palette.coralDeep});
  color: #fffaf4;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 16px -12px rgba(207, 94, 70, 0.9);
  transition: transform 0.15s ease, opacity 0.15s ease;

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 280px;
  padding: 20px;
  border-radius: 17px;
  border: 1px dashed rgba(61, 47, 41, 0.14);
  background: rgba(255, 255, 255, 0.42);
  text-align: center;

  .emoji {
    font-size: 26px;
    opacity: 0.7;
  }

  strong {
    color: ${palette.inkSoft};
    font-size: 12px;
  }

  span {
    max-width: 230px;
    color: ${palette.muted};
    font-size: 10px;
    line-height: 1.6;
  }

  button {
    margin-top: 4px;
    height: 30px;
    padding: 0 14px;
    border-radius: 9px;
    border: 1px solid rgba(61, 47, 41, 0.12);
    background: rgba(255, 255, 255, 0.8);
    color: ${palette.inkSoft};
    font-size: 10.5px;
    cursor: pointer;
  }
`;

export default function WritingPanel({ cards = [], lang = 'zh' }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [restartKey, setRestartKey] = useState(0);

  // Only Chinese words can be written; French cards have no strokes.
  const queue = useMemo(() => cards.filter((card) => /[\u3400-\u9fff]/.test(card.w)), [cards]);

  if (lang !== 'zh') {
    return (
      <Wrap>
        <Empty>
          <span className="emoji" aria-hidden="true">
            ✍️
          </span>
          <strong>{t('write.onlyChinese')}</strong>
          <span>{t('write.onlyChineseBody')}</span>
        </Empty>
      </Wrap>
    );
  }

  if (!queue.length) {
    return (
      <Wrap>
        <Empty>
          <span className="emoji" aria-hidden="true">
            ✍️
          </span>
          <strong>{t('write.empty.title')}</strong>
          <span>{t('write.empty.body')}</span>
        </Empty>
      </Wrap>
    );
  }

  if (index >= queue.length) {
    return (
      <Wrap>
        <Empty>
          <span className="emoji" aria-hidden="true">
            ✨
          </span>
          <strong>{t('write.finished')}</strong>
          <span>{t('write.finishedBody', { count: queue.length })}</span>
          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setRestartKey((value) => value + 1);
            }}
          >
            {t('write.restart')}
          </button>
        </Empty>
      </Wrap>
    );
  }

  const card = queue[index];

  return (
    <Wrap key={`${card.key}-${restartKey}`}>
      <Progress>{t('write.progress', { current: index + 1, total: queue.length })}</Progress>
      <Word>
        <strong lang="zh-Hans">{card.w}</strong>
        {card.p && <span>{card.p}</span>}
        <em>{card.m}</em>
      </Word>

      <StrokeBoard
        word={card.w}
        size={168}
        autoPlay
        onFinished={() => {
          // Give the tick a moment, then move on.
          window.setTimeout(() => setIndex((value) => value + 1), 1100);
        }}
      />

      <Next type="button" onClick={() => setIndex((value) => value + 1)}>
        {t('write.next')}
      </Next>
    </Wrap>
  );
}
