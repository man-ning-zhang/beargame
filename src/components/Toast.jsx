import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useRoom } from '../context/RoomContext';
import { useI18n } from '../context/LanguageContext';
import { palette, shadows } from '../theme';

const pop = keyframes`
  0% { opacity: 0; transform: translate(-50%, 16px) scale(0.94); }
  100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
`;

const ToastRoot = styled.div`
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(440px, calc(100vw - 32px));
  padding: 12px 18px;
  border-radius: 999px;
  background: rgba(255, 248, 236, 0.97);
  color: ${palette.ink};
  font-size: 14px;
  line-height: 1.35;
  box-shadow: ${shadows.card};
  animation: ${pop} 0.24s ease-out;
  border: 1px solid rgba(61, 47, 41, 0.08);
`;

const Bear = styled.span`
  font-size: 18px;
`;

export default function Toast() {
  const { toast } = useRoom();
  const { t } = useI18n();
  if (!toast) return null;
  return (
    <ToastRoot role="status" aria-live="polite">
      <Bear aria-hidden="true">🐻</Bear>
      <span>{t(toast.key, toast.params)}</span>
    </ToastRoot>
  );
}
