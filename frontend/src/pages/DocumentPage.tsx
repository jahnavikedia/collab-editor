import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Editor } from '../components/Editor';
import { CrdtEngine, CrdtOperation } from '../utils/crdt';

export function DocumentPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [status, setStatus] = useState('Connecting...');
  const [remoteOps, setRemoteOps] = useState<CrdtOperation[]>([]);
  const clientRef = useRef<Client | null>(null);
  const crdtRef = useRef<CrdtEngine | null>(null);
  const [siteId] = useState(() => 'user-' + Math.random().toString(36).substr(2, 6));
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
        chars.forEach((c: any) => {
          if (!c.tombstone) {
            crdt.applyRemoteOperation({
              type: 'INSERT',
              character: c,
              documentId: documentId,
              siteId: c.siteId,
              clock: c.clock,
            });
          }
        });

        // Trigger editor to show loaded text
        if (chars.length > 0) {
          setRemoteOps([{ type: 'INSERT', character: chars[0], documentId: documentId!, siteId: chars[0].siteId, clock: chars[0].clock }]);
        }

        // Now connect WebSocket
        const client = new Client({
          webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
          onConnect: () => {
            setStatus('Connected as ' + siteId);

            client.subscribe('/topic/document/' + documentId, (message) => {
              const data = JSON.parse(message.body);
              const applied = crdt.applyRemoteOperation(data.operation);
              if (applied) {
                setRemoteOps(prev => [...prev, data.operation]);
              }
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
            setStatus('Connected as ' + siteId);
            client.subscribe('/topic/document/' + documentId, (message) => {
              const data = JSON.parse(message.body);
              const applied = crdt.applyRemoteOperation(data.operation);
              if (applied) {
                setRemoteOps(prev => [...prev, data.operation]);
              }
            });
            setReady(true);
          },
          onWebSocketClose: () => setStatus('Disconnected'),
        });
        client.activate();
        clientRef.current = client;
      });

    return () => {
      clientRef.current?.deactivate();
    };
  }, [documentId, siteId]);

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Document: {documentId}</h1>
      <p>Status: {status}</p>
      <p style={{ fontSize: 12, color: '#888' }}>
        Share this URL to collaborate: {window.location.href}
      </p>
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