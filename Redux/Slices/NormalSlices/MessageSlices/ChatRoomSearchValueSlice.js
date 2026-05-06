import { createSlice } from '@reduxjs/toolkit';
import { resetAll } from '../../../Actions';

const initialState = {
    data: {
        searchString: "",
        isSearchMode: false,
    },

};

const chatRoomSearchValueSlice = createSlice({
    name: 'chatRoomSearchValue',
    initialState,
    reducers: {
        insertSearchString : (state, action) => {
            state.data.searchString = action.payload.searchString;
        },
        clearSearchString : (state, action) => {
            state.data.searchString = ""
        },
        setIsSearchMode : (state, action) => {
            state.data.isSearchMode = action.payload;
        }
    },
    extraReducers(builder) {
        builder.addCase(resetAll, (state) => {
          return initialState
        })
      }
});

export const { insertSearchString, clearSearchString, setIsSearchMode } = chatRoomSearchValueSlice.actions;
export default chatRoomSearchValueSlice.reducer;
