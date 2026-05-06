import {createSlice} from '@reduxjs/toolkit';
import {resetAll} from '../../Actions';

let checkForHexRegExp = /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i;

// Base cache keys + combined audience+sort keys
const BASE_CACHE_KEYS = ['none', 'followers', 'subscribers', 'read', 'unread'];
const COMBINED_CACHE_KEYS = [
  'subscribers_read', 'subscribers_unread',
  'followers_read', 'followers_unread',
  'none_read', 'none_unread',
];
const ALL_CACHE_KEYS = [...BASE_CACHE_KEYS, ...COMBINED_CACHE_KEYS];

const initialState = {
  data: {
    // Recent sorts (audience-only keys)
    none: [],
    followers: [],
    subscribers: [],
    // Global read/unread (no audience filter)
    read: [],
    unread: [],
    // Combined audience + sort keys
    subscribers_read: [],
    subscribers_unread: [],
    followers_read: [],
    followers_unread: [],
    none_read: [],
    none_unread: [],
  },
};

const sortChatRoomList = arr => {
  return arr
    .map(x => {
      x.updatedAt = new Date(x.updatedAt);
      return x;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
};

const chatRoomListSlice = createSlice({
  name: 'roomList',
  initialState,

  reducers: {
    setCacheByFilter: (state, action) => {
      const {type, data: incoming, replace} = action.payload;

      if (!ALL_CACHE_KEYS.includes(type)) {
        console.error(`Invalid filter type: ${type}`);
        return;
      }

      // Ensure the dynamic key exists in state (for combined keys)
      if (!state.data[type]) {
        state.data[type] = [];
      }

      // Merge old + new unless replace is true
      const merged = replace ? [...incoming] : [...state.data[type], ...incoming];

      // Remove duplicates by _id
      const unique = merged.reduce((acc, item) => {
        if (!acc.some(x => x._id === item._id)) acc.push(item);
        return acc;
      }, []);

      // ✅ FIX: Sort after merging to ensure correct order
      state.data[type] = sortChatRoomList(unique);

      console.log(`✅ Cached and sorted ${unique.length} rooms in ${type}`);
    },

    updateCacheRoomList: (state, action) => {
      console.log('📥 Updating room list cache', action.payload);

      const {
        chatRoomId: _id,
        roomId: chatRoomIdAlt,
        createdAt,
        message,
        hasAttachment,
        senderId,
        sender_id: senderIdAlt,
        recipientId,
        userName,
        username: userNameAlt,
        profileImage,
        profile_image: profileImageAlt,
        role,
        sender_role: roleAlt,
        onlineStatus,
        unreadCount,
        user_type: roomType,
      } = action.payload;

      const roomId = _id || chatRoomIdAlt;
      const actualSenderId = senderId || senderIdAlt;
      const actualUserName = userName || userNameAlt;
      const actualProfileImage = profileImage || profileImageAlt;
      const actualRole = role || roleAlt;

      // ✅ Determine which caches to update
      const filterTypes = ['none']; // Always update 'none'

      if (roomType === 'follower') filterTypes.push('followers');
      if (roomType === 'subscriber') filterTypes.push('subscribers');

      // ✅ CRITICAL: Determine read/unread status
      let shouldBeInUnread = false;
      let shouldBeInRead = false;

      if (unreadCount !== undefined) {
        if (unreadCount > 0) {
          shouldBeInUnread = true;
          filterTypes.push('unread');
        } else {
          shouldBeInRead = true;
          filterTypes.push('read');
        }
      }

      console.log('🎯 Cache routing:', {
        roomId,
        unreadCount,
        shouldBeInUnread,
        shouldBeInRead,
        filterTypes,
        roomType,
      });

      filterTypes.forEach(filterType => {
        const roomIdObjectIndex = state.data[filterType].findIndex(x => x._id === roomId);

        if (roomIdObjectIndex !== -1) {
          // ✅ Room exists - update it
          console.log(`✏️ Updating existing room in ${filterType}:`, roomId);

          state.data[filterType][roomIdObjectIndex].lastMessage = {
            hasAttachment,
            message,
            senderId: actualSenderId,
          };
          state.data[filterType][roomIdObjectIndex].updatedAt = createdAt;

          if (recipientId) {
            state.data[filterType][roomIdObjectIndex].recipient._id = recipientId;
          }
          if (actualUserName) {
            state.data[filterType][roomIdObjectIndex].recipient.displayName = actualUserName;
          }
          if (actualProfileImage) {
            state.data[filterType][roomIdObjectIndex].recipient.profile_image.url = actualProfileImage;
          }
          if (actualRole) {
            state.data[filterType][roomIdObjectIndex].recipient.role = actualRole;
          }
          if (onlineStatus !== undefined) {
            state.data[filterType][roomIdObjectIndex].onlineStatus = onlineStatus;
          }
          if (unreadCount !== undefined) {
            state.data[filterType][roomIdObjectIndex].unreadCounterUser = unreadCount;
          }

          state.data[filterType] = sortChatRoomList(state.data[filterType]);
        } else {
          // ✅ Room doesn't exist - create it (only in relevant caches)
          console.log(`➕ Creating new room in ${filterType}:`, roomId);

          if (checkForHexRegExp.test(roomId) && checkForHexRegExp.test(actualSenderId)) {
            const actualRecipientId = recipientId || actualSenderId;

            if (!actualUserName || !actualRecipientId) {
              console.error('❌ Cannot create room: missing userName or recipientId');
              return;
            }

            let newMessageRoomObject = {
              _id: roomId,
              label: 'none',
              type: roomType || 'none',
              unreadCounterUser: unreadCount !== undefined ? unreadCount : 0,
              onlineStatus: onlineStatus !== undefined ? onlineStatus : true,
              updatedAt: createdAt,
              lastMessage: {
                senderId: actualSenderId,
                message: message,
                hasAttachment: hasAttachment,
              },
              recipient: {
                _id: actualRecipientId,
                displayName: actualUserName,
                role: actualRole || 'user',
                profile_image: {
                  url: actualProfileImage || '',
                  type: 'profile',
                },
              },
              myId: actualSenderId,
              callRequest: {
                callTries: 0,
                type: '',
                status: false,
                initiatedAt: null,
                initiator: null,
              },
            };

            state.data[filterType].unshift(newMessageRoomObject);
            state.data[filterType] = sortChatRoomList(state.data[filterType]);
          }
        }
      });

      // ✅ CRITICAL: Handle moving between read/unread when status changes
      if (unreadCount !== undefined) {
        // If message is unread, remove from read cache
        if (shouldBeInUnread) {
          const readIndex = state.data.read.findIndex(x => x._id === roomId);
          if (readIndex !== -1) {
            console.log(`🔄 Moving from read to unread:`, roomId);
            state.data.read.splice(readIndex, 1);
          }
        }
        // If message is read, remove from unread cache
        else if (shouldBeInRead) {
          const unreadIndex = state.data.unread.findIndex(x => x._id === roomId);
          if (unreadIndex !== -1) {
            console.log(`🔄 Moving from unread to read:`, roomId);
            state.data.unread.splice(unreadIndex, 1);
          }
        }
      }

      console.log('📊 Cache sizes after update:', {
        none: state.data.none.length,
        followers: state.data.followers.length,
        subscribers: state.data.subscribers.length,
        read: state.data.read.length,
        unread: state.data.unread.length,
      });
    },

    updateLabel: (state, action) => {
      const {roomId, current} = action.payload.data;

      ['none', 'followers', 'subscribers', 'read', 'unread'].forEach(filterType => {
        const roomIdObjectIndex = state.data[filterType].findIndex(x => x._id === roomId);
        if (roomIdObjectIndex >= 0) {
          state.data[filterType][roomIdObjectIndex].label = current;
        }
      });
    },

    sortByLabel: (state, action) => {
      const targetLabel = action.payload.data;

      ['none', 'followers', 'subscribers', 'read', 'unread'].forEach(filterType => {
        state.data[filterType] = state.data[filterType].sort((a, b) => {
          const aHasLabel = a?.label === targetLabel ? 0 : 1;
          const bHasLabel = b?.label === targetLabel ? 0 : 1;
          return aHasLabel - bHasLabel;
        });
      });
    },

    removeRoomList: (state, action) => {
      state.data.none = [];
      state.data.followers = [];
      state.data.subscribers = [];
      state.data.read = [];
      state.data.unread = [];
    },

    deleteFirst: (state, action) => {
      ['none', 'followers', 'subscribers', 'read', 'unread'].forEach(filterType => {
        if (state.data[filterType].length > 0) {
          state.data[filterType].splice(0, 1);
        }
      });
    },

    resetUnreadCount: (state, action) => {
      const {chatRoomId} = action.payload;

      console.log('📖 Resetting unread count for:', chatRoomId);

      // ✅ Step 1: Update counter in all caches
      ['none', 'followers', 'subscribers', 'read', 'unread'].forEach(filterType => {
        const roomIndex = state.data[filterType].findIndex(x => x._id === chatRoomId);
        if (roomIndex !== -1) {
          state.data[filterType][roomIndex].unreadCounterUser = 0;
        }
      });

      // ✅ Step 2: Move from unread to read cache
      const unreadIndex = state.data.unread.findIndex(x => x._id === chatRoomId);
      if (unreadIndex !== -1) {
        console.log('🔄 Moving chat from unread to read cache:', chatRoomId);

        const room = {...state.data.unread[unreadIndex]};
        room.unreadCounterUser = 0; // Ensure it's 0

        // Remove from unread
        state.data.unread.splice(unreadIndex, 1);

        // Add to read if not already there
        const readIndex = state.data.read.findIndex(x => x._id === chatRoomId);
        if (readIndex === -1) {
          state.data.read.unshift(room);
          state.data.read = sortChatRoomList(state.data.read);
          console.log('✅ Added to read cache');
        } else {
          console.log('ℹ️ Already in read cache');
        }
      } else {
        console.log('ℹ️ Chat not found in unread cache');
      }

      console.log('📊 Cache sizes after reset:', {
        read: state.data.read.length,
        unread: state.data.unread.length,
      });
    },

    // ✅ Clear specific cache for refetch (supports combined keys like 'subscribers_read')
    clearCache: (state, action) => {
      const {cacheType} = action.payload;

      if (cacheType === 'all') {
        // Reset all known keys to empty arrays
        ALL_CACHE_KEYS.forEach(key => {
          state.data[key] = [];
        });
      } else if (ALL_CACHE_KEYS.includes(cacheType)) {
        console.log(`🗑️ Clearing ${cacheType} cache`);
        state.data[cacheType] = [];
      } else {
        console.warn(`⚠️ Unknown cacheType: ${cacheType}`);
      }
    },
  },

  extraReducers(builder) {
    builder.addCase(resetAll, state => {
      return initialState;
    });
  },
});

export const {setCacheByFilter, removeRoomList, updateCacheRoomList, deleteFirst, updateLabel, sortByLabel, resetUnreadCount, clearCache} = chatRoomListSlice.actions;

export default chatRoomListSlice.reducer;
