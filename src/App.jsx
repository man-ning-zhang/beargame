import React from 'react';
import Backdrop from './components/Backdrop';
import { LanguageProvider } from './context/LanguageContext';
import Toast from './components/Toast';
import { RoomProvider, useRoom } from './context/RoomContext';
import Lobby from './pages/Lobby';
import RoomPage from './pages/RoomPage';

function Screen() {
  const { room } = useRoom();
  return room ? <RoomPage /> : <Lobby />;
}

export default function App() {
  return (
    <LanguageProvider>
      <RoomProvider>
        <Backdrop />
        <main className="app-shell">
          <Screen />
        </main>
        <Toast />
      </RoomProvider>
    </LanguageProvider>
  );
}
