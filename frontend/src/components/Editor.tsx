import React, { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { CrdtEngine, CrdtOperation } from '../utils/crdt';

interface EditorProps {
  crdt: CrdtEngine;
  onOperation: (op: CrdtOperation) => void;
  remoteOps: CrdtOperation[];
}

export const Editor: React.FC<EditorProps> = ({ crdt, onOperation, remoteOps }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isRemoteUpdate = useRef(false);
  const processedOpsCount = useRef(0);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: crdt.getText(),
      extensions: [
        basicSetup,
        oneDark,
        EditorView.updateListener.of((update) => {
          if (isRemoteUpdate.current) return;
          if (!update.docChanged) return;

          update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            for (let i = toA - 1; i >= fromA; i--) {
              const op = crdt.generateDelete(i);
              if (op) onOperation(op);
            }

            const text = inserted ? inserted.toString() : '';
            for (let i = 0; i < text.length; i++) {
              const op = crdt.generateInsert(text[i], fromA + i - 1);
              onOperation(op);
            }
          });
        }),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    return () => view.destroy();
  }, [crdt, onOperation]);

  // When remote operations arrive, update CodeMirror
  useEffect(() => {
    if (!remoteOps || remoteOps.length <= processedOpsCount.current) return;

    const view = viewRef.current;
    if (!view) return;

    // Sync CodeMirror with CRDT text
    const crdtText = crdt.getText();
    const currentText = view.state.doc.toString();

    if (crdtText !== currentText) {
      isRemoteUpdate.current = true;
      view.dispatch({
        changes: { from: 0, to: currentText.length, insert: crdtText },
      });
      isRemoteUpdate.current = false;
    }

    processedOpsCount.current = remoteOps.length;
  }, [remoteOps, crdt]);

  return <div ref={editorRef} style={{ height: '400px', border: '1px solid #333' }} />;
};