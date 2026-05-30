import { StyleSheet, Text, View, TouchableOpacity, Pressable, TextInput, KeyboardAvoidingView, Platform, FlatList, Image, Keyboard, ActivityIndicator } from 'react-native';
import React, { memo, useEffect, useRef, useState } from 'react';
import DIcon from '../../../DesiginData/DIcons';
import { FONT_SIZES, nTwins, WIDTH_SIZES } from '../../../DesiginData/Utility';
import { useSelector } from 'react-redux';

import { useSendMessageLiveStreamMutation } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { token as memoizedToken, token } from '../../../Redux/Slices/NormalSlices/AuthSlice';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import { LinearGradient } from 'expo-linear-gradient';
import Send from '../../../Assets/svg/send.svg';
import LiveStreamComment from './LiveStreamComment';
import Feather from 'react-native-vector-icons/Feather';
import MaskedView from '@react-native-masked-view/masked-view';

const LiveStreamTextInput = ({ roomId, setShowCommentArea }) => {
  const commentChat = useRef('');

  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setShowCommentArea(false);
    });

    // Focus programmatically AFTER listeners are registered
    const focusTimer = setTimeout(() => {
      commentChat.current?.focus?.();
    }, 150);

    return () => {
      showListener.remove();
      hideListener.remove();
      clearTimeout(focusTimer);
    };
  }, []);

  const { role, currentUserDisplayName, currentUserProfilePicture } = useSelector(state => state.auth.user);

  const [sendMessageLiveStream] = useSendMessageLiveStreamMutation();

  const token = useSelector(state => state.auth.user.token);

  const falshChats = useSelector(state => state.livechats.data.chats);

  const emitMessage = async () => {
    // if (loading) return;

    if (commentChat.current.value?.trim()?.length === 0) {
      return;
    }

    setLoading(true); // Start loading

    try {
      const { error, data } = await sendMessageLiveStream({
        token,
        data: {
          roomId,
          data: {
            role,
            displayName: currentUserDisplayName,
            profile_image: {
              url: currentUserProfilePicture,
            },
            message: commentChat.current.value?.trim(),
          },
        },
      });

      if (commentChat.current) {
        commentChat.current.clear();
        commentChat.current.value = '';
      }

      if (data?.statusCode === 200) {
        console.log('Message Sent...');
      }
    } catch (err) {
      console.error('Message failed', err);
    } finally {
      setLoading(false); // Stop loading no matter success or failure
    }
  };

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: keyboardHeight,
        top: 0,
        backgroundColor: '#00000090',
        zIndex: 2,
        justifyContent: 'flex-end',
        width: '100%',
      }}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'transparent' }} onPress={() => setShowCommentArea(false)}>
        <View style={styles.overlayCommentsContainer}>
          <MaskedView
            style={{
              height: responsiveWidth(60),
              marginTop: responsiveWidth(3),
            }}
            maskElement={
              <LinearGradient
                style={{ flex: 1 }}
                colors={['transparent', 'black']}
                locations={[0, 0.2]}
              />
            }
          >
            <FlatList
              data={[...falshChats].reverse()}
              renderItem={({ item }) => <LiveStreamComment item={item} currentUserDisplayName={currentUserDisplayName} />}
              style={{ marginLeft: responsiveWidth(2), flex: 1 }}
              contentContainerStyle={{ gap: responsiveWidth(3) }}
              showsVerticalScrollIndicator={false}
              inverted
            />
          </MaskedView>
        </View>
      </TouchableOpacity>

      <View>
        <View style={styles.keyboardContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              enterKeyHint="send"
              placeholderTextColor={'#282828'}
              placeholder="Comments..."
              returnKeyType="none"
              onChangeText={t => (commentChat.current.value = t)}
              multiline={false}
              style={styles.textInput}
              ref={commentChat}
              keyboardAppearance="light"
              onSubmitEditing={() => (loading ? null : emitMessage())}
              blurOnSubmit={false}
              maxLength={50}
            />

            <Pressable
              style={styles.sendButton}
              onPress={() => !loading && emitMessage()} // disable press when loading
              disabled={loading} // makes sure it's not pressable
            >
              {loading ? <ActivityIndicator size="small" color="#1e1e1e" /> : ({ pressed }) => <Feather name="send" size={24} color={pressed ? '#999' : '#1e1e1e'} />}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

export default memo(LiveStreamTextInput);

const styles = StyleSheet.create({
  textInput: {
    paddingLeft: responsiveWidth(3),
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[14],
    backgroundColor: '#ffffff',
    borderRightColor: 'white',
    borderTopLeftRadius: WIDTH_SIZES[14],
    borderBottomLeftRadius: WIDTH_SIZES[14],
    height: responsiveWidth(14),
    borderWidth: responsiveWidth(0.3),
    width: responsiveWidth(85),
    padding: responsiveWidth(5),
    paddingRight: responsiveWidth(8),
    marginBottom: Platform.OS === 'ios' ? responsiveWidth(4) : responsiveWidth(6),
    color: '#1e1e1e',
  },
  keyboardContainer: {
    width: '100%',
    // padding: responsiveWidth(1),
    // backgroundColor: "red",
    // height: responsiveWidth(20),
    justifyContent: 'center',
    // alignItems : 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },

  overlayCommentsContainer: {
    backgroundColor: 'transparent',
    width: '100%',
    height: 'auto',
    marginTop: 'auto',
    marginBottom: WIDTH_SIZES[20],
  },

  profileImage: {
    width: '100%',
    resizeMode: 'cover',
    height: '100%',
    // borderRadius: responsiveWidth(4),
    borderWidth: responsiveWidth(0.3),
    borderRadius: responsiveWidth(2),
  },
  detailContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },

  commentText: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.6),
    color: '#fff',
    maxWidth: responsiveWidth(50),
  },

  name: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.8),
    color: '#fff',
  },

  imageContainer: {
    borderColor: 'purple',
    borderRadius: responsiveWidth(2),
    position: 'relative',
    borderColor: '#282828',
    resizeMode: 'cover',
    height: responsiveWidth(8),
    width: responsiveWidth(8),
    justifyContent: 'center',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: WIDTH_SIZES[14],
    borderWidth: responsiveWidth(0.3),
    width: WIDTH_SIZES[345],
    paddingHorizontal: responsiveWidth(2),
    paddingVertical: 10,
    marginBottom: 19,
  },
  textInput: {
    flex: 1,
    fontSize: responsiveFontSize(1.8),
    color: '#282828',
    paddingVertical: responsiveWidth(2),
    fontFamily: 'Rubik-Regular',
  },
  sendButton: {
    padding: responsiveWidth(2),
  },
});
