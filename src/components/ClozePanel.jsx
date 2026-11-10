import React, { useEffect, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useI18n } from '../context/LanguageContext';
import { palette } from '../theme';

const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
`;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 11px;
  min-height: 300px;
  padding-top: 13px;
  color: ${palette.ink};
`;

const Hint = styled.p`
  margin: 0;
  color: ${palette.muted};
  font-size: 9.5px;
  letter-spacing: 0.04em;
  text-align: center;
`;

const Sentence = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  min-height: 86px;
  padding: 14px 12px;
  border-radius: 17px;
  border: 1px solid rgba(61, 47, 41, 0.07);
  background: linear-gradient(155deg, #fffdf8, #f8eedb);
  font-family: 'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif;
  font-size: 17px;
  line-height: 1.95;
  text-align: center;
  word-break: break-word;
  animation: ${rise} 0.25s ease-out both;
`;

const Blank = styled.span`
  display: inline-block;
  min-width: 2.4em;
  margin: 0 3px;
  padding: 0 4px;
  border-bottom: 2px solid ${palette.coral};
  color: ${palette.coralDeep};
  font-weight: 600;
  text-align: center;
  line-height: 1.3;
`;

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
`;

const Option = styled.button`
  height: 44px;
  padding: 0 8px;
  border-radius: 12px;
  border: 1px solid
    ${(props) => {
      if (props.$state === 'right') return 'rgba(127, 174, 139, 0.6)';
      if (props.$state === 'wrong') return 'rgba(232, 121, 95, 0.55)';
      return 'rgba(61, 47, 41, 0.1)';
    }};
  background: ${(props) => {
    if (props.$state === 'right') return 'rgba(127, 174, 139, 0.18)';
    if (props.$state === 'wrong') return 'rgba(232, 121, 95, 0.14)';
    return 'rgba(255, 255, 255, 0.85)';
  }};
  color: ${(props) => (props.$state === 'wrong' ? palette.coralDeep : palette.ink)};
  font-family: 'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif;
  font-size: 16px;
  font-weight: 600;
  cursor: ${(props) => (props.disabled ? 'default' : 'pointer')};
  transition: transform 0.14s ease, background 0.16s ease, border-color 0.16s ease;

  ${(props) =>
    props.$state === 'wrong' &&
    css`
      animation: ${shake} 0.3s ease;
    `}

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    background: #fff;
    border-color: rgba(232, 121, 95, 0.32);
  }

  &:focus-visible {
    outline: 2px solid rgba(232, 121, 95, 0.35);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: ${(props) => (props.$state ? 1 : 0.55)};
  }
`;

const Feedback = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px;
  border-radius: 13px;
  background: ${(props) => (props.$right ? 'rgba(127, 174, 139, 0.13)' : 'rgba(232, 121, 95, 0.11)')};
  animation: ${rise} 0.22s ease-out both;

  strong {
    color: ${(props) => (props.$right ? '#4f7a5c' : palette.coralDeep)};
    font-size: 11.5px;
  }

  .detail {
    color: ${palette.inkSoft};
    font-size: 10.5px;
    line-height: 1.55;
  }
`;

const Next = styled.button`
  height: 38px;
  border: 0;
  border-radius: 11px;
  background: linear-gradient(145deg, ${palette.coral}, ${palette.coralDeep});
  color: #fffaf4;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 16px -12px rgba(207, 94, 70, 0.9);

  &:hover:not(:disabled) {
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
  min-height: 260px;
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
`;

function formatWhen(days, t) {
  if (!days || days < 1) return t('study.minutes', { count: 10 });
  if (days === 1) return t('study.day', { count: 1 });
  return t('study.days', { count: days });
}

export default function ClozePanel({ question, result, connected, onRequest, onAnswer }) {
  const { t } = useI18n();
  const [chosen, setChosen] = useState('');

  useEffect(() => {
    setChosen('');
  }, [question?.key, question?.prompt]);

  const answered = Boolean(chosen);
  const right = result ? result.correct : answered && chosen === question?.answer;

  if (!question) {
    return (
      <Wrap>
        <Empty>
          <span className="emoji" aria-hidden="true">
            ✍️
          </span>
          <strong>{t('cloze.empty.title')}</strong>
          <span>{t('cloze.empty.body')}</span>
        </Empty>
      </Wrap>
    );
  }

  const [before, after] = String(question.prompt).split('＿＿');
  // HSK levels are numbers, DELF levels are strings.
  const textLang = typeof question.l === 'number' ? 'zh-Hans' : 'fr';

  return (
    <Wrap>
      <Hint>{t('cloze.hint')}</Hint>

      <Sentence lang={textLang}>
        {before}
        <Blank aria-label={t('cloze.blank')}>{answered ? question.answer : '　'}</Blank>
        {after}
      </Sentence>

      <Options>
        {question.options.map((option) => {
          let state = '';
          if (answered) {
            if (option === question.answer) state = 'right';
            else if (option === chosen) state = 'wrong';
          }
          return (
            <Option
              key={option}
              type="button"
              lang={textLang}
              $state={state}
              disabled={answered || !connected}
              onClick={() => {
                if (answered) return;
                setChosen(option);
                onAnswer(question.key, option);
              }}
            >
              {option}
            </Option>
          );
        })}
      </Options>

      {answered && (
        <Feedback $right={right} role="status">
          <strong>{right ? t('cloze.correct') : t('cloze.wrong', { answer: question.answer })}</strong>
          <span className="detail">
            {question.p ? `${question.p} · ${question.m}` : question.m}
            {result ? ` · ${t('cloze.nextIn', { when: formatWhen(result.interval, t) })}` : ''}
          </span>
        </Feedback>
      )}

      <Next type="button" onClick={onRequest} disabled={!connected || !answered}>
        {t('cloze.next')}
      </Next>
    </Wrap>
  );
}
