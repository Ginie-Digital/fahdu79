import {StyleSheet, TouchableOpacity, Text, View, Pressable} from 'react-native';
import React, {useCallback} from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import {useFollowUserMutation, useGetRoomIdMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {successSnack} from '../ErrorSnacks';
import DIcon from '../../../DesiginData/DIcons';
import {useDispatch, useSelector} from 'react-redux';
import {toggleProfileAction} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {navigate} from '../../../Navigation/RootNavigation';
import {updateCacheRoomList} from '../../../Redux/Slices/NormalSlices/RoomListSlice';

const MessageSubButton = ({isFollowing, setIsFollowing, token, userName, userProfileDetails, subscribed}) => {
  const [followUser, {isError: followError, data: followData, originalArgs}] = useFollowUserMutation();

  const [getRoomId] = useGetRoomIdMutation();
  const dispatch = useDispatch();
  const loggedInUserRole = useSelector(state => state.auth.user.role);

  const handleFollow = useCallback(() => {
    setIsFollowing(false);

    followUser({token, displayName: userName})
      .then(e => {
        if (e?.data) {
          setIsFollowing(true);
        }

        if (e?.error?.data?.message?.search('Already') >= 0) {
          setIsFollowing(true);
        } else if (e?.error?.data?.status_code === 2044) {
          console.log('Logout');
        }
      })

      .catch(e => {
        console.log(e?.data);
      });
  }, []);

  const handleMessageNavigation = () => {
    const data = {
      user_id: {
        user1: userProfileDetails?._id,
      },
    };

    getRoomId({token, data}).then(e => {
      if (e?.data?.statusCode) {
        console.log(e?.data?.data?.createdAt);

        let chatRoomAndWidowDetails = {
          chatRoomId: e?.data?.data?._id,
          name: userProfileDetails?.displayName,
          profileImageUrl: userProfileDetails?.profile_image?.url,
          role: userProfileDetails?.role,
          id: userProfileDetails?._id,
        };

        dispatch(
          updateCacheRoomList({
            chatRoomId: chatRoomAndWidowDetails?.chatRoomId,
            createdAt: e?.data?.data?.createdAt,
            message: e?.data?.data?.lastMessage?.hasAttachment ? '' : e?.data?.data?.lastMessage?.message,
            hasAttachment: e?.data?.data?.lastMessage?.hasAttachment,
            senderId: chatRoomAndWidowDetails?.id,
            profileImage: chatRoomAndWidowDetails?.profileImageUrl,
            userName: chatRoomAndWidowDetails?.name,
            role: chatRoomAndWidowDetails?.role,
          }),
        );

        navigate('Chats', chatRoomAndWidowDetails);
      }
    });
  };

  if (isFollowing) {
    return (
      <View style={styles.wrapper}>
        <TouchableOpacity style={{width: responsiveWidth(5)}} />

        <View style={{width: responsiveWidth(75), flexDirection: 'row', justifyContent: loggedInUserRole === 'creator' ? 'center' : 'space-around'}}>
          {loggedInUserRole !== 'creator' && (
            <View style={{position: 'relative', alignSelf: 'center'}}>
              <Pressable onPress={() => handleMessageNavigation()}>
                <Text style={[styles.loginButton]}>Message</Text>
              </Pressable>
            </View>
          )}

          {!subscribed && (
            <View style={{position: 'relative', alignSelf: 'center'}}>
              <Pressable
                onPress={() =>
                  navigate('subscribeCreator', {
                    name: userProfileDetails?.displayName,
                    profileImageUrl: userProfileDetails?.profile_image?.url,
                    role: userProfileDetails?.role,
                    id: userProfileDetails?._id,
                  })
                }>
                <Text style={[styles.loginButton]}>Subscribe</Text>
              </Pressable>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={() => dispatch(toggleProfileAction())} style={styles.threeDots}>
          <DIcon provider={'Entypo'} name={'dots-three-vertical'} />
        </TouchableOpacity>
      </View>
    );
  } else {
    return (
      <View style={{position: 'relative', alignSelf: 'center'}}>
        <Text style={[styles.loginButton, {backgroundColor: '#282828', position: 'absolute', alignSelf: 'center', transform: [{translateX: 2}, {translateY: 2}]}]} />
        <Pressable onPress={() => handleFollow()}>
          <Text style={[styles.loginButton]}>Follow</Text>
        </Pressable>
      </View>
    );
  }
};

export default MessageSubButton;

const styles = StyleSheet.create({
  loginButton: {
    borderWidth: 1,
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#ffa07a',
    borderRadius: responsiveWidth(2),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Lexend-Medium',
    elevation: 1,
    fontWeight: '600',
    width: responsiveWidth(28),
    height: responsiveWidth(11),
    textAlignVertical: 'center',
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
    elevation: 1,
    fontSize: responsiveFontSize(2.3),
  },

  wrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },

  threeDots: {
    width: responsiveWidth(5),
  },
});
