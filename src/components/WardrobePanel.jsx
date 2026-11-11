import React from 'react';
import styled, { keyframes } from 'styled-components';
import { OutfitSwatch, TryOnPreview } from './OutfitArt';
import { WHO, outfitFor, outfitsFor } from '../utils/wardrobe';
import { useI18n } from '../context/LanguageContext';
import { breakpoints, palette, shadows } from '../theme';

/* A small light card that sits under the scene when the pair steps into the
   dressing room. The hanger previews are SVG, so the clothes are legible even
   when Fishy is away on his skateboard. */

const popIn = keyframes`
  from { opacity: 0; transform: translateY(6px) scale(0.94); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const Panel = styled.section`
  margin-top: 14px;
  padding: 18px 20px 20px;
  border-radius: 26px;
  background: linear-gradient(160deg, rgba(255, 252, 246, 0.99), rgba(250, 241, 228, 0.99));
  color: ${palette.ink};
  box-shadow: ${shadows.card};
  border: 1px solid rgba(255, 255, 255, 0.6);

  @media (max-width: ${breakpoints.medium}) {
    padding: 15px 14px 16px;
    border-radius: 22px;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
`;

const Title = styled.h2`
  margin: 0 0 4px;
  font-family: 'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.03em;
`;

const Sub = styled.p`
  margin: 0;
  color: ${palette.muted};
  font-size: 10.5px;
  line-height: 1.5;
`;

const Shared = styled.span`
  flex: none;
  margin-top: 2px;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(241, 185, 79, 0.16);
  color: #92661c;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
`;

const Group = styled.div`
  & + & {
    margin-top: 15px;
    padding-top: 14px;
    border-top: 1px dashed rgba(61, 47, 41, 0.12);
  }
`;

/* The mirror is the answer to "did it actually change?". Tapping a hanger
   scrolls the scene off screen on a phone, so the pair need to see the result
   right here: two stand-ins redrawn in the colours just picked. */
const Mirror = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px;
  border-radius: 18px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.94), rgba(250, 236, 222, 0.82));
  border: 1px solid rgba(61, 47, 41, 0.07);
`;

const TryOn = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 6px 8px;
  border-radius: 14px;
  animation: ${popIn} 0.34s ease-out;

  .label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .who {
    color: ${palette.muted};
    font-size: 9.5px;
    letter-spacing: 0.03em;
  }

  .wearing {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    overflow: hidden;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  @media (max-width: ${breakpoints.small}) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
  }
`;

const GroupHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 9px;

  strong {
    font-size: 12px;
    letter-spacing: 0.02em;
  }

  span {
    color: ${palette.muted};
    font-size: 10px;
  }
`;

const Rail = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;

  @media (max-width: ${breakpoints.small}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Hanger = styled.button`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px 9px;
  border-radius: 16px;
  border: 1px solid ${(props) => (props.$active ? 'rgba(232, 121, 95, 0.5)' : 'rgba(61, 47, 41, 0.09)')};
  background: ${(props) => (props.$active ? 'linear-gradient(165deg, #fff1e9, #f9ddd0)' : 'rgba(255, 255, 255, 0.66)')};
  color: ${palette.ink};
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  -webkit-tap-highlight-color: transparent;

  svg { display: block; }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 18px -14px rgba(61, 47, 41, 0.55);
  }

  &:focus-visible {
    outline: 3px solid rgba(232, 121, 95, 0.3);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    filter: saturate(0.6);
  }

  .name {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }

  .worn {
    position: absolute;
    top: 5px;
    right: 6px;
    font-size: 9px;
    color: ${palette.coralDeep};
  }
`;

const Foot = styled.p`
  margin: 14px 2px 0;
  color: ${palette.muted};
  font-size: 10px;
  line-height: 1.5;
`;

export default function WardrobePanel({ outfits = {}, connected = true, busy = false, onChange = null }) {
  const { t } = useI18n();
  const blocked = !connected || busy;

  return (
    <Panel aria-label={t('wardrobe.title')}>
      <Head>
        <div>
          <Title>{t('wardrobe.title')}</Title>
          <Sub>{t('wardrobe.sub')}</Sub>
        </div>
        <Shared>✦ {t('wardrobe.shared')}</Shared>
      </Head>

      <Mirror aria-label={t('wardrobe.mirror')}>
        {WHO.map((who) => {
          const current = outfitFor(who, outfits[who]);
          return (
            <TryOn key={`${who}-${current.id}`}>
              <TryOnPreview who={who} outfit={current} />
              <span className="label">
                <span className="who">
                  {t(`wardrobe.${who}`)} · {t('wardrobe.current')}
                </span>
                <span className="wearing">
                  {current.icon} {t(current.labelKey)}
                </span>
              </span>
            </TryOn>
          );
        })}
      </Mirror>

      {WHO.map((who) => {
        const current = outfitFor(who, outfits[who]);
        return (
          <Group key={who}>
            <GroupHead>
              <strong>{t(`wardrobe.${who}`)}</strong>
              <span>
                {t('wardrobe.current')} · {current.icon} {t(current.labelKey)}
              </span>
            </GroupHead>
            <Rail role="group" aria-label={t(`wardrobe.${who}`)}>
              {outfitsFor(who).map((outfit) => {
                const active = current.id === outfit.id;
                const label = `${t(outfit.labelKey)}${active ? ` · ${t('wardrobe.worn')}` : ''}`;
                return (
                  <Hanger
                    key={outfit.id}
                    type="button"
                    $active={active}
                    aria-pressed={active}
                    aria-label={label}
                    title={busy ? t('activity.busyButton') : label}
                    disabled={blocked || active}
                    onClick={() => onChange?.(who, outfit.id)}
                  >
                    <OutfitSwatch who={who} outfit={outfit} />
                    <span className="name" aria-hidden="true">
                      {outfit.icon} {t(outfit.labelKey)}
                    </span>
                    {active && <span className="worn" aria-hidden="true">✓</span>}
                  </Hanger>
                );
              })}
            </Rail>
          </Group>
        );
      })}

      <Foot>{busy ? t('activity.busy') : t('wardrobe.foot')}</Foot>
    </Panel>
  );
}
