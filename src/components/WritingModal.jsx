import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import HanziWriter from 'hanzi-writer';
import styled, { keyframes } from 'styled-components';
import { useI18n } from '../context/LanguageContext';
import { palette, shadows } from '../theme';

const DEFAULT_SIZE = 190;

const fade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const pop = keyframes`
  0% { opacity: 0; transform: translateY(8px) scale(0.96); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(38, 28, 24, 0.45);
  backdrop-filter: blur(3px);
  animation: ${fade} 0.18s ease-out;
`;

const Panel = styled.div`
  width: min(280px, 100%);
  padding: 16px;
  border-radius: 20px;
  background: #fffaf1;
  box-shadow: ${shadows.card};
  animation: ${pop} 0.22s ease-out;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  strong {
    font-family: 'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 0.08em;
  }

  button {
    width: 26px;
    height: 26px;
    border: 0;
    border-radius: 8px;
    background: rgba(61, 47, 41, 0.06);
    color: ${palette.muted};
    font-size: 14px;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background: rgba(61, 47, 41, 0.1);
    }
  }
`;

const CharTabs = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 10px;

  button {
    min-width: 34px;
    height: 30px;
    padding: 0 8px;
    border-radius: 9px;
    border: 1px solid rgba(61, 47, 41, 0.1);
    background: rgba(255, 255, 255, 0.7);
    color: ${palette.inkSoft};
    font-family: 'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif;
    font-size: 15px;
    cursor: pointer;

    &[data-active='true'] {
      border-color: transparent;
      background: rgba(232, 121, 95, 0.16);
      color: ${palette.coralDeep};
    }
  }
`;

const Stage = styled.div`
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(61, 47, 41, 0.07);
  overflow: hidden;

  svg {
    display: block;
  }
`;

const Hint = styled.p`
  margin: 0;
  padding: 18px 8px;
  color: ${palette.muted};
  font-size: 10.5px;
  line-height: 1.6;
  text-align: center;
`;

const Controls = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 11px;
`;

const ControlButton = styled.button`
  flex: 1;
  height: 34px;
  border-radius: 10px;
  border: 1px solid ${(props) => (props.$active ? 'transparent' : 'rgba(61, 47, 41, 0.1)')};
  background: ${(props) =>
    props.$active
      ? `linear-gradient(145deg, ${palette.coral}, ${palette.coralDeep})`
      : 'rgba(255, 255, 255, 0.75)'};
  color: ${(props) => (props.$active ? '#fffaf4' : palette.inkSoft)};
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const Status = styled.p`
  margin: 9px 0 0;
  min-height: 14px;
  color: ${(props) => (props.$done ? '#4f7a5c' : palette.muted)};
  font-size: 10px;
  text-align: center;
`;

/**
 * The stroke animation + tracing canvas for one word. Reused by the card
 * pop-up and by the standalone writing tab.
 */
export function StrokeBoard({ word, size = DEFAULT_SIZE, autoPlay = true, onFinished }) {
  const { t } = useI18n();
  const chars = Array.from(String(word ?? '')).filter((char) => /[\u3400-\u9fff]/.test(char));
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState(autoPlay ? 'animate' : 'quiz');
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [done, setDone] = useState(false);
  const [runId, setRunId] = useState(0);
  const stageRef = useRef(null);
  // Keep the callback in a ref: an inline prop would change identity on every
  // parent render and rebuild the writer, restarting the animation mid-stroke.
  const finishedRef = useRef(onFinished);
  useEffect(() => {
    finishedRef.current = onFinished;
  }, [onFinished]);

  const char = chars[index];

  // A new word starts again from its first character, animating.
  useEffect(() => {
    setIndex(0);
    setMode(autoPlay ? 'animate' : 'quiz');
    setDone(false);
    setRunId((value) => value + 1);
  }, [word, autoPlay]);

  useEffect(() => {
    if (!char) return undefined;
    let alive = true;
    setStatus('loading');
    setData(null);
    setDone(false);
    fetch(`/api/stroke/${encodeURIComponent(char)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('missing'))))
      .then((payload) => {
        if (!alive) return;
        setData(payload);
        setStatus('ready');
      })
      .catch(() => {
        if (alive) setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [char]);

  useEffect(() => {
    if (!data || !stageRef.current || !char) return undefined;
    stageRef.current.innerHTML = '';
    const writer = HanziWriter.create(stageRef.current, char, {
      width: size,
      height: size,
      padding: 10,
      showOutline: true,
      charData: data,
      strokeColor: palette.ink,
      outlineColor: 'rgba(61, 47, 41, 0.16)',
      highlightColor: palette.coral,
      drawingColor: palette.coralDeep,
      strokeAnimationSpeed: 0.9,
      delayBetweenStrokes: 130,
    });

    if (mode === 'quiz') {
      writer.quiz({
        onComplete: () => {
          setDone(true);
          finishedRef.current?.();
        },
      });
    } else {
      writer.animateCharacter();
    }

    return () => {
      try {
        writer.cancelQuiz();
      } catch {
        // Nothing to cancel.
      }
    };
  }, [data, mode, char, runId, size]);

  if (!chars.length) {
    return (
      <Stage>
        <Hint>{t('write.error')}</Hint>
      </Stage>
    );
  }

  const replay = () => {
    setDone(false);
    setMode('animate');
    setRunId((value) => value + 1);
  };

  const startQuiz = () => {
    setDone(false);
    setMode('quiz');
    setRunId((value) => value + 1);
  };

  return (
    <>
      {chars.length > 1 && (
        <CharTabs>
          {chars.map((item, position) => (
            <button
              key={`${item}-${position}`}
              type="button"
              data-active={position === index}
              onClick={() => {
                setIndex(position);
                setMode('animate');
                setRunId((value) => value + 1);
              }}
              lang="zh-Hans"
            >
              {item}
            </button>
          ))}
        </CharTabs>
      )}

      <Stage ref={stageRef} style={{ width: size + 20, height: size + 20 }}>
        {status === 'loading' && <Hint>{t('write.loading')}</Hint>}
        {status === 'error' && <Hint>{t('write.error')}</Hint>}
      </Stage>

      <Controls>
        <ControlButton type="button" $active={mode === 'animate'} onClick={replay} disabled={status !== 'ready'}>
          {t('write.watch')}
        </ControlButton>
        <ControlButton type="button" $active={mode === 'quiz'} onClick={startQuiz} disabled={status !== 'ready'}>
          {t('write.try')}
        </ControlButton>
      </Controls>

      <Status $done={done}>
        {done ? t('write.done') : mode === 'quiz' ? t('write.hintQuiz') : t('write.hintWatch')}
      </Status>
    </>
  );
}

export default function WritingModal({ word, onClose }) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The sidebar uses backdrop-filter, which makes `position: fixed` resolve
  // against it; a portal keeps the dialog centred on the viewport.
  return createPortal(
    <Backdrop onClick={onClose} role="presentation">
      <Panel onClick={(event) => event.stopPropagation()} role="dialog" aria-label={t('write.title')}>
        <Head>
          <strong>{t('write.title')}</strong>
          <button type="button" onClick={onClose} aria-label={t('write.close')}>
            ×
          </button>
        </Head>
        <StrokeBoard word={word} autoPlay />
      </Panel>
    </Backdrop>,
    document.body,
  );
}
