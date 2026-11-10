import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useI18n } from '../context/LanguageContext';
import ClozePanel from './ClozePanel';
import NotebookPanel from './NotebookPanel';
import { speak, speechSupported } from '../utils/speech';
import { breakpoints, palette } from '../theme';

const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pop = keyframes`
  0% { opacity: 0; transform: scale(0.94); }
  60% { transform: scale(1.015); }
  100% { opacity: 1; transform: scale(1); }
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

const Streak = styled.span`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 999px;
  background: ${(props) => (props.$on ? 'rgba(241, 185, 79, 0.18)' : 'rgba(61, 47, 41, 0.05)')};
  color: ${(props) => (props.$on ? '#92661c' : palette.muted)};
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.03em;
  white-space: nowrap;
`;

const ViewSwitch = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 11px;
  padding: 3px;
  border-radius: 11px;
  background: rgba(61, 47, 41, 0.05);
`;

const SwitchButton = styled.button`
  flex: 1;
  height: 26px;
  border: 0;
  border-radius: 8px;
  background: ${(props) => (props.$active ? 'rgba(255, 255, 255, 0.95)' : 'transparent')};
  color: ${(props) => (props.$active ? palette.ink : palette.muted)};
  font-size: 10px;
  font-weight: ${(props) => (props.$active ? 700 : 500)};
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;

  .count {
    margin-left: 4px;
    opacity: 0.55;
    font-variant-numeric: tabular-nums;
  }

  &:focus-visible {
    outline: 2px solid rgba(232, 121, 95, 0.35);
    outline-offset: 1px;
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 11px;
`;

const LangSwitch = styled.div`
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  background: rgba(61, 47, 41, 0.05);
`;

const LangButton = styled.button`
  height: 24px;
  padding: 0 9px;
  border: 0;
  border-radius: 7px;
  background: ${(props) => (props.$active ? 'rgba(255, 255, 255, 0.96)' : 'transparent')};
  color: ${(props) => (props.$active ? palette.ink : palette.muted)};
  font-size: 10px;
  font-weight: ${(props) => (props.$active ? 700 : 500)};
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid rgba(232, 121, 95, 0.35);
    outline-offset: 1px;
  }
`;

const Levels = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 13px 2px 0;

  .label {
    margin-right: 2px;
    color: ${palette.muted};
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
  }
`;

const LevelChip = styled.button`
  flex: 1;
  min-width: 0;
  height: 27px;
  padding: 0;
  border: 1px solid ${(props) => (props.$active ? 'transparent' : 'rgba(61, 47, 41, 0.09)')};
  border-radius: 9px;
  background: ${(props) =>
    props.$active ? 'linear-gradient(150deg, #e8795f, #d96951)' : 'rgba(255, 255, 255, 0.62)'};
  color: ${(props) => (props.$active ? '#fffaf4' : palette.inkSoft)};
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid rgba(232, 121, 95, 0.35);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Today = styled.div`
  padding: 13px 3px 0;
`;

const TodayRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 7px;

  strong {
    font-size: 11.5px;
    font-weight: 700;
    color: ${palette.ink};
  }

  span {
    color: ${palette.muted};
    font-size: 9.5px;
  }
`;

const LimitRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 9px;

  .label {
    margin-right: 2px;
    color: ${palette.muted};
    font-size: 8.5px;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }
`;

const LimitChip = styled.button`
  min-width: 28px;
  height: 22px;
  padding: 0 7px;
  border-radius: 7px;
  border: 1px solid ${(props) => (props.$active ? 'transparent' : 'rgba(61, 47, 41, 0.09)')};
  background: ${(props) => (props.$active ? 'rgba(232, 121, 95, 0.16)' : 'rgba(255, 255, 255, 0.6)')};
  color: ${(props) => (props.$active ? palette.coralDeep : palette.muted)};
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 9.5px;
  font-weight: ${(props) => (props.$active ? 700 : 500)};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    background: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid rgba(232, 121, 95, 0.35);
    outline-offset: 1px;
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
  width: ${(props) => props.$percent}%;
  border-radius: 999px;
  background: linear-gradient(90deg, ${palette.amber}, ${palette.coral});
  transition: width 0.4s ease;
`;

