import React, { useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useI18n } from '../context/LanguageContext';
import { breakpoints, palette } from '../theme';

const rise = keyframes`
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: ${palette.ink};
`;

const Tools = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Search = styled.input`
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 11px;
  border-radius: 11px;
  border: 1px solid ${palette.line};
  background: rgba(255, 255, 255, 0.7);
  color: ${palette.ink};
  font-size: 11.5px;
  outline: none;
  transition: border-color 0.18s ease, background 0.18s ease;

  &::placeholder {
    color: ${palette.muted};
  }

  &:focus {
    background: #fff;
    border-color: rgba(232, 121, 95, 0.4);
  }
`;

const AddButton = styled.button`
  flex: none;
  height: 34px;
  padding: 0 12px;
  border-radius: 11px;
  border: 0;
  background: linear-gradient(145deg, ${palette.coral}, ${palette.coralDeep});
  color: #fffaf4;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 16px -12px rgba(207, 94, 70, 0.9);
  transition: transform 0.15s ease, opacity 0.15s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  height: clamp(220px, 30vh, 292px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: rgba(61, 47, 41, 0.18) transparent;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(61, 47, 41, 0.16);
    border-radius: 999px;
  }
`;

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 13px;
  border: 1px solid ${(props) => (props.$on ? 'rgba(127, 174, 139, 0.34)' : 'rgba(61, 47, 41, 0.07)')};
  background: ${(props) => (props.$on ? 'rgba(127, 174, 139, 0.1)' : 'rgba(255, 255, 255, 0.62)')};
  animation: ${rise} 0.22s ease-out both;

  .body {
    flex: 1;
    min-width: 0;
  }

  .top {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
  }

  .w {
    font-family: 'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.2;
  }

  .p {
    color: ${palette.coralDeep};
    font-size: 10.5px;
  }

  .tag {
    padding: 1px 5px;
    border-radius: 5px;
    background: rgba(61, 47, 41, 0.055);
    color: ${palette.muted};
    font-size: 8.5px;
  }

  .m {
    margin-top: 3px;
    color: ${palette.inkSoft};
    font-size: 10.5px;
    line-height: 1.45;
    word-break: break-word;
  }

  .note {
    margin-top: 4px;
    padding-left: 7px;
    border-left: 2px solid rgba(232, 121, 95, 0.28);
    color: ${palette.muted};
    font-size: 9.5px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

const Acts = styled.div`
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 4px;
`;

const MiniButton = styled.button`
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid ${(props) => (props.$danger ? 'rgba(232, 121, 95, 0.3)' : 'rgba(61, 47, 41, 0.08)')};
  background: ${(props) => (props.$danger ? 'rgba(232, 121, 95, 0.1)' : 'rgba(255, 255, 255, 0.85)')};
  color: ${(props) => (props.$danger ? palette.coralDeep : palette.inkSoft)};
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.14s ease, background 0.14s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    background: #fff;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 11px;
  border-radius: 15px;
  border: 1px solid rgba(232, 121, 95, 0.22);
  background: rgba(255, 255, 255, 0.8);
  animation: ${rise} 0.22s ease-out both;
`;

const Pair = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  color: ${palette.muted};
  font-size: 8.5px;
  letter-spacing: 0.05em;

  input,
  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 7px 9px;
    border-radius: 9px;
    border: 1px solid ${palette.line};
    background: #fffdf8;
    color: ${palette.ink};
    font-size: 11.5px;
    font-family: inherit;
    outline: none;
    resize: none;

    &:focus {
      border-color: rgba(232, 121, 95, 0.42);
    }
  }
`;

const Check = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  align-self: end;
  height: 30px;
  color: ${palette.inkSoft};
  font-size: 10px;
  cursor: pointer;

  input {
    accent-color: ${palette.coral};
  }
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 2px;
`;

const Button = styled.button`
  height: 30px;
  padding: 0 12px;
  border-radius: 9px;
  border: ${(props) => (props.$primary ? '0' : `1px solid ${palette.line}`)};
  background: ${(props) =>
    props.$primary ? `linear-gradient(145deg, ${palette.coral}, ${palette.coralDeep})` : 'transparent'};
  color: ${(props) => (props.$primary ? '#fffaf4' : palette.muted)};
  font-size: 10.5px;
  font-weight: ${(props) => (props.$primary ? 700 : 500)};
  cursor: pointer;

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
  gap: 5px;
  height: 100%;
  min-height: 180px;
  padding: 20px 16px;
  border-radius: 14px;
  border: 1px dashed rgba(61, 47, 41, 0.14);
  background: rgba(255, 255, 255, 0.4);
  text-align: center;

  .emoji {
    font-size: 24px;
    opacity: 0.75;
  }

  strong {
    color: ${palette.inkSoft};
    font-size: 11.5px;
  }

  span {
    max-width: 230px;
    color: ${palette.muted};
    font-size: 10px;
    line-height: 1.6;
  }

  @media (max-width: ${breakpoints.small}) {
    min-height: 150px;
  }
`;

const FootNote = styled.p`
  margin: 0;
  color: ${palette.muted};
  font-size: 8.5px;
  line-height: 1.5;
  text-align: center;
`;

function blankDraft(lang) {
  return { w: '', p: '', m: '', note: '', tag: '', study: true, lang };
}

