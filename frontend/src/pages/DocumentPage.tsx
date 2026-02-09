import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { Editor } from '../components/Editor';
import { PresenceBar } from '../components/PresenceBar';
import { CrdtEngine, CrdtOperation } from '../utils/crdt';

interface User {
  siteId: string;
  userName: string;
  color: string;
}

interface CursorInfo {
  siteId: string;
  userName: string;
  color: string;
  position: number;
}

export function DocumentPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [remoteOps, setRemoteOps] = useState<CrdtOperation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorInfo>>(new Map());
  const [copied, setCopied] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const crdtRef = useRef<CrdtEngine | null>(null);
  const downloadDropdownRef = useRef<HTMLDivElement | null>(null);
  const [siteId] = useState(() => 'user-' + Math.random().toString(36).substr(2, 6));
  const [userName] = useState(() => 'User ' + Math.random().toString(36).substr(2, 4).toUpperCase());
  const [myColor, setMyColor] = useState('#58a6ff');
  const [ready, setReady] = useState(false);

  const sendOperation = useCallback((op: CrdtOperation) => {
    if (clientRef.current?.active) {
      clientRef.current.publish({
        destination: '/app/document.edit',
        body: JSON.stringify({ documentId, operation: op }),
      });
    }
  }, [documentId]);

  const sendCursor = useCallback((position: number) => {
    if (clientRef.current?.active) {
      clientRef.current.publish({
        destination: '/app/document.cursor',
        body: JSON.stringify({ documentId, siteId, userName, color: myColor, position }),
      });
    }
  }, [documentId, siteId, userName, myColor]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const text = crdtRef.current?.getText() || '';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setShowDownloadDropdown(false);
  };

  const handleDownloadDocx = async () => {
    const text = crdtRef.current?.getText() || '';
    const lines = text.split('\n');

    const doc = new Document({
      sections: [{
        properties: {},
        children: lines.map(line =>
          new Paragraph({
            children: [new TextRun(line || ' ')],
          })
        ),
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${documentId}.docx`);
    setShowDownloadDropdown(false);
  };

  useEffect(() => {
    if (!documentId) return;

    const crdt = new CrdtEngine(siteId, documentId);
    crdtRef.current = crdt;

    fetch(`/api/documents/${documentId}/state`)
      .then(res => res.json())
      .then(chars => {
        crdt.loadFromState(chars);
        if (chars.length > 0) {
          setRemoteOps([{ type: 'INSERT', character: chars[0], documentId: documentId!, siteId: chars[0].siteId, clock: chars[0].clock }]);
        }
        connectWebSocket(crdt);
      })
      .catch(err => {
        console.error('Failed to load document:', err);
        connectWebSocket(crdt);
      });

    function connectWebSocket(crdt: CrdtEngine) {
      const client = new Client({
        webSocketFactory: () => new SockJS('/ws'),
        onConnect: () => {
          setStatus('connected');

          client.subscribe('/topic/document/' + documentId, (message) => {
            const data = JSON.parse(message.body);
            const applied = crdt.applyRemoteOperation(data.operation);
            if (applied) {
              setRemoteOps(prev => [...prev, data.operation]);
            }
          });

          client.subscribe('/topic/presence/' + documentId, (message) => {
            const userList: User[] = JSON.parse(message.body);
            setUsers(userList);
            const me = userList.find(u => u.siteId === siteId);
            if (me) setMyColor(me.color);
          });

          client.subscribe('/topic/cursor/' + documentId, (message) => {
            const cursor: CursorInfo = JSON.parse(message.body);
            if (cursor.siteId !== siteId) {
              setCursors(prev => {
                const next = new Map(prev);
                next.set(cursor.siteId, cursor);
                return next;
              });
            }
          });

          client.publish({
            destination: '/app/document.join',
            body: JSON.stringify({ documentId, siteId, userName }),
          });

          setReady(true);
        },
        onWebSocketClose: () => setStatus('disconnected'),
      });

      client.activate();
      clientRef.current = client;
    }

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

  // Close download dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target as Node)) {
        setShowDownloadDropdown(false);
      }
    };

    if (showDownloadDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadDropdown]);

  return (
    <div className="doc-container">
      <div className="doc-header">
        <div className="doc-header-left">
          <button className="doc-back-btn" onClick={() => navigate('/')}>←</button>
          <span className="doc-title">{documentId}</span>
          <div className={`doc-status ${status === 'disconnected' ? 'disconnected' : ''}`}>
            <div className="doc-status-dot" />
            {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </div>
        </div>
        <div className="doc-header-right">
          <PresenceBar users={users} currentSiteId={siteId} />
          <div style={{ position: 'relative' }} ref={downloadDropdownRef}>
            <button
              className="doc-share-btn"
              onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
            >
              ⬇ Download
            </button>
            {showDownloadDropdown && (
              <div className="doc-download-dropdown">
                <div className="doc-download-option" onClick={handleDownloadTxt}>
                  Save as .txt
                </div>
                <div className="doc-download-option" onClick={handleDownloadDocx}>
                  Save as .docx
                </div>
              </div>
            )}
          </div>
          <button className={`doc-share-btn ${copied ? 'copied' : ''}`} onClick={copyLink}>
            {copied ? '✓ Copied' : 'Share Link'}
          </button>
        </div>
      </div>
      <div className="doc-editor-area">
        {ready && crdtRef.current && (
          <Editor
            crdt={crdtRef.current}
            onOperation={sendOperation}
            onCursorChange={sendCursor}
            remoteCursors={cursors}
            remoteOps={remoteOps}
          />
        )}
      </div>
    </div>
  );
}