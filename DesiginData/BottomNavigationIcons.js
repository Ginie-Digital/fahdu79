import { StyleSheet, View } from 'react-native';
import React from 'react';
import { responsiveWidth } from 'react-native-responsive-dimensions';
import { useSelector } from 'react-redux';
import { Image } from 'expo-image';

// Light mode icons (default)
const iconsObject = {
  messages: require('./../Assets/svg/Tabsvgs/messages.png'),
  messagesFocus: require('./../Assets/svg/Tabsvgs/messagesfocus.png'),
  messageUnRead: require('./../Assets/svg/Tabsvgs/unreadchat.png'),

  createpostbottomtab: require('./../Assets/svg/Tabsvgs/add.png'),
  createpostbottomtabFocus: require('./../Assets/svg/Tabsvgs/add.png'),

  home: require('./../Assets/svg/Tabsvgs/home.png'),
  homeFocus: require('./../Assets/svg/Tabsvgs/homefocus.png'),

  dashboard: require('../Assets/Images/dashboard.png'),
  dashboardFocus: require('../Assets/Images/dashboardFocus.png'),

  profile: require('../Assets/Images/Coin.png'),
  profileFocus: require('../Assets/Images/Coin.png'),

  discover: require('./../Assets/svg/Tabsvgs/discover.png'),
  discoverFocus: require('./../Assets/svg/Tabsvgs/discoverfocus.png'),

  notifications: require('./../Assets/Images/notifications.png'),
  notificationsFocus: require('./../Assets/Images/notificationsfocus.png'),
};

// Dark mode icons from DarkModeBottom folder
const darkIconsObject = {
  messages: require('../Assets/Images/DarkModeBottom/messageUnfocus.png'),
  messagesFocus: require('../Assets/Images/DarkModeBottom/messageFocus.png'),
  messageUnRead: require('../Assets/Images/DarkModeBottom/messageNotifiyUnfocus.png'),

  createpostbottomtab: require('./../Assets/svg/Tabsvgs/add.png'),
  createpostbottomtabFocus: require('./../Assets/svg/Tabsvgs/add.png'),

  home: require('../Assets/Images/DarkModeBottom/homeUnfocus.png'),
  homeFocus: require('../Assets/Images/DarkModeBottom/homeFocus.png'),

  dashboard: require('../Assets/Images/dashboard.png'),
  dashboardFocus: require('../Assets/Images/dashboardFocus.png'),

  profile: require('../Assets/Images/Coin.png'),
  profileFocus: require('../Assets/Images/Coin.png'),

  discover: require('../Assets/Images/DarkModeBottom/discoverUnfocus.png'),
  discoverFocus: require('../Assets/Images/DarkModeBottom/discoverFocus.png'),

  notifications: require('./../Assets/Images/notifications.png'),
  notificationsFocus: require('./../Assets/Images/notificationsfocus.png'),
};

import { useAppTheme } from '../Src/Hook/useAppTheme';

const BottomNavigationIcons = props => {
  const { colors, isDark } = useAppTheme();
  const userProfileUrl = useSelector(state => state.auth.user.currentUserProfilePicture);

  const showUnReadIcon = useSelector(state => state.hideShow.visibility.unReadChatIcon);

  // Also check room list for any unread messages as backup
  const roomListData = useSelector(state => state.roomList?.data?.none || []);
  const hasUnreadInRoomList = roomListData.some(room => room.unreadCounterUser > 0);

  // Show unread icon if either the flag is set OR there are unread messages in room list
  const shouldShowUnread = showUnReadIcon || hasUnreadInRoomList;

  // Pick the correct icon set based on theme
  const icons = isDark ? darkIconsObject : iconsObject;

  let iconName = icons[props.iconName] || null;

  // 🔥 UNREAD CHAT OVERRIDE - Only show unread icon when NOT focused (not in chatroom)
  // When in chatroom (focused), always show normal focus icon
  if (props.iconName === 'messages' && shouldShowUnread) {
    // Not in chatroom + has unread = show unread icon
    iconName = icons.messageUnRead;
  } else if (props.iconName === 'messagesFocus') {
    // In chatroom (focused) = always show normal focus icon, not unread
    iconName = icons.messagesFocus;
  }

  // Special cases
  if (props.iconName === 'profile' || props.iconName === 'profileFocus') {
    iconName = 'url';
  } else if (props.iconName === 'createpostbottomtab' || props.iconName === 'createpostbottomtabFocus') {
    iconName = 'same';
  }

  return (
    <View style={styles.iconContainer}>
      {iconName === 'url' ? (
        <View
          style={{
            height: responsiveWidth(6),
            width: responsiveWidth(6),
            borderRadius: responsiveWidth(5),
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: props.focused ? colors.accent : (isDark ? '#FFFFFF' : '#1E1E1E'),
          }}>
          <Image source={{ uri: userProfileUrl }} placeholder={require('../Assets/Images/DefaultProfile.jpg')} contentFit="cover" style={{ flex: 1 }} />
        </View>
      ) : iconName === 'same' ? (
        <Image source={icons.createpostbottomtabFocus} style={styles.createPostIcon} tintColor={props.focused ? undefined : colors.iconTint} />
      ) : (
        <Image source={iconName} style={styles.defaultIcon} tintColor={props.focused ? undefined : colors.iconTint} />
      )}
    </View>
  );
};

export default BottomNavigationIcons;

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: responsiveWidth(5),
    height: responsiveWidth(5),
    padding: 20,
  },

  createPostIcon: {
    width: responsiveWidth(6),
    height: responsiveWidth(6),
    resizeMode: 'contain',
  },

  defaultIcon: {
    width: responsiveWidth(6),
    height: responsiveWidth(6),
    resizeMode: 'contain',
  },
});
