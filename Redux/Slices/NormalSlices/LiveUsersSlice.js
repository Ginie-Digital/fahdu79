import { createSlice } from '@reduxjs/toolkit';
import { resetAll } from '../../Actions';

const initialState = {
    liveUsers: [],
};

const liveUsersSlice = createSlice({
    name: 'liveUsers',
    initialState,

    reducers: {
        setLiveUsers: (state, action) => {
            // Replace entire list with new users
            state.liveUsers = action.payload.map((user, index) => ({
                id: index,
                roomId: user.roomId || '',
                displayName: user.displayName || '',
                userId: user.userId || user.creatorId || '',
                profileImage: user.profileImage || '',
            }));
        },

        addLiveUser: (state, action) => {
            // Add a new live user
            const user = action.payload;
            const newId = state.liveUsers.length;
            state.liveUsers.push({
                id: newId,
                roomId: user.roomId || '',
                displayName: user.displayName || '',
                userId: user.userId || user.creatorId || '',
                profileImage: user.profileImage || '',
            });
        },

        removeLiveUser: (state, action) => {
            // Remove user by roomId or userId
            const { roomId, userId } = action.payload;
            state.liveUsers = state.liveUsers.filter(user => {
                if (roomId && user.roomId === roomId) return false;
                if (userId && user.userId === userId) return false;
                return true;
            });
            // Re-index
            state.liveUsers = state.liveUsers.map((user, index) => ({
                ...user,
                id: index,
            }));
        },

        updateLiveUser: (state, action) => {
            // Update a specific user by userId or roomId
            const { userId, roomId, ...updates } = action.payload;
            const index = state.liveUsers.findIndex(
                user => user.userId === userId || user.roomId === roomId
            );
            if (index !== -1) {
                state.liveUsers[index] = {
                    ...state.liveUsers[index],
                    ...updates,
                };
            }
        },

        clearLiveUsers: (state) => {
            state.liveUsers = [];
        },
    },

    extraReducers(builder) {
        builder.addCase(resetAll, state => {
            return initialState;
        });
    },
});

export const {
    setLiveUsers,
    addLiveUser,
    removeLiveUser,
    updateLiveUser,
    clearLiveUsers,
} = liveUsersSlice.actions;

export default liveUsersSlice.reducer;
