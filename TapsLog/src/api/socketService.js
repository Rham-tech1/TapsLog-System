/**
 * Socket.IO client singleton for TapsLog real-time events
 */
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

/**
 * Get or create the socket connection
 * @returns {import('socket.io-client').Socket}
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      autoConnect: false,
    });
  }
  return socket;
}

/**
 * Connect to the socket server
 */
export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

/**
 * Disconnect the socket
 */
export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

/**
 * Join a session room to receive live tap events
 * @param {string} sessionId
 */
export function joinSessionRoom(sessionId) {
  const s = getSocket();
  s.emit('join_session', { session_id: sessionId });
}

/**
 * Leave a session room
 * @param {string} sessionId
 */
export function leaveSessionRoom(sessionId) {
  const s = getSocket();
  s.emit('leave_session', { session_id: sessionId });
}
