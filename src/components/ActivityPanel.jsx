import React from 'react';
import styled, { keyframes } from 'styled-components';
import {
  DISHES_BY_ID,
  GROCERY_BATCH,
  PANTRY_ITEMS,
  activityDetailKey,
  activityIcon,
  activityRoom,
  activityTitleKey,
  dishOptions,
  ingredientMeta,
  pantryHasEnough,
  tasksForRoom,
} from '../utils/activityCatalog';
import { useServerNow } from '../utils/useServerNow';
import { useI18n } from '../context/LanguageContext';
import { breakpoints, palette, shadows } from '../theme';

/* One panel for every slow little chore. The timer itself lives on the server,
   this card only draws the shared progress and the room's own list of things
   to do. */

const shimmer = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
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
  background: ${(props) => (props.$on ? 'rgba(232, 121, 95, 0.14)' : 'rgba(61, 47, 41, 0.05)')};
  color: ${(props) => (props.$on ? palette.coralDeep : palette.muted)};
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
`;

const Progress = styled.div`
  margin-top: 14px;
  padding: 12px 13px;
  border-radius: 17px;
  background: ${(props) => (props.$on ? 'linear-gradient(100deg, rgba(248, 214, 205, 0.5), rgba(251, 232, 189, 0.5))' : 'rgba(61, 47, 41, 0.045)')};
  border: 1px solid ${(props) => (props.$on ? 'rgba(232, 121, 95, 0.14)' : 'rgba(61, 47, 41, 0.06)')};
`;

const ProgressTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11.5px;

  strong {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: ${palette.ink};
  }

  span {
    color: ${palette.inkSoft};
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    font-size: 10px;
    white-space: nowrap;
  }
`;

const ProgressNote = styled.p`
  margin: 5px 0 0;
  color: ${palette.muted};
  font-size: 10px;
  line-height: 1.45;
`;

const Track = styled.div`
  height: 7px;
  margin-top: 9px;
  border-radius: 999px;
  background: rgba(232, 121, 95, 0.13);
  overflow: hidden;
`;

const Fill = styled.div`
  height: 100%;
  width: ${(props) => Math.max(0, Math.min(100, props.$value))}%;
  border-radius: inherit;
  background: linear-gradient(90deg, ${palette.coral}, ${palette.amber});
  transition: width 0.25s linear;
  animation: ${(props) => (props.$waiting ? shimmer : 'none')} 1.2s ease-in-out infinite;
`;

const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin: 16px 0 9px;

  h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  span {
    color: ${palette.muted};
    font-size: 10px;
    text-align: right;
  }

  @media (max-width: ${breakpoints.small}) {
    span { display: none; }
  }
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;

  @media (max-width: ${breakpoints.small}) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 11px 12px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(61, 47, 41, 0.08);
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  strong {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    letter-spacing: 0.02em;
  }

  em {
    color: ${palette.muted};
    font-style: normal;
    font-size: 9.5px;
    white-space: nowrap;
  }
`;

const Ingredients = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border-radius: 999px;
  background: ${(props) => (props.$ok ? 'rgba(127, 174, 139, 0.14)' : 'rgba(232, 121, 95, 0.1)')};
  border: 1px solid ${(props) => (props.$ok ? 'rgba(127, 174, 139, 0.28)' : 'rgba(232, 121, 95, 0.2)')};
  color: ${(props) => (props.$ok ? '#4b7357' : palette.coralDeep)};
  font-size: 9.5px;
  white-space: nowrap;

  b {
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    font-weight: 700;
  }
`;

const CardFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
`;

const Status = styled.span`
  color: ${palette.muted};
  font-size: 9.5px;
`;

const StartButton = styled.button`
  flex: none;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(232, 121, 95, 0.24);
  background: linear-gradient(165deg, #fff0eb, #f9d9d0);
  color: ${palette.coralDeep};
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 14px -10px rgba(61, 47, 41, 0.6);
  }

  &:focus-visible { outline: 3px solid rgba(232, 121, 95, 0.3); outline-offset: 2px; }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
    filter: saturate(0.5);
  }
