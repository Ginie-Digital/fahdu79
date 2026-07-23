import notifee, {AuthorizationStatus, AndroidCategory} from '@notifee/react-native';
import {AndroidColor, AndroidImportance, AndroidStyle, AndroidLaunchActivityFlag} from '@notifee/react-native/dist/types/NotificationAndroid';
import {Alert, AppState, Platform} from 'react-native';

const INCOMING_CALL_CATEGORY_ID = 'incoming_call';

/** iOS: Accept/Decline category (safe to call repeatedly). */
export async function ensureIncomingCallNotificationCategory() {
  if (Platform.OS !== 'ios') return;
  try {
    await notifee.setNotificationCategories([
      {
        id: INCOMING_CALL_CATEGORY_ID,
        actions: [
          {
            id: 'decline_call',
            title: 'Decline',
            destructive: true,
            foreground: false,
            authenticationRequired: false,
          },
          {
            id: 'accept_call',
            title: 'Accept',
            foreground: true,
            authenticationRequired: false,
          },
        ],
      },
    ]);
  } catch (error) {
    console.log('❌ [Notifee] Failed to set iOS call categories:', error?.message || error);
  }
}

async function ensureNotificationPermission() {
  try {
    const settings = await notifee.getNotificationSettings();
    if (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }
    const req = await notifee.requestPermission();
    return (
      req.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      req.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch (_) {
    return true;
  }
}

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

/** Normalize FCM/socket payloads so roomId is never missed. */
function normalizeIncomingCallDetails(raw) {
  let details = raw;
  if (typeof details === 'string') {
    try {
      details = JSON.parse(details);
    } catch (_) {
      return null;
    }
  }
  if (!details || typeof details !== 'object') return null;
  // Some payloads nest under content / data.content
  if (!details.roomId && details.content) {
    const inner =
      typeof details.content === 'string'
        ? (() => {
            try {
              return JSON.parse(details.content);
            } catch (_) {
              return null;
            }
          })()
        : details.content;
    if (inner?.roomId) details = { ...details, ...inner };
  }
  const roomId = details.roomId || details.room_id;
  if (!roomId) return null;
  return {
    roomId: String(roomId),
    callId: String(details.callId || details.call_id || ''),
    callType: details.callType === 'video' || details.call_type === 'video' ? 'video' : 'audio',
    displayName:
      details.displayName ||
      details.name ||
      details.callerName ||
      details.username ||
      'Incoming Call',
    name: details.name || details.displayName || details.callerName || 'Incoming Call',
    senderId: String(details.senderId || details.callerId || details.sender_id || ''),
    callerId: String(details.callerId || details.senderId || details.sender_id || ''),
    profileImage: (() => {
      try {
        const { resolveProfileImageUrl } = require('./Src/Utils/callAcceptFlow');
        return resolveProfileImageUrl(
          details.profileImage,
          details.profileImageUrl,
          details.profile_image,
          details.profileImageurl,
        );
      } catch (_) {
        const v =
          details.profileImage ||
          details.profileImageUrl ||
          details.profile_image ||
          details.profileImageurl ||
          '';
        if (typeof v === 'string') return v === '[object Object]' ? '' : v;
        return v?.url || '';
      }
    })(),
    profileImageUrl: (() => {
      try {
        const { resolveProfileImageUrl } = require('./Src/Utils/callAcceptFlow');
        return resolveProfileImageUrl(
          details.profileImageUrl,
          details.profileImage,
          details.profile_image,
          details.profileImageurl,
        );
      } catch (_) {
        const v =
          details.profileImageUrl ||
          details.profileImage ||
          details.profile_image ||
          details.profileImageurl ||
          '';
        if (typeof v === 'string') return v === '[object Object]' ? '' : v;
        return v?.url || '';
      }
    })(),
  };
}

/**
 * Incoming call shade for BG / kill / handoff.
 *
 * Android:
 *   force=true → always post CallStyle (BG/kill Accept + Reject).
 *   Without force, skip when app is active (IncomingCall screen handles FG).
 * iOS: Notifee / CallKit category.
 */
export async function showIncomingCallNotification(callDetails, options = {}) {
  const details = normalizeIncomingCallDetails(callDetails);
  if (!details?.roomId) {
    console.warn(
      '[showIncomingCallNotification] missing roomId — skip',
      typeof callDetails,
      callDetails && Object.keys(callDetails),
    );
    return false;
  }

  // Without force: skip when app is active (FG uses IncomingCall screen).
  // force=true (BG/kill/handoff) must always post CallStyle.
  if (!options.force && AppState.currentState === 'active') {
    console.log(
      '📱 [showIncomingCallNotification] skip — foreground (IncomingCall screen handles it)',
      details.roomId,
    );
    return false;
  }

  try {
    const {
      clearEndedCallStampForIncoming,
      prepareIncomingCall,
    } = require('./Src/Utils/callAcceptFlow');
    clearEndedCallStampForIncoming(details);
    prepareIncomingCall(details);
  } catch (_) {}

  try {
    await ensureNotificationPermission();

    // ─── Android: CallStyle ONLY (circular Decline + Answer). Never Notifee. ───
    if (Platform.OS === 'android') {
      // Kill leftover text Reject/Accept Notifee shade (wrong UI).
      try {
        await notifee.cancelNotification('incoming_call_' + details.roomId);
      } catch (_) {}

      try {
        const {
          displayAndroidCallStyleNotification,
        } = require('./Src/Services/IncomingCallStyle');
        const shown = await displayAndroidCallStyleNotification(details, {
          force: true,
          playRingtone: options.playRingtone !== false,
        });
        if (shown) {
          try {
            await notifee.cancelNotification('incoming_call_' + details.roomId);
          } catch (_) {}
          console.log(
            '✅ [showIncomingCallNotification] CallStyle only',
            details.roomId,
            details.callType,
          );
          return true;
        }
        const retry = await displayAndroidCallStyleNotification(details, {
          force: true,
          playRingtone: options.playRingtone !== false,
        });
        console.log(
          '📱 [showIncomingCallNotification] CallStyle retry=',
          retry,
          details.roomId,
        );
        return !!retry;
      } catch (e) {
        console.warn(
          '📱 [showIncomingCallNotification] CallStyle error (no Notifee fallback):',
          e?.message || e,
        );
        return false;
      }
    }

    // ─── iOS: Notifee / CallKit category ───
    await ensureIncomingCallNotificationCategory();
    return await displayNotifeeIncomingCallFallback(details, { withSound: true });
  } catch (error) {
    console.log('❌ Error displaying incoming call notification:', error?.message || error);
    if (Platform.OS === 'android') {
      // Android: never show Notifee text Reject/Accept as fallback.
      return false;
    }
    try {
      return await displayNotifeeIncomingCallFallback(
        normalizeIncomingCallDetails(callDetails),
        { minimal: true },
      );
    } catch (e2) {
      console.log('❌ Fallback notification also failed:', e2?.message || e2);
      return false;
    }
  }
}

/** Notifee Accept/Reject — iOS primary, Android fallback only. */
async function displayNotifeeIncomingCallFallback(details, opts = {}) {
  if (!details?.roomId) return false;

  const channelId = await notifee.createChannel({
    id: opts.minimal
      ? 'fahdu_incoming_calls_actions_v1'
      : 'fahdu_incoming_calls_actions_v3_silent_novib',
    name: 'Incoming Call Actions',
    importance: AndroidImportance.HIGH,
    sound: undefined,
    vibration: false,
  });

  const callerName = details.displayName || 'Incoming Call';
  const callTypeLabel = details.callType === 'video' ? 'video' : 'voice';
  const notifId = 'incoming_call_' + details.roomId;
  const withSound = opts.withSound === true;

  await notifee.displayNotification({
    id: notifId,
    title: callerName,
    body: opts.minimal ? 'Incoming call' : `Incoming ${callTypeLabel} call`,
    data: {
      roomId: details.roomId,
      callType: details.callType,
      senderId: details.senderId,
      callerId: details.callerId,
      displayName: callerName,
      callerName: callerName,
      name: callerName,
      profileImage: details.profileImage,
      profileImageUrl: details.profileImageUrl,
      callId: details.callId,
      type: 'incoming_call',
    },
    ios: {
      categoryId: INCOMING_CALL_CATEGORY_ID,
      sound: withSound ? 'default' : 'default',
      interruptionLevel: 'timeSensitive',
      foregroundPresentationOptions: {
        badge: true,
        sound: true,
        banner: true,
        list: true,
      },
    },
    android: {
      channelId,
      smallIcon: 'icon_notification',
      importance: AndroidImportance.HIGH,
      // Not CALL — avoids OEM full-screen redelivery on unlock.
      category: AndroidCategory.STATUS,
      ongoing: true,
      autoCancel: false,
      lightUpScreen: false,
      vibrationPattern: undefined,
      color: '#10B981',
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
      actions: [
        { title: 'Reject', pressAction: { id: 'decline_call' } },
        {
          title: 'Accept',
          pressAction: { id: 'accept_call', launchActivity: 'default' },
        },
      ],
    },
  });

  console.log(
    '✅ Accept/Reject Notifee shown',
    details.roomId,
    opts.minimal ? '(minimal)' : '',
  );

  if (Platform.OS === 'ios') {
    try {
      const RingtoneManager = require('./Src/Components/Calling/RingtoneManager').default;
      RingtoneManager.playIncoming().catch(() => {});
    } catch (_) {}
  }

  return true;
}

/**
 * Dismiss incoming-call shade.
 * @param {string} roomId
 * @param {{ stopRingtone?: boolean }} [options]
 *   stopRingtone defaults true (Accept/Reject).
 *   Pass false when IncomingCall is taking over FG audio — otherwise async
 *   stopAll() races and kills the in-app ringtone that just started.
 */
export async function cancelIncomingCallNotification(roomId, options = {}) {
  const stopRingtone = options.stopRingtone !== false;
  try {
    if (stopRingtone) {
      try {
        const RingtoneManager = require('./Src/Components/Calling/RingtoneManager').default;
        RingtoneManager.stopAndSuppress(roomId);
      } catch (_) {}
    }
    await notifee.cancelNotification('incoming_call_' + roomId);
    if (Platform.OS === 'android') {
      try {
        if (stopRingtone) {
          // Accept/Reject — stop MediaPlayer + remove CallStyle.
          const { stopAndroidRingtoneAndDismiss } = require('./Src/Services/IncomingCallStyle');
          await stopAndroidRingtoneAndDismiss(roomId);
        } else {
          // FG takeover — drop shade only; RingtoneManager owns audio.
          const { dismissAndroidCallStyleShade } = require('./Src/Services/IncomingCallStyle');
          await dismissAndroidCallStyleShade(roomId);
        }
      } catch (_) {
        try {
          const { cancelAndroidCallStyleNotification } = require('./Src/Services/IncomingCallStyle');
          await cancelAndroidCallStyleNotification(roomId);
        } catch (__) {}
      }
    }
    console.log('✅ Cancelled call notification for room:', roomId, 'stopRing=', stopRingtone);
  } catch (error) {
    console.log('❌ Error cancelling call notification:', error);
  }
}

