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

  const showToast = useCallback((message) => {
    if (!message) return;
    setToast({ id: `${Date.now()}-${Math.random()}`, message });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const sendRaw = useCallback((message) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
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
          playSound(reconnecting ? 'join' : 'join');
          break;
        }
        case 'state': {
          if (!message.room) return;
          inRoomRef.current = true;
          setRoom(message.room);
          setStatus('room');
          setClockOffset(message.room.serverTime - Date.now());
          break;
        }
        case 'left': {
          inRoomRef.current = false;
          desiredRef.current = null;
          setRoom(null);
          setMe(null);
          setStatus('idle');
          break;
        }
        case 'toast': {
          showToast(message.message);
          break;
        }
        case 'error': {
          if (message.code === 'replaced') {
            inRoomRef.current = false;
            desiredRef.current = null;
            setRoom(null);
            setMe(null);
            setStatus('idle');
            setNotice(message.message || '这个房间在另一个窗口打开了。');
            showToast(message.message || '这个房间在另一个窗口打开了。');
            writeStorage(KEYS.room, null);
            setLastRoom('');
            setInitialCode('');
            setUrlRoom('');
            break;
          }

          if (message.code === 'rate_limited' && inRoomRef.current) {
            showToast(message.message);
            break;
          }

          if (['room_not_found', 'room_full', 'invalid_code', 'busy', 'rate_limited'].includes(message.code)) {
            inRoomRef.current = false;
            desiredRef.current = null;
            setRoom(null);
            setMe(null);
            setStatus('idle');
            setNotice(message.message || '没有进到这间小屋。');
            playSound('error');
            if (['room_not_found', 'room_full', 'invalid_code'].includes(message.code)) {
              writeStorage(KEYS.room, null);
              setLastRoom('');
              setInitialCode('');
              setUrlRoom('');
            }
            break;
          }

          showToast(message.message || '小熊没听懂，再试一次吧。');
          break;
        }
        default:
          break;
      }
    },
    [showToast],
  );

  const openSocket = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return existing;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let socket;
    try {
      socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
    } catch {
      scheduleReconnect();
      return null;
    }
    wsRef.current = socket;

    socket.onopen = () => {
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

    socket.onmessage = handleMessage;

    socket.onclose = () => {
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
        showToast('正在重新连回小屋…');
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
        showToast('还在重新连接，消息没有发出去。');
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
    sendChat,
    makeMove,
    rematch,
    clearNotice,
    showToast,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
