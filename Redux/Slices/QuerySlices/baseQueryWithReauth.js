import { toggleReLogin } from '../NormalSlices/HideShowSlice';

export const baseQueryWithReauth = (baseQuery) => async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  const publicUrls = ['/api/user/signup', '/api/user/search/creators', '/api/user/forget-password'];
  const isPublicUrl = publicUrls.some(url => typeof args === 'string' ? args.includes(url) : args.url?.includes(url));

  if (result.error && result.error.status === 401 && !isPublicUrl) {
    const token = api.getState()?.auth?.user?.token;
    if (token) {
      console.log('⚠️ [Auth] 401 Unauthorized detected, triggering Re-login modal');
      api.dispatch(toggleReLogin({ show: true }));
    } else {
      console.log('ℹ️ [Auth] 401 suppressed because user is already logged out or logout is in progress');
    }
  }

  return result;
};
