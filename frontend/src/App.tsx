import React from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { DocumentPage } from './pages/DocumentPage';

function HomePage() {
  const navigate = useNavigate();

  const createDocument = () => {
    const id = Math.random().toString(36).substr(2, 8);
    navigate(`/doc/${id}`);
  };

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Collab Editor</h1>
      <p>Create a new document or share a link to collaborate.</p>
      <button onClick={createDocument}>New Document</button>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/doc/:documentId" element={<DocumentPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;