import AsyncStorage from '@react-native-async-storage/async-storage';
import { authLogout } from './Redux/Slices/NormalSlices/AuthSlice';
import { resetAllModal, setPostsCardType, toggleReLogin } from './Redux/Slices/NormalSlices/HideShowSlice';
import { deleteCachedMessages } from './Redux/Slices/NormalSlices/MessageSlices/ThreadSlices';
import { removeRoomList } from './Redux/Slices/NormalSlices/RoomListSlice';
import { emptyUnreadRoomList } from './Redux/Slices/NormalSlices/UnReadThreadSlice';
import store from './Redux/Store';
import axios from 'axios';
import { LoginPageErrors } from './Src/Components/ErrorSnacks';
import { resetAll } from './Redux/Actions';

const logoutUser = async token => {
  try {
    let { data } = await axios.get('https://api.fahdu.in/api/user/logout', { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 10000 });

    console.log(data?.data);
  } catch (e) {
    console.log(e?.response?.data?.message);

    if (e.toJSON().message === 'Network Error') {
      LoginPageErrors('no internet connection');
    }
  }
};

export const autoLogout = async () => {
  const currentState = store.getState();
  const hasToken = currentState?.auth?.user?.token;

  if (hasToken) {
    store.dispatch(toggleReLogin({ show: true }));
  } else {
    console.log('autoLogout skipped: User already logged out explicitly');
  }
};

export const logoutExplicit = async () => {
  store.dispatch(authLogout());
  store.dispatch(deleteCachedMessages());
  store.dispatch(removeRoomList());
  store.dispatch(emptyUnreadRoomList());
  store.dispatch(setPostsCardType({ postCardType: 'normal' }));
  store.dispatch(resetAllModal());
  store.dispatch(resetAll());
  console.log('Logout out initiated');
};
