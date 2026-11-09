import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import Bear from '../components/Bear';
import LanguageToggle from '../components/LanguageToggle';
import { useI18n } from '../context/LanguageContext';
import { useRoom } from '../context/RoomContext';
import { breakpoints, fonts, palette, shadows } from '../theme';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Page = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 48px);
  padding: 10px 0 40px;
  animation: ${fadeUp} 0.55s ease-out both;

  @media (max-width: ${breakpoints.medium}) {
    min-height: calc(100dvh - 32px);
  }
`;

const TopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-bottom: clamp(20px, 5vh, 52px);

  @media (max-width: ${breakpoints.medium}) {
    margin-bottom: 18px;
  }
`;

const TopActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  flex-wrap: wrap;
`;

const Connection = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  border: 1px solid rgba(255, 248, 236, 0.12);
  border-radius: 999px;
  background: rgba(255, 248, 236, 0.05);
  color: rgba(255, 248, 236, 0.72);
  font-size: 12px;
  backdrop-filter: blur(10px);
`;

const Dot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${(props) => (props.$online ? palette.sage : palette.amber)};
  box-shadow: 0 0 0 4px ${(props) => (props.$online ? 'rgba(127,174,139,0.14)' : 'rgba(241,185,79,0.14)')};
`;

const Grid = styled.div`
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
  align-items: center;
  align-content: center;
  gap: clamp(28px, 6vw, 84px);

  @media (max-width: ${breakpoints.wide}) {
    grid-template-columns: 1fr;
    gap: 36px;
  }
`;

const Hero = styled.section`
  position: relative;
  color: ${palette.cream};
  padding: 8px 0;
`;

const Title = styled.h1`
  margin: 0;
  font-family: ${fonts.display};
  font-size: clamp(46px, 5.8vw, 78px);
  line-height: 0.98;
  letter-spacing: -0.015em;
  font-weight: 600;
  color: ${palette.cream};
  white-space: nowrap;

  @media (max-width: ${breakpoints.medium}) {
    font-size: clamp(40px, 11.5vw, 56px);
  }
`;

const BearStage = styled.div`
  position: relative;
  margin-top: clamp(18px, 4vh, 36px);
  width: min(340px, 88%);

  @media (max-width: ${breakpoints.medium}) {
    display: none;
  }
`;

const Moon = styled.div`
  position: absolute;
  inset: 4% 5% 12%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 240, 206, 0.28), transparent 55%),
    radial-gradient(circle at 65% 68%, rgba(232, 121, 95, 0.2), transparent 60%);
  border: 1px solid rgba(255, 248, 236, 0.09);
  box-shadow: inset 0 0 60px rgba(255, 232, 190, 0.08);
`;

const BearFloat = styled.div`
  position: relative;
  animation: ${float} 5.6s ease-in-out infinite;
  padding: 6px 0 0;
`;

const Card = styled.section`
  position: relative;
  padding: clamp(24px, 3.4vw, 36px);
  border-radius: 30px;
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.9), rgba(255, 248, 236, 0.97)),
    ${palette.cream};
  color: ${palette.ink};
  box-shadow: ${shadows.card};
  border: 1px solid rgba(255, 255, 255, 0.55);
  animation: ${fadeUp} 0.7s 0.1s ease-out both;

  &::before {
    content: '';
    position: absolute;
    inset: 8px;
    border-radius: 23px;
    border: 1px dashed rgba(61, 47, 41, 0.1);
    pointer-events: none;
  }
`;

const CardHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
`;

const CardTitle = styled.h2`
  margin: 0 0 7px;
  font-family: ${fonts.display};
  font-size: 27px;
  font-weight: 600;
  letter-spacing: 0.02em;
`;

const CardSub = styled.p`
  margin: 0;
  color: ${palette.muted};
  font-size: 12.5px;
  line-height: 1.6;
`;

const Badge = styled.span`
  flex: none;
  padding: 6px 10px;
  border-radius: 999px;
  background: ${palette.amberSoft};
  color: #9a6a1f;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
`;

const Field = styled.label`
  display: block;
  margin-bottom: 16px;
`;

const LabelRow = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
  font-size: 12px;
  color: ${palette.inkSoft};
  font-weight: 600;
`;

const Hint = styled.span`
  font-weight: 400;
  color: ${palette.muted};
  font-size: 11px;
`;

const Input = styled.input`
  width: 100%;
  height: 48px;
  padding: 0 15px;
  border-radius: 14px;
  border: 1px solid ${palette.line};
  background: rgba(255, 255, 255, 0.72);
  color: ${palette.ink};
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  &::placeholder {
    color: #b6a79c;
  }

  &:focus {
    border-color: rgba(232, 121, 95, 0.55);
    box-shadow: 0 0 0 4px rgba(232, 121, 95, 0.1);
    background: #fff;
  }

  &:disabled {
    opacity: 0.65;
  }
`;

const Primary = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  min-height: 50px;
  padding: 0 20px;
  border: 0;
  border-radius: 15px;
  background: linear-gradient(140deg, ${palette.coral}, ${palette.coralDeep});
  color: #fffaf4;
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  cursor: pointer;
  box-shadow: ${shadows.button};
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 14px 24px -12px rgba(207, 94, 70, 0.85);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 3px solid rgba(232, 121, 95, 0.4);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    box-shadow: none;
  }
`;

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0 18px;
  color: ${palette.muted};
  font-size: 11px;
  letter-spacing: 0.06em;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${palette.line};
  }
`;

const JoinRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 9px;
`;

