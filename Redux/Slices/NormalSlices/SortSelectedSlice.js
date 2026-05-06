import {createSlice} from '@reduxjs/toolkit';
import {resetAll} from '../../Actions';

const initialState = {
  selected: {
    sort: 1, // 1 = Recent, 2 = Read, 3 = Unread
    label: 'none',
    onlineFilter: 'all', // ✅ NEW: 'all', 'online', 'offline'
  },
};

const sortSelectedSlice = createSlice({
  name: 'sortBy',
  initialState,

  reducers: {
    setSelectedSort: (state, action) => {
      state.selected.sort = action.payload.sortNumber;
      console.log('🔄 Sort changed to:', action.payload.sortNumber);
    },

    setLabel: (state, action) => {
      state.selected.label = action.payload.label;
      console.log('🏷️ Label changed to:', action.payload.label);
    },

    // ✅ NEW: Set online filter
    setOnlineFilter: (state, action) => {
      state.selected.onlineFilter = action.payload.filter;
      console.log('🌐 Online filter changed to:', action.payload.filter);
    },

    resetLabel: state => {
      state.selected.label = 'none';
      console.log('🔄 Label reset to: none');
    },

    setDefaultSort: state => {
      state.selected.sort = 1;
      state.selected.label = 'none';
      state.selected.onlineFilter = 'all'; // ✅ Also reset online filter
      console.log('🔄 All filters reset to defaults');
    },
  },

  extraReducers(builder) {
    builder.addCase(resetAll, state => {
      return initialState;
    });
  },
});

export const {
  setSelectedSort,
  setLabel,
  setOnlineFilter, // ✅ NEW: Export
  resetLabel,
  setDefaultSort,
} = sortSelectedSlice.actions;

export default sortSelectedSlice.reducer;