`;

const Jump = styled.button`
  padding: 0;
  border: 0;
  background: none;
  color: ${palette.coralDeep};
  font-size: 9.5px;
  text-decoration: underline;
  cursor: pointer;
`;

const PantryBox = styled.div`
  margin-top: 14px;
  padding: 11px 12px;
  border-radius: 16px;
  background: rgba(143, 182, 217, 0.1);
  border: 1px solid rgba(143, 182, 217, 0.18);
`;

const PantryTitle = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;

  span {
    color: ${palette.muted};
    font-size: 9.5px;
    font-weight: 400;
  }
`;

const PantryGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`;

const PantryItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border-radius: 999px;
  background: ${(props) => (props.$empty ? 'rgba(61, 47, 41, 0.04)' : 'rgba(255, 255, 255, 0.8)')};
  color: ${(props) => (props.$empty ? palette.muted : palette.inkSoft)};
  font-size: 9.5px;
  opacity: ${(props) => (props.$empty ? 0.6 : 1)};

  b {
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    color: ${(props) => (props.$empty ? palette.muted : palette.coralDeep)};
  }
`;

const Foot = styled.p`
  margin: 12px 2px 0;
  color: ${palette.muted};
  font-size: 10px;
  line-height: 1.5;
`;

function IngredientChips({ needs, pantry, buying = false }) {
  const { t } = useI18n();
  return (
    <Ingredients>
      {Object.entries(needs).map(([id, amount]) => {
        const meta = ingredientMeta(id);
        const have = pantry?.[id] ?? 0;
        const ok = !buying && have >= amount;
        return (
          <Chip key={id} $ok={ok || buying} title={t(meta.labelKey)}>
            <span aria-hidden="true">{meta.icon}</span>
            {t(meta.labelKey)}
            <b>{buying ? `+${amount * GROCERY_BATCH}` : `${have}/${amount}`}</b>
          </Chip>
        );
      })}
    </Ingredients>
  );
}

