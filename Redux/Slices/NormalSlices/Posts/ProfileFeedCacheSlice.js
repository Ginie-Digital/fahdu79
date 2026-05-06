import { createSlice } from '@reduxjs/toolkit';
import { resetAll } from '../../../Actions';

const initialState = {
  data: {
    content: [],
    totalPages: 0,
    currentPage: 1,
    firstPostCreatedAt: '',
    haveSubscribed: false,
    haveFollowed: false,
    profileDetails: {},
    shareLink: undefined,
  },
};

const profileFeedCacheSlice = createSlice({
  name: 'profileFeedCache',
  initialState,
  reducers: {
    setFeedCachePost: (state, action) => {
      console.log(action.payload.data?.length, '[[[[[[[[[[[[[');
      state.data.content = [...action.payload.data];
    },

    resetFeedPost: (state, action) => {
      state.data.content = [];
    },

    appendFeedCachePosts: (state, action) => {
      const newPosts = action.payload.data.filter(
        (newPost) => !state.data.content.some((existingPost) => existingPost._id === newPost._id)
      );
      state.data.content = [...state.data.content, ...newPosts];
    },

    likeDislikePost: (state, action) => {
      if (action.payload.type === 'INC') {
        state.data.content[action.payload.index].count.likes++;
        state.data.content[action.payload.index].has_liked = true;
      } else {
        state.data.content[action.payload.index].count.likes > 0 ? state.data.content[action.payload.index].count.likes-- : state.data.content[action.payload.index].count.likes;
        state.data.content[action.payload.index].has_liked = false;
      }
    },

    otherProfileIncrementCommentCount: (state, action) => {

      const { postId } = action.payload;

      console.log('PostId', postId);

      const post = state.data.content.find(post => post._id === postId);

      console.log('CPMPIOST', post);

      if (post) {
        post.count.comments += 1;
      }
    },

    manipulateTotalPagesPost: (state, action) => {
      state.data.totalPages = action.payload.currentTotalPage;
    },

    manipulateCurrentPagePost: (state, action) => {
      state.data.currentPage = action.payload.currentPage;
    },

    mainpulateFirstPageCreatedAtPost: (state, action) => {
      state.data.firstPostCreatedAt = action.payload.timestamp;
    },

    setHaveFollowedOrSubscribedOtherUser: (state, action) => {
      if (action.payload.type) {
        if (action.payload.setFollow) {
          state.data.haveFollowed = true;
        }

        if (action.payload.setSubscribe) {
          state.data.haveSubscribed = true;
        }
      } else {
        state.data.haveFollowed = action.payload.data.haveFollowed;
        state.data.haveSubscribed = action.payload.data.haveSubscribed;
      }
    },

    unFollowProfileCache: (state, action) => {
      state.data.haveFollowed = false;
      state.data.content = [];
    },

    unSubscribeProfileCache: (state, action) => {
      state.data.haveSubscribed = false;
    },

    setProfileDetails: (state, action) => {
      state.data.profileDetails = action.payload.profileDetails;
    },

    setOtherProfileShareLink: (state, action) => {
      state.data.shareLink = action.payload.shareLink;
    },

    // blockPost: (state, action) => {
    //   let indx = state.data.blockedPost.findIndex((x) => x === action.payload.postId);

    //   if (indx < 0) {
    //     state.data.blockedPost.push(action.payload.postId);
    //   }
    // },
  },

  extraReducers(builder) {
    builder.addCase(resetAll, state => {
      return initialState;
    });
  },
});

export const {
  setFeedCachePost,
  resetFeedPost,
  appendFeedCachePosts,
  likeDislikePost,
  manipulateTotalPagesPost,
  manipulateCurrentPagePost,
  mainpulateFirstPageCreatedAtPost,
  setHaveFollowedOrSubscribedOtherUser,
  setProfileDetails,
  unFollowProfileCache,
  unSubscribeProfileCache,
  setOtherProfileShareLink,
  otherProfileIncrementCommentCount,
} = profileFeedCacheSlice.actions;

export default profileFeedCacheSlice.reducer;
