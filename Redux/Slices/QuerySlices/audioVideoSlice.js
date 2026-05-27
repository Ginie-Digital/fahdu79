import { fetchBaseQuery, createApi } from '@reduxjs/toolkit/query/react';

export const audioVideoApi = createApi({
  reducerPath: 'audioVideoApi',

  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.fahdu.in/api/',
  }),

  endpoints: builder => ({
    callRequest: builder.mutation({
      query: ({ token, body }) => ({
        url: 'stream/request-call',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      }),
    }),
  }),
});

export const { useCallRequestMutation } = audioVideoApi;
