import { configureStore, combineReducers } from '@reduxjs/toolkit';
import persistReducer from 'redux-persist/es/persistReducer';

//Importin my Rducers (Normal)
import testReducer from '../Slices/NormalSlices/TestSlice';
import roomListReducer from '../Slices/NormalSlices/RoomListSlice';
import authReducer from '../Slices/NormalSlices/AuthSlice';
import filterByReducer from '../Slices/NormalSlices/AudienceSelectedSlice';
import hideShowReducer from '../Slices/NormalSlices/HideShowSlice';
import sortByReducer from '../Slices/NormalSlices/SortSelectedSlice';
import threadReducer from '../Slices/NormalSlices/MessageSlices/ThreadSlices';
import chatWindowPreviewDataReducer from '../Slices/NormalSlices/MessageSlices/ChatWindowPreviewDataSlice';
import senderDetailReducer from '../Slices/NormalSlices/MessageSlices/ChatWindowSenderDetailSlice';
import chatWindowUnlockPremiumTempDataReducer from '../Slices/NormalSlices/MessageSlices/ChatWindowUnlockPremiumTempDataSlice';
import ChatWindowTipAmountReducer from '../Slices/NormalSlices/MessageSlices/ChatWindowTipAmountSlice';
import secondUserReducer from '../Slices/NormalSlices/SecondUserSlice';
import chatRoomSearchValueReducer from '../Slices/NormalSlices/MessageSlices/ChatRoomSearchValueSlice';
import unReadThreadReducer from '../Slices/NormalSlices/UnReadThreadSlice';
import chatWindowFeeDetailsReducer from '../Slices/NormalSlices/MessageSlices/ChatWindowFeeDetailsSlice';
import ChatWindowCurrentChattingRoomReducer from '../Slices/NormalSlices/MessageSlices/ChatWindowCurrentChattingRoom';
import brandBottomSheetDetailReducer from '../Slices/NormalSlices/Brands/BrandBottomSheetDetailSlice';
import currentDashboardActionReducer from '../Slices/NormalSlices/Brands/CurrentDashboardActionSlice';
import currentMyProfileContentReducer from '../Slices/NormalSlices/CurrentMyProfileContent';
import createWishListMediaInfoReducer from '../Slices/NormalSlices/ProfileSlices/WishListUploadMediaInfo';
import transactionReducer from '../Slices/NormalSlices/TransactionSlice';
import wishListDonateSheetReducer from '../Slices/NormalSlices/OtherProfile/WishListDonateSheetSlice';
import manageRevenueDashboardReducer from '../Slices/NormalSlices/ManageRevenueDashboardSlice';
import currentCommentReducer from '../Slices/NormalSlices/CurrentCommentSlice';
import otherProfileUserInfoReducer from '../Slices/NormalSlices/OtherProfile/OtherProfileUserInfoSlice';
import HasAppUpdatedReducer from '../Slices/NormalSlices/HasAppUpdatedSlice';
import FeedCacheReducer from '../Slices/NormalSlices/Home/FeedCacheSlice';
import keyboardPropertiesReducer from '../Slices/NormalSlices/AppData/KeyboardPropertiesSlice';
import liveChatsReducer from '../Slices/NormalSlices/LiveStream/LiveChats';
import storiesReducer from '../Slices/NormalSlices/Home/StoriesSlice';
import walletReducer from '../Slices/NormalSlices/Wallet/WalletSlice';
import profileFeedCacheReducer from '../Slices/NormalSlices/Posts/ProfileFeedCacheSlice';
import myProfileFeedCacheReducer from '../Slices/NormalSlices/Posts/MyProfileFeedCacheSlice';
import deeplinkReducer from '../Slices/NormalSlices/Deeplink/DeeplinkSlice';
import campaignDataReducer from '../Slices/NormalSlices/Brands/CampaignDataSlice';
import credentialsReducer from '../Slices/NormalSlices/TempCredentials';
import searchProfileReducer from '../Slices/NormalSlices/Search/SearchProfileSlice';
import massMessageReducer from '../Slices/NormalSlices/MessageSlices/MassMessage';
import chipsReducer from '../Slices/NormalSlices/MessageSlices/MassMessageChips';
import callReducer from '../Slices/NormalSlices/Call/CallSlice';
import uploadReducer from '../Slices/NormalSlices/UploadSlice';
import liveUsersReducer from '../Slices/NormalSlices/LiveUsersSlice';

