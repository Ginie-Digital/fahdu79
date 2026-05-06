import {createSelector, createSlice} from '@reduxjs/toolkit';
import {resetAll} from '../../Actions';

const initialState = {
  user: {
    token: undefined,
    apnToken: undefined,
    currentUserId: undefined,
    currentUserFullName: undefined,
    currentUserDisplayName: undefined,
    currentUserProfilePicture: undefined,
    currentUserCoverPicture: undefined,
    role: undefined,
    email: undefined,
    passwordCreated: undefined,
    licenseAgreed: true,
    is_phone_verifed: false,
    aboutUser: '',
    categoryHeader: undefined,
    categoryDescription: undefined,
    videoCall_info: [],
    audioCall_info: [],
    chat_info: [],
    liveStream_info: [],
    suspended: false,
  },
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    currentUserInformation: (state, action) => {
      state.user = {
        ...state.user, // keep existing state
        ...action.payload,
        followerFee: {
          audiocall: undefined,
          videocall: undefined,
          livestream: undefined,
          chat: undefined,
        },
        subscriberFee: {
          audiocall: undefined,
          videocall: undefined,
          livestream: undefined,
          chat: undefined,
        },
      };
    },

    authLogout: (state, action) => {
      state.user.token = undefined;
      state.user.currentUserId = undefined;
      state.user.currentUserDisplayName = undefined;
      state.user.currentUserProfilePicture = undefined;
      state.user.role = undefined;
      state.currentUserCoverPicture = undefined;
      state.user.passwordCreated = undefined;
    },
    updateCoverProfilePicture: (state, action) => {
      state.user.currentUserCoverPicture = action.payload.coverUrl;
      state.user.currentUserProfilePicture = action.payload.profileUrl;
    },

    updateApnToken: (state, action) => {
      console.log('GOTAPN', action.payload.token);
      state.user.apnToken = action.payload.token;
    },

    updateDisplayName: (state, action) => {
      state.user.currentUserDisplayName = action.payload.currentUserDisplayName;
    },

    updateAboutUser: (state, action) => {
      state.user.aboutUser = action.payload.aboutUser;
    },

    setDoPasswordCreated: (state, action) => {
      state.user.passwordCreated = action.payload.doPasswordCreated;
    },

    updateAgreement: (state, action) => {
      state.user.licenseAgreed = action.payload.agreed;
    },

    setCategoryHeader: (state, action) => {
      state.user.categoryHeader = action.payload.categoryHeader;
    },

    setCategoryDescription: (state, action) => {
      state.user.categoryDescription = action.payload.categoryDescription;
    },

    setIsPhoneNumberVerified: (state, action) => {
      state.user.is_phone_verifed = action.payload.phoneStatus;
    },

    setCurrentUserFullName: (state, action) => {
      state.user.currentUserFullName = action.payload.fullName;
    },

    setAboutUser: (state, aciton) => {
      state.user.aboutUser = aciton.payload.aboutUser;
    },

    updateEditProfile: (state, action) => {
      state.user.currentUserDisplayName = action.payload.currentUserDisplayName;
      state.user.currentUserFullName = action.payload.currentUserFullName;
      state.user.aboutUser = action.payload.aboutUser;
      state.user.categoryHeader = action.payload.categoryHeader;
      state.user.categoryDescription = action.payload.categoryDescription;
    },

    setAllDescriptions: (state, action) => {
      const {videoCall_info, audioCall_info, chat_info, liveStream_info} = action.payload;

      console.log(videoCall_info?.followerFee, 'auiodinfo', videoCall_info?.subscriptionFee);

      if (videoCall_info !== undefined) {
        state.user.videoCall_info = videoCall_info?.descriptions;
        state.user.followerFee.videocall = videoCall_info?.followerFee;
        state.user.subscriberFee.videocall = videoCall_info?.subscriptionFee;
      }
      if (audioCall_info !== undefined) {
        state.user.audioCall_info = audioCall_info?.descriptions;
        state.user.followerFee.audiocall = audioCall_info?.followerFee;
        state.user.subscriberFee.audiocall = audioCall_info?.subscriptionFee;
      }
      if (chat_info !== undefined) {
        state.user.chat_info = chat_info?.descriptions;
        state.user.followerFee.chat = chat_info?.followerFee;
        state.user.subscriberFee.chat = chat_info?.subscriptionFee;
      }
      if (liveStream_info !== undefined) {
        state.user.liveStream_info = liveStream_info?.descriptions;
        state.user.followerFee.livestream = liveStream_info?.followerFee;
        state.user.subscriberFee.livestream = liveStream_info?.subscriptionFee;
      }
    },

    updateDescription: (state, action) => {
      console.log(action.payload, 'UPdate description');

      const {videoCall_info, audioCall_info, chat_info, liveStream_info} = action.payload;

      if (videoCall_info !== undefined) {
        state.user.videoCall_info = videoCall_info;
      }
      if (audioCall_info !== undefined) {
        state.user.audioCall_info = audioCall_info;
      }
      if (chat_info !== undefined) {
        state.user.chat_info = chat_info;
      }
      if (liveStream_info !== undefined) {
        state.user.liveStream_info = liveStream_info;
      }
    },
  },

  extraReducers(builder) {
    builder.addCase(resetAll, state => {
      return initialState;
    });
  },
});

export const {
  currentUserInformation,
  authLogout,
  updateCoverProfilePicture,
  setDoPasswordCreated,
  updateDisplayName,
  updateAgreement,
  setIsPhoneNumberVerified,
  updateAboutUser,
  setCategoryDescription,
  setCategoryHeader,
  setCurrentUserFullName,
  setAboutUser,
  updateEditProfile,
  setAllDescriptions,
  updateDescription,
  updateApnToken,
} = authSlice.actions;

export default authSlice.reducer;

const ini = state => state.auth.user.token;

export const token = createSelector([ini], token => {
  return token;
});

const forCurrentUserId = state => state.auth.user.currentUserId;

export const userIdCreateSelector = createSelector([forCurrentUserId], currentUserId => currentUserId);
