import React, { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { CrdtEngine, CrdtOperation } from '../utils/crdt';

interface CursorInfo {
  siteId: string;
  userName: string;
  color: string;
  position: number;
}

interface EditorProps {
  crdt: CrdtEngine;
  onOperation: (op: CrdtOperation) => void;
  onCursorChange: (position: number) => void;
  remoteCursors: Map<string, CursorInfo>;
  remoteOps: CrdtOperation[];
}

// Widget to display a remote cursor
class RemoteCursorWidget extends WidgetType {
  constructor(readonly userName: string, readonly color: string) {
    super();
  }

  toDOM() {
    const wrap = document.createElement('span');
    wrap.style.position = 'relative';
    wrap.style.display = 'inline';

    const cursor = document.createElement('div');
    cursor.style.position = 'absolute';
    cursor.style.left = '0';
    cursor.style.top = '0';
    cursor.style.width = '2px';
    cursor.style.height = '1.2em';
    cursor.style.backgroundColor = this.color;
    cursor.style.zIndex = '10';

    const label = document.createElement('div');
    label.textContent = this.userName;
    label.style.position = 'absolute';
    label.style.left = '0';
    label.style.top = '-18px';
    label.style.backgroundColor = this.color;
    label.style.color = '#fff';
    label.style.padding = '2px 4px';
    label.style.fontSize = '10px';
    label.style.fontWeight = '600';
    label.style.borderRadius = '3px';
    label.style.whiteSpace = 'nowrap';
    label.style.zIndex = '11';
    label.style.opacity = '1';
    label.style.transition = 'opacity 0.3s';

    // Fade out label after 2 seconds
    setTimeout(() => {
      label.style.opacity = '0';
    }, 2000);

    wrap.appendChild(cursor);
    wrap.appendChild(label);
    return wrap;
  }
}

// StateEffect to update remote cursors
const updateCursors = StateEffect.define<Map<string, CursorInfo>>();

// StateField to manage remote cursor decorations
const remoteCursorField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);

    for (const effect of tr.effects) {
      if (effect.is(updateCursors)) {
        const cursors = effect.value;
        const widgets: any[] = [];

        cursors.forEach((cursor) => {
          const pos = Math.min(cursor.position, tr.state.doc.length);
          const widget = Decoration.widget({
            widget: new RemoteCursorWidget(cursor.userName, cursor.color),
            side: 1,
          });
          widgets.push(widget.range(pos));
        });

        decorations = Decoration.set(widgets, true);
      }
    }

    return decorations;
  },
  provide: f => EditorView.decorations.from(f),
});

export const Editor: React.FC<EditorProps> = ({
  crdt,
  onOperation,
  onCursorChange,
  remoteCursors,
  remoteOps
}) => {
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
        remoteCursorField,
        EditorView.updateListener.of((update) => {
          if (isRemoteUpdate.current) return;

          // Notify cursor position changes
          if (update.selectionSet) {
            const cursorPos = update.state.selection.main.head;
            onCursorChange(cursorPos);
          }

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
  }, [crdt, onOperation, onCursorChange]);

  // When remote operations arrive, update CodeMirror
  useEffect(() => {
    if (!remoteOps || remoteOps.length <= processedOpsCount.current) return;

    const view = viewRef.current;
    if (!view) return;

    // Sync CodeMirror with CRDT text
    const crdtText = crdt.getText();
    const currentText = view.state.doc.toString();

    if (crdtText !== currentText) {
      // Save cursor position before update
      const currentSelection = view.state.selection.main;
      const cursorPos = currentSelection.head;

      isRemoteUpdate.current = true;

      // Replace entire document with CRDT text
      view.dispatch({
        changes: { from: 0, to: currentText.length, insert: crdtText },
        // Restore cursor position, clamped to new document length
        selection: { anchor: Math.min(cursorPos, crdtText.length) },
      });

      isRemoteUpdate.current = false;
    }

    processedOpsCount.current = remoteOps.length;
  }, [remoteOps, crdt]);

  // Update remote cursor decorations when cursors change
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: updateCursors.of(remoteCursors),
    });
  }, [remoteCursors]);

  return <div ref={editorRef} />;
};
