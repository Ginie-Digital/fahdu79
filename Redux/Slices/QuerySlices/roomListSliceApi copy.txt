import {fetchBaseQuery, createApi} from '@reduxjs/toolkit/query/react';

export const roomListApi = createApi({
  reducerPath: 'roomListApi',

  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.fahdu.in/api/messages/',
  }),

  tagTypes: ['recent', 'old', 'latestChat'],
  keepUnusedDataFor: 0.01,

  endpoints: builder => ({
    getRoomList: builder.query({
      query: ({token, page, sortBy, label, filter}) => {
        return {
          timeout: 25000,
          url: `rooms?page=${page}&sortBy=${sortBy}&label=${label}&filter=${filter}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
      providesTags: ['recent'],
      keepUnusedDataFor: 0,
    }),

    getInitialChats: builder.query({
      query: ({token, chatRoomId, page}) => {
        return {
          timeout: 25000,
          url: `room/${chatRoomId}?page=${page}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },

      transformResponse: response => {
        return {...response?.data, messages: response?.data?.messages.reverse()};
      },
    }),

    getLatestChat: builder.query({
      query: ({token, chatRoomId, _id}) => {
        return {
          url: `room/v2/unread/${chatRoomId}?chatId=${_id}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
      invalidatesTags: ['latestChat'],
      transformResponse: response => {
        return {...response?.data, messages: response?.data?.messages.reverse()};
      },
    }),

    sendMessage: builder.mutation({
      query: ({token, message, roomId, attachment}) => ({
        url: ``,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          message: message,
          room_id: roomId,
          attachment,
        },
      }),
    }),

    setSeenToServer: builder.mutation({
      query: ({token, roomId}) => ({
        url: `markAsRead`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          room_id: roomId,
        },
      }),
    }),
  }),
});

export const {useLazyGetRoomListQuery, useGetInitialChatsQuery, useLazyGetInitialChatsQuery, useGetLatestChatQuery, useSendMessageMutation, useSetSeenToServerMutation, useLazyGetLatestChatQuery} = roomListApi;
