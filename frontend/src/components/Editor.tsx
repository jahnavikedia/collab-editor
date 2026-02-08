import React, { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';

interface EditorProps {
  onTextChange: (text: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ onTextChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: '',
      extensions: [
        basicSetup,
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onTextChange(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => view.destroy();
  }, []);

  return <div ref={editorRef} style={{ height: '400px', border: '1px solid #333' }} />;
};