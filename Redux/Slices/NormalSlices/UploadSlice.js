import {createSlice} from '@reduxjs/toolkit';
import {Platform} from 'react-native';

const initialState = {
  progress: 0,
  isUploading: false,
  previewUrl: undefined,
  isModalVisible: false,
  processing: false,
  postIndex: undefined,
};

const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    startProcessing: (state, action) => {
      state.processing = true;
      state.isModalVisible = true;
      state.postIndex = undefined;
      state.previewUrl = action.payload.previewUrl;
      // state.progress = 0;
    },

    startUpload: (state, action) => {
      state.isUploading = true;
      state.processing = false;
      state.isModalVisible = true;

      // previewUrl is already set by startProcessing — don't overwrite it
      // to avoid thumbnail flickering during multi-image uploads

      if (Platform.OS === 'ios') {
        const iosProgress = [40, 68, 77];
        state.progress = iosProgress[Math.floor(Math.random() * iosProgress.length)];
      } else {
        state.progress = 1;
      }
    },

    setUploadProgress: (state, action) => {
      console.log(action.payload);

      if (action.payload) {
        state.progress = action.payload;
        state.isUploading = action.payload < 100;
      }

      // Automatically hide the modal and stop the 'uploading' state at 100%
    },

    setPostIndex: (state, action) => {
      state.postIndex = action.payload;
    },

    resetPostIndex: (state, action) => {
      state.postIndex = undefined;
      state.isModalVisible = false;
    },

    resetUploadProgress: state => {
      if (state.isUploading) {
        state.progress = Platform.OS === 'ios' ? 100 : 0;
      }
      state.postIndex = undefined;
      state.previewUrl = undefined;
      state.processing = false;
      state.progress = 0;
      // state.isModalVisible = false;
      state.isUploading = false;
    },
  },
});

export const {setUploadProgress, resetUploadProgress, startProcessing, startUpload, setPostIndex, resetPostIndex} = uploadSlice.actions;
export default uploadSlice.reducer;
