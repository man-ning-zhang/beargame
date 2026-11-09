import React from 'react';
import styled from 'styled-components';
import { useI18n } from '../context/LanguageContext';
import { breakpoints, palette } from '../theme';

const Switch = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(255, 248, 236, 0.05);
  border: 1px solid rgba(255, 248, 236, 0.1);
  backdrop-filter: blur(10px);
`;

const Option = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 7px;
  border: 0;
  border-radius: 7px;
  background: ${(props) => (props.$active ? 'rgba(255, 248, 236, 0.16)' : 'transparent')};
  color: ${(props) => (props.$active ? palette.cream : 'rgba(255, 248, 236, 0.48)')};
  font-size: 10px;
  font-weight: ${(props) => (props.$active ? 700 : 500)};
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;

  &:hover {
    color: ${palette.cream};
    background: rgba(255, 248, 236, 0.1);
  }

  &:focus-visible {
    outline: 2px solid rgba(241, 185, 79, 0.6);
    outline-offset: 1px;
  }

  @media (max-width: ${breakpoints.small}) {
    min-width: 24px;
    height: 26px;
    padding: 0 5px;

    .long {
      display: none;
    }
  }
`;

const Short = styled.span`
  display: none;

  @media (max-width: ${breakpoints.small}) {
    display: inline;
  }
`;

export default function LanguageToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <Switch role="group" aria-label="Language / 语言">
      <Option
        type="button"
        $active={lang === 'zh'}
        onClick={() => setLang('zh')}
        aria-pressed={lang === 'zh'}
        aria-label={t('language.switchToZh')}
        title={t('language.switchToZh')}
      >
        <span className="long">中文</span>
        <Short>中</Short>
      </Option>
      <Option
        type="button"
        $active={lang === 'en'}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        aria-label={t('language.switchToEn')}
        title={t('language.switchToEn')}
      >
        EN
      </Option>
    </Switch>
  );
}
