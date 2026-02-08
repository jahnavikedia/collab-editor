import React, { useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

function App() {
  const [status, setStatus] = useState('Disconnected');

  const connect = () => {
    setStatus('Connecting...');

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        setStatus('Connected!');
        console.log('WebSocket connected');
      },
      onWebSocketClose: () => {
        setStatus('Disconnected');
      },
    });

    client.activate();
  };

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Collab Editor</h1>
      <p>Status: <strong>{status}</strong></p>
      <button onClick={connect}>Connect to Server</button>
    </div>
  );
}

export default App;