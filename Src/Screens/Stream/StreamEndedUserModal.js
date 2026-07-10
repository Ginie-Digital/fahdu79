import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import {responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {FONT_SIZES} from '../../../DesiginData/Utility';
import {useAppTheme} from '../../Hook/useAppTheme';

const StreamEndedUserModal = ({visible, onPress, title = 'Livestream has ended...'}) => {
  const {isDark} = useAppTheme();

  return (
    <Dialog
      visible={visible}
      dialogStyle={[
        styles.dialog,
        {
          backgroundColor: isDark ? '#121212' : '#fff',
          borderColor: isDark ? '#000000' : '#1e1e1e',
          borderWidth: isDark ? 1.5 : 2,
          shadowColor: isDark ? '#585858' : '#000000',
          shadowOffset: {width: 0, height: 0},
          shadowOpacity: isDark ? 0.8 : 0.1,
          shadowRadius: isDark ? 24 : 10,
          elevation: isDark ? 24 : 5,
        },
      ]}
      contentStyle={{paddingVertical: 32, paddingHorizontal: 32}}
      onTouchOutside={onPress}
      onRequestClose={onPress}
    >
      <View style={styles.content}>
        <Text style={[styles.text, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>
          {title}
        </Text>

        <TouchableOpacity
          style={[
            styles.okButton,
            {
              borderColor: isDark ? '#FF7819' : '#1e1e1e',
              borderWidth: isDark ? 1.5 : 2,
            },
          ]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Text style={styles.okButtonText}>Ok</Text>
        </TouchableOpacity>
      </View>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: responsiveWidth(5),
    borderStyle: 'dashed',
    alignSelf: 'center',
    width: responsiveWidth(90),
    padding: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[20] || FONT_SIZES[16],
    textAlign: 'center',
    width: responsiveWidth(75),
    marginTop: responsiveWidth(2.2),
  },
  okButton: {
    width: '100%',
    height: responsiveHeight(6.65),
    borderRadius: responsiveWidth(3.73),
    backgroundColor: '#FFA86B',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveWidth(7),
  },
  okButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[14],
    color: '#1E1E1E',
  },
});

export default React.memo(StreamEndedUserModal);

