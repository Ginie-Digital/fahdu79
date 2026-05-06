import notifee, {AuthorizationStatus} from '@notifee/react-native';
import {AndroidColor, AndroidImportance, AndroidStyle, AndroidLaunchActivityFlag} from '@notifee/react-native/dist/types/NotificationAndroid';
import {Alert} from 'react-native';


export async function onDisplayNotification(data) {
  // Request permissions (required for iOS)

  console.log('::::::::::On Display Notification:::::::::', data);

  // Create a channel (required for Android)
  const channelId = await notifee.createChannel({
    id: 'message',
    name: 'message',
    sound: 'fahdu_default_sound',
    importance: AndroidImportance.HIGH,
  });

  await notifee.displayNotification({
    title: data?.username,
    body: `${data?.message}`,
    data: {
      roomId: String(data?.roomId || ''),
      userName: String(data?.username || ''),
      type: String(data?.channel || ''),
      profile_image: String(data?.profile_image || ''),
    },
    subtitle: data?.subtitle,
    android: {
      largeIcon: data?.profile_image,
      circularLargeIcon: true,
      showTimestamp: true,
      channelId,
      colorized: true,
      color: '#E8210C',
      smallIcon: 'icon_notification',
      timestamp: Date.now(),
      pressAction: {
        id: 'default',
        launchActivity: 'default',
        launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
      },
      // style: { type: AndroidStyle.MESSAGING  ,picture: "https://i.stack.imgur.com/rXEfk.jpg?s=256&g=1" },
    },
  });
}

export async function liveStreamNotification(data) {
  console.log(data, 'LPLPLP');

  // Create a channel (Android only, do this once ideally)
  const channelId = await notifee.createChannel({
    id: 'livestream',
    name: 'Live Stream Notifications',
    sound: 'fahdu_default_sound',
    importance: AndroidImportance.HIGH,
  });

  // Show the notification
  await notifee.displayNotification({
    title: data.title,
    body: data.subtitle,
    android: {
      channelId,
      pressAction: {
        id: 'default',
        launchActivity: 'default',
        launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
      },
      largeIcon: data.profile_image,
      smallIcon: 'ic_launcher',
    },
    ios: {
      attachments: data.profile_image ? [{url: data.profile_image}] : [],
    },
    data: {
      roomId: String(data.roomId || ''),
      link: String(data.link || ''),
      type: 'livestream',
    },
  });
}

export const displayNotificationProgressIndicator = async () => {
  console.log('removeing this');
};

export const dismissProgressNotification = async () => {
  // await notifee.cancelNotification('progress');
  console.log('removing this');
};

export const showPostInteractionNotification = async data => {
  console.log(JSON.stringify(data, null, '\t'));

  const channelId = await notifee.createChannel({
    id: 'posts',
    name: 'posts',
    sound: 'fahdu_default_sound',
    importance: AndroidImportance['HIGH'],
  });

  await notifee.displayNotification({
    title: data?.content?.style?.title,

    subtitle: data?.content?.style?.subtitle,

    body: data?.content?.style?.body,

    data: {
      link: String(data?.content?.misc?.link || ''),
    },

    android: {
      largeIcon: data?.content?.style?.largeIcon,
      vibrationPattern: data?.content?.style?.vibration,
      groupId: String(data?.content?.style?.groupID),
      groupSummary: true,
      circularLargeIcon: true,
      showTimestamp: true,
      channelId,
      colorized: true,
      color: '#E8210C',
      smallIcon: 'icon_notification',
      timestamp: Date.now(),
      style: {type: AndroidStyle.BIGPICTURE, picture: data?.content?.style?.bigPicture},
      pressAction: {
        id: 'default',
        launchActivity: 'default',
        launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
      },
    },

    ios: {
      attachments: data?.content?.style?.bigPicture 
        ? [{ url: String(data.content.style.bigPicture) }] 
        : [],
    },
  });
};

export const disp = async data => {
  // Request permissions (required for iOS)

  const channelId = await notifee.createChannel({
    id: 'message',
    name: 'Message',
    sound: 'fahdu_default_sound',
    importance: AndroidImportance.HIGH,
  });

  await notifee.displayNotification({
    title: 'Yo',
    android: {
      channelId,
    },
  });

  await notifee.displayNotification({
    title: data?.username,
    body: `${data?.message}`,
    data: {
      roomId: String(data?.roomId || ''),
      userName: String(data?.username || ''),
      type: String(data?.type || ''),
    },
    subtitle: data?.subtitle,
    android: {
      largeIcon: data?.profile_image,
      circularLargeIcon: true,
      showTimestamp: true,
      channelId,
      colorized: true,
      color: '#E8210C',
      smallIcon: 'icon_notification',
      timestamp: Date.now(),
      pressAction: {
        id: 'default',
      },
      // style: { type: AndroidStyle.MESSAGING  ,picture: "https://i.stack.imgur.com/rXEfk.jpg?s=256&g=1" },
    },
  });
};

