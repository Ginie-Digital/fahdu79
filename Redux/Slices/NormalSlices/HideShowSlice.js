import { createSlice } from '@reduxjs/toolkit';
import { resetAll } from '../../Actions';

const initialState = {
  visibility: {
    chatRoomSortModal: false,
    chatWindowClipModal: false,
    chatWindowVideoModal: false,
    chatWindowPaymentModal: false,
    chatWindowFullSizedImageModal: false,
    chatWindowAttachmentPreviewModal: false,
    chatWindowInformationModal: false,
    newMessageRecieved: 0,
    chatWindowTipModal: false,
    forgetPassword: false,
    notificationClick: false,
    verficationScreen: false,
    notificationModal: false,
    homeBottomSheet: -1,
    switchBottomSheet: -1,
    chatWindowPreview: -1,
    postCardType: 'normal',
    tableModal: false,
    brandPreviewModal: false,
    brandLinkSubmitSheet: -1,
    createPostSheet: -1,
    dateTimePicker: -1,
    dateTimePickerData: {
      date: new Date().toISOString(),
      type: 'datetime',
      status: 'idle', // idle, picking, confirmed
    },
    wishListSheet: -1,
    transactionSheet: -1,
    hideShowLiveTerms: -1,
    hideShowInformationIcon: false,
    otherProfileActionSheet: {
      show: -1,
      subscribed: false,
    },
    manageRevenueDashboard: -1,

    commentBottomSheet: {
      show: -1,
      focus: false,
    },

    postActionBottomSheet: {
      show: -1,
      postId: undefined,
      postContent: undefined,
    },

    profileActionModal: false,
    wishListPreviewModal: false,
    currentVideoPlayId: undefined,
    confirmSubscribe: false,
    attachmentMediaLoading: false,
    areYouSureModal: false,
    isThisYou: false,
    confirmIsThisYou: false,
    refreshOtherProfile: false, //Refresh page on other profile

    sendPostTipsModal: {
      show: false,
      postId: '',
    },

    liveStreamTipModal: {
      show: false,
      roomId: '',
    },

    verificationInformatin: false,

    discoverFilter: {
      type: 'all',
      visible: false,
    },

    whoTippedSheet: {
      show: -1,
      postId: undefined,
    },

    otherProfileRatingSheet: -1,

    twoFAAuthCard: {
      type: 'authenticator',
      show: false,
    },

    authenticatorVia: {
      email: true,
      auth: false,
    },

    disableAuthModal: {
      show: false,
    },

    otherProfileLoader: {
      stateOne: true,
      stateTwo: true,
      stateThree: true,
    },

    instagramLinkSubmitModal: false,

    addGoalsSheet: -1,

    emailVerification: false,

    instagramVerification: false,

    areYou: false,

    appliedVerify: false,

    loadingComments: false,

    transferModal: false,

    bankDetailsModal: false,

    confirmBankDetailsModal: false,

    paymentAlert: false,

    paymentInfo: false,

    bankDetails: false,

    helpCenterModal: false,

    chatWindowFeeSetup: false,

    ratingModal: false,

    otherProfileActionModal: false,

    transactionDetailModal: false,

    labelModal: false,

    chatRoomLabelEdit: false,

    combineSelectorModal: false,

    showChatRoomSelector: false,

    floatingViews: 'showMessageFloat',

    callMethodSelector: false,

    callRequestModal: false,

    callPriceModal: {
      show: false,
      type: 'audio',
    },

    isCallInitiator: false,

    callTimeModal: false,

    callTip: false,

    walletLoader: null,

    linkingModal: false,

    accountDeleteModal: false,

    isUserOnline: false,

    relogin: false,

    timeRequestModal: false,

    fahduFees: 0,

    amount: 0,

    showPostProgress: false,



    profileDescriptionModal: {
      type: undefined,
      show: false,
    },

    callAccepted: false,

    showRechargeModal: false,

    alertModal: {
      message: undefined,
      show: false,
      type: false,
    },

    onlineStatus: false,

    unReadChatIcon: false,
    showOnboarding: false,
    setupCompleteModal: false,
    serverMaintenance: false, // Temporary variable for maintenance mode
    showTabBar: true,
    latestTip: null,
    nicheSelectorModal: false,
    creatorSelectorModal: false,
  },
};

