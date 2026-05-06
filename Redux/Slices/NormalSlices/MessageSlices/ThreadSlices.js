import {createSlice} from '@reduxjs/toolkit';
import {createSelector} from '@reduxjs/toolkit';

import {resetAll} from '../../../Actions';

const initialState = {
  threadStore: {},
};

const threadSlice = createSlice({
  name: 'thread',
  initialState,
  reducers: {
    saveThread: (state, action) => {
      console.log('Entered to threadslice');
      const {chatRoomId, threadDetails, append} = action.payload;

      if (append && state.threadStore[chatRoomId]) {
        // Pagination: merge old messages with existing, deduplicate by _id
        const existingIds = new Set(state.threadStore[chatRoomId].messages.map(m => m._id));
        const uniqueOldMessages = threadDetails.messages.filter(m => !existingIds.has(m._id));
        const merged = [...uniqueOldMessages, ...state.threadStore[chatRoomId].messages];
        // Sort by createdAt ascending
        merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        state.threadStore[chatRoomId] = {
          ...threadDetails,
          messages: merged,
        };
      } else {
        // Initial load: replace everything
        state.threadStore[chatRoomId] = {
          ...threadDetails,
        };
      }
    },

    updateThread: (state, action) => {
      console.log('Update thread reached');
      const {chatRoomId, newMessage} = action.payload;
      const existing = state.threadStore[chatRoomId].messages;
      const existingIds = new Set(existing.map(m => m._id));

      // Filter out any messages that already exist in the cache
      const uniqueNew = newMessage.filter(m => !existingIds.has(m._id));

      if (uniqueNew.length > 0) {
        existing.push(...uniqueNew);
        // Sort by createdAt ascending to maintain correct order
        existing.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }
    },
    updatePremiumAttachmentThread: (state, action) => {
      console.log('Updating premium thread', action.payload.chatRoomId);
      let premiumChatIndex = state.threadStore[action.payload.chatRoomId]?.messages?.findIndex(x => x._id == action.payload.conversationId);
      state.threadStore[action.payload.chatRoomId].messages[premiumChatIndex].attachment.url = action.payload.url;
      state.threadStore[action.payload.chatRoomId].messages[premiumChatIndex].attachment.paid_by_reciever = true;
      // Keep the existing preview — do NOT clear it, so the thumbnail remains visible after unlock
    },
    pushSentMessageResponse: (state, action) => {
      const {chatRoomId, sentMessageResponse} = action.payload;
      let x = state.threadStore[chatRoomId].messages.findIndex(x => x._id === sentMessageResponse._id);
      if (x === -1) {
        state.threadStore[chatRoomId].messages.push(sentMessageResponse);
        // Sort to maintain correct order after push
        state.threadStore[chatRoomId].messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      } else {
        state.threadStore[chatRoomId].messages[x] = sentMessageResponse;
      }
    },
    deleteCachedMessages: (state, action) => {
      state.threadStore = {};
    },
  },
  extraReducers(builder) {
    builder.addCase(resetAll, state => {
      return initialState;
    });
  },
});

export const {saveThread, updateThread, updatePremiumAttachmentThread, pushSentMessageResponse, deleteCachedMessages} = threadSlice.actions;
export default threadSlice.reducer;

//!@Exporting memoized selectors

const wholeThread = state => state.thread.threadStore;

export const memoizedThreadSelector = roomId => {
  return createSelector([wholeThread], threadStore => threadStore[roomId]);
};