export const checkNotificationGranted = async () => {
  const settings = await notifee.getNotificationSettings();

  if (settings.authorizationStatus == AuthorizationStatus.AUTHORIZED) {
    return true;
  } else if (settings.authorizationStatus == AuthorizationStatus.DENIED) {
    return false;
  }
};

export const outsideCallNotification = async data => {
  await notifee.createChannel({
    id: 'call',
    name: 'Incoming Calls',
    importance: AndroidImportance.HIGH,
    vibration: true,
    lights: true,
    lightColor: '#FF0000',
    sound: 'call',
  });

  await notifee.displayNotification({
    title: `📞 Incoming fahdu ${data?.callType} call`,
    body: `${data?.username} is calling you...`,
    android: {
      channelId: 'call',
      showTimestamp: true,
      pressAction: {
        id: 'default',
      },
      largeIcon: data?.profile_image,
      actions: [
        {
          title: 'Show',
          pressAction: {
            id: 'show-call',
          },
        },
      ],
      importance: AndroidImportance.HIGH,
      sound: 'call',
      autoCancel: false,
    },
  });
};

export async function showOthersCategoryNotification(remoteMessage) {
  try {
    // No Alert here — use console for debug
    console.log('📨 showOthersCategoryNotification:', remoteMessage);

    const data = remoteMessage?.data?.content ? JSON.parse(remoteMessage.data.content) : remoteMessage?.content || {};

    const {
      style: {title, subtitle, body, largeIcon, vibration, groupID},
      misc: {link},
    } = data;

    // Create a channel if not exists
    const channelId = await notifee.createChannel({
      id: 'others',
      name: 'Others',
      importance: AndroidImportance.HIGH, // HIGH for foreground visibility
    });

    // Show the notification
    await notifee.displayNotification({
      title: `${title ?? ''} ${subtitle ?? ''}`,
      body: body ?? '',
      data: {link: String(link || '')},
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        vibrationPattern: vibration || [100, 100],
        groupId: groupID || 'others',
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        colorized: true,
        color: '#E8210C',
      },
    });
  } catch (error) {
    console.log('Error displaying "others" notification:', error);
  }
}

export async function showSubscriptionNotification(remoteMessage) {
  try {
    console.log('📨 showSubscriptionNotification:', remoteMessage);

    const data = remoteMessage?.data?.content ? JSON.parse(remoteMessage.data.content) : remoteMessage?.content || {};

    console.log('ZOR', data);

    const {
      style: {title, subtitle, body, largeIcon, vibration, groupID},
      misc: {link},
    } = data;

    // ✅ Create channel (required)
    const channelId = await notifee.createChannel({
      id: 'subscription',
      name: 'Subscription Updates',
      importance: AndroidImportance.HIGH,
    });

    // ✅ Display with BIGPICTURE style
    await notifee.displayNotification({
      title: `${title ?? ''} ${subtitle ?? ''}`,
      body: body ?? '',
      data: {link: String(link || ''), type: 'subscription'},
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        groupId: groupID || 'subscription_group',
        colorized: true,
        color: '#E8210C',
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        largeIcon,
        vibrationPattern: vibration || [100, 200, 100],
        importance: AndroidImportance.HIGH,
        showTimestamp: true,
      },
    });

    console.log('✅ Subscription notification displayed');
  } catch (error) {
    console.log('❌ Error displaying subscription notification:', error);
  }
}

export async function showCallRequestNotification(remoteMessage) {
  try {
    console.log('📨 showSubscriptionNotification:', remoteMessage);

    const data = remoteMessage?.data?.content ? JSON.parse(remoteMessage.data.content) : remoteMessage?.content || {};

    const {
      style: {title, subtitle, body, largeIcon, vibration, groupID},
      misc: {link},
    } = data;

    // ✅ Create channel (required)
    const channelId = await notifee.createChannel({
      id: 'subscription',
      name: 'Subscription Updates',
      importance: AndroidImportance.HIGH,
    });

    // ✅ Display with BIGPICTURE style
    await notifee.displayNotification({
      title: `${title ?? ''} ${subtitle ?? ''}`,
      body: body ?? '',
      data: {link: String(link || ''), type: 'subscription'},
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        groupId: groupID || 'subscription_group',
        colorized: true,
        color: '#E8210C',
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        largeIcon,
        vibrationPattern: vibration || [100, 200, 100],
        importance: AndroidImportance.HIGH,
        showTimestamp: true,
      },
    });

    console.log('✅ Subscription notification displayed');
  } catch (error) {
    console.log('❌ Error displaying subscription notification:', error);
  }
}

// export async function showCallRelatedNotification(remoteMessage) {
//   try {
//     console.log('📨 showCallRelatedNotification:', remoteMessage);

//     const data = remoteMessage?.data?.content ? JSON.parse(remoteMessage.data.content) : remoteMessage?.content || {};

//     console.log('ZOR', data);

//     // FIX: Remove the style destructuring - properties are directly in data
//     const {title, subtitle, body, profile_image: largeIcon, roomId, callType, username, sender_id, sender_role, channel} = data;