const CodeInput = styled(Input)`
  height: 50px;
  padding: 0 12px;
  text-align: center;
  font-family: ${fonts.mono};
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.38em;
  text-indent: 0.38em;
  text-transform: uppercase;
`;

const JoinButton = styled.button`
  min-width: 98px;
  height: 50px;
  padding: 0 18px;
  border-radius: 15px;
  border: 1px solid rgba(61, 47, 41, 0.14);
  background: rgba(255, 255, 255, 0.65);
  color: ${palette.ink};
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

  &:hover:not(:disabled) {
    background: #fff;
    border-color: rgba(232, 121, 95, 0.45);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 3px solid rgba(232, 121, 95, 0.3);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const LastRoom = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 14px;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: ${palette.coralDeep};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover span {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Notice = styled.div`
  margin: 0 0 16px;
  padding: 10px 13px;
  border-radius: 12px;
  background: ${(props) => (props.$error ? 'rgba(232, 121, 95, 0.1)' : 'rgba(127, 174, 139, 0.12)')};
  border: 1px solid ${(props) => (props.$error ? 'rgba(232, 121, 95, 0.22)' : 'rgba(127, 174, 139, 0.28)')};
  color: ${(props) => (props.$error ? '#a44734' : '#4f7a5c')};
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.55;
  animation: ${fadeUp} 0.25s ease-out both;
`;

const FootNote = styled.p`
  margin: 20px 0 0;
  padding-top: 16px;
  border-top: 1px solid ${palette.line};
  color: ${palette.muted};
  font-size: 11px;
  line-height: 1.7;
  text-align: center;
`;

export default function Lobby() {
  const {
    savedName,
    initialCode,
    lastRoom,
    notice,
    status,
    connected,
    createRoom,
    joinRoom,
    clearNotice,
  } = useRoom();
  const [name, setName] = useState(savedName);
  const [code, setCode] = useState(initialCode || '');
  const [localError, setLocalError] = useState('');
  const nameRef = useRef(null);
  const codeRef = useRef(null);
  const { t } = useI18n();

  const busy = status === 'joining' || status === 'reconnecting';
  const message = localError || notice;

  useEffect(() => {
    if (notice) setLocalError('');
  }, [notice]);

  const clearError = () => {
    if (localError) setLocalError('');
    if (notice) clearNotice();
  };

  const validateName = () => {
    if (!name.trim()) {
      setLocalError('error.nameRequired');
      nameRef.current?.focus();
      return false;
    }
    return true;
  };

  const handleCreate = (event) => {
    event.preventDefault();
    clearError();
    if (busy) return;
    if (!validateName()) return;
    createRoom(name);
  };

  const handleJoin = () => {
    clearError();
    if (busy) return;
    if (!validateName()) return;
    if (code.trim().length < 4) {
      setLocalError('error.codeRequired');
      codeRef.current?.focus();
      return;
    }
    if (!joinRoom(code, name)) {
      setLocalError('error.codeInvalid');
      codeRef.current?.focus();
    }
  };

  const handleLastRoom = () => {
    if (!lastRoom) return;
    setCode(lastRoom);
    clearError();
    if (!validateName()) return;
    joinRoom(lastRoom, name);
  };

  return (
    <Page>
      <TopBar>
        <TopActions>
          <Connection>
            <Dot $online={connected} />
            {connected ? t('lobby.connection.online') : t('lobby.connection.connecting')}
          </Connection>
          <LanguageToggle />
        </TopActions>
      </TopBar>

      <Grid>
        <Hero>
          <Title>Bear Together</Title>

          <BearStage>
            <Moon />
            <BearFloat>
              <Bear stats={{ mood: 88, fullness: 82, energy: 76 }} />
            </BearFloat>
          </BearStage>
        </Hero>

        <Card>
          <CardHead>
            <div>
              <CardTitle>{t('lobby.card.title')}</CardTitle>
              <CardSub>{t('lobby.card.sub')}</CardSub>
            </div>
            <Badge>{t('lobby.badge')}</Badge>
          </CardHead>

          {message && <Notice $error>{t(message)}</Notice>}

          <form onSubmit={handleCreate}>
            <Field>
              <LabelRow>
                <span>{t('lobby.name.label')}</span>
                <Hint>{t('lobby.name.hint')}</Hint>
              </LabelRow>
              <Input
                ref={nameRef}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  clearError();
                }}
                placeholder={t('lobby.name.placeholder')}
                maxLength={12}
                autoComplete="nickname"
                disabled={busy}
                aria-label={t('lobby.name.aria')}
              />
            </Field>

            <Primary type="submit" disabled={busy}>
              {busy ? <Spinner aria-hidden="true" /> : <span aria-hidden="true">✨</span>}
              {busy ? t('lobby.createBusy') : t('lobby.create')}
            </Primary>
          </form>

          <Divider>{t('lobby.divider')}</Divider>

          <JoinRow>
            <CodeInput
              ref={codeRef}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4));
                clearError();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleJoin();
                }
              }}
              placeholder="ABCD"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={4}
              disabled={busy}
              aria-label={t('lobby.code.aria')}
            />
            <JoinButton type="button" onClick={handleJoin} disabled={busy || code.length < 4}>
              {t('lobby.join')}
            </JoinButton>
          </JoinRow>

          {lastRoom && (
            <LastRoom type="button" onClick={handleLastRoom} disabled={busy}>
              <span aria-hidden="true">↩</span>
              <span>{t('lobby.lastRoom', { code: lastRoom })}</span>
            </LastRoom>
          )}

          <FootNote>
            {t('lobby.foot1')}
            <br />
            {t('lobby.foot2')}
          </FootNote>
        </Card>
      </Grid>
    </Page>
  );
}
