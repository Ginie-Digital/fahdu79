import {GoogleSignin, statusCodes, isSuccessResponse} from '@react-native-google-signin/google-signin';
import {memo, useMemo, useCallback} from 'react';
import axios from 'axios';
import {getAuth, GoogleAuthProvider} from '@react-native-firebase/auth';
import {ChatWindowError, LoginPageErrors} from '../Src/Components/ErrorSnacks';
import {appleAuth} from '@invertase/react-native-apple-authentication';
import { BASE_URL } from '../Src/Configs/ApiConfig';

GoogleSignin.configure({
  webClientId: '244359435466-1v5qtnn5suvivvdpp4il6tnkghf2k4dt.apps.googleusercontent.com',
  offlineAccess: true,
});

export const googleUserInfo = async () => {
  try {
    await signOutGoogle();

    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      console.log('Google sign-in was not successful');
      return 'cancelled';
    }

    const idToken = response.data?.idToken;

    if (!idToken) {
      console.log('No idToken received from Google');
      return;
    }

    const googleCredential = GoogleAuthProvider.credential(idToken);

    const mainINfo = await getAuth().signInWithCredential(googleCredential);

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
    if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('cancelled');
      return 'cancelled';
    } else {
      console.log('GetGoogleUserInfo error:', e);
    }
  }
};

export const googleSignIn = async () => {
  try {
    /**
     * todo1: generated Id token from googleSignin
     * todo2:  Create a Google credential with the token
     * todo3: Sign-in the user with the credential
     * !->uid: mainINfo.user.uid [User Id]
     * todo4: Get access token for server verification
     * !->firebaseAuthToken [token for sending to server],
     * @auth : Refers to firebaseStuff
     * */

    await signOutGoogle();

    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      console.log('Google sign-in was not successful');
      return 'cancelled';
    }

    const idToken = response.data?.idToken;

    if (!idToken) {
      console.log('No idToken received from Google');
      LoginPageErrors('Google Sign-In failed - no token received');
      return;
    }

    const googleCredential = GoogleAuthProvider.credential(idToken);

    const mainINfo = await getAuth().signInWithCredential(googleCredential);

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
    console.log('🚀 ~ googleSignIn error:', e);

    if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
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

    // Check credential state, but don't block on it in dev builds
    let isAuthorized = false;
    try {
      const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);
      isAuthorized = credentialState === appleAuth.State.AUTHORIZED;
      if (!isAuthorized) {
        console.log('Apple credentialState:', credentialState);
      }
    } catch (credErr) {
      console.log('Apple getCredentialState failed (dev build):', credErr);
    }

    // Proceed if authorized OR if we have a valid identityToken from performRequest
    if (isAuthorized || appleAuthRequestResponse?.identityToken) {
      console.log('Apple auth proceeding with response');

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
      console.log('Apple sign-in: no authorization and no identityToken');
    }
  } catch (e) {
    console.log('Apple sign-in error:', e?.response?.data || e);
    ChatWindowError(e?.response?.data?.message || 'Apple Sign-In failed');
  }
};

export const signOutGoogle = async () => {
  try {
    let signedInWithGoogle = getAuth().currentUser;

    if (signedInWithGoogle) {
      await GoogleSignin.signOut();
      await getAuth().signOut();
    } else {
      console.log('User not signed in with Google to logout');
    }
  } catch (error) {
    console.error(error);
  }
};
