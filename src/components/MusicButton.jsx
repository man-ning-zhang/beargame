import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useI18n } from '../context/LanguageContext';
import { breakpoints, palette } from '../theme';
import { getStation, setMusicVolume, setStation, stopMusic } from '../utils/music';

const fade = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Wrap = styled.div`
  position: relative;
  flex: none;
`;

const Button = styled.button`
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid
    ${(props) => (props.$on ? 'rgba(241, 185, 79, 0.55)' : 'rgba(255, 248, 236, 0.1)')};
  background: ${(props) => (props.$on ? 'rgba(241, 185, 79, 0.16)' : 'rgba(255, 248, 236, 0.05)')};
  color: ${(props) => (props.$on ? palette.cream : 'rgba(255, 248, 236, 0.7)')};
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

const Panel = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 30;
  width: 222px;
  max-height: min(76vh, 430px);
  overflow-y: auto;
  padding: 12px;
  border-radius: 15px;
  background: rgba(43, 38, 56, 0.97);
  border: 1px solid rgba(255, 248, 236, 0.1);
  box-shadow: 0 18px 34px -22px rgba(0, 0, 0, 0.9);
  animation: ${fade} 0.16s ease-out;

  h3 {
    margin: 0 0 8px;
    color: rgba(255, 248, 236, 0.62);
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h4 {
    margin: 8px 0 3px;
    color: rgba(255, 248, 236, 0.32);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

const Option = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 0;
  border-radius: 9px;
  background: ${(props) => (props.$active ? 'rgba(241, 185, 79, 0.16)' : 'transparent')};
  color: ${(props) => (props.$active ? palette.cream : 'rgba(255, 248, 236, 0.72)')};
  font-size: 11px;
  text-align: left;
  cursor: pointer;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${(props) => (props.$active ? palette.gold : 'rgba(255, 248, 236, 0.22)')};
  }

  &:hover {
    background: rgba(255, 248, 236, 0.07);
    color: ${palette.cream};
  }
`;

const VolumeRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 248, 236, 0.09);
  color: rgba(255, 248, 236, 0.5);
  font-size: 9px;

  input {
    flex: 1;
    accent-color: ${palette.gold};
  }
`;

const Note = styled.p`
  margin: 8px 0 0;
  color: rgba(255, 248, 236, 0.34);
  font-size: 8.5px;
  line-height: 1.5;
`;

const GROUPS = [
  { title: 'room.music.group.ambient', items: ['off', 'rain', 'fire'] },
  { title: 'room.music.group.synth', items: ['lofi', 'piano'] },
  { title: 'room.music.group.classical', items: ['satie', 'mozart'] },
];

const LABELS = {
  off: 'room.music.off',
  rain: 'room.music.rain',
  fire: 'room.music.fire',
  lofi: 'room.music.lofi',
  piano: 'room.music.piano',
  satie: 'room.music.satie',
  mozart: 'room.music.mozart',
};

export default function MusicButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(getStation());
  const [level, setLevel] = useState(45);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Leaving the room should not leave a synth running in the background.
  useEffect(() => () => stopMusic(), []);

  useEffect(() => {
    setMusicVolume(level / 100);
  }, [level]);

  const choose = (id) => {
    setCurrent(setStation(id));
  };

  return (
    <Wrap ref={wrapRef}>
      <Button
        type="button"
        $on={current !== 'off'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('room.music')}
        title={t('room.music')}
        onClick={() => setOpen((value) => !value)}
      >
        {current === 'off' ? '🎵' : '🎶'}
      </Button>

      {open && (
        <Panel role="dialog" aria-label={t('room.music')}>
          <h3>{t('room.music')}</h3>

          {GROUPS.map((group) => (
            <div key={group.title}>
              <h4>{t(group.title)}</h4>
              {group.items.map((id) => (
                <Option key={id} type="button" $active={current === id} onClick={() => choose(id)}>
                  <span className="dot" aria-hidden="true" />
                  {t(LABELS[id])}
                </Option>
              ))}
            </div>
          ))}

          <VolumeRow>
            {t('room.music.volume')}
            <input
              type="range"
              min="0"
              max="100"
              value={level}
              onChange={(event) => setLevel(Number(event.target.value))}
              aria-label={t('room.music.volume')}
            />
          </VolumeRow>

          <Note>{t('room.music.credit')}</Note>
          <Note>{t('room.music.note')}</Note>
        </Panel>
      )}
    </Wrap>
  );
}
