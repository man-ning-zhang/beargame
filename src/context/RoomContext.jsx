import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { playSound } from '../utils/sound';

const RoomContext = createContext(null);

const KEYS = {
  token: 'bearTogether.token',
  name: 'bearTogether.name',
  room: 'bearTogether.room',
  // The browser is the master copy of everything that is "yours": study
  // progress, your own cards, your notes. The server only holds it while you
  // are in the room, so a redeploy cannot take it away.
  personal: 'bearTogether.personal',
};

const ERROR_KEYS = {
  room_not_found: 'error.roomNotFound',
  room_full: 'error.roomFull',
  full: 'error.roomFull',
  invalid_code: 'error.invalidCode',
  busy: 'error.busy',
  rate_limited: 'error.rateLimited',
  replaced: 'error.replaced',
  not_in_room: 'error.notInRoom',
  invalid_action: 'error.invalidAction',
};

const TOAST_KEYS = {
  action_cooldown: 'toast.actionCooldown',
  chat_slow: 'toast.chatSlow',
  socket_slow: 'toast.socketSlow',
  game_waiting: 'toast.gameWaiting',
  game_not_turn: 'toast.gameNotTurn',
  game_in_progress: 'toast.gameInProgress',
  study_invalid: 'study.invalid',
  note_invalid: 'note.saveFailed',
  level_invalid: 'study.levelInvalid',
  note_full: 'note.full',
  activity_busy: 'toast.activityBusy',
  activity_ingredients: 'toast.activityIngredients',
};

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private mode / storage disabled: the session still works, just without memory.
  }
}