//Import my Reducer (Query)
import { roomListApi } from '../Slices/QuerySlices/roomListSliceApi';

import { chatWindowAttachmentApi } from '../Slices/QuerySlices/chatWindowAttachmentSliceApi';

import { audioVideoApi } from '../Slices/QuerySlices/audioVideoSlice';

import reduxStorage from '../../MMKVConfig';

const createEnhancers = getDefaultEnhancers => {
  return getDefaultEnhancers();
};

const persistConfig = {
  timeout: 2000,
  key: 'root',
  storage: reduxStorage,
  whitelist: ['auth'],
  blacklist: ['livechats', 'stories', 'wallet', 'profileFeedCache', 'myProfileFeedCache'],
};

const combined_reducer = combineReducers({
  test: testReducer,
  auth: authReducer,
  roomList: roomListReducer,
  filterBy: filterByReducer,
  hideShow: hideShowReducer,
  sortBy: sortByReducer,
  thread: threadReducer,
  chatWindowPreviewData: chatWindowPreviewDataReducer,
  senderDetail: senderDetailReducer,
  chatWindowUnlockPremiumTempData: chatWindowUnlockPremiumTempDataReducer,
  chatWindowTipAmount: ChatWindowTipAmountReducer,
  secondUser: secondUserReducer,
  chatRoomSearchValue: chatRoomSearchValueReducer,
  unReadThread: unReadThreadReducer,
  chatWindowFeeDetails: chatWindowFeeDetailsReducer,
  chatWindowCurrentChattingRoom: ChatWindowCurrentChattingRoomReducer,
  brandBottomSheetDetail: brandBottomSheetDetailReducer,
  currentDashboardAction: currentDashboardActionReducer,
  currentMyProfileContent: currentMyProfileContentReducer,
  createWishListMediaInfo: createWishListMediaInfoReducer,
  transaction: transactionReducer,
  wishListDonateSheet: wishListDonateSheetReducer,
  manageRevenueDashboard: manageRevenueDashboardReducer,
  currentComment: currentCommentReducer,
  otherProfileUserInfo: otherProfileUserInfoReducer,
  hasAppUpdated: HasAppUpdatedReducer,
  feedCache: FeedCacheReducer,
  keyboardProperties: keyboardPropertiesReducer,
  livechats: liveChatsReducer,
  stories: storiesReducer,
  wallet: walletReducer,
  profileFeedCache: profileFeedCacheReducer,
  myProfileFeedCache: myProfileFeedCacheReducer,
  deeplink: deeplinkReducer,
  campaignData: campaignDataReducer,
  credentials: credentialsReducer,
  searchProfile: searchProfileReducer,
  massMessage: massMessageReducer,
  chips: chipsReducer,
  call: callReducer,
  upload: uploadReducer,
  liveUsers: liveUsersReducer,
  [roomListApi.reducerPath]: roomListApi.reducer,
  [chatWindowAttachmentApi.reducerPath]: chatWindowAttachmentApi.reducer,
  [audioVideoApi.reducerPath]: audioVideoApi.reducer,
});

const persist_reducer = persistReducer(persistConfig, combined_reducer);

const store = configureStore({
  reducer: persist_reducer,
  enhancers: createEnhancers,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }).concat(roomListApi.middleware, chatWindowAttachmentApi.middleware),
});

export default store;
