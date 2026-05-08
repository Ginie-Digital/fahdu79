import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import {memo, useMemo, useCallback} from 'react';
import axios from 'axios';
import auth from '@react-native-firebase/auth';
import {ChatWindowError, LoginPageErrors} from '../Src/Components/ErrorSnacks';
import {appleAuth} from '@invertase/react-native-apple-authentication';
import { BASE_URL } from '../Src/Configs/ApiConfig';

GoogleSignin.configure({
  webClientId: '244359435466-1v5qtnn5suvivvdpp4il6tnkghf2k4dt.apps.googleusercontent.com',
  offlineAccess: true,
});

export const googleUserInfo = async () => {
  try {
    signOutGoogle();

    const {idToken} = await GoogleSignin.signIn();

    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    const mainINfo = await auth().signInWithCredential(googleCredential);

    if (idToken && mainINfo) {
      return {
        provider: 'google',
        google: {
          idToken: idToken,
          id: mainINfo?.user?.providerData[0]?.uid,
          name: mainINfo?.user?.displayName,
          email: mainINfo?.user?.email,
          photoUrl: mainINfo?.user?.photoURL,
          firstName: mainINfo?.additionalUserInfo?.profile?.given_name,
          lastName: mainINfo?.additionalUserInfo?.profile?.family_name,
          provider: 'GOOGLE',
        },
      };
    }
  } catch (e) {
    if (e.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('cancelled');
      return 'cancelled';
    } else {
      console.log('GetGoogleUserInfo');
    }
  }
};

export const googleSignIn = async () => {
  try {
    /**
     * todo1: generated Id token from googleSignin
     * todo2:  Create a Google credential with the token
     * todo3: Sign-in to firebase the user with the credential
     * !->uid: mainINfo.user.uid [User Id]
     * todo4: Get access token for server verification
     * !->firebaseAuthToken [token for sending to server],
     * @auth : Refers to firebaseStuff
     * */

    signOutGoogle();

    const {idToken} = await GoogleSignin.signIn();

    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    const mainINfo = await auth().signInWithCredential(googleCredential);

    let {data: serverResponse} = await axios.post(
      `${BASE_URL}/api/connect/social`,
      {
        provider: 'google',
        google: {
          idToken: idToken,
          id: mainINfo?.user?.providerData[0]?.uid,
          name: mainINfo?.user?.displayName,
          email: mainINfo?.user?.email,
          photoUrl: mainINfo?.user?.photoURL,
          firstName: mainINfo?.additionalUserInfo?.profile?.given_name,
          lastName: mainINfo?.additionalUserInfo?.profile?.family_name,
          provider: 'GOOGLE',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    // console.log(serverResponse);

    return serverResponse;
  } catch (e) {
    console.log('🚀 ~ file: Plus.js:81 ~ signInErrors ~ e:', e);

    if (e.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('cancelled');
      return 'cancelled';
    }

    //Show Google account not connected when errorr code 409

    LoginPageErrors('Google Account Not Connected');

    if (e?.message?.search('409') !== -1) {
      return (data = {
        statusCode: 409,
      });
    }
  }
};

export const appleSignIn = async () => {
  try {
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });

    const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);

    if (credentialState === appleAuth.State.AUTHORIZED) {
      console.log(appleAuthRequestResponse);

      let {data: serverResponse} = await axios.post(
        `${BASE_URL}/api/connect/social`,
        {
          provider: 'apple',
          apple: appleAuthRequestResponse,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return serverResponse;
    } else {
      console.log(credentialState, '::::');
    }
  } catch (e) {
    console.log('Error', e?.response?.data);
    ChatWindowError(e?.response?.data?.message);
  }
};

export const signOutGoogle = async () => {
  try {
    let signedInWithGoogle = auth().currentUser;

    if (signedInWithGoogle) {
      await GoogleSignin.signOut();
      await auth().signOut();
    } else {
      console.log('User not signed in with Google to logout');
    }
  } catch (error) {
    console.error(error);
  }
};
