import { createSlice } from '@reduxjs/toolkit';
import { resetAll } from '../../../Actions';

const initialState = {
  data: {
    content: [],
    totalPages: 0,
    currentPage: 1,
    firstPostCreatedAt: '',
    profileDetails: {},
  },
};

const myProfileFeedCacheSlice = createSlice({
  name: 'myProfileFeedCache',
  initialState,
  reducers: {
    setFeedCacheMyPost: (state, action) => {
      console.log(action.payload.data?.length, '[[[[[[[[[[[[[');
      state.data.content = [...action.payload.data];
    },

    resetFeedMyPost: (state, action) => {
      state.data.content = [];
    },

    appendFeedCacheMyPosts: (state, action) => {
      const newPosts = action.payload.data.filter(
        (newPost) => !state.data.content.some((existingPost) => existingPost._id === newPost._id)
      );
      state.data.content = [...state.data.content, ...newPosts];
    },

    likeDislikeMyPost: (state, action) => {
      if (action.payload.type === 'INC') {
        state.data.content[action.payload.index].count.likes++;
        state.data.content[action.payload.index].has_liked = true;
      } else {
        state.data.content[action.payload.index].count.likes > 0 ? state.data.content[action.payload.index].count.likes-- : state.data.content[action.payload.index].count.likes;
        state.data.content[action.payload.index].has_liked = false;
      }
    },

    myProfileIncrementCommentCount: (state, action) => {
      console.log('Incrementingt count of comment', action.payload.postId);

      const { postId } = action.payload;

      console.log('PostId', postId);

      const post = state.data.content.find(post => post._id === postId);

      console.log('CPMPIOST', post);

      if (post) {
        post.count.comments += 1;
      }
    },

    manipulateTotalPagesMyPost: (state, action) => {
      state.data.totalPages = action.payload.currentTotalPage;
    },

    manipulateCurrentPageMyPost: (state, action) => {
      state.data.currentPage = action.payload.currentPage;
    },

    mainpulateFirstPageCreatedAtMyPost: (state, action) => {
      state.data.firstPostCreatedAt = action.payload.timestamp;
    },

    setMyProfileDetails: (state, action) => {
      state.data.profileDetails = action.payload.profileDetails;
    },

    deleteMyProfilePost: (state, action) => {
      if (action.payload.postId) {
        let index = state.data.content.findIndex(x => x._id === action.payload.postId);

        state.data.content.splice(index, 1);
      }
    },

    pinMyProfilePost: (state, action) => {
      if (action.payload.postId) {
        let index = state.data.content.findIndex(x => x._id === action.payload.postId);

        if (!state.data.content[index].pinned) {
          state.data.content[index].pinned = true;

          state.data.content.unshift(state.data.content.splice(index, 1)[0]);
        } else {
          state.data.content[index].pinned = false;

          let tempPinnedArr = state.data.content.filter(x => x.pinned === true);

          let tempNonPinnedArr = state.data.content.filter(x => x.pinned === false);

          let finalTempArr = [...tempPinnedArr, ...tempNonPinnedArr];

          state.data.content = finalTempArr;
        }
      }
    },

    editMyPostCaption: (state, action) => {
      if (action.payload.postId) {
        let index = state.data.content.findIndex(x => x._id === action.payload.postId);

        state.data.content[index].postContent = action.payload.caption;
      }
    },

    addNewPostToMyProfileCache: (state, action) => {
      state.data.content.unshift(action.payload.newPost);
    },
  },

  extraReducers(builder) {
    builder.addCase(resetAll, state => {
      return initialState;
    });
  },
});

export const { setFeedCacheMyPost, resetFeedMyPost, appendFeedCacheMyPosts, likeDislikeMyPost, manipulateTotalPagesMyPost, manipulateCurrentPageMyPost, mainpulateFirstPageCreatedAtMyPost, setMyProfileDetails, deleteMyProfilePost, pinMyProfilePost, editMyPostCaption, addNewPostToMyProfileCache, myProfileIncrementCommentCount } =
  myProfileFeedCacheSlice.actions;

export default myProfileFeedCacheSlice.reducer;
