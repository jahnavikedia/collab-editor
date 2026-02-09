import React from 'react';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();

  const createDocument = () => {
    const id = Math.random().toString(36).substr(2, 8);
    navigate(`/doc/${id}`);
  };

  return (
    <div className="home-container">
      <div className="home-logo">CollabEdit</div>
      <p className="home-subtitle">Real-time collaborative editing, powered by CRDTs</p>
      <button className="home-btn" onClick={createDocument}>
        + New Document
      </button>
    </div>
  );
}