const hideShowSlice = createSlice({
  name: 'hideShow',
  initialState,
  reducers: {
    toggleChatRoomModal: (state, action) => {
      state.visibility.chatRoomSortModal = !state.visibility.chatRoomSortModal;
    },

    toggleChatWindowClipModal: (state, action) => {
      state.visibility.chatWindowClipModal = !state.visibility.chatWindowClipModal;
    },

    toggleChatWindowVideoModal: (state, action) => {
      state.visibility.chatWindowVideoModal = !state.visibility.chatWindowVideoModal;
    },

    toggleChatWindowPaymentModal: (state, action) => {
      state.visibility.chatWindowPaymentModal = !state.visibility.chatWindowPaymentModal;
    },

    toggleChatWindowFullSizedImageModal: (state, action) => {
      state.visibility.chatWindowFullSizedImageModal = !state.visibility.chatWindowFullSizedImageModal;
    },

    toggleChatWindowAttachmentPreviewModal: (state, action) => {
      state.visibility.chatWindowAttachmentPreviewModal = !state.visibility.chatWindowAttachmentPreviewModal;
    },

    toggleNewMessageRecieved: (state, action) => {
      state.visibility.newMessageRecieved = (state.visibility.newMessageRecieved || 0) + 1;
    },

    toggleChatWindowInformationModal: (state, action) => {
      state.visibility.chatWindowInformationModal = !state.visibility.chatWindowInformationModal;
    },

    toggleChatWindowTipModal: (state, action) => {
      state.visibility.chatWindowTipModal = !state.visibility.chatWindowTipModal;
    },

    toggleForgetPassword: (state, action) => {
      state.visibility.forgetPassword = !state.visibility.forgetPassword;
    },

    setClickedNotification: (state, action) => {
      state.visibility.notificationClick = action.payload.click;
    },

    toggleVerficationScreen: (state, action) => {
      state.visibility.verficationScreen = action.payload.show;
    },

    toggleConfirmSubscribe: (state, action) => {
      state.visibility.confirmSubscribe = !state.visibility.confirmSubscribe;
    },

    enableNotificationModal: (state, action) => {
      state.visibility.notificationModal = true;
    },

    toggleShowProgress: (state, action) => {
      state.visibility.showPostProgress = action.payload.show;
    },

    disableNotificationModal: (state, action) => {
      state.visibility.notificationModal = false;
    },

    toggleHomeBottomSheet: (state, action) => {
      state.visibility.homeBottomSheet = action.payload.show;
    },

    setDiscoverFilter: (state, action) => {
      if (typeof action.payload.show === 'boolean') {
        state.visibility.discoverFilter.visible = action.payload.show;
      }

      if (action.payload.type) {
        state.visibility.discoverFilter.type = action.payload.type;
      }
    },

    toggleChatWindowPreviewSheet: (state, action) => {
      state.visibility.chatWindowPreview = action.payload.show;
    },

    toggleWishListSheet: (state, action) => {
      state.visibility.wishListSheet = action.payload.show;
    },

    toggleTransactionSheet: (state, action) => {
      state.visibility.transactionSheet = action.payload.show;
    },


    toggleShowRechargeModal: (state, action) => {
      state.visibility.showRechargeModal = action.payload.show;
    },

    togglePostActionBottomSheet: (state, action) => {
      console.log(action.payload.info, ':::::::::::P');
      state.visibility.postActionBottomSheet = { ...action.payload.info };
    },

    setPostsCardType: (state, action) => {
      state.visibility.postCardType = action.payload.postCardType;
    },

    resetAllModal: (state, action) => {
      state.visibility.chatRoomSortModal = false;
      state.visibility.chatWindowClipModal = false;
      state.visibility.chatWindowVideoModal = false;
      state.visibility.chatWindowPaymentModal = false;
      state.visibility.chatWindowFullSizedImageModal = false;
      state.visibility.chatWindowAttachmentPreviewModal = false;
      state.visibility.chatWindowInformationModal = false;
      state.visibility.newMessageRecieved = 0;
      state.visibility.chatWindowTipModal = false;
      state.visibility.logoutModal = false;
      state.visibility.verficationScreen = -1;
      state.visibility.wishListPreviewModal = false;
      state.visibility.profileActionModal = false;
      state.visibility.wishListPreviewModal = false;
      state.visibility.currentVideoPlayId = undefined;
      state.visibility.confirmSubscribe = false;
      state.visibility.attachmentMediaLoading = false;
      state.visibility.areYouSureModal = false;
      state.visibility.isThisYou = false;
      state.visibility.confirmIsThisYou = false;
      state.visibility.homeBottomSheet = -1;
      state.visibility.chatWindowPreview = -1;
      state.visibility.switchBottomSheet = -1;
      state.visibility.brandLinkSubmitSheet = -1;
      state.visibility.createPostSheet = -1;
      state.visibility.dateTimePicker = -1;
      state.visibility.wishListSheet = -1;
      state.visibility.transactionSheet = -1;
      state.visibility.hideShowLiveTerms = -1;
      state.visibility.hideShowInformationIcon = false;
      state.visibility.commentBottomSheet = { show: -1, focus: false };
      state.visibility.postActionBottomSheet = { postId: '', show: -1 };
      state.visibility.sendPostTipsModal = {
        show: false,
        postId: '',
      };
      state.visibility.whoTippedSheet = { show: -1, postId: undefined };
      state.visibility.otherProfileRatingSheet = -1;
      state.visibility.twoFAAuthCard = { type: 'authenticator', show: false };
      state.visibility.authenticatorVia = { email: false, auth: false };
      state.visibility.disableAuthModal = { show: false };
      state.visibility.otherProfileLoader = { stateOne: true, stateTwo: true, stateThree: true };
      state.visibility.dateTimePickerData = {
        date: new Date().toISOString(),
        type: 'datetime',
        status: 'idle',
      };
    },

    resetVerificationScreen: (state, action) => {
      state.visibility.verficationScreen = -1;
    },

    toggleTableModal: (state, action) => {
      state.visibility.tableModal = !state.visibility.tableModal;
    },

    toggleBrandPreviewModal: (state, action) => {
      state.visibility.brandPreviewModal = !state.visibility.brandPreviewModal;
    },

    toggleHideShowInformationModal: (state, action) => {
      state.visibility.hideShowInformationIcon = action.payload.show;
    },

    toggleBrandLinkSubmitSheet: (state, action) => {
      state.visibility.brandLinkSubmitSheet = action.payload.show;
    },

    toggleCreatePostBottomSheet: (state, action) => {
      state.visibility.createPostSheet = action.payload.show;
    },

    toggleDateTimePicker: (state, action) => {
      state.visibility.dateTimePicker = action.payload.show;
      if (action.payload.show === 1) {
        state.visibility.dateTimePickerData.status = 'picking';
      }
      if (action.payload.date) {
        state.visibility.dateTimePickerData.date = action.payload.date;
      }
      if (action.payload.type) {
        state.visibility.dateTimePickerData.type = action.payload.type;
      }
    },

    resetDateTimePicker: (state, action) => {
      state.visibility.dateTimePicker = -1;
      state.visibility.dateTimePickerData = {
        date: new Date().toISOString(),
        type: 'datetime',
        status: 'idle',
      };
    },

    confirmDateTimePicker: (state, action) => {
      state.visibility.dateTimePicker = -1;
      state.visibility.dateTimePickerData.status = 'confirmed';
      state.visibility.dateTimePickerData.date = action.payload.date;
    },

    setDateTimePickerDate: (state, action) => {
      state.visibility.dateTimePickerData.date = action.payload.date;
    },

    toggleProfileAction: (state, action) => {
      state.visibility.profileActionModal = !state.visibility.profileActionModal;
    },

    toggleWishListPreviewModal: (state, action) => {
      state.visibility.wishListPreviewModal = !state.visibility.wishListPreviewModal;
    },

    setCurrentVideoPlayId: (state, action) => {
      state.visibility.currentVideoPlayId = action.payload.currentVideoId;
    },

    toggleSendPostTipModal: (state, action) => {
      state.visibility.sendPostTipsModal = { ...action.payload.info };
    },

    toggleLiveStreamTipModal: (state, action) => {
      state.visibility.liveStreamTipModal = { ...action.payload.info };
    },

    toggleTabBar: (state, action) => {
      state.visibility.showTabBar = action.payload.show;
    },

    toggleSwitchBottomSheet: (state, action) => {
      state.visibility.switchBottomSheet = action.payload.show;
    },

    toggleAttachmentMediaLoading: (state, action) => {
      state.visibility.attachmentMediaLoading = action.payload.show;
    },

    toggleAreYouSureModal: (state, action) => {
      state.visibility.areYouSureModal = action.payload.show;
    },

    toggleIsThisYou: (state, action) => {
      state.visibility.isThisYou = !state.visibility.isThisYou;
    },

    toggleConfirmIsThisYou: (state, action) => {
      state.visibility.confirmIsThisYou = !state.visibility.confirmIsThisYou;
    },

    toggleOtherProfileActionSheet: (state, action) => {
      state.visibility.otherProfileActionSheet = { ...action.payload.info };
    },

    toggleRefreshOtherProfile: (state, action) => {
      state.visibility.refreshOtherProfile = !state.visibility.refreshOtherProfile;
    },

    toggleManageRevenueDashboard: (state, action) => {
      state.visibility.manageRevenueDashboard = action.payload.show;
    },

    toggleCommentBottomSheet: (state, action) => {
      state.visibility.commentBottomSheet = { ...action.payload.info };
    },

    toggleVerificatinInformation: (state, action) => {
      state.visibility.verificationInformatin = !state.visibility.verificationInformatin;
    },

    toggleWhoTippedSheet: (state, action) => {
      state.visibility.whoTippedSheet = { ...action.payload.info };
    },

    toggleOtherProfileRatingSheet: (state, action) => {
      state.visibility.otherProfileRatingSheet = action.payload.show;
    },

    toggleTwoFAAuthCard: (state, action) => {
      state.visibility.twoFAAuthCard = { ...action.payload.info };
    },

    toggleAuthenticatorVia: (state, action) => {
      state.visibility.authenticatorVia = { ...state.visibility.authenticatorVia, ...action.payload.info };
    },

    toggleDisableAuthModal: (state, action) => {
      state.visibility.disableAuthModal.show = action.payload.show;
    },

    toggleOtherProfileLoader: (state, action) => {
      state.visibility.otherProfileLoader = { ...action.payload.info };
    },

    toggleHideShowLiveTerms: (state, action) => {
      state.visibility.hideShowLiveTerms = action.payload.show;
    },

    toggleAddGoals: (state, action) => {
      state.visibility.addGoalsSheet = action.payload.show;
    },

    toggleInstagrmLinkSubmitModal: (state, action) => {
      state.visibility.instagramLinkSubmitModal = action.payload.show;
    },

    toggleEmailVerificationModal: (state, action) => {
      state.visibility.emailVerification = action.payload.show;
    },

    toggleInstagramVerification: (state, action) => {
      state.visibility.instagramVerification = action.payload.show;
    },

    toggleAreYou: (state, action) => {
      state.visibility.areYou = action.payload.show;
    },

    toggleAppliedVerify: (state, action) => {
      state.visibility.appliedVerify = action.payload.show;
    },

    toggleLoadingComments: (state, action) => {
      state.visibility.loadingComments = action.payload.show;
    },

    toggleTransferModal: (state, action) => {
      state.visibility.transferModal = action.payload.show;
    },

    toggleBankDetailsModal: (state, action) => {
      state.visibility.bankDetailsModal = action.payload.show;
    },

    toggleConfirmBankDetails: (state, action) => {
      state.visibility.confirmBankDetailsModal = action.payload.show;
    },

    togglePaymentAlert: (state, action) => {
      state.visibility.paymentAlert = action.payload.show;
    },

    togglePaymentInfo: (state, action) => {
      state.visibility.paymentInfo = action.payload.show;
    },

    toggleShowBankDetailsModal: (state, action) => {
      state.visibility.bankDetails = action.payload.show;

      state.visibility.fahduFees = action.payload.fahduFees;

      state.visibility.amount = action.payload.amount;
    },

    toggleHelpCenterModal: (state, action) => {
      state.visibility.helpCenterModal = action.payload.show;
    },

    toggleChatWindowFeeSetup: (state, action) => {
      state.visibility.chatWindowFeeSetup = action.payload.show;
    },

    toggleRatingModal: (state, action) => {
      state.visibility.ratingModal = action.payload.show;
    },

    toggleOtherProfileActionModal: (state, action) => {
      state.visibility.otherProfileActionModal = action.payload.show;
    },

    toggleTransactionDetailModal: (state, action) => {
      state.visibility.transactionDetailModal = action.payload.show;
    },

    toggleLabelModal: (state, action) => {
      state.visibility.labelModal = action.payload.show;
    },

    toggleChatRoomLabelEdit: (state, action) => {
      state.visibility.chatRoomLabelEdit = action.payload.show;
    },

    toggleCombineSelectorModal: (state, action) => {
      state.visibility.combineSelectorModal = action.payload.show;
    },

    toggleShowChatRoomSelector: (state, action) => {
      state.visibility.showChatRoomSelector = action.payload.show;
    },

    toggleFloatingViews: (state, action) => {
      state.visibility.floatingViews = action.payload.show;
    },

    toggleCallMethodSelector: (state, action) => {
      console.log(action.payload.show, '::::~::');

      state.visibility.callMethodSelector = action.payload.show;
    },

    toggleCallRequestModal: (state, action) => {
      state.visibility.callRequestModal = action.payload.show;
    },

    toggleCallPriceModal: (state, action) => {
      state.visibility.callPriceModal.show = action.payload.show;
      state.visibility.callPriceModal.type = action.payload.type;
      state.visibility.callMethodSelector = action.payload.callSelectors;
    },

    toggleCallIntiator: (state, action) => {
      state.visibility.isCallInitiator = action.payload.isInitiator;
    },

    toggleCallTimeModal: (state, action) => {
      state.visibility.callTimeModal = action.payload.show;
    },

    toggleCallTipModal: (state, action) => {
      state.visibility.callTip = action.payload.show;
    },

    toggleWalletLoader: (state, action) => {
      state.visibility.walletLoader = action.payload.packId;
    },

    toggleLinkingModal: (state, action) => {
      state.visibility.linkingModal = action.payload.show;
    },

    toggleAccountDeleteModal: (state, action) => {
      state.visibility.accountDeleteModal = action.payload.show;
    },



    toggleProfileDescriptionModal: (state, action) => {
      state.visibility.profileDescriptionModal.type = action.payload.type;
      state.visibility.profileDescriptionModal.show = action.payload.show;
    },

    hideAlertModal: (state, action) => {
      state.visibility.alertModal.show = false;
    },

    setIsUserOnline: (state, action) => {
      state.visibility.isUserOnline = action.payload.show;
    },

    toggleReLogin: (state, action) => {
      state.visibility.relogin = action.payload.show;
    },

    toggleCallAccepted: (state, action) => {
      state.visibility.callAccepted = action.payload.status;
    },

    toggleTimeRequestModal: (state, action) => {
      state.visibility.timeRequestModal = action.payload.show;
      state.visibility.callPriceModal.show = action.payload.priceModal;
    },

    toggleAlertModal: (state, action) => {
      state.visibility.alertModal.message = action.payload.message;
      state.visibility.alertModal.show = action.payload.show;
      state.visibility.alertModal.type = action.payload.type;
    },

    updateOnlineStatus: (state, action) => {
      state.visibility.onlineStatus = action.payload.onlineStatus;
    },

    setUnReadChatIcon: (state, action) => {
      state.visibility.unReadChatIcon = action.payload.show;
    },

    toggleShowOnboarding: (state, action) => {
      state.visibility.showOnboarding = action.payload.show;
    },

    toggleSetupCompleteModal: (state, action) => {
      state.visibility.setupCompleteModal = action.payload.show;
    },

    toggleServerMaintenance: (state, action) => {
      state.visibility.serverMaintenance = action.payload.show;
    },
    setLatestTip: (state, action) => {
      state.visibility.latestTip = action.payload;
    },
    toggleNicheSelectorModal: (state, action) => {
      state.visibility.nicheSelectorModal = action.payload.show;
    },
    setConfirmedNiches: (state, action) => {
      state.visibility.confirmedNiches = action.payload;
    },
    toggleCreatorSelectorModal: (state, action) => {
      state.visibility.creatorSelectorModal = action.payload.show;
    },
  },

  extraReducers(builder) {
    builder.addCase(resetAll, state => {
      return initialState;
    });
  },
});

