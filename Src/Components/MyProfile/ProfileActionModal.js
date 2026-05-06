import { StyleSheet, Text, View, Animated, TouchableOpacity, FlatList, ToastAndroid, ActivityIndicator } from "react-native";
import React, { useCallback } from "react";
import { responsiveFontSize, responsiveHeight, responsiveWidth } from "react-native-responsive-dimensions";
import { useSelector, useDispatch } from "react-redux";

import Modal from "react-native-modal";

import { profileActionList } from "../../../DesiginData/Data";
import DIcon from "../../../DesiginData/DIcons";
import { toggleProfileAction } from "../../../Redux/Slices/NormalSlices/HideShowSlice";
import { useUnFollowUserMutation, useUnSubscribeMutation } from "../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi";
import { chatRoomSuccess, LoginPageErrors } from "../ErrorSnacks";

/**
 * todo : One dispatch to hide show modal, another one to set seelcted sort
 */

const ProfileActionModal = ({ setIsFollowing, isFollowing, token, userName, setSubscribed, onUnsubscribePress, subscribed, isFetchingSubscription }) => {
  const dispatch = useDispatch();
  const modalVisibility = useSelector((state) => state.hideShow.visibility.profileActionModal);

  const [unFollowUser] = useUnFollowUserMutation();

  const handleProfileActions = async (id) => {
    if (id === 1) { // Unfollow
      dispatch(toggleProfileAction());
      const { data, error } = await unFollowUser({ token, displayName: userName });
      if (data) {
        setIsFollowing(false);
        chatRoomSuccess(`You have unfollowed ${userName}`);
      }
      if (error) LoginPageErrors(error?.data?.message);
    } else if (id === 4) { // Unsubscribe
      if (onUnsubscribePress) {
        onUnsubscribePress();
      }
    } else if (id === 3) { // Block
      dispatch(toggleProfileAction());
      ToastAndroid.show("Block feature coming soon", ToastAndroid.SHORT);
    }
  };

  const currentActions = [];
  if (isFollowing) {
    currentActions.push({
      id: 1,
      title: "Unfollow",
      iconName: "eye-off",
      provider: "Feather",
    });
  }
  if (subscribed) {
    currentActions.push({
      id: 4,
      title: "Unsubscribe",
      iconName: "tag-remove-outline",
      provider: "MaterialCommunityIcons",
    });
  }
  currentActions.push({
    id: 3,
    title: "Block User",
    iconName: "shield-alert-outline",
    provider: "MaterialCommunityIcons",
  });

  return (
    <Modal
      animationIn={"fadeInDown"}
      animationOut={"fadeOutUp"}
      animationInTiming={150}
      animationOutTiming={150}
      onRequestClose={() => dispatch(toggleProfileAction())}
      transparent={true}
      isVisible={modalVisibility}
      backdropColor="transparent"
      onBackButtonPress={() => dispatch(toggleProfileAction())}
      onBackdropPress={() => dispatch(toggleProfileAction())}
      useNativeDriver
      style={{
        width: "100%",
        alignSelf: "center",
        height: "100%",
        justifyContent: "flex-start",
      }}
    >
      <View style={[{ position: "relative" }]}>
        <View style={styles.modalInnerWrapper}>
          <FlatList
            data={currentActions}
            renderItem={({ item, index }) => (
              <TouchableOpacity 
                onPress={() => !isFetchingSubscription && handleProfileActions(item.id)}
                disabled={isFetchingSubscription && item.id === 4}
              >
                <View style={[styles.eachSortModalList, item.id === 4 && isFetchingSubscription && { opacity: 0.6 }]}>
                  {item.id === 4 && isFetchingSubscription ? (
                    <ActivityIndicator size="small" color="#FFA07A" style={{ width: responsiveWidth(5) }} />
                  ) : (
                    <DIcon name={item.iconName} provider={item.provider} size={responsiveWidth(5)} color={"#FFA07A"} />
                  )}
                  <Text style={styles.eachSortByModalListText}>{item.title}</Text>
                </View>
              </TouchableOpacity>
            )}
            style={{ marginTop: responsiveWidth(3) }}
          />
        </View>
      </View>
    </Modal>
  );
};

export default ProfileActionModal;

const styles = StyleSheet.create({
  modalInnerWrapper: {
    height: responsiveWidth(30),
    width: responsiveWidth(40),
    backgroundColor: "#fff",
    alignSelf: "flex-end",
    marginRight: responsiveWidth(8),
    marginTop: responsiveHeight(40),
    borderRadius: responsiveWidth(2),
    // padding: responsiveWidth(2),
    paddingHorizontal: responsiveWidth(3),
    borderWidth: 1,
    borderColor: "#282828",
  },

  eachSortByModalListText: {
    fontSize: responsiveFontSize(1.8),
    color: "#282828",
    fontFamily: "MabryPro-Medium",
  },
  eachSortModalList: {
    flexDirection: "row",
    gap: responsiveWidth(5),
    alignItems: "center",
    marginVertical: responsiveWidth(3),
  },
});
