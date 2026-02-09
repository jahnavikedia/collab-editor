import React from 'react';

interface User {
  siteId: string;
  userName: string;
  color: string;
}

interface PresenceBarProps {
  users: User[];
  currentSiteId: string;
}

export const PresenceBar: React.FC<PresenceBarProps> = ({ users, currentSiteId }) => {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '8px 0',
      flexWrap: 'wrap',
      alignItems: 'center',
    }}>
      <span style={{ fontSize: 13, color: '#888', marginRight: 4 }}>Online:</span>
      {users.map(user => (
        <div
          key={user.siteId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 16,
            backgroundColor: user.color + '22',
            border: `1px solid ${user.color}`,
            fontSize: 13,
          }}
        >
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: user.color,
          }} />
          {user.userName}
          {user.siteId === currentSiteId && <span style={{ fontSize: 11, color: '#888' }}>(you)</span>}
        </div>
      ))}
    </div>
  );
};