export const {
  toggleLiveStreamTipModal,
  toggleAddGoals,
  toggleHideShowLiveTerms,
  toggleHideShowInformationModal,
  toggleChatWindowPreviewSheet,
  toggleOtherProfileLoader,
  toggleDisableAuthModal,
  toggleAuthenticatorVia,
  toggleTwoFAAuthCard,
  toggleOtherProfileRatingSheet,
  toggleWhoTippedSheet,
  toggleVerificatinInformation,
  toggleSendPostTipModal,
  toggleCommentBottomSheet,
  toggleOtherProfileActionSheet,
  toggleConfirmSubscribe,
  toggleTransactionSheet,
  toggleSwitchBottomSheet,
  toggleWishListSheet,
  toggleAreYouSureModal,
  toggleAttachmentMediaLoading,
  setCurrentVideoPlayId,
  toggleChatRoomModal,
  toggleProfileAction,
  toggleWishListPreviewModal,
  toggleChatWindowClipModal,
  toggleChatWindowAttachmentPreviewModal,
  toggleChatWindowVideoModal,
  toggleChatWindowPaymentModal,
  toggleChatWindowFullSizedImageModal,
  toggleNewMessageRecieved,
  toggleChatWindowInformationModal,
  toggleChatWindowTipModal,
  resetAllModal,
  setClickedNotification,
  toggleVerficationScreen,
  resetVerificationScreen,
  enableNotificationModal,
  disableNotificationModal,
  toggleHomeBottomSheet,
  setPostsCardType,
  toggleTableModal,
  toggleBrandPreviewModal,
  toggleBrandLinkSubmitSheet,
  toggleCreatePostBottomSheet,
  toggleDateTimePicker,
  resetDateTimePicker,
  confirmDateTimePicker,
  setDateTimePickerDate,
  toggleForgetPassword,
  toggleIsThisYou,
  toggleConfirmIsThisYou,
  toggleRefreshOtherProfile,
  toggleManageRevenueDashboard,
  togglePostActionBottomSheet,
  toggleInstagrmLinkSubmitModal,
  toggleEmailVerificationModal,
  toggleCreatorSelectorModal,
  toggleInstagramVerification,
  toggleAreYou,
  toggleAppliedVerify,
  toggleLoadingComments,
  toggleTransferModal,
  toggleBankDetailsModal,
  toggleConfirmBankDetails,
  togglePaymentAlert,
  togglePaymentInfo,
  toggleShowBankDetailsModal,
  toggleHelpCenterModal,
  toggleChatWindowFeeSetup,
  toggleRatingModal,
  toggleOtherProfileActionModal,
  toggleTransactionDetailModal,
  toggleLabelModal,
  toggleChatRoomLabelEdit,
  toggleCombineSelectorModal,
  toggleShowChatRoomSelector,
  toggleFloatingViews,
  toggleCallMethodSelector,
  toggleCallRequestModal,
  toggleCallPriceModal,
  toggleNicheSelectorModal,
  setConfirmedNiches,
  toggleCallIntiator,
  toggleCallTimeModal,
  toggleCallTipModal,
  toggleWalletLoader,
  toggleLinkingModal,
  toggleProfileDescriptionModal,
  toggleAccountDeleteModal,

  toggleAlertModal,
  toggleReLogin,
  toggleTimeRequestModal,
  toggleShowRechargeModal,
  toggleShowProgress,
  setDiscoverFilter,
  hideAlertModal,
  setIsUserOnline,
  toggleCallAccepted,
  setUnReadChatIcon,
  updateOnlineStatus,
  toggleShowOnboarding,
  toggleSetupCompleteModal,
  toggleServerMaintenance,
  toggleTabBar,
  setLatestTip,
} = hideShowSlice.actions;
export default hideShowSlice.reducer;
