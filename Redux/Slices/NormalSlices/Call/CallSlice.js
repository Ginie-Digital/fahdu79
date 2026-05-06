// In your Call Redux slice file
import {createSlice} from '@reduxjs/toolkit';

const callSlice = createSlice({
  name: 'call',
  initialState: {
    data: {
      // your existing state
    },
    isRejected: false,
    processedRoomIds: [], // Track processed call IDs
    acceptedRoomIds: [], // Track accepted room IDs for deduplication
  },
  reducers: {
    setCallRejected: (state, action) => {
      state.isRejected = action.payload;
    },
    markRoomAsProcessed: (state, action) => {
      const roomId = action.payload;
      if (!state.processedRoomIds.includes(roomId)) {
        state.processedRoomIds.push(roomId);
        // Optional: Keep only last 10-20 IDs to avoid uncontrolled growth
        if (state.processedRoomIds.length > 20) {
          state.processedRoomIds.shift();
        }
      }
    },
    markRoomAsAccepted: (state, action) => {
      const roomId = action.payload;
      if (!state.acceptedRoomIds.includes(roomId)) {
        state.acceptedRoomIds.push(roomId);
        if (state.acceptedRoomIds.length > 20) {
          state.acceptedRoomIds.shift();
        }
      }
    },
    clearAcceptedRoomId: (state, action) => {
      const roomId = action.payload;
      state.acceptedRoomIds = state.acceptedRoomIds.filter(id => id !== roomId);
    },
    clearProcessedRoomId: (state, action) => {
      const callId = action.payload;
      state.processedRoomIds = state.processedRoomIds.filter(id => id !== callId);
    },
  },
});

export const {setCallRejected, markRoomAsProcessed, markRoomAsAccepted, clearAcceptedRoomId, clearProcessedRoomId} = callSlice.actions;
export default callSlice.reducer;
