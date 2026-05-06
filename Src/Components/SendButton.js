import React from 'react';
import {TouchableOpacity, Text, View, Animated} from 'react-native';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import Icon from 'react-native-vector-icons/Feather'; // Using Feather for the outlined paper plane look
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

const SendButton = ({handleOnclick, disableSendButton, userRole, secondUserRole}) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (disableSendButton) {
      spinValue.setValue(0);
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [disableSendButton]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const onSendPress = () => {
    ReactNativeHapticFeedback.trigger("rigid", hapticOptions);
    handleOnclick();
  };

  return (
    <TouchableOpacity
      onPress={onSendPress}
      disabled={disableSendButton}
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          width: 40,
          height: 40,
          backgroundColor: '#FFA86B',
          borderWidth: 1.36,
          borderColor: '#1E1E1E',
          borderRadius: 20,
        },
        userRole === 'creator' && secondUserRole !== 'creator' ? {marginLeft: responsiveWidth(5)} : null,
      ]}>
      {disableSendButton ? (
        <Animated.View style={{transform: [{rotate: spin}]}}>
          <Icon name="refresh-cw" size={18} color="#1E1E1E" />
        </Animated.View>
      ) : (
        <Icon name="send" size={18} color="#1E1E1E" style={{ marginLeft: -2, marginTop: 2 }} />
      )}
    </TouchableOpacity>
  );
};

export default SendButton;
