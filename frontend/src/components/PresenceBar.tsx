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

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export const PresenceBar: React.FC<PresenceBarProps> = ({ users, currentSiteId }) => {
  return (
    <div className="presence-bar">
      {users.map(user => (
        <div
          key={user.siteId}
          className="presence-avatar"
          style={{ backgroundColor: user.color }}
        >
          {getInitials(user.userName)}
          <span className="tooltip">
            {user.userName}{user.siteId === currentSiteId ? ' (you)' : ''}
          </span>
        </div>
      ))}
    </div>
  );
};