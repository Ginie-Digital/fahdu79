import { createSlice } from "@reduxjs/toolkit";
import { resetAll } from "../../../Actions";

const initialState = {
  data: {
    content: [],
    totalPages: 0,
    blockedPost: [],
    currentPage : 1,
    firstPostCreatedAt : ""
  },
};

const feedCacheSlice = createSlice({
  name: "feedCache",
  initialState,
  reducers: {
    setFeedCache: (state, action) => {
      console.log(action.payload.data?.length, "[[[[[[[[[[[[[");
      state.data.content = [...action.payload.data];
    },

    resetFeed: (state, action) => {
      state.data.content = [];
    },

    likeDislike: (state, action) => {
      if (action.payload.type === "INC") {
        state.data.content[action.payload.index].count.likes++;
        state.data.content[action.payload.index].has_liked = true;
      } else {
        state.data.content[action.payload.index].count.likes > 0 ? state.data.content[action.payload.index].count.likes-- : state.data.content[action.payload.index].count.likes;
        state.data.content[action.payload.index].has_liked = false;
      }
    },

    incrementCommentCount: (state, action) => {


      console.log("Incrementingt count of comment", action.payload.postId)

      const { postId } = action.payload;

      console.log("PostId", postId)

      const post = state.data.content.find((post) => post._id === postId);

      console.log("CPMPIOST", post)

      if (post) {
        post.count.comments += 1; 
      }
    },

    manipulateTotalPages: (state, action) => {  
      state.data.totalPages = action.payload.currentTotalPage;
    },

    manipulateCurrentPage: (state, action) => {
      state.data.currentPage = action.payload.currentPage;
    },

    mainpulateFirstPageCreatedAt : (state, action) => {
      state.data.firstPostCreatedAt = action.payload.timestamp
    },

    blockPost: (state, action) => {
      let indx = state.data.blockedPost.findIndex((x) => x === action.payload.postId);

      if (indx < 0) {
        state.data.blockedPost.push(action.payload.postId);
      }
    },

    unlockPost: (state, action) => {
      const { postId, post_content_files } = action.payload;
      const post = state.data.content.find((p) => p._id === postId);
      if (post) {
        post.post_content_files = post_content_files;
        post.for_subscribers = false;
        if (post.unlockSettings) {
          post.unlockSettings.enabled = false;
        }
      }
    },
  },

  extraReducers(builder) {
    builder.addCase(resetAll, (state) => {
      return initialState;
    });
  },
});

export const { setFeedCache, resetFeed, likeDislike, manipulateTotalPages, blockPost, manipulateCurrentPage, mainpulateFirstPageCreatedAt, incrementCommentCount, unlockPost } = feedCacheSlice.actions;

export default feedCacheSlice.reducer;