import io from 'socket.io-client';
import { AppState } from 'react-native';
import store from './Redux/Store';
import { setSocketConnect } from './Redux/Slices/NormalSlices/LiveStream/LiveChats';
import { addLiveUser, removeLiveUser, setLiveUsers } from './Redux/Slices/NormalSlices/LiveUsersSlice';


const SOCKET_URL = 'https://api.fahdu.com';

class WSService {
  // Store credentials for AppState-based reconnection
  _currentUserId = null;
  _token = null;
  _appStateSubscription = null;
  _heartbeatInterval = null;

  initializeSocket = async (currentUserId, token) => {
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

      this.socket.on('connect', () => {
        console.log(':::-> Socket connected:::::::::::');
        this.socket.emit('initiateConnection', currentUserId, res => console.log('Connection Initiated', res));
        store.dispatch(setSocketConnect({ socketConnect: true }));

        // Request initial live users list
        this.requestLiveUsers();
      });

      this.socket.on('disconnect', reason => {
        console.log(':::-> Socket disconnected:', reason);
        store.dispatch(setSocketConnect({ socketConnect: false }));
      });

      this.socket.on('reconnect', () => {
        console.log(':::-> Socket reconnected');
        this.socket.emit('initiateConnection', currentUserId);
        // Re-fetch live users on reconnect
        this.requestLiveUsers();
      });

      this.socket.off('message');
      this.socket.on('message', msg => {
        console.log('CHAT MESSAGE:', msg);
      });

      // Setup live stream listeners
      this.setupLiveStreamListeners();

      this.socket.on('error', err => {
        console.log('Socket error:', err);
      });

      // Setup AppState listener for foreground reconnection
      this._setupAppStateListener();

      // Setup Heartbeat listener to aggressively keep socket alive while idle
      this._startHeartbeat();

    } catch (error) {
      console.log('Socket init failed', error);
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

  // Aggressive Background / Idle Heartbeat
  _startHeartbeat = () => {
    if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
    this._heartbeatInterval = setInterval(() => {
      if (AppState.currentState === 'active' && this.socket) {
        if (!this.socket.connected) {
          console.log('💓 [Socket Heartbeat] Detected dead socket while active! Forcing reconnect...');
          this.socket.connect();
        } else {
          // Send dummy ping to keep NAT/Load Balancer alive
          this.socket.volatile.emit('client_ping', { time: Date.now() });
        }
      }
    }, 20000); // Check every 20 seconds
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
    console.log(`📥 LISTEN [${event}]`);
    this.socket?.on(event, cb);
  }

  off(event, cb) {
    console.log(`🔇 UNLISTEN [${event}]`);
    this.socket?.off(event, cb);
  }

  isConnected() {
    return !!this.socket?.connected;
  }
}

const socketServices = new WSService();
export default socketServices;