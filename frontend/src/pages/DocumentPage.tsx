import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Editor } from '../components/Editor';
import { PresenceBar } from '../components/PresenceBar';
import { CrdtEngine, CrdtOperation } from '../utils/crdt';

interface User {
  siteId: string;
  userName: string;
  color: string;
}

export function DocumentPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [status, setStatus] = useState('Connecting...');
  const [remoteOps, setRemoteOps] = useState<CrdtOperation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const clientRef = useRef<Client | null>(null);
  const crdtRef = useRef<CrdtEngine | null>(null);
  const [siteId] = useState(() => 'user-' + Math.random().toString(36).substr(2, 6));
  const [userName] = useState(() => 'User ' + Math.random().toString(36).substr(2, 4).toUpperCase());
  const [ready, setReady] = useState(false);

  const sendOperation = useCallback((op: CrdtOperation) => {
    if (clientRef.current?.active) {
      clientRef.current.publish({
        destination: '/app/document.edit',
        body: JSON.stringify({ documentId, operation: op }),
      });
    }
  }, [documentId]);

  useEffect(() => {
    if (!documentId) return;

    const crdt = new CrdtEngine(siteId, documentId);
    crdtRef.current = crdt;

    fetch(`http://localhost:8080/api/documents/${documentId}/state`)
      .then(res => res.json())
      .then(chars => {
        // Load server's ordered sequence directly - do NOT replay through insert algorithm
        crdt.loadFromState(chars);

        if (chars.length > 0) {
          setRemoteOps([{ type: 'INSERT', character: chars[0], documentId: documentId!, siteId: chars[0].siteId, clock: chars[0].clock }]);
        }

        const client = new Client({
          webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
          onConnect: () => {
            setStatus('Connected');

            client.subscribe('/topic/document/' + documentId, (message) => {
              const data = JSON.parse(message.body);
              const applied = crdt.applyRemoteOperation(data.operation);
              if (applied) {
                setRemoteOps(prev => [...prev, data.operation]);
              }
            });

            client.subscribe('/topic/presence/' + documentId, (message) => {
              setUsers(JSON.parse(message.body));
            });

            // Send join message
            client.publish({
              destination: '/app/document.join',
              body: JSON.stringify({ documentId, siteId, userName }),
            });

            setReady(true);
          },
          onWebSocketClose: () => setStatus('Disconnected'),
        });

        client.activate();
        clientRef.current = client;
      })
      .catch(err => {
        console.error('Failed to load document:', err);
        const client = new Client({
          webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
          onConnect: () => {
            setStatus('Connected');
            client.subscribe('/topic/document/' + documentId, (message) => {
              const data = JSON.parse(message.body);
              const applied = crdt.applyRemoteOperation(data.operation);
              if (applied) {
                setRemoteOps(prev => [...prev, data.operation]);
              }
            });
            client.subscribe('/topic/presence/' + documentId, (message) => {
              setUsers(JSON.parse(message.body));
            });
            client.publish({
              destination: '/app/document.join',
              body: JSON.stringify({ documentId, siteId, userName }),
            });
            setReady(true);
          },
          onWebSocketClose: () => setStatus('Disconnected'),
        });
        client.activate();
        clientRef.current = client;
      });

    return () => {
      if (clientRef.current?.active) {
        clientRef.current.publish({
          destination: '/app/document.leave',
          body: JSON.stringify({ documentId, siteId }),
        });
      }
      clientRef.current?.deactivate();
    };
  }, [documentId, siteId, userName]);

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Document: {documentId}</h1>
      <p style={{ fontSize: 12, color: '#888' }}>
        Share this URL to collaborate: {window.location.href}
      </p>
      <PresenceBar users={users} currentSiteId={siteId} />
      {ready && crdtRef.current && (
        <Editor
          crdt={crdtRef.current}
          onOperation={sendOperation}
          remoteOps={remoteOps}
        />
      )}
    </div>
  );
}