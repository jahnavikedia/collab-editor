import React, { useState } from 'react';
import { Editor } from './components/Editor';

function App() {
  const [text, setText] = useState('');

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Collab Editor</h1>
      <Editor onTextChange={setText} />
      <p style={{ marginTop: 10, color: '#888' }}>
        Characters: {text.length}
      </p>
    </div>
  );
}

export default App;