export default function ActivityPanel({
  roomId,
  activity = null,
  pantry = {},
  clockOffset = 0,
  connected = true,
  busy = false,
  onStart = null,
  onGoToRoom = null,
}) {
  const { t } = useI18n();
  const now = useServerNow(clockOffset);
  const running = Boolean(activity && now < activity.endsAt);
  const total = Math.max(1, (activity?.endsAt ?? 0) - (activity?.startedAt ?? 0));
  const progress = activity ? ((now - activity.startedAt) / total) * 100 : 0;
  const remaining = activity ? Math.max(0, Math.ceil((activity.endsAt - now) / 1000)) : 0;
  const activityIn = activity ? activityRoom(activity.id) : null;
  const detailKey = activity ? activityDetailKey(activity.id) : null;
  const blocked = busy || !connected;

  const isKitchen = roomId === 'kitchen';
  const isMarket = roomId === 'market';
  const tasks = tasksForRoom(roomId);
  const dishes = isKitchen ? dishOptions('cook') : isMarket ? dishOptions('grocery') : [];

  const sectionTitle = isKitchen
    ? 'activity.cookTitle'
    : isMarket
      ? 'activity.marketTitle'
      : 'activity.choreTitle';
  const sectionHint = isKitchen
    ? 'activity.cookHint'
    : isMarket
      ? t('activity.batch', { count: GROCERY_BATCH })
      : 'activity.choreHint';

  return (
    <Panel aria-label={t('activity.title')}>
      <Head>
        <div>
          <Title>{t('activity.title')}</Title>
          <Sub>{t('activity.sub')}</Sub>
        </div>
        <Shared $on={running}>{running ? `⏳ ${t('activity.shared')}` : `· ${t('activity.free')}`}</Shared>
      </Head>

      <Progress $on={running} aria-live="polite">
        <ProgressTop>
          {activity ? (
            <>
              <strong>
                <span aria-hidden="true">{activityIcon(activity.id)}</span>
                {t(activityTitleKey(activity.id))}
                {detailKey && ` · ${t(detailKey)}`}
              </strong>
              <span>{remaining > 0 ? t('activity.remaining', { seconds: remaining }) : t('activity.almostDone')}</span>
            </>
          ) : (
            <>
              <strong>✨ {t('activity.idle')}</strong>
              <span>{t('activity.free')}</span>
            </>
          )}
        </ProgressTop>
        {activity && (
          <ProgressNote>
            {t('activity.by', { name: activity.name })}
            {activityIn && activityIn !== roomId && ` · ${t('activity.elsewhere', { room: t(`house.${activityIn}`) })}`}
          </ProgressNote>
        )}
        <Track
          role="progressbar"
          aria-label={t('activity.title')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(Math.max(0, Math.min(100, progress)))}
        >
          <Fill $value={progress} $waiting={activity && remaining === 0} />
        </Track>
      </Progress>

      <SectionHead>
        <h3>{t(sectionTitle)}</h3>
        <span>{isMarket ? sectionHint : t(sectionHint)}</span>
      </SectionHead>

      <Cards>
        {dishes.map(({ id, dish, seconds }) => {
          const enough = isMarket || pantryHasEnough(pantry, dish.needs);
          const label = isMarket
            ? t('activity.groceryButton', { seconds })
            : t('activity.cookButton', { seconds });
          return (
            <Card key={id}>
              <CardTop>
                <strong>
                  <span aria-hidden="true">{DISHES_BY_ID[dish.id].icon}</span>
                  {t(`dish.${dish.id}`)}
                </strong>
                <em>{t('activity.reward', { bond: dish.effects.bond })}</em>
              </CardTop>
              <IngredientChips needs={dish.needs} pantry={pantry} buying={isMarket} />
              <CardFoot>
                {isMarket ? (
                  <Status>{t('activity.buyHint')}</Status>
                ) : enough ? (
                  <Status>✓ {t('activity.ready')}</Status>
                ) : (
                  <Status>
                    {t('activity.missing')}{' '}
                    {onGoToRoom && (
                      <Jump type="button" onClick={() => onGoToRoom('market')}>
                        {t('activity.goMarket')}
                      </Jump>
                    )}
                  </Status>
                )}
                <StartButton
                  type="button"
                  disabled={blocked || !enough}
                  title={blocked ? t('activity.busyButton') : label}
                  aria-label={`${label} · ${t(`dish.${dish.id}`)}`}
                  onClick={() => onStart?.(id)}
                >
                  {label}
                </StartButton>
              </CardFoot>
            </Card>
          );
        })}

        {tasks.map((task) => (
          <Card key={task.id}>
            <CardTop>
              <strong>
                <span aria-hidden="true">{task.icon}</span>
                {t(task.labelKey)}
              </strong>
              <em>{t('activity.reward', { bond: task.effects.bond })}</em>
            </CardTop>
            <Status>{t(`activity.${task.id}.hint`)}</Status>
            <CardFoot>
              <Status>{t('activity.choreNote')}</Status>
              <StartButton
                type="button"
                disabled={blocked}
                title={blocked ? t('activity.busyButton') : t('activity.choreButton', { seconds: task.seconds })}
                aria-label={`${t('activity.choreButton', { seconds: task.seconds })} · ${t(task.labelKey)}`}
                onClick={() => onStart?.(task.id)}
              >
                {t('activity.choreButton', { seconds: task.seconds })}
              </StartButton>
            </CardFoot>
          </Card>
        ))}
      </Cards>

      {(isKitchen || isMarket) && (
        <PantryBox>
          <PantryTitle>
            🧊 {t('activity.pantry')}
            <span>{t('activity.pantryHint')}</span>
          </PantryTitle>
          <PantryGrid>
            {PANTRY_ITEMS.map((item) => {
              const count = pantry?.[item.id] ?? 0;
              return (
                <PantryItem key={item.id} $empty={count === 0} title={t(item.labelKey)}>
                  <span aria-hidden="true">{item.icon}</span>
                  {t(item.labelKey)} <b>×{count}</b>
                </PantryItem>
              );
            })}
          </PantryGrid>
        </PantryBox>
      )}

      <Foot>{busy ? t('activity.busy') : t('activity.foot')}</Foot>
    </Panel>
  );
}