function makeToken() {
  const saved = readStorage(KEYS.token);
  if (saved && /^[A-Za-z0-9_-]{8,80}$/.test(saved)) return saved;
  let token;
  try {
    token = crypto.randomUUID().replaceAll('-', '');
  } catch {
    token = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
  writeStorage(KEYS.token, token);
  return token;
}

function cleanName(raw) {
  return Array.from(String(raw ?? '').trim()).slice(0, 12).join('');
}

function cleanCode(raw) {
  const text = String(raw ?? '').trim();
  const link = text.match(/[?&]room=([A-Za-z0-9]{4,10})/i);
  return (link ? link[1] : text).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
}

function readPersonal() {
  try {
    const raw = window.localStorage.getItem(KEYS.personal);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

function writePersonal(data) {
  try {
    window.localStorage.setItem(KEYS.personal, JSON.stringify(data));
  } catch {
    // Storage full or disabled: the session still works, just without memory.
  }
}

function savedAtOf(personal) {
  return Number(personal?.savedAt) || 0;
}

function codeFromUrl() {
  try {
    return cleanCode(new URLSearchParams(window.location.search).get('room') || '');
  } catch {
    return '';
  }
}

function setUrlRoom(code) {
  try {
    const url = new URL(window.location.href);
    if (code) url.searchParams.set('room', code);
    else url.searchParams.delete('room');
    window.history.replaceState({}, '', url);
  } catch {
    // URL prettiness is optional.
  }
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRoom must be used inside RoomProvider');
  return context;
}

export function RoomProvider({ children }) {
  const savedName = readStorage(KEYS.name) || '';
  const urlCode = useMemo(codeFromUrl, []);

  const [status, setStatus] = useState('connecting');
  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(null);
  const [connected, setConnected] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState(null);
  const [cloze, setCloze] = useState(null);
  const [clozeResult, setClozeResult] = useState(null);
  const studyKeyRef = useRef('');
  const [lastRoom, setLastRoom] = useState(readStorage(KEYS.room) || '');
  const [initialCode, setInitialCode] = useState(urlCode || readStorage(KEYS.room) || '');

  const wsRef = useRef(null);
  const desiredRef = useRef(null);
  const inRoomRef = useRef(false);
  const tokenRef = useRef(makeToken());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const aliveRef = useRef(true);
  const openSocketRef = useRef(null);
  const lastMessageAtRef = useRef(Date.now());

  const showToast = useCallback((key, params = null) => {
    if (!key) return;
    setToast({ id: `${Date.now()}-${Math.random()}`, key, params });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const sendRaw = useCallback((message) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      // A half-open socket looks OPEN but nothing arrives and nothing sends.
      // Mark the silence so the watchdog rebuilds the connection right away
      // instead of waiting for its next scan.
      lastMessageAtRef.current = 0;
      return false;
    }
    socket.send(JSON.stringify(message));
    return true;
  }, []);

  const scheduleReconnect = useCallback(() => {
    window.clearTimeout(reconnectTimerRef.current);
    const attempt = reconnectAttemptRef.current;
    reconnectAttemptRef.current = Math.min(attempt + 1, 8);
    const delay = Math.min(450 * 1.7 ** attempt, 5000);
    reconnectTimerRef.current = window.setTimeout(() => {
      if (aliveRef.current) openSocketRef.current?.();
    }, delay);
  }, []);

  const handleMessage = useCallback(
    (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!message || typeof message.type !== 'string') return;

      switch (message.type) {
        case 'joined': {
          const reconnecting = inRoomRef.current;
          const saved = readPersonal();
          if (saved) {
            // Hand our copy back to the server, stamped so the empty snapshot
            // the server is about to send cannot overwrite it. The server keeps
            // whichever is newer, so this is also how a redeploy is undone.
            const stamped = { ...saved, savedAt: Date.now() };
            writePersonal(stamped);
            sendRaw({ type: 'personal', data: stamped });
          }
          if (message.reborn) showToast('room.reborn');
          inRoomRef.current = true;
          setMe(message.seat);
          setConnected(true);
          setStatus(reconnecting ? 'reconnecting' : 'joining');
          setNotice('');
          if (message.token) {
            tokenRef.current = message.token;
            writeStorage(KEYS.token, message.token);
          }
          writeStorage(KEYS.room, message.code);
          setLastRoom(message.code);
          setInitialCode(message.code);
          setUrlRoom(message.code);
          // From here on this is a room we belong to, so every reconnection must
          // re-join it by code. Keeping the original "create" intent would make
          // each reconnect open a brand new cabin and quietly move the pair to
          // another room — which looks exactly like "my taps do nothing".
          if (desiredRef.current) {
            desiredRef.current = {
              mode: 'join',
              code: message.code,
              name: desiredRef.current.name || readStorage(KEYS.name) || '',
            };
          }
          playSound(reconnecting ? 'join' : 'join');
          break;
        }
        case 'state': {
          if (!message.room) return;
          inRoomRef.current = true;
          const incoming = message.room;
          const fromServer = incoming.study?.personal ?? null;

          if (fromServer) {
            const local = readPersonal();
            // Newer wins: after a redeploy the server starts empty (savedAt 0),
            // so the browser's copy is adopted; a fresher server copy (another
            // tab or device) wins over a stale local one.
            const picked = local && savedAtOf(fromServer) < savedAtOf(local) ? local : fromServer;
            writePersonal(picked);
            incoming.study.notes = picked.notes ?? [];
          } else if (incoming.study) {
            incoming.study.notes = readPersonal()?.notes ?? [];
          }

          // A question belongs to one deck: drop it when the language or level
          // changes, otherwise a Chinese sentence can survive into French.
          const studyKey = `${incoming.study?.lang ?? ''}:${incoming.study?.level ?? ''}`;
          if (studyKeyRef.current !== studyKey) {
            studyKeyRef.current = studyKey;
            setCloze(null);
            setClozeResult(null);
          }

          setRoom(incoming);
          setStatus('room');
          setClockOffset(incoming.serverTime - Date.now());
          break;
        }
        case 'left': {
          setCloze(null);
          setClozeResult(null);
          inRoomRef.current = false;
          desiredRef.current = null;
          setRoom(null);
          setMe(null);
          setStatus('idle');
          break;
        }
        case 'cloze': {
          setCloze(message.question ?? null);
          setClozeResult(null);
          break;
        }
        case 'clozeResult': {
          setClozeResult({
            correct: Boolean(message.correct),
            answer: message.answer,
            interval: message.interval,
            iv: message.iv,
          });
          break;
        }
        case 'toast': {
          showToast(
            TOAST_KEYS[message.code] ?? 'error.generic',
            message.code === 'action_cooldown' ? { wait: message.wait } : null,
          );
          break;
        }
        case 'error': {
          if (message.code === 'replaced') {
            inRoomRef.current = false;
            desiredRef.current = null;
            setRoom(null);
            setMe(null);
            setStatus('idle');
            setNotice('error.replaced');
            writeStorage(KEYS.room, null);
            setLastRoom('');
            setInitialCode('');
            setUrlRoom('');
            break;
          }

          if (message.code === 'rate_limited' && inRoomRef.current) {
            showToast('error.rateLimited');
            break;
          }

          if (['room_not_found', 'room_full', 'invalid_code', 'busy', 'rate_limited', 'full'].includes(message.code)) {
            inRoomRef.current = false;
            desiredRef.current = null;
            setRoom(null);
            setMe(null);
            setStatus('idle');
            setNotice(ERROR_KEYS[message.code] ?? 'error.generic');
            playSound('error');
            if (['room_not_found', 'room_full', 'invalid_code', 'full'].includes(message.code)) {
              writeStorage(KEYS.room, null);
              setLastRoom('');
              setInitialCode('');
              setUrlRoom('');
            }
            break;
          }

          showToast(ERROR_KEYS[message.code] ?? 'error.generic');
          break;
        }
        default:
          break;
      }
    },
    [sendRaw, showToast],
  );

  const openSocket = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const existing = wsRef.current;
    if (existing && existing.readyState === WebSocket.OPEN) return existing;
    if (existing && existing.readyState === WebSocket.CONNECTING) {
      // A handshake that never completes (a cold free-tier instance can hold
      // the upgrade open) would block every future attempt. Give it a deadline.
      if (Date.now() - (existing.connectedAt ?? 0) < 8000) return existing;
      existing.onclose = null;
      existing.onopen = null;
      existing.onmessage = null;
      try {
        existing.close();
      } catch {
        // Already gone.
      }
      if (wsRef.current === existing) wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let socket;
    try {
      socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
    } catch {
      scheduleReconnect();
      return null;
    }
    socket.connectedAt = Date.now();
    wsRef.current = socket;

    let connectTimer = window.setTimeout(() => {
      if (socket.readyState !== WebSocket.CONNECTING) return;
      socket.onclose = null;
      socket.onopen = null;
      socket.onmessage = null;
      try {
        socket.close();
      } catch {
        // Already gone.
      }
      if (wsRef.current === socket) wsRef.current = null;
      if (!aliveRef.current) return;
      setConnected(false);
      setStatus(inRoomRef.current ? 'reconnecting' : desiredRef.current ? 'joining' : 'connecting');
      scheduleReconnect();
    }, 8000);

    const clearConnectTimer = () => {
      window.clearTimeout(connectTimer);
      connectTimer = null;
    };

    socket.onopen = () => {
      clearConnectTimer();
      if (!aliveRef.current) return;
      setConnected(true);
      setStatus(inRoomRef.current ? 'reconnecting' : desiredRef.current ? 'joining' : 'idle');
      reconnectAttemptRef.current = 0;
      const desired = desiredRef.current;
      if (desired) {
        const payload =
          desired.mode === 'create'
            ? { type: 'create', name: desired.name, token: tokenRef.current }
            : { type: 'join', code: desired.code, name: desired.name, token: tokenRef.current };
        sendRaw(payload);
      }
    };

    socket.onmessage = (event) => {
      lastMessageAtRef.current = Date.now();
      handleMessage(event);
    };

    socket.onclose = () => {
      clearConnectTimer();
      if (wsRef.current === socket) wsRef.current = null;
      if (!aliveRef.current) return;
      setConnected(false);
      setStatus(inRoomRef.current ? 'reconnecting' : desiredRef.current ? 'joining' : 'connecting');
      scheduleReconnect();
    };

    socket.onerror = () => {
      // The close event drives reconnection.
    };

    return socket;
  }, [handleMessage, scheduleReconnect, sendRaw]);

  useEffect(() => {
    openSocketRef.current = openSocket;
  }, [openSocket]);

  // Watchdog for silent drops. Free-tier hosts and mobile networks can lose a
  // socket without ever firing `close`, which leaves the page showing a stale
  // room where every tap goes into a dead connection. The server broadcasts at
  // least every 4 seconds while someone is in the room, so 15 seconds of
  // silence while the tab is visible means the link is gone.
  useEffect(() => {
    const checkConnection = () => {
      if (!inRoomRef.current) return;
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastMessageAtRef.current < 15000) return;

      lastMessageAtRef.current = Date.now();
      const socket = wsRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      } else {
        openSocketRef.current?.();
      }
    };

    const timer = window.setInterval(checkConnection, 5000);
    // Coming back from another app is exactly when a phone socket is most
    // likely to be dead, so check right away instead of waiting for the scan.
    document.addEventListener('visibilitychange', checkConnection);
    window.addEventListener('focus', checkConnection);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', checkConnection);
      window.removeEventListener('focus', checkConnection);
    };
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    const saved = readStorage(KEYS.name) || '';
    if (urlCode && saved) {
      desiredRef.current = { mode: 'join', code: urlCode, name: saved };
      setStatus('joining');
    }
    const socket = openSocket();
    return () => {
      aliveRef.current = false;
      window.clearTimeout(reconnectTimerRef.current);
      if (socket) {
        socket.onclose = null;
        socket.onmessage = null;
        socket.onopen = null;
        socket.close();
      }
      if (wsRef.current === socket) wsRef.current = null;
    };
    // Connection should only be created once for the lifetime of the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createRoom = useCallback(
    (name) => {
      const nextName = cleanName(name);
      if (!nextName) return false;
      writeStorage(KEYS.name, nextName);
      desiredRef.current = { mode: 'create', name: nextName };
      setNotice('');
      setStatus('joining');
      if (!sendRaw({ type: 'create', name: nextName, token: tokenRef.current })) {
        openSocket();
      }
      return true;
    },
    [openSocket, sendRaw],
  );

  const joinRoom = useCallback(
    (code, name) => {
      const nextCode = cleanCode(code);
      const nextName = cleanName(name);
      if (nextCode.length !== 4 || !nextName) return false;
      writeStorage(KEYS.name, nextName);
      desiredRef.current = { mode: 'join', code: nextCode, name: nextName };
      setNotice('');
      setStatus('joining');
      if (!sendRaw({ type: 'join', code: nextCode, name: nextName, token: tokenRef.current })) {
        openSocket();
      }
      return true;
    },
    [openSocket, sendRaw],
  );

  const leave = useCallback(() => {
    sendRaw({ type: 'leave' });
    inRoomRef.current = false;
    desiredRef.current = null;
    setRoom(null);
    setMe(null);
    setStatus(connected ? 'idle' : 'connecting');
    writeStorage(KEYS.room, null);
    setLastRoom('');
    setInitialCode('');
    setNotice('');
    setUrlRoom('');
  }, [connected, sendRaw]);

  const doAction = useCallback(
    (action) => {
      if (!inRoomRef.current) return false;
      if (!sendRaw({ type: 'action', action })) {
        showToast('toast.reconnecting');
        return false;
      }
      return true;
    },
    [sendRaw, showToast],
  );

  // Outfits and long chores are room-wide, not personal, so they go through
  // the same socket as every care action and every device sees the result.
  const changeOutfit = useCallback(
    (who, outfit) => {
      if (!inRoomRef.current) return false;
      if (!sendRaw({ type: 'outfit', who: String(who), outfit: String(outfit) })) {
        showToast('toast.reconnecting');
        return false;
      }
      return true;
    },
    [sendRaw, showToast],
  );

  const startActivity = useCallback(
    (id, roomId) => {
      if (!inRoomRef.current) return false;
      if (!sendRaw({ type: 'activity', id: String(id), room: String(roomId) })) {
        showToast('toast.reconnecting');
        return false;
      }
      return true;
    },
    [sendRaw, showToast],
  );

  const sendChat = useCallback(
    (text, emote = '') => {
      if (!inRoomRef.current) return false;
      const cleanText = String(text ?? '').slice(0, 120);
      if (!cleanText.trim() && !emote) return false;
      if (!sendRaw({ type: 'chat', text: cleanText, emote })) {
        showToast('toast.chatOffline');
        return false;
      }
      return true;
    },
    [sendRaw, showToast],
  );

  const makeMove = useCallback(
    (index) => {
      if (!inRoomRef.current) return false;
      return sendRaw({ type: 'move', index });
    },
    [sendRaw],
  );

  const rematch = useCallback(() => {
    if (!inRoomRef.current) return false;
    return sendRaw({ type: 'rematch' });
  }, [sendRaw]);

  const gradeCard = useCallback(
    (key, grade) => {
      if (!inRoomRef.current) return false;
      const payload = { type: 'study', action: 'grade', key: String(key ?? ''), grade };
      if (!sendRaw(payload)) {
        showToast('toast.reconnecting');
        return false;
      }
      return true;
    },
    [sendRaw, showToast],
  );

  const setStudyLevel = useCallback(
    (level) => {
      if (!inRoomRef.current) return false;
      // Levels are numbers for HSK (1-6) and strings for DELF (A1-B1), so pass
      // the value through untouched.
      return sendRaw({ type: 'study', action: 'level', level });
    },
    [sendRaw],
  );

  const setStudyLang = useCallback(
    (lang) => {
      if (!inRoomRef.current) return false;
      return sendRaw({ type: 'study', action: 'lang', lang: String(lang) });
    },
    [sendRaw],
  );

  const setStudyLimit = useCallback(
    (limit) => {
      if (!inRoomRef.current) return false;
      return sendRaw({ type: 'study', action: 'limit', limit: Number(limit) });
    },
    [sendRaw],
  );

  const requestCloze = useCallback(() => {
    if (!inRoomRef.current) return false;
    return sendRaw({ type: 'study', action: 'cloze' });
  }, [sendRaw]);

  const answerCloze = useCallback(
    (key, choice) => {
      if (!inRoomRef.current) return false;
      return sendRaw({ type: 'study', action: 'clozeAnswer', key, choice });
    },
    [sendRaw],
  );

  const saveNote = useCallback(
    (note) => {
      if (!inRoomRef.current) return false;
      const action = note?.id ? 'update' : 'add';
      return sendRaw({ type: 'note', action, payload: note });
    },
    [sendRaw],
  );

  const removeNote = useCallback(
    (id) => {
      if (!inRoomRef.current) return false;
      return sendRaw({ type: 'note', action: 'remove', payload: { id } });
    },
    [sendRaw],
  );

  const toggleNoteStudy = useCallback(
    (id, study) => {
      if (!inRoomRef.current) return false;
      return sendRaw({ type: 'note', action: 'study', payload: { id, study } });
    },
    [sendRaw],
  );

  const clearNotice = useCallback(() => setNotice(''), []);

  const value = {
    status,
    connected,
    room,
    me,
    clockOffset,
    notice,
    toast,
    lastRoom,
    initialCode,
    savedName,
    createRoom,
    joinRoom,
    leave,
    doAction,
    changeOutfit,
    startActivity,
    sendChat,
    makeMove,
    rematch,
    gradeCard,
    setStudyLevel,
    setStudyLang,
    setStudyLimit,
    cloze,
    clozeResult,
    requestCloze,
    answerCloze,
    saveNote,
    removeNote,
    toggleNoteStudy,
    clearNotice,
    showToast,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