//     // ✅ Create channel (required)
//     const channelId = await notifee.createChannel({
//       id: 'call_request',
//       name: 'Call Requests',
//       importance: AndroidImportance.HIGH,
//     });

//     // ✅ Display notification
//     await notifee.displayNotification({
//       title: subtitle,
//       body: title,
//       data: {
//         roomId,
//         callType,
//         sender_id,
//         sender_role,
//         type: 'call_request',
//       },
//       android: {
//         channelId,
//         smallIcon: 'ic_launcher',
//         groupId: channel || 'call_request_group',
//         colorized: true,
//         color: '#E8210C',
//         pressAction: {
//           id: 'default',
//           launchActivity: 'default',
//         },
//         largeIcon: largeIcon || undefined, // Only set if exists
//         vibrationPattern: [300, 500, 300, 500], // Call-like vibration
//         importance: AndroidImportance.HIGH,
//         showTimestamp: true,
//       },
//     });

//     console.log('✅ Call notification displayed');
//   } catch (error) {
//     console.log('❌ Error displaying call notification:', error);
//   }
// }

export async function showCallRelatedNotification(remoteMessage) {
  try {
    const data = remoteMessage?.data?.content ? JSON.parse(remoteMessage.data.content) : remoteMessage?.content || {};

    const {title, subtitle, profile_image: largeIcon, roomId, callType, username, sender_id, sender_role, channel} = data;

    const CALL_GROUP_ID = 'CALL_NOTIFICATIONS_GROUP';

    const channelId = await notifee.createChannel({
      id: 'call_request',
      name: 'Call Requests',
      importance: AndroidImportance.HIGH,
    });

    // ✅ MAIN call notification
    await notifee.displayNotification({
      title: subtitle,
      body: title,
      data: {
        roomId: String(roomId || ''),
        callType: String(callType || ''),
        sender_id: String(sender_id || ''),
        sender_role: String(sender_role || ''),
        type: 'call_request',
      },
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        groupId: CALL_GROUP_ID,
        largeIcon: largeIcon || undefined,
        vibrationPattern: [300, 500, 300, 500],
        importance: AndroidImportance.HIGH,
        showTimestamp: true,
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
      },
    });

    // ✅ GROUP SUMMARY
    await notifee.displayNotification({
      title: 'Incoming Calls',
      body: 'You have multiple call requests',
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        groupId: CALL_GROUP_ID,
        groupSummary: true,
      },
    });

    console.log('✅ Grouped call notification displayed');
  } catch (error) {
    console.log('❌ Error displaying call notification:', error);
  }
}

export async function showCallReminderNotification(remoteMessage) {
  try {
    const data = remoteMessage?.data?.content ? JSON.parse(remoteMessage.data.content) : remoteMessage?.content || {};

    const {title, subtitle, profile_image: largeIcon, roomId, callType, username, sender_id, sender_role, channel} = data;

    const channelId = await notifee.createChannel({
      id: 'call_reminder',
      name: 'Call Reminders',
      importance: AndroidImportance.HIGH,
      sound: 'fahdu_default_sound',
    });

    await notifee.displayNotification({
      title: title,
      body: subtitle,
      data: {
        roomId: String(roomId || ''),
        callType: String(callType || ''),
        sender_id: String(sender_id || ''),
        sender_role: String(sender_role || ''),
        type: 'call_reminder', 
        userName: String(username || ''),
        profile_image: String(largeIcon || '')
      },
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        largeIcon: largeIcon || undefined,
        importance: AndroidImportance.HIGH,
        showTimestamp: true,
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
      },
    });

    console.log('✅ Call Reminder notification displayed');
  } catch (error) {
    console.log('❌ Error displaying call reminder notification:', error);
  }
}

export async function showMentionNotification(remoteMessage) {
  try {
    console.log('📨 showMentionNotification:', remoteMessage);

    const data = remoteMessage?.data?.content ? JSON.parse(remoteMessage.data.content) : remoteMessage?.content || {};

    const {
      style: {title, subtitle, body, largeIcon, vibration, groupID, bigPicture},
      misc: {link},
    } = data;

    // Create channel
    const channelId = await notifee.createChannel({
      id: 'mentions',
      name: 'Mentions',
      importance: AndroidImportance.HIGH,
    });

    // Display notification
    await notifee.displayNotification({
      title: title || 'New Mention',
      body: body || subtitle || '',
      data: {
        link: String(link || ''),
        type: 'mention',
      },
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        largeIcon: largeIcon || undefined,
        groupId: groupID || 'mentions_group',
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        style: bigPicture ? { type: AndroidStyle.BIGPICTURE, picture: bigPicture } : undefined,
        vibrationPattern: vibration || [50, 100, 50, 100],
        importance: AndroidImportance.HIGH,
      },
      ios: {
        attachments: bigPicture ? [{ url: String(bigPicture) }] : [],
      },
    });

    console.log('✅ Mention notification displayed');
  } catch (error) {
    console.log('❌ Error displaying mention notification:', error);
  }
}