export default function NotebookPanel({ notes = [], lang = 'zh', connected, myCards, onSave, onRemove, onToggleStudy }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(null);
  const [confirmId, setConfirmId] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const mine = notes.filter((note) => (note.lang ?? 'zh') === lang);
    const sorted = [...mine].sort((a, b) => (b.updatedAt || b.at || 0) - (a.updatedAt || a.at || 0));
    if (!needle) return sorted;
    return sorted.filter((note) =>
      [note.w, note.p, note.m, note.note, note.tag]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle)),
    );
  }, [notes, query, lang]);

  const startNew = () => {
    setDraft(blankDraft(lang));
    setConfirmId('');
  };

  const startEdit = (note) => {
    setDraft({ ...note });
  };

  const submit = (event) => {
    event.preventDefault();
    if (!draft || !draft.w.trim()) return;
    onSave({
      id: draft.id,
      w: draft.w.trim(),
      p: draft.p.trim(),
      m: draft.m.trim(),
      note: draft.note.trim(),
      tag: draft.tag.trim(),
      study: Boolean(draft.study),
      lang: draft.lang ?? lang,
    });
    setDraft(null);
  };

  const requestRemove = (note) => {
    if (confirmId === note.id) {
      onRemove(note.id);
      setConfirmId('');
      return;
    }
    setConfirmId(note.id);
    window.setTimeout(() => setConfirmId((current) => (current === note.id ? '' : current)), 3000);
  };

  return (
    <Wrap>
      <Tools>
        <Search
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('note.search')}
          aria-label={t('note.search')}
          type="search"
        />
        <AddButton type="button" onClick={startNew} disabled={!connected || Boolean(draft)}>
          {t('note.add')}
        </AddButton>
      </Tools>

      {draft ? (
        <Form onSubmit={submit}>
          <Pair>
            <Field>
              {t('note.field.hanzi')}
              <input
                value={draft.w}
                onChange={(event) => setDraft({ ...draft, w: event.target.value })}
                placeholder={t('note.placeholder.hanzi')}
                maxLength={12}
                autoFocus
                required
              />
            </Field>
            <Field>
              {t('note.field.pinyin')}
              <input
                value={draft.p}
                onChange={(event) => setDraft({ ...draft, p: event.target.value })}
                placeholder={t('note.placeholder.pinyin')}
                maxLength={40}
              />
            </Field>
          </Pair>
          <Field>
            {t('note.field.meaning')}
            <input
              value={draft.m}
              onChange={(event) => setDraft({ ...draft, m: event.target.value })}
              placeholder={t('note.placeholder.meaning')}
              maxLength={140}
            />
          </Field>
          <Field>
            {t('note.field.note')}
            <textarea
              value={draft.note}
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              placeholder={t('note.placeholder.note')}
              rows={2}
              maxLength={500}
            />
          </Field>
          <Pair>
            <Field>
              {t('note.field.tag')}
              <input
                value={draft.tag}
                onChange={(event) => setDraft({ ...draft, tag: event.target.value })}
                placeholder={t('note.placeholder.tag')}
                maxLength={16}
              />
            </Field>
            <Check>
              <input
                type="checkbox"
                checked={Boolean(draft.study)}
                onChange={(event) => setDraft({ ...draft, study: event.target.checked })}
              />
              {t('note.field.study')}
            </Check>
          </Pair>
          <FormActions>
            <Button type="button" onClick={() => setDraft(null)}>
              {t('note.cancel')}
            </Button>
            <Button type="submit" $primary disabled={!connected || !draft.w.trim()}>
              {t('note.save')}
            </Button>
          </FormActions>
        </Form>
      ) : null}

      <List>
        {filtered.length === 0 ? (
          <Empty>
            <span className="emoji" aria-hidden="true">
              {query ? '🔍' : '📝'}
            </span>
            <strong>{query ? t('note.empty.search') : t('note.empty.title')}</strong>
            <span>{query ? t('note.empty.searchBody') : t('note.empty.body')}</span>
          </Empty>
        ) : (
          filtered.map((note) => (
            <Row key={note.id} $on={note.study}>
              <Acts>
                <MiniButton
                  type="button"
                  onClick={() => onToggleStudy(note.id, !note.study)}
                  disabled={!connected}
                  aria-label={note.study ? t('note.toDeckOff', { word: note.w }) : t('note.toDeckOn', { word: note.w })}
                  title={note.study ? t('note.toDeckOff', { word: note.w }) : t('note.toDeckOn', { word: note.w })}
                >
                  {note.study ? '✓' : '+'}
                </MiniButton>
              </Acts>
              <div className="body">
                <div className="top">
                  <span className="w" lang="zh-Hans">
                    {note.w}
                  </span>
                  {note.p && <span className="p">{note.p}</span>}
                  {note.tag && <span className="tag">#{note.tag}</span>}
                </div>
                {note.m && <div className="m">{note.m}</div>}
                {note.note && <div className="note">{note.note}</div>}
              </div>
              <Acts>
                <MiniButton type="button" onClick={() => startEdit(note)} disabled={!connected} aria-label={t('note.edit')} title={t('note.edit')}>
                  ✎
                </MiniButton>
                <MiniButton
                  type="button"
                  $danger
                  onClick={() => requestRemove(note)}
                  disabled={!connected}
                  aria-label={t('note.delete')}
                  title={t('note.delete')}
                >
                  {confirmId === note.id ? '!' : '×'}
                </MiniButton>
              </Acts>
            </Row>
          ))
        )}
      </List>

      <FootNote>{t('note.foot', { count: myCards ?? notes.length })}</FootNote>
    </Wrap>
  );
}