const Stage = styled.div`
  position: relative;
  margin-top: 14px;
  height: 218px;
  perspective: 1200px;

  @media (max-width: ${breakpoints.small}) {
    height: 200px;
  }
`;

const Flip = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform: rotateY(${(props) => (props.$flipped ? 180 : 0)}deg);
  transition: transform 0.52s cubic-bezier(0.2, 0.72, 0.3, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Face = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 22px 20px 20px;
  border-radius: 20px;
  border: 1px solid rgba(61, 47, 41, 0.07);
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.85), transparent 60%),
    linear-gradient(155deg, #fffdf8, #f8eedb);
  box-shadow:
    0 14px 30px -22px rgba(61, 47, 41, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  cursor: pointer;
  user-select: none;

  &:focus-visible {
    outline: 3px solid rgba(232, 121, 95, 0.3);
    outline-offset: 2px;
  }
`;

const Back = styled(Face)`
  transform: rotateY(180deg);
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.9), transparent 60%),
    linear-gradient(155deg, #fffdf8, #f4e7d2);
`;

const LevelTag = styled.span`
  position: absolute;
  top: 12px;
  left: 14px;
  padding: 3px 7px;
  border-radius: 6px;
  background: rgba(61, 47, 41, 0.055);
  color: ${palette.muted};
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
`;

const Hanzi = styled.div`
  font-family: 'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif;
  font-size: 56px;
  line-height: 1.1;
  letter-spacing: 0.04em;
  color: ${palette.ink};

  @media (max-width: ${breakpoints.small}) {
    font-size: 50px;
  }
`;

const BackHanzi = styled.div`
  font-family: 'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif;
  font-size: 21px;
  line-height: 1.2;
  color: rgba(61, 47, 41, 0.45);
`;

const Pinyin = styled.div`
  color: ${palette.coralDeep};
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.25;
`;

const Meaning = styled.div`
  max-width: 100%;
  color: ${palette.inkSoft};
  font-size: 12.5px;
  line-height: 1.55;
  text-align: center;
  word-break: break-word;
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: ${palette.muted};
  font-size: 9px;

  span {
    padding: 2px 6px;
    border-radius: 5px;
    background: rgba(61, 47, 41, 0.05);
  }
`;

const TapHint = styled.span`
  position: absolute;
  bottom: 14px;
  left: 0;
  right: 0;
  color: ${palette.muted};
  font-size: 9.5px;
  letter-spacing: 0.05em;
  text-align: center;
  opacity: 0.8;
`;

const Speak = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(61, 47, 41, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    background: #fff;
  }

  &:active {
    transform: scale(0.94);
  }

  &:focus-visible {
    outline: 2px solid rgba(232, 121, 95, 0.35);
    outline-offset: 1px;
  }
`;

const Grades = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  margin-top: 12px;
`;

const GradeButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 47px;
  padding: 0 4px;
  border-radius: 13px;
  border: 1px solid ${(props) => props.$border};
  background: ${(props) => props.$background};
  color: ${(props) => props.$color};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.16s ease, opacity 0.16s ease;

  small {
    font-size: 8.5px;
    font-weight: 500;
    opacity: 0.72;
    letter-spacing: 0.02em;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:focus-visible {
    outline: 2px solid rgba(232, 121, 95, 0.35);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  ${(props) =>
    props.$busy &&
    css`
      opacity: 0.7;
    `}
`;

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 218px;
  margin-top: 14px;
  padding: 20px;
  border-radius: 20px;
  border: 1px dashed rgba(61, 47, 41, 0.14);
  background: rgba(255, 255, 255, 0.45);
  text-align: center;
  animation: ${pop} 0.3s ease-out both;

  .emoji {
    font-size: 30px;
    margin-bottom: 2px;
  }

  strong {
    font-size: 12.5px;
    color: ${palette.inkSoft};
  }

  span {
    color: ${palette.muted};
    font-size: 10.5px;
    line-height: 1.6;
    max-width: 240px;
  }
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid ${palette.line};
  animation: ${rise} 0.3s ease-out both;

  .partner {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: ${palette.inkSoft};
    font-size: 9.5px;
    min-width: 0;

    &::before {
      content: '';
      width: 5px;
      height: 5px;
      flex: none;
      border-radius: 50%;
      background: ${(props) => (props.$done ? palette.sage : 'rgba(61, 47, 41, 0.22)')};
    }
  }

  .note {
    color: ${palette.muted};
    font-size: 8.5px;
    text-align: right;
    line-height: 1.4;

    @media (max-width: ${breakpoints.small}) {
      display: none;
    }
  }
`;

function intervalLabel(days, t) {
  if (!days || days < 1) return t('study.minutes', { count: 10 });
  if (days === 1) return t('study.day', { count: 1 });
  return t('study.days', { count: days });
}

export default function StudyPanel({
  room,
  connected,
  onGrade,
  onLevel,
  onLang,
  onLimit,
  onSaveNote,
  onRemoveNote,
  onToggleNoteStudy,
  cloze,
  clozeResult,
  onRequestCloze,
  onAnswerCloze,
}) {
  const { t } = useI18n();
  const study = room?.study ?? null;
  const card = study?.queue?.[0] ?? null;
  const notes = study?.notes ?? [];
  const [view, setView] = useState('cards');
  const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState('');

  // A new card means a fresh, face-down card.
  useEffect(() => {
    setRevealed(false);
    setPending('');
  }, [card?.w, study?.level]);

  // Ask for a question when the cloze view opens (once, not in a loop).
  const clozeAsked = useRef(false);
  // Switching language or level invalidates the question that is on screen.
  useEffect(() => {
    clozeAsked.current = false;
  }, [study?.lang, study?.level]);

  useEffect(() => {
    if (view !== 'cloze') {
      clozeAsked.current = false;
      return;
    }
    if (cloze || clozeAsked.current) return;
    clozeAsked.current = true;
    onRequestCloze();
  }, [view, cloze, onRequestCloze, study?.lang, study?.level]);

  useEffect(() => {
    if (!pending) return undefined;
    // "again" can bring the same card straight back; never leave the buttons
    // stuck in a pending state.
    const timer = window.setTimeout(() => setPending(''), 1600);
    return () => window.clearTimeout(timer);
  }, [pending]);

  const grade = useCallback(
    (value) => {
      if (!card || !connected || pending) return;
      setPending(value);
      // `key` carries the language prefix (fr:du); `w` alone only works for Chinese.
      onGrade(card.key ?? card.w, value);
    },
    [card, connected, onGrade, pending],
  );

  if (!study) return null;

  const { today } = study;
  const lang = study.lang ?? 'zh';
  const deckName = t(`study.deck.${lang}`);
  const percent = Math.min(100, Math.round((today.reviewed / Math.max(1, today.goal)) * 100));
  const canListen = speechSupported();
  const onCardKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setRevealed((value) => !value);
      return;
    }
    if (!revealed) return;
    if (event.key === '1') grade('again');
    else if (event.key === '2') grade('hard');
    else if (event.key === '3') grade('good');
  };

  return (
    <Wrap>
      <Head>
        <div>
          <Title>{t('study.title')}</Title>
          <Sub>{t('study.sub')}</Sub>
        </div>
      </Head>

      <TopRow>
        <LangSwitch role="group" aria-label={t('study.langAria')}>
          <LangButton
            type="button"
            $active={lang === 'zh'}
            aria-pressed={lang === 'zh'}
            disabled={!connected}
            onClick={() => onLang('zh')}
          >
            {t('study.lang.zh')}
          </LangButton>
          <LangButton
            type="button"
            $active={lang === 'fr'}
            aria-pressed={lang === 'fr'}
            disabled={!connected}
            onClick={() => onLang('fr')}
          >
            {t('study.lang.fr')}
          </LangButton>
        </LangSwitch>
        <Streak $on={study.streak > 0}>
          {study.streak > 0 ? `🔥 ${t('study.streak', { days: study.streak })}` : t('study.streak.none')}
        </Streak>
      </TopRow>

      <ViewSwitch role="tablist" aria-label={t('study.viewAria')}>
        <SwitchButton
          type="button"
          role="tab"
          aria-selected={view === 'cards'}
          $active={view === 'cards'}
          onClick={() => setView('cards')}
        >
          {t('study.view.cards')}
        </SwitchButton>
        <SwitchButton
          type="button"
          role="tab"
          aria-selected={view === 'cloze'}
          $active={view === 'cloze'}
          onClick={() => setView('cloze')}
        >
          {t('study.view.cloze')}
        </SwitchButton>
        <SwitchButton
          type="button"
          role="tab"
          aria-selected={view === 'notes'}
          $active={view === 'notes'}
          onClick={() => setView('notes')}
        >
          {t('study.view.notes')}
          {notes.length > 0 && <span className="count">{notes.length}</span>}
        </SwitchButton>
      </ViewSwitch>

      {view === 'cloze' ? (
        <ClozePanel
          question={cloze && cloze.lang === lang ? cloze : null}
          result={clozeResult}
          connected={connected}
          onRequest={onRequestCloze}
          onAnswer={onAnswerCloze}
        />
      ) : view === 'notes' ? (
        <div style={{ marginTop: 11 }}>
          <NotebookPanel
            notes={notes}
            lang={lang}
            connected={connected}
            myCards={study.myCards}
            onSave={onSaveNote}
            onRemove={onRemoveNote}
            onToggleStudy={onToggleNoteStudy}
          />
        </div>
      ) : (
        <>
      <Levels role="group" aria-label={t('study.levelGroup')}>
        <span className="label" aria-hidden="true">
          {deckName}
        </span>
        {study.levels.map((entry) => (
          <LevelChip
            key={entry.level}
            type="button"
            $active={entry.level === study.level}
            aria-pressed={entry.level === study.level}
            aria-label={t('study.levelAria', {
              deck: deckName,
              level: entry.level,
              learned: entry.learned,
              total: entry.total,
            })}
            title={t('study.levelAria', {
              deck: deckName,
              level: entry.level,
              learned: entry.learned,
              total: entry.total,
            })}
            onClick={() => onLevel(entry.level)}
            disabled={!connected}
          >
            {entry.level}
          </LevelChip>
        ))}
      </Levels>

      <Today>
        <TodayRow>
          <strong>{t('study.today', { count: today.reviewed, goal: today.goal })}</strong>
          <span>
            {t('study.learned', { count: study.learned, total: study.total })} ·{' '}
            {t('study.due', { count: study.due })}
          </span>
        </TodayRow>
        <Track>
          <Fill $percent={percent} />
        </Track>
        <LimitRow>
          <span className="label">{t('study.limit.label')}</span>
          {[10, 20, 50, 999].map((value) => (
            <LimitChip
              key={value}
              type="button"
              $active={today.newLimit === value}
              aria-pressed={today.newLimit === value}
              disabled={!connected}
              onClick={() => onLimit(value)}
            >
              {value === 999 ? t('study.limit.all') : value}
            </LimitChip>
          ))}
        </LimitRow>
      </Today>

      {card ? (
        <>
          <Stage>
            <Flip $flipped={revealed}>
              <Face
                role="button"
                tabIndex={0}
                aria-label={revealed ? card.w : t('study.cardFront', { word: card.w })}
                onClick={() => setRevealed((value) => !value)}
                onKeyDown={onCardKeyDown}
              >
                <LevelTag>
                  {card.custom ? t('study.tagCustom') : t('study.tag', { deck: deckName, level: card.l })}
                </LevelTag>
                <Hanzi lang={lang === 'fr' ? 'fr' : 'zh-Hans'}>{card.w}</Hanzi>
                <TapHint>{t('study.flip')}</TapHint>
              </Face>
              <Back aria-hidden={!revealed} onClick={() => setRevealed(false)}>
                <LevelTag>
                  {card.custom ? t('study.tagCustom') : t('study.tag', { deck: deckName, level: card.l })}
                </LevelTag>
                <BackHanzi lang={lang === 'fr' ? 'fr' : 'zh-Hans'}>{card.w}</BackHanzi>
                {card.p && <Pinyin>{card.p}</Pinyin>}
                <Meaning>{card.m}</Meaning>
                {(card.pos || card.c) && (
                  <Meta>
                    {card.pos && <span>{t('study.pos', { pos: card.pos })}</span>}
                    {card.c && <span>{t('study.classifier', { clf: card.c })}</span>}
                  </Meta>
                )}
              </Back>
            </Flip>
            {canListen && (
              <Speak
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  speak(card.w, lang === 'fr' ? 'fr-FR' : 'zh-CN');
                }}
                aria-label={t('study.listen', { word: card.w })}
                title={t('study.listen', { word: card.w })}
              >
                🔉
              </Speak>
            )}
          </Stage>

          <Grades>
            <GradeButton
              type="button"
              $busy={pending === 'again'}
              disabled={!revealed || !connected || Boolean(pending)}
              $border="rgba(232, 121, 95, 0.24)"
              $background="rgba(232, 121, 95, 0.09)"
              $color={palette.coralDeep}
              onClick={() => grade('again')}
            >
              {t('study.grade.again')}
              <small>{intervalLabel(0, t)}</small>
            </GradeButton>
            <GradeButton
              type="button"
              $busy={pending === 'hard'}
              disabled={!revealed || !connected || Boolean(pending)}
              $border="rgba(241, 185, 79, 0.32)"
              $background="rgba(241, 185, 79, 0.12)"
              $color="#96661a"
              onClick={() => grade('hard')}
            >
              {t('study.grade.hard')}
              <small>{intervalLabel(card.iv?.[0], t)}</small>
            </GradeButton>
            <GradeButton
              type="button"
              $busy={pending === 'good'}
              disabled={!revealed || !connected || Boolean(pending)}
              $border="rgba(127, 174, 139, 0.32)"
              $background="rgba(127, 174, 139, 0.13)"
              $color="#4f7a5c"
              onClick={() => grade('good')}
            >
              {t('study.grade.good')}
              <small>{intervalLabel(card.iv?.[1], t)}</small>
            </GradeButton>
          </Grades>
        </>
      ) : (
        <Empty>
          <span className="emoji" aria-hidden="true">
            {today.done ? '🎉' : '🌙'}
          </span>
          <strong>{today.done ? t('study.empty.title') : t('study.empty.newTitle')}</strong>
          <span>{today.done ? t('study.empty.body') : t('study.empty.newBody')}</span>
        </Empty>
      )}

        </>
      )}

      {view === 'cards' && (
      <Foot $done={Boolean(study.partner?.done)}>
        <span className="partner">
          {study.partner
            ? study.partner.reviewed > 0
              ? study.partner.done
                ? t('study.partner.done', { name: study.partner.name })
                : t('study.partner.progress', {
                    name: study.partner.name,
                    count: study.partner.reviewed,
                  })
              : t('study.partner.idle', { name: study.partner.name })
            : t('study.partner.none')}
        </span>
        <span className="note">{t(`study.note.${lang}`)}</span>
      </Foot>
      )}
    </Wrap>
  );
}
