import io from 'socket.io-client';
import { AppState } from 'react-native';
import store from './Redux/Store';
import { setSocketConnect } from './Redux/Slices/NormalSlices/LiveStream/LiveChats';
import { addLiveUser, removeLiveUser, setLiveUsers } from './Redux/Slices/NormalSlices/LiveUsersSlice';


const SOCKET_URL = 'https://api.fahdu.in';

class WSService {
  // Store credentials for AppState-based reconnection
  _currentUserId = null;
  _token = null;
  _appStateSubscription = null;
  _heartbeatInterval = null;

  initializeSocket = async (currentUserId, token) => {
    // Guard: Skip if no auth token provided
    if (!token) {
      console.log(':::--> No auth token provided, skipping socket init');
      return;
    }

    // Guard: If already connected with the same user, skip re-initialization
    if (this.socket?.connected && this._currentUserId === currentUserId) {
      console.log(':::-> Socket already connected, skipping re-init');
      return;
    }

    // Store credentials for reconnection
    this._currentUserId = currentUserId;
    this._token = token;

    // Only disconnect if we have an existing socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    try {
      this.socket = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        autoConnect: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ['websocket'],
      });

      // Wildcard listener to log EVERY arrived event from the socket server
      this.socket.onAny((event, ...args) => {
        console.log(`📥 [Socket Arrived] Event: [${event}] | Payload:`, JSON.stringify(args, null, 2));
      });

      this.socket.on('connect', () => {
        console.log('🔌 [Socket Connection] CONNECTED | ID:', this.socket.id);
        
        this.socket.emit('initiateConnection', currentUserId, res => {
          console.log('🔌 [Socket Connection] Connection Initiated response:', res);
        });
        store.dispatch(setSocketConnect({ socketConnect: true }));

        // Request initial live users list
        this.requestLiveUsers();
      });

      this.socket.on('disconnect', reason => {
        console.log('🔌 [Socket Connection] DISCONNECTED | Reason:', reason);
        store.dispatch(setSocketConnect({ socketConnect: false }));
      });

      this.socket.on('reconnect', () => {
        console.log('🔌 [Socket Connection] RECONNECTED');
        this.socket.emit('initiateConnection', currentUserId);
        // Re-fetch live users on reconnect
        this.requestLiveUsers();
      });

      this.socket.off('message');
      this.socket.on('message', msg => {
        console.log('✉️ CHAT MESSAGE RECEIVED:', msg);
      });

      // Setup live stream listeners
      this.setupLiveStreamListeners();

      this.socket.on('error', err => {
        console.log('🔌 [Socket Connection] ERROR:', err);
      });

      // Setup AppState listener for foreground reconnection
      this._setupAppStateListener();

      // Setup Heartbeat listener to aggressively keep socket alive while idle
      this._startHeartbeat();

    } catch (error) {
      console.log('🔌 [Socket Connection] Init failed:', error);
    }
  };

  // Automatically verify and restore socket when app returns to foreground
  _setupAppStateListener = () => {
    // Remove previous listener if any
    if (this._appStateSubscription) {
      this._appStateSubscription.remove();
    }

    console.log(':::-> Setting up AppState listener for socket health');

    this._appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      console.log(':::-> AppState changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        const isConnected = this.socket?.connected;
        console.log(':::-> App foregrounded. Socket connected:', isConnected);
        
        if (this.socket && !isConnected) {
          console.log(':::-> Socket disconnected while in background → reconnecting');
          this.socket.connect();
        }
      }
    });
  };

  // Heartbeat: Only force reconnect when socket.io's own reconnection isn't running
  _startHeartbeat = () => {
    if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
    this._heartbeatInterval = setInterval(() => {
      if (AppState.currentState === 'active' && this.socket) {
        if (!this.socket.connected) {
          // Don't fight socket.io's own reconnection backoff
          if (!this.socket.io?._reconnecting) {
            console.log('💓 [Socket Heartbeat] Dead socket, no reconnection in progress. Forcing connect...');
            this.socket.connect();
          }
        } else {
          // Send dummy ping to keep NAT/Load Balancer alive
          this.socket.volatile.emit('client_ping', { time: Date.now() });
        }
      }
    }, 30000); // Check every 30 seconds (was 20s — reduced to avoid fighting socket.io backoff)
  };

  setupLiveStreamListeners = () => {
    // Listen for initial live users list
    this.socket.on('live_users_list', (users) => {
      console.log('📺 Received live users list:', users);
      store.dispatch(setLiveUsers(users));
    });

    // Listen for when someone starts streaming (always receives array)
    this.socket.on('stream_started', (users) => {
      console.log('🔴 Stream started:', users);
      users.forEach(user => {
        store.dispatch(addLiveUser(user));
      });
    });

    // Listen for when someone stops streaming
    this.socket.on('stream_ended', (data) => {
      console.log('⚫ Stream ended:', data);
      store.dispatch(removeLiveUser({
        roomId: data.roomId,
        userId: data.userId
      }));
    });
  };

  // Request current live users
  requestLiveUsers = () => {
    console.log('📺 Requesting live users list');
    this.emit('get_live_users');
  };

  // Emit when user starts streaming
  emitStartStream = (roomId, userId, displayName) => {
    console.log('🔴 EMITTING start_stream:', { roomId, userId, displayName });
    this.emit('start_stream', { roomId, userId, displayName });
  };

  // Emit when user stops streaming
  emitEndStream = (roomId, userId) => {
    console.log('⚫ EMITTING end_stream:', { roomId, userId });
    this.emit('end_stream', { roomId, userId });
  };

  emitTyping = (roomId, userId) => {
    console.log('🟢 EMITTING typing:', { roomId, userId, socketConnected: !!this.socket?.connected });
    this.emit('typing', { roomId, userId });
  };

  emitStopTyping = (roomId, userId) => {
    console.log('🔴 EMITTING stop_typing:', { roomId, userId, socketConnected: !!this.socket?.connected });
    this.emit('stop_typing', { roomId, userId });
  };

  emitStartShake = roomId => {
    console.log('🔴 EMITTING shaking');
    this.emit('shake', roomId);
  };

  onUserShake = callback => {
    this.on('user_shake', callback);
  };

  onUserTyping = callback => {
    console.log('👂 LISTENING for user_typing');
    this.on('user_typing', callback);
  };

  onUserStopTyping = callback => {
    console.log('👂 LISTENING for user_stop_typing');
    this.on('user_stop_typing', callback);
  };

  removeTypingListeners = () => {
    console.log('🗑️ REMOVING typing listeners');
    this.off('user_typing');
    this.off('user_stop_typing');
  };

  removeLiveStreamListeners = () => {
    console.log('🗑️ REMOVING live stream listeners');
    this.off('live_users_list');
    this.off('stream_started');
    this.off('stream_ended');
  };

  emit(event, data = {}) {
    console.log(`📤 EMIT [${event}]:`, data, '| Socket exists:', !!this.socket, '| Connected:', !!this.socket?.connected);
    this.socket?.emit(event, data);
  }

  on(event, cb) {
    console.log(`📥 [Socket Listen Setup] Event: [${event}]`);
    
    // Wrap callback to log when the listener is triggered (what socket arrived listened to)
    const wrappedCb = (...args) => {
      console.log(`🔔 [Socket Listened Action] Event [${event}] callback triggered | Data:`, JSON.stringify(args, null, 2));
      if (cb) {
        cb(...args);
      }
    };

    if (!this._wrappedListeners) {
      this._wrappedListeners = new Map();
    }
    if (!this._wrappedListeners.has(event)) {
      this._wrappedListeners.set(event, new Map());
    }
    this._wrappedListeners.get(event).set(cb, wrappedCb);

    this.socket?.on(event, wrappedCb);
  }

  off(event, cb) {
    console.log(`🔇 UNLISTEN [${event}]`);
    if (cb && this._wrappedListeners?.get(event)?.has(cb)) {
      const wrappedCb = this._wrappedListeners.get(event).get(cb);
      this.socket?.off(event, wrappedCb);
      this._wrappedListeners.get(event).delete(cb);
      if (this._wrappedListeners.get(event).size === 0) {
        this._wrappedListeners.delete(event);
      }
    } else {
      this.socket?.off(event);
      if (this._wrappedListeners?.has(event)) {
        this._wrappedListeners.delete(event);
      }
    }
  }

  // Fully disconnect and clean up socket, heartbeat, and AppState listeners
  disconnect = () => {
    console.log('🔌 [Socket] Full disconnect and cleanup initiated');

    // Stop heartbeat
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }

    // Remove AppState listener
    if (this._appStateSubscription) {
      this._appStateSubscription.remove();
      this._appStateSubscription = null;
    }

    // Disconnect and destroy socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    // Clear wrapped listeners map
    if (this._wrappedListeners) {
      this._wrappedListeners.clear();
    }

    // Clear stored credentials so auto-reconnect doesn't kick in
    this._currentUserId = null;
    this._token = null;

    store.dispatch(setSocketConnect({ socketConnect: false }));
    console.log('🔌 [Socket] Cleanup complete');
  };

  isConnected() {
    return !!this.socket?.connected;
  }
}

const socketServices = new WSService();
export default socketServices;