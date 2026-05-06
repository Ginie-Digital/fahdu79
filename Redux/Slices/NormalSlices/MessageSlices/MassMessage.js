import {createSlice} from '@reduxjs/toolkit';
import {resetAll} from '../../../Actions';

const initialState = {
  data: {
    _body: {
      message: null,
      attachment: {
        url: undefined,
        format: undefined,
        is_charagble: false,
        charge_amount: 10,
        paid_by_reciever: false,
        preview: '',
        type: '',
      },
    },
    target: {
      selectedUsers: [],
      label: [],
      filter: 'none', // Default set to 'none'
    },
    status: {
      online: true,
      offline: false,
    },
    audienceType: {
      followers: false,
      subscribers: false,
      all: false,
    },
  },
};

const massMessageSlice = createSlice({
  name: 'massMessage',
  initialState,
  reducers: {
    setMassMessageLabel: (state, action) => {
      const {label} = action.payload;
      const labelIndex = state.data.target.label.findIndex(l => l === label);

      if (labelIndex >= 0) {
        state.data.target.label.splice(labelIndex, 1);
      } else {
        state.data.target.label.push(label);
      }
    },

    setMassMessageTargetOnlinleOffline: (state, action) => {
      console.log('AC', action.payload);

      const {online, offline} = action.payload.status;

      if (!online && !offline) {
        return;
      }

      state.data.status.online = online;
      state.data.status.offline = offline;
    },

    setMassMessageAddToUserList: (state, action) => {
      const userId = action.payload._id;
      const index = state.data.target.selectedUsers.indexOf(userId);

      if (index >= 0) {
        state.data.target.selectedUsers.splice(index, 1);
      } else {
        state.data.target.selectedUsers.push(userId);
      }
    },

    massMessageUpdateBody: (state, action) => {
      const {message, attachment} = action.payload;

      if (message !== undefined) {
        state.data._body.message = message;
      }

      if (attachment !== undefined) {
        state.data._body.attachment = {
          ...state.data._body.attachment,
          ...attachment,
        };
      }
    },

    setAudienceType: (state, action) => {
      const {audienceType} = action.payload;

      if (audienceType === 'followers') {
        const newValue = !state.data.audienceType.followers;
        state.data.audienceType.followers = newValue;
        state.data.audienceType.subscribers = false;
        state.data.audienceType.all = false;
        state.data.target.filter = newValue ? 'followers' : 'none';
      } else if (audienceType === 'subscribers') {
        const newValue = !state.data.audienceType.subscribers;
        state.data.audienceType.followers = false;
        state.data.audienceType.subscribers = newValue;
        state.data.audienceType.all = false;
        state.data.target.filter = newValue ? 'subscribers' : 'none';
      } else if (audienceType === 'all') {
        const newValue = !state.data.audienceType.all;
        state.data.audienceType.followers = false;
        state.data.audienceType.subscribers = false;
        state.data.audienceType.all = newValue;
        state.data.target.filter = newValue ? 'all' : 'none';
      }
    },

    resetMassMessage: () => initialState,
  },

  extraReducers: builder => {
    builder.addCase(resetAll, () => initialState);
  },
});

export const {setMassMessageLabel, setMassMessageTargetOnlinleOffline, setMassMessageMedia, setMassMessageAddToUserList, massMessageUpdateBody, setAudienceType, resetMassMessage} = massMessageSlice.actions;

export default massMessageSlice.reducer;
