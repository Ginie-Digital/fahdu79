import Snackbar from 'react-native-snackbar';
import DeviceInfo from 'react-native-device-info';
import { useFollowUserMutation, useResendEmailVerificationMutation } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
import { Platform, ToastAndroid, Keyboard } from 'react-native';
import { navigate } from '../../Navigation/RootNavigation';
import axios from 'axios';
import { nTwins } from '../../DesiginData/Utility';
import store from '../../Redux/Store';
import { toggleAlertModal } from '../../Redux/Slices/NormalSlices/HideShowSlice';

let getKeyboardHeight = store.getState().keyboardProperties.data.height;

export const LoginPageErrors = text => {
  // return Snackbar.show({
  //   text,
  //   duration: Snackbar.LENGTH_SHORT,
  //   backgroundColor: "#FF9E99",
  //   textColor: "#282828",
  //   fontFamily: "Rubik-Bold",
  //   marginBottom: Platform.OS === "ios" && Keyboard.isVisible() ? getKeyboardHeight : nTwins(1, 0)
  // });

  store.dispatch(toggleAlertModal({ message: text, type: false, show: true }));
};

export const ChatWindowError = text => {
  // return Snackbar.show({
  //   text,
  //   duration: Snackbar.LENGTH_LONG,
  //   backgroundColor: '#FF9E99',
  //   textColor: '#383838',
  //   fontFamily: 'Rubik-Bold',
  //   marginBottom: Platform.OS === 'ios' ? responsiveWidth(190) : responsiveWidth(1),
  // });

  store.dispatch(toggleAlertModal({ message: text, type: false, show: true }));
};

//ChatWindowFollowError(e?.error?.data?.message, followUser, followData, followError, token, name)

export const ChatWindowFollowError = (text, followUser, token, name) => {
  return Snackbar.show({
    text,
    duration: Snackbar.LENGTH_LONG,
    backgroundColor: '#FF9E99',
    textColor: '#383838',
    fontFamily: 'Rubik-Bold',
    action: {
      text: 'FOLLOW',
      textColor: 'green',
      onPress: () => {
        followUser({ token, displayName: name }).then(e => {
          console.log(e);
        });
      },
    },
  });
};

export const VerifyEmail = (text, email, token) => {
  return Snackbar.show({
    text,
    duration: Snackbar.LENGTH_LONG,
    backgroundColor: '#FF9E99',
    textColor: '#383838',
    fontFamily: 'Rubik-Bold',
    action: {
      text: 'RE-SEND',
      textColor: 'green',
      onPress: async () => {
        try {
          const { data, status } = await axios.post(
            'https://api.fahdu.com/api/user/verify/email/resend',
            { email, token },
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'System-Agent': `${DeviceInfo.getBrand()} ${DeviceInfo.getModel()}`,
              },
            },
          );

          if (data?.statusCode === 200) {
            Snackbar.dismiss();
            chatRoomSuccess('Your email verification link sent again');
          }
        } catch (e) {
          console.log(e?.response?.data?.data?.message);
        }
      },
    },
  });
};

export const CreatePasswordError = text => {
  return Snackbar.show({
    text,
    duration: Snackbar.LENGTH_LONG,
    backgroundColor: '#FF9E99',
    textColor: '#383838',
    fontFamily: 'Rubik-Bold',
    action: {
      text: 'CREATE',
      textColor: 'green',
      onPress: () => {
        navigate('changePassword', { title: 'Create password' });
      },
    },
  });
};

export const CommonSuccess = text => {
  // return Snackbar.show({
  //   text,
  //   duration: Snackbar.LENGTH_LONG,
  //   backgroundColor: '#FF9E99',
  //   textColor: '#383838',
  //   fontFamily: 'Rubik-Bold',
  // });

  store.dispatch(toggleAlertModal({ message: text, type: true, show: true }));
};

export const OnlineSnack = () => {
  return Snackbar.show({
    text: "You're Online Now",
    duration: Snackbar.LENGTH_SHORT,
    backgroundColor: '#DAFDCE',
    textColor: '#383838',
    fontFamily: 'Rubik-Bold',
  });
};

export const OfflineSnack = () => {
  return Snackbar.show({
    text: "You're Offline",
    duration: Snackbar.LENGTH_LONG,
    backgroundColor: '#FF9E99',
    textColor: '#383838',
    fontFamily: 'Rubik-Bold',
  });
};

export const successSnack = () => {
  // return Snackbar.show({
  //   text: 'Code sent to email',
  //   duration: Snackbar.LENGTH_LONG,
  //   backgroundColor: '#DAFDCE',
  //   textColor: '#383838',
  //   fontFamily: 'Rubik-Bold',
  // });
  store.dispatch(toggleAlertModal({ message: text, type: true, show: true }));
};

export const chatRoomSuccess = text => {
  // return Snackbar.show({
  //   text,
  //   duration: Snackbar.LENGTH_LONG,
  //   backgroundColor: '#DAFDCE',
  //   textColor: '#383838',
  //   fontFamily: 'Rubik-Bold',
  // });

  store.dispatch(toggleAlertModal({ message: text, type: true, show: true }));
};

export const successSnacks = text => {
  // return Snackbar.show({
  //   text,
  //   duration: Snackbar.LENGTH_LONG,
  //   backgroundColor: '#DAFDCE',
  //   textColor: '#383838',
  //   fontFamily: 'Rubik-Bold',
  // });

  store.dispatch(toggleAlertModal({ message: text, type: true, show: true }));
};
