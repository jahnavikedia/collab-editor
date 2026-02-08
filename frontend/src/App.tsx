import React, { useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Editor } from './components/Editor';
import { CrdtEngine, CrdtOperation } from './utils/crdt';

function App() {
  const [status, setStatus] = useState('Disconnected');
  const [remoteOps, setRemoteOps] = useState<CrdtOperation[]>([]);
  const clientRef = useRef<Client | null>(null);
  const crdtRef = useRef<CrdtEngine | null>(null);
  const documentId = 'demo';
  const [siteId] = useState(() => 'user-' + Math.random().toString(36).substr(2, 6));

  const sendOperation = useCallback((op: CrdtOperation) => {
    if (clientRef.current?.active) {
      clientRef.current.publish({
        destination: '/app/document.edit',
        body: JSON.stringify({ documentId, operation: op }),
      });
    }
  }, [documentId]);

  const connect = () => {
    crdtRef.current = new CrdtEngine(siteId, documentId);
    setStatus('Connecting...');

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        setStatus('Connected as ' + siteId);

        client.subscribe('/topic/document/' + documentId, (message) => {
          const data = JSON.parse(message.body);
          const crdt = crdtRef.current;
          if (!crdt) return;

          const applied = crdt.applyRemoteOperation(data.operation);
          if (applied) {
            setRemoteOps(prev => [...prev, data.operation]);
          }
        });
      },
      onWebSocketClose: () => setStatus('Disconnected'),
    });

    client.activate();
    clientRef.current = client;
  };

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Collab Editor</h1>
      <p>Status: <strong>{status}</strong></p>
      {status === 'Disconnected' && (
        <button onClick={connect}>Connect</button>
      )}
      {crdtRef.current && (
        <Editor
          crdt={crdtRef.current}
          onOperation={sendOperation}
          remoteOps={remoteOps}
        />
      )}
    </div>
  );
}

export default App;