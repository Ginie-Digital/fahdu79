import { fetchBaseQuery, createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

export const roomListApi = createApi({
  reducerPath: 'roomListApi',

  baseQuery: baseQueryWithReauth(fetchBaseQuery({
    baseUrl: 'https://api.fahdu.com/api/messages/',
  })),

  tagTypes: ['recent', 'old', 'latestChat'],
  keepUnusedDataFor: 0,

  endpoints: builder => ({
    getRoomList: builder.query({
      query: ({ token, cursor, audience, state, label, status }) => {
        const pathSegment = (audience && audience !== 'none') ? audience : 'all';
        let url = `${pathSegment}/rooms`;
        const params = [];
        if (cursor)                      params.push(`cursor=${cursor}`);
        if (state && state !== 'recent') params.push(`state=${state}`);
        if (label && label !== 'none')   params.push(`label=${label}`);
        if (status && status !== 'all')  params.push(`status=${status}`);
        if (params.length > 0) url += `?${params.join('&')}`;
        console.log('📤 [ChatRoom API] Request:', {
          endpoint: 'getRoomList',
          url: `https://api.fahdu.com/api/messages/${url}`,
          params: { cursor: cursor ? '...' + cursor.slice(-20) : null, audience, state, label, status },
          timestamp: new Date().toISOString(),
        });
        return {
          timeout: 25000,
          url: url,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        };
      },
      transformResponse: (response, meta, arg) => {
        console.log('📥 [ChatRoom API] Response:', {
          endpoint: 'getRoomList',
          status: meta?.response?.status,
          roomsCount: response?.data?.rooms?.length || 0,
          metadata: response?.data?.metadata,
          params: arg,
          timestamp: new Date().toISOString(),
        });
        if (response?.data?.rooms) {
          console.log('📋 [ChatRoom API] Rooms Preview:', response.data.rooms.slice(0, 3).map(r => ({
            id: r._id,
            displayName: r.recipientDetails?.displayName,
            lastMessage: r.lastMessage?.message?.substring(0, 30),
            unreadCount: r.unreadCount,
          })));
        }
        return response;
      },
      transformErrorResponse: (response, meta, arg) => {
        console.error('❌ [ChatRoom API] Error:', {
          endpoint: 'getRoomList',
          status: response?.status,
          error: response?.data,
          params: arg,
          timestamp: new Date().toISOString(),
        });
        return response;
      },
      providesTags: ['recent'],
      keepUnusedDataFor: 0,
    }),

    getInitialChats: builder.query({
      query: ({ token, chatRoomId, page }) => {
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
        return { ...response?.data, messages: response?.data?.messages.reverse() };
      },
    }),

    getLatestChat: builder.query({
      query: ({ token, chatRoomId, _id }) => {
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
        return { ...response?.data, messages: response?.data?.messages.reverse() };
      },
    }),

    sendMessage: builder.mutation({
      query: ({ token, message, roomId, attachment }) => ({
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
      query: ({ token, roomId }) => ({
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

    searchChatRoom: builder.query({
      query: ({ token, searchString }) => ({
        url: `search?search=${searchString}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useLazyGetRoomListQuery, useGetInitialChatsQuery, useLazyGetInitialChatsQuery, useGetLatestChatQuery, useSendMessageMutation, useSetSeenToServerMutation, useLazyGetLatestChatQuery, useLazySearchChatRoomQuery } = roomListApi;
