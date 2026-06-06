import { fetchBaseQuery, createApi } from '@reduxjs/toolkit/query/react';
import { Platform } from 'react-native';
import { BASE_URL } from '../../../Src/Configs/ApiConfig';
import { useSendMessageMutation } from './roomListSliceApi';
import axios from 'axios';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { setUploadProgress } from '../NormalSlices/UploadSlice';
import { baseQueryWithReauth } from './baseQueryWithReauth';
import { toggleReLogin } from '../NormalSlices/HideShowSlice';

export const chatWindowAttachmentApi = createApi({
  reducerPath: 'chatWindowAttachmentApi',

  baseQuery: baseQueryWithReauth(fetchBaseQuery({
    baseUrl: BASE_URL,
  })),

  tagTypes: ['CampaignList', 'Hello', 'UserProfile'],

  endpoints: builder => ({
    uploadAttachment: builder.mutation({
      queryFn: async ({ token, formData }, { dispatch }) => {
        try {
          // Extract file info from the FormData parts
          const parts = formData.getParts ? formData.getParts() : formData._parts;
          let fileUri = '';
          let fileName = 'file';
          let fileType = 'application/octet-stream';
          let keyName = 'message_attachment';

          if (parts) {
            for (const part of parts) {
              // FormData._parts is an array of [key, value] pairs
              const key = Array.isArray(part) ? part[0] : part.fieldName;
              const value = Array.isArray(part) ? part[1] : part;

              if (key === 'keyName') {
                keyName = Array.isArray(part) ? part[1] : part.string;
              } else if (key === 'file') {
                const fileObj = Array.isArray(part) ? part[1] : part;
                fileUri = fileObj.uri || '';
                fileName = fileObj.name || fileObj.fileName || 'file';
                fileType = fileObj.type || 'application/octet-stream';
              }
            }
          }

          // Normalize URI — remove file:// prefix for ReactNativeBlobUtil
          let cleanUri = fileUri;
          if (cleanUri.startsWith('file://')) {
            cleanUri = cleanUri.replace('file://', '');
          }

          console.log('📤 BlobUtil upload:', { cleanUri, fileName, fileType, keyName });

          const response = await ReactNativeBlobUtil.fetch(
            'POST',
            `${BASE_URL}/api/upload`,
            {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
            [
              { name: 'keyName', data: keyName },
              {
                name: 'file',
                filename: fileName,
                type: fileType,
                data: ReactNativeBlobUtil.wrap(cleanUri),
              },
            ],
          );

          const status = response.respInfo.status;
          const data = response.json();

          console.log('📤 BlobUtil response status:', status);

          if (status === 401) {
            const tokenExists = getState()?.auth?.user?.token;
            if (tokenExists) {
              dispatch(toggleReLogin({ show: true }));
            }
            return { error: data || 'Unauthorized' };
          }

          if (status >= 200 && status < 300) {
            return { data };
          }

          return { error: data || `Upload failed with status ${status}` };
        } catch (error) {
          console.error('❌ uploadAttachment BlobUtil error:', error);
          return { error: error?.message || 'Network error during upload' };
        }
      },
    }),

    createPostUploadAttachment: builder.mutation({
      queryFn: async ({ token, formData }, { dispatch, getState }) => {
        try {
          const response = await axios.post(`${BASE_URL}/api/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`,
            },
            // This is the key part for progress tracking
            onUploadProgress: progressEvent => {
              const { loaded, total } = progressEvent;

              console.log(loaded, total, '&&&&&&&&&', progressEvent);
              const percentCompleted = Math.round((loaded * 100) / total);
              // Dispatch the progress to your Redux store
              dispatch(setUploadProgress(percentCompleted));
            },
          });
          return { data: response };
        } catch (error) {
          if (error.response?.status === 401) {
            const tokenExists = getState()?.auth?.user?.token;
            if (tokenExists) {
              dispatch(toggleReLogin({ show: true }));
            }
          }
          return { error: error.response?.data || error.message };
        }
      },
    }),

    initiatePayment: builder.mutation({
      query: ({ token, conversationId, roomId }) => ({
        url: '/api/wallet/message/initiate-attachment-payment',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          roomId,
          conversationId,
        },
      }),
    }),

    payment: builder.mutation({
      query: ({ token, conversationId, roomId }) => ({
        url: '/api/wallet/message/payment',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          roomId,
          conversationId,
        },
      }),
    }),

    sendFcmToken: builder.mutation({
      query: ({ token, fcmToken }) => ({
        url: '/api/notification/preserve/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          token: fcmToken,
        },
      }),
    }),

    calculateCallAmount: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/call/amount',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    requestCall: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/request-call',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    startCall: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/call',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getPendingCalls: builder.query({
      query: (token) => ({
        url: '/api/stream/pending/calls',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    }),

    getScheduledCalls: builder.query({
      query: (token) => ({
        url: '/api/stream/scheduled/calls',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    }),

    sendTip: builder.mutation({
      query: ({ token, tipAmount, chatRoomId }) => ({
        url: '/api/wallet/chat/send-tip',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          amount: tipAmount,
          roomId: chatRoomId,
          type: 'CHAT',
        },
      }),
    }),

    sendCallTip: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/wallet/call/send-tip',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getAllNotifications: builder.query({
      query: ({ token, chatRoomId, _id }) => {
        return {
          url: ``,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
      invalidatesTags: ['latestChat'],
    }),

    logoutFromServer: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/user/logout`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    getCoins: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/wallet/get-coins`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    isValidFollow: builder.query({
      query: ({ token, userName }) => {
        console.log('FOLLO', userName);

        return {
          url: `/api/user/valid-follow-check?id=${userName}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    followUser: builder.mutation({
      query: ({ token, displayName }) => ({
        url: '/api/user/follow',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          displayName,
        },
      }),
    }),

    unFollowUser: builder.mutation({
      query: ({ token, displayName }) => ({
        url: '/api/user/unFollow',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          displayName,
        },
      }),
    }),

    getUserFeed: builder.query({
      query: ({ token, page, timestamp }) => {
        return {
          url: `/api/post/user/feeds?page=${page}&timestamp=${timestamp}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    requestBrandCollab: builder.mutation({
      query: ({ token, id }) => ({
        url: '/api/brand/campaign/apply',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          id,
        },
      }),
    }),

    getDashBoardData: builder.query({
      query: ({ token, page }) => {
        return {
          url: `/api/brand/creator/campaign/dashboard`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    getCampaignList: builder.query({
      query: ({ token, filter, page }) => {
        return {
          url: `/api/brand/creator/campaign/response?filter=${filter}&&page=${page}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
      providesTags: ['CampaignList'],
    }),

    submitMediaForApproval: builder.mutation({
      query: ({ token, id, url }) => ({
        url: '/api/brand/campaign/creator/submit',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          id,
          url,
        },
      }),
      invalidatesTags: ['CampaignList'],
    }),

    submitMediaForRevision: builder.mutation({
      query: ({ token, id, url }) => ({
        url: '/api/brand/campaign/creator/revision/submit',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          id,
          url,
        },
      }),
      invalidatesTags: ['CampaignList'],
    }),

    submitLinkToBrand: builder.mutation({
      query: ({ token, id, url }) => ({
        url: '/api/brand/campaign/creator/ready/submit',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          id,
          url,
        },
      }),
      invalidatesTags: ['CampaignList'],
    }),

    createPost: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/post/create',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    myPostList: builder.query({
      query: ({ token, page = 1 }) => {
        return {
          url: `/api/post/user/cpost?page=${page}&timestamp=`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
      providesTags: ['CampaignList'],
    }),

    otherPostList: builder.query({
      query: ({ token, userName, page = 1 }) => {
        return {
          url: `/api/post/user/cr_feeds?id=${userName}&page=${page}&timestamp=`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
      providesTags: ['CampaignList'],
    }),

    creatorProfile: builder.query({
      query: ({ token, displayName }) => {
        return {
          url: `/api/user/${displayName}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
      providesTags: ['UserProfile'],
    }),

    creatorRating: builder.query({
      query: ({ token, displayName }) => {
        return {
          url: `/api/user/get-user-rating?displayName=${displayName}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    getWishList: builder.query({
      query: ({ token, userId }) => {
        return {
          url: `/api/wishlists?userId=${userId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    rateUser: builder.mutation({
      query: ({ token, displayName, rating }) => ({
        url: '/api/user/user-rating',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          displayName,
          rating: Number(rating),
        },
      }),
    }),

    uploadWishList: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/wishlists',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    changePassword: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/user/password-change',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    userProfile: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/user/profile`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
      providesTags: ['UserProfile'],
    }),

    updateProfile: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/user/update-profile',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
      invalidatesTags: ['UserProfile'],
    }),

    //DiscoverPageAPI

    newCreators: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/creators/new-creators`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    mostSearch: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/creators/most-search`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    trendingCreators: builder.query({
      query: ({ token, niche, filter, page = 1 }) => {
        return {
          url: `/api/creators/trending-creators?niche=${encodeURIComponent(niche)}&filter=${filter}&page=${page}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    newCreators: builder.query({
      query: ({ token, niche, filter, page = 1 }) => {
        return {
          url: `/api/creators/creators-list?niche=${encodeURIComponent(niche)}&filter=${filter}&page=${page}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    discoverRecomendCreators: builder.query({
      query: ({ token, type = 'LifeStyle' }) => {
        return {
          url: `api/creators/niche?niche=${encodeURIComponent(type)}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    recommendedCreators: builder.query({
      query: ({ token, page }) => {
        return {
          url: `/api/creators/trending-creators-niche?page=${page}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    popularCreators: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/creators/popular-artist`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    searchedCreators: builder.query({
      query: ({ name }) => {
        return {
          url: `/api/user/search/creators?searchBy=${name}`,
          headers: {
            'Content-Type': 'application/json',
          },
        };
      },
    }),

    //Creatrors perspective

    getFS: builder.query({
      query: ({ token, listType, active = true, page = 1, t = '' }) => {
        return {
          url: `/api/subscription/get-${listType}?active=${active}&page=${page}${t ? `&t=${t}` : ''}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    //User Perspective

    //list-type : followed/subscribed
    getFSD: builder.query({
      query: ({ token, listType, active = true, page = 1, t = '' }) => {
        return {
          url: `/api/subscription/get-${listType}?active=${active}&page=${page}${t ? `&t=${t}` : ''}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    getFollowing: builder.query({
      query: ({ token, page = 1, limit = 10, t = '' }) => {
        return {
          url: `/api/subscription/get-followed?page=${page}&limit=${limit}${t ? `&t=${t}` : ''}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    //Check account link

    accountLinkStatus: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/connect`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    linkAccount: builder.mutation({
      query: ({ token, data }) => ({
        url: `/api/connect/link`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    unLinkAccount: builder.mutation({
      query: ({ token, provider }) => ({
        url: `/api/connect/unlink`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          provider,
        },
      }),
    }),

    // user/

    updatePictures: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/user/update-profile-image',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    createPassword: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/user/create-password',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getRoomId: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/messages/room',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    wishListDonation: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/wishlists/donate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    transactionData: builder.query({
      query: ({ token, page, filter }) => {
        return {
          url: `api/wallet/get-recentTrxn?page=${page}&filter=${filter}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    forgetPassword: builder.mutation({
      query: ({ data }) => ({
        url: '/api/user/forget-password',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
      }),
    }),

    verifyOtp: builder.mutation({
      query: ({ data }) => ({
        url: '/api/user/forgot-password/verify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
      }),
    }),

    resendOtp: builder.mutation({
      query: ({ data }) => ({
        url: '/api/user/resend-otp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
      }),
    }),

    resetPassword: builder.mutation({
      query: ({ data }) => ({
        url: '/api/user/update-password',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
      }),
    }),

    // user/signup

    signUp: builder.mutation({
      query: ({ data }) => ({
        url: '/api/user/signup',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
      }),
    }),

    referralVerify: builder.query({
      query: ({ query }) => {
        return {
          url: `/api/user/verify-referral?refId=${query}`,
          headers: {
            'Content-Type': 'application/json',
          },
        };
      },
    }),

    //

    signUpByRefferal: builder.mutation({
      query: ({ data }) => ({
        url: '/api/user/signup-by-referral',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
      }),
    }),

    getCreatorsPlan: builder.query({
      query: ({ token, id }) => {
        return {
          url: `/api/subscription/get-package/${id}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    subscriptionPayments: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/wallet/subscription/payment',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getCashfreeSubscription: builder.query({
      query: ({ token, creatorId }) => ({
        url: `/api/payments/cashfree/subscription?creatorId=${creatorId}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
    }),

    manageSubscription: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/payments/cashfree/subscription/manage',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    unSubscribe: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/user/unsubscribe',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    //

    instaVerify: builder.query({
      query: ({ token, handle }) => {
        return {
          url: `/api/document-verification/v3/ig/account?handle=${handle}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    coverUpdateProfile: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/user/cove/update-profile',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
      invalidatesTags: ['UserProfile'],
    }),

    getNoOnce: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/document-verification/get-nonce`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    checkUserNameAvailability: builder.query({
      query: ({ token, displayName }) => {
        return {
          url: `/api/document-verification/v2/check-availability?displayName=${displayName}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    getUserDoc: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/document-verification/v2/get-user-docs`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    finalVerificationSubmission: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/document-verification/v2/create-docs',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    checkVerificationImageStatus: builder.query({
      query: ({ token, time }) => {
        return {
          url: `/api/document-verification/check/verification?time=${time || Date.now()}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    getOwnPackage: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/subscription/get-own-package`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),
    createSubscription: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/payments/cashfree/subscription/create',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    addPackageSubscription: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/subscription/add-package',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getFeeSetupDetails: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/fee-setup/get-feesetup-details`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    updateFeeSetup: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/fee-setup/update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    updateFeeSetupChatWindow: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/fee-setup/chat/update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getWalletPack: builder.query({
      query: ({ token, os }) => {
        return {
          url: `/api/wallet/get-coin-packs?type=${os}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    appleReceiptVerify: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/payments/apple/verify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getMRDashboardData: builder.query({
      query: ({ token, type, filter }) => {
        return {
          url: `/api/creators/dashboard?filter=${type}&duration=${filter}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    refferalDetails: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/referral/details`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    //

    getSelfLike: builder.query({
      query: ({ token, _id }) => {
        return {
          url: `/api/post/get-like?postId=${_id}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    likeApi: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/post/likes',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getAllComments: builder.query({
      query: ({ token, _id, page = 1 }) => {
        console.log('kanchanpage', page);

        return {
          url: `/api/post/get-comment?postId=${_id}&page=${page}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    doComment: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/post/comment',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    sendPostTip: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/wallet/post/send-tip',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    reportPost: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/post/report',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    //

    getScheduledPosts: builder.query({
      query: ({ token, _id }) => {
        return {
          url: `/api/post/get-scheduled-post`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    deleteScheduledPost: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/post/cancel-schedule-post',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    deleteMyPost: builder.mutation({
      query: ({ token, postId }) => ({
        url: `/api/post/del-post?postId=${postId}`,
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
    }),

    pinUnPinPost: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/post/pin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    postEdit: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/post/edit-post',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    blockUser: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/user/block',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    unblockUser: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/user/unblock',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getBlockList: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/user/blocked-list`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    getSupportRoomId: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/static/config/additional`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    //

    getTippersList: builder.query({
      query: ({ token, postId, page = 1 }) => {
        return {
          url: `/api/post/details/tip?postId=${postId}&page=${page}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    getTFACode: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/TFA/third-party/access-code',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getTFAEmailCode: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/TFA/mail/access-code',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    validateTFA: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/TFA/mail/validate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    validateTFAAuth: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/TFA/third-party/get-qrcode',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getTFAStatus: builder.query({
      query: ({ token, postId, page = 1 }) => {
        return {
          url: '/api/TFA',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    // /api/TFA/mail/disable/access-code

    enableThirdPartyAuth: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/TFA/third-party/validate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    disableThirdPartyAuth: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/TFA/third-party/disable',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    disableMailTwoFA: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/TFA/mail/disable/confirm',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    resendCodeTFA: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/TFA/mail/resend/access-code',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getDisableMailTFACode: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/TFA/mail/disable/access-code',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getSinglePostDetails: builder.query({
      query: ({ token, postId }) => {
        return {
          url: `/api/post/get-post?postId=${postId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    deleteUser: builder.mutation({
      query: ({ token }) => ({
        url: '/api/user/account/remove',
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
    }),

    agreeToLicense: builder.mutation({
      query: ({ token }) => ({
        url: '/api/user/toc/agree',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
    }),

    //!liveStream

    createLiveStream: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/livestream/create',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    joinLiveStream: builder.query({
      query: ({ token, roomId }) => {
        return {
          url: `/api/stream/livestream/join?roomId=${roomId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    // /api/stream/live/token?roomId=92846b8c-3313-445e-a0aa-3c62e78d3644

    getStreamTokenToJoin: builder.query({
      query: ({ token, roomId }) => {
        return {
          url: `/api/stream/live/token?roomId=${roomId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    //We have to renew token of user for every 1 min

    userRenewToken: builder.query({
      query: ({ token, roomId }) => {
        return {
          url: `/api/stream/live/renew-token?roomId=${roomId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    //roomId in body {terminate livestream from userSide}
    leaveLiveStream: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/livestream/leave',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    //{terminate livestream from streamer side}
    endLiveStream: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/livestream/end',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    // {amount, roomId, type : "LIVESTREAM"}
    liveStreamTip: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/wallet/livestream/send-tip',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    //

    sendMessageLiveStream: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/livestream/sendMessage',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    // {amount, title}

    addGoalsLiveStream: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/livestream/goals',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    // { amount: 2, title: "Russian", roomId: "83c3a194-ec4a-4842-9049-1490eecd6f26" }
    tipForGoal: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/livestream/goals/tip',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    reJoin: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/livestream/rejoin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    //Mutre

    muteLiveStream: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/livestream/toggleMute',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    //For leaderboard

    sendLiveStreamDetails: builder.mutation({
      query: ({ token, data }) => ({
        url: 'api/leaderboard/submit/task/liveStream',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    //Stories

    getStories: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/post/get-stories`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    getInstagramProfileInfo: builder.query({
      query: ({ username }) => {
        return {
          url: `/api/brand/creator/insta/information/${username}`,
          headers: {
            'Content-Type': 'application/json',
          },
        };
      },
    }),

    applyInCampaign: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/brand/creator/apply',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    listOfAppliedCampaign: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/brand/creator/campaign/applied/list',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    submitMobileNumberForOtp: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/brand/creator/send/otp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    verifyWhatsappOtp: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/brand/creator/verify/mobilenumber',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    //Payments

    paymentCheckOut: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/payments/cashfree/wallet/checkout',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    paymentCheckOutPhonePe: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/payments/wallet/checkout',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    searchProfile: builder.query({
      query: ({ token, name }) => {
        return {
          url: `/api/creators/search-user?prefix=${name}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    getWeeklyEarning: builder.query({
      query: ({ token, startDate, endDate }) => {
        let url = '/api/wallet/get-weeklyEarnings';
        if (startDate && endDate) {
          url += `?startDate=${startDate}&endDate=${endDate}`;
        }
        return {
          url,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    getTotalEarnings: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/wallet/get-totalEarnings`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    saveBankDetails: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/payments/cashfree/create/beneficiary',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    featureWiseEarningDetail: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/wallet/get-earningDetails`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    withdrawableBalance: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/wallet/withdrawableBalance`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    refferalList: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/referral/get-referral`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    //Check if bank details already submitted

    alreadyFilledBankDetails: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/wallet/checkBankDetails`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    getShowBankDetails: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/wallet/get-bankDetails`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    helpCenterRequest: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/user/helpcenter',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    transferAmount: builder.mutation({
      query: ({ token, data }) => ({
        url: 'api/payout/transfer/payout',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    wishlistPayout: builder.mutation({
      query: ({ token, data }) => ({
        url: 'api/payout/transfer/payout',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    assignLabel: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/messages/label/assign',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    updateLabelTitle: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/messages/label/update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getAllLabelName: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/messages/getLabels`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    sendMassMessage: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/messages/bulk',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getPostDetails: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/post/share-post',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    //notificaiton

    areYouACreatorNotification: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/user/signup/notification',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    //Delete

    getAppVersion: builder.query({
      query: () => {
        return {
          url: `/api/user/get/version`,
          headers: {
            'Content-Type': 'application/json',
          },
        };
      },
    }),

    callRequest: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/request-call',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getCallToken: builder.query({
      query: ({ token, roomId }) => {
        return {
          url: `/api/stream/call/token?roomId=${roomId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    renewTokenCall: builder.query({
      query: ({ token, roomId }) => {
        return {
          url: `/api/stream/call/renew-token?roomId=${roomId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    othersCallingFeeDetail: builder.query({
      query: ({ token, userId }) => {
        return {
          url: `/api/fee-setup/get-fees?userId=${userId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    acceptCallRequest: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/call',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    callTriesStatus: builder.query({
      query: ({ token, roomId }) => {
        return {
          url: `/api/stream/call/status/?roomId=${roomId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    //roomId in body {terminate livestream from userSide}
    leaveCall: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/call/leave',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    rejectCall: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/reject-call',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    callTip: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/wallet/call/send-tip',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    getPaymentToken: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/payments/cashfree/create/order',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    callAcceptManual: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/call/accept/manual',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    declineCallRequest: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/decline-call-request',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    /**
     * { "roomId":"6800e1f6a0afe682dc8f4bd5",
"callType":"audio",
"status":"ACCEPTED" }
REJECTED, UNAVAILABLE
    */

    phonePePayLoad: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/payments/generate/payload',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    // onlineStatus: builder.mutation({
    //   query: ({token, data}) => ({
    //     url: '/api/user/status?displayName=',
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       Authorization: `Bearer ${token}`,
    //     },
    //     body: data,
    //   }),
    // }),

    updateProfileDescription: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/user/update/contactInfo',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
      invalidatesTags: ['UserProfile'],
    }),

    verifyPan: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/payments/cashfree/verify/pan',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    deleteBankDetails: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/payments/cashfree/delete/beneficiary',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    onlineStatus: builder.query({
      query: ({ token, displayName }) => {
        return {
          url: `/api/user/status?displayName=${displayName}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    // https://api.fahdu.in

    liveStatus: builder.query({
      query: ({ token, userId }) => {
        return {
          url: `/api/stream/live/status?userId=${userId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    creditDebit: builder.query({
      query: ({ token, roomId }) => {
        return {
          url: `/api/stream/live/transferCoins?roomId=${roomId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    contactInfo: builder.query({
      query: ({ token, userId }) => {
        return {
          url: `/api/user/get/contactInfo?userId=${userId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    pingIt: builder.query({
      query: ({ token, userId }) => {
        return {
          url: `/api/messages/emit/socket?roomId=${roomId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    //clear cache
    canClearCache: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/user/set/version',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    // Get unread chat count
    getUnreadChatCount: builder.query({
      query: ({ token }) => {
        return {
          url: `/api/messages/get/unread/count`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),

    // Complete onboarding
    toggleOnboarding: builder.mutation({
      query: ({ token, userId }) => ({
        url: 'api/creators/complete/onboarding',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          userId,
        },
      }),
    }),

    updateAvailability: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/stream/update/availability',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
    }),

    submitFeedback: builder.mutation({
      query: ({ token, data }) => ({
        url: '/api/user/feedback',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }),
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          console.log('Feedback API Response:', data);
        } catch (err) {
          console.error('Feedback API Error:', err);
        }
      },
    }),
  }),
});

export const {
  useVerifyWhatsappOtpMutation,
  useSubmitMobileNumberForOtpMutation,

  useReJoinMutation,
  useTipForGoalMutation,
  useLazyGetStoriesQuery,
  useAddGoalsLiveStreamMutation,
  useSendMessageLiveStreamMutation,
  useEndLiveStreamMutation,
  useLiveStreamTipMutation,
  useLazyUserRenewTokenQuery,
  useLeaveLiveStreamMutation,
  useLazyGetStreamTokenToJoinQuery,
  useLazyJoinLiveStreamQuery,
  useCreateLiveStreamMutation,
  useAgreeToLicenseMutation,
  useDeleteUserMutation,
  useLazyGetSinglePostDetailsQuery,
  useGetDisableMailTFACodeMutation,
  useResendCodeTFAMutation,
  useDisableMailTwoFAMutation,
  useDisableThirdPartyAuthMutation,
  useEnableThirdPartyAuthMutation,
  useValidateTFAAuthMutation,
  useLazyGetTFAStatusQuery,
  useGetTFAEmailCodeMutation,
  useValidateTFAMutation,
  useGetTFACodeMutation,
  useLazyGetTippersListQuery,
  useLazyGetSupportRoomIdQuery,
  useUnblockUserMutation,
  useLazyGetBlockListQuery,
  useBlockUserMutation,
  usePostEditMutation,
  usePinUnPinPostMutation,
  useDeleteMyPostMutation,
  useDeleteScheduledPostMutation,
  useLazyGetScheduledPostsQuery,
  useReportPostMutation,
  useSendPostTipMutation,
  useDoCommentMutation,
  useLikeApiMutation,
  useLazyGetAllCommentsQuery,
  useLazyGetSelfLikeQuery,
  useLazyRefferalDetailsQuery,
  useLazyGetMRDashboardDataQuery,
  useLazyGetWalletPackQuery,
  useUpdateFeeSetupMutation,
  useLazyGetFeeSetupDetailsQuery,
  useAddPackageSubscriptionMutation,
  useCreateSubscriptionMutation,
  useLazyGetOwnPackageQuery,
  useLazyGetUserDocQuery,
  useFinalVerificationSubmissionMutation,
  useLazyCheckUserNameAvailabilityQuery,
  useLazyGetNoOnceQuery,
  useLazyInstaVerifyQuery,
  useCoverUpdateProfileMutation,
  useUnSubscribeMutation,
  useSubscriptionPaymentsMutation,
  useGetCreatorsPlanQuery,
  useLazyGetCreatorsPlanQuery,
  useSignUpByRefferalMutation,
  useLazyReferralVerifyQuery,
  useSignUpMutation,
  useResetPasswordMutation,
  useResendOtpMutation,
  useVerifyOtpMutation,
  useForgetPasswordMutation,
  useLazyTransactionDataQuery,
  useWishListDonationMutation,
  useGetRoomIdMutation,
  useCreatePasswordMutation,
  useUpdatePicturesMutation,
  useUnLinkAccountMutation,
  useLinkAccountMutation,
  useLazyGetFSQuery,
  useLazyAccountLinkStatusQuery,
  useLazyGetFSDQuery,
  useUploadAttachmentMutation,
  useInitiatePaymentMutation,
  usePaymentMutation,
  useSendFcmTokenMutation,
  useSendTipMutation,
  useLazyLogoutFromServerQuery,
  useGetCoinsQuery,
  useFollowUserMutation,
  useUnFollowUserMutation,
  useGetUserFeedQuery,
  useLazyGetUserFeedQuery,

  useRequestBrandCollabMutation,
  useGetDashBoardDataQuery,
  useLazyGetCampaignListQuery,
  useSubmitMediaForApprovalMutation,
  useSubmitLinkToBrandMutation,
  useSubmitMediaForRevisionMutation,
  useLazyGetDashBoardDataQuery,
  useCreatePostMutation,
  useLazyMyPostListQuery,
  useLazyCreatorProfileQuery,
  useLazyCreatorRatingQuery,
  useLazyGetWishListQuery,
  useLazyOtherPostListQuery,
  useLazyIsValidFollowQuery,
  useRateUserMutation,
  useUploadWishListMutation,
  useChangePasswordMutation,
  useLazyUserProfileQuery,
  useUpdateProfileMutation,
  useAppleReceiptVerifyMutation,

  useLazyNewCreatorsQuery,
  useLazyMostSearchQuery,
  useLazyTrendingCreatorsQuery,
  useLazyRecommendedCreatorsQuery,
  useLazyPopularCreatorsQuery,
  useLazySearchedCreatorsQuery,
  useSendLiveStreamDetailsMutation,
  useLazyGetInstagramProfileInfoQuery,
  useApplyInCampaignMutation,
  useListOfAppliedCampaignMutation,
  useLazyDiscoverRecomendCreatorsQuery,
  usePaymentCheckOutMutation,

  //Dashboard

  useLazyGetWeeklyEarningQuery,
  useSaveBankDetailsMutation,
  useLazyGetTotalEarningsQuery,
  useLazyFeatureWiseEarningDetailQuery,
  useLazyAlreadyFilledBankDetailsQuery,
  useLazyGetShowBankDetailsQuery,

  useUpdateFeeSetupChatWindowMutation,

  //Search
  useLazySearchProfileQuery,

  //live

  useMuteLiveStreamMutation,

  useSendMassMessageMutation,

  useHelpCenterRequestMutation,

  //Reffereal
  useLazyRefferalListQuery,

  useLazyGetAppVersionQuery,

  //Label

  useAssignLabelMutation,
  useUpdateLabelTitleMutation,
  useLazyGetAllLabelNameQuery,

  useGetPostDetailsMutation,

  useCanClearCacheMutation,

  usePaymentCheckOutPhonePeMutation,

  useCallRequestMutation,
  useLazyGetCallTokenQuery,

  useLazyOthersCallingFeeDetailQuery,

  useAcceptCallRequestMutation,

  useLazyCallTriesStatusQuery,

  useLazyRenewTokenCallQuery,

  useLeaveCallMutation,

  useRejectCallMutation,

  useCallTipMutation,

  useLazyLiveStatusQuery,

  useCallAcceptManualMutation,

  useGetPaymentTokenMutation,

  usePhonePePayLoadMutation,

  useUpdateProfileDescriptionMutation,

  useLazyContactInfoQuery,

  useCreatePostUploadAttachmentMutation,

  useLazyCreditDebitQuery,

  useLazyOnlineStatusQuery,

  useDeclineCallRequestMutation,

  useTransferAmountMutation,

  useDeleteBankDetailsMutation,

  useLazyWithdrawableBalanceQuery,

  useLazyPingItQuery,

  useWishlistPayoutMutation,

  useVerifyPanMutation,

  useAreYouACreatorNotificationMutation,

  useToggleOnboardingMutation,
  useLazyGetUnreadChatCountQuery,
  useLazyGetFollowingQuery,
  useCalculateCallAmountMutation,
  useRequestCallMutation,
  useStartCallMutation,
  useUpdateAvailabilityMutation,
  useLazyGetPendingCallsQuery,
  useLazyGetScheduledCallsQuery,
  useGetPendingCallsQuery,
  useGetScheduledCallsQuery,
  useSendCallTipMutation,
  useLazyGetCashfreeSubscriptionQuery,
  useManageSubscriptionMutation,
  useSubmitFeedbackMutation,
  useLazyCheckVerificationImageStatusQuery,
} = chatWindowAttachmentApi;
