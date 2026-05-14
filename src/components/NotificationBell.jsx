// src/components/NotificationBell.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';
import './NotificationBell.css';

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadMessagesCount();
      
      // Rafraîchir toutes les 30 secondes
      const interval = setInterval(() => {
        loadNotifications();
        loadUnreadMessagesCount();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    const result = await notificationService.getUserNotifications(user.uid);
    if (result.success) {
      setNotifications(result.data);
      const unread = result.data.filter(n => !n.read).length;
      setUnreadCount(unread);
    }
  };

  const loadUnreadMessagesCount = async () => {
    const result = await notificationService.getUnreadMessagesCount(user.uid);
    if (result.success) {
      setUnreadMessagesCount(result.count);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    await notificationService.markAsRead(notificationId);
    loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead(user.uid);
    loadNotifications();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message': return '💬';
      case 'like': return '❤️';
      case 'comment': return '💭';
      case 'join': return '👥';
      case 'event': return '📅';
      default: return '🔔';
    }
  };

  const getNotificationLink = (notification) => {
    if (notification.type === 'message') {
      return '/messages';
    }
    if (notification.type === 'like' || notification.type === 'comment') {
      return '/feed';
    }
    if (notification.type === 'event') {
      return '/events';
    }
    return '#';
  };

  // Total des notifications non lues (notifications + messages)
  const totalUnread = unreadCount + unreadMessagesCount;

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button className="bell-btn" onClick={() => setIsOpen(!isOpen)}>
        🔔
        {totalUnread > 0 && (
          <span className="badge">{totalUnread > 9 ? '9+' : totalUnread}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={handleMarkAllAsRead}>
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Section messages non lus */}
          {unreadMessagesCount > 0 && (
            <Link to="/messages" className="unread-messages-banner" onClick={() => setIsOpen(false)}>
              <div className="unread-messages-icon">💬</div>
              <div className="unread-messages-content">
                <strong>{unreadMessagesCount} message(s) non lu(s)</strong>
                <span>Consultez vos messages</span>
              </div>
              <div className="unread-messages-arrow">→</div>
            </Link>
          )}

          <div className="dropdown-list">
            {notifications.length === 0 && unreadMessagesCount === 0 ? (
              <div className="empty-notifications">
                <span>📭</span>
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.map(notif => (
                <Link
                  key={notif.id}
                  to={getNotificationLink(notif)}
                  className={`notification-item ${!notif.read ? 'unread' : ''}`}
                  onClick={() => handleMarkAsRead(notif.id)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notif.title}</div>
                    <div className="notification-message">{notif.message}</div>
                    <div className="notification-time">{notif.time}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
