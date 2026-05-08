import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import {responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {FONT_SIZES} from '../../../DesiginData/Utility';

const StreamEndedUserModal = ({visible, onPress, title = 'Livestream has ended...'}) => {


  return (
    <Dialog
      visible={visible}
      dialogStyle={styles.dialog}
      contentStyle={{paddingVertical: 32, paddingHorizontal: 32}}
      onTouchOutside={onPress}
      onRequestClose={onPress}
    >
      <View style={styles.content}>
        <Text style={styles.text}>{title}</Text>

        <TouchableOpacity
          style={styles.okButton}
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
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    backgroundColor: '#fff',
    width: responsiveWidth(90),
    borderColor: '#1e1e1e',
    padding: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[16],
    textAlign: 'center',
    color: '#1e1e1e',
    width: responsiveWidth(75),
    marginTop: responsiveWidth(2.2),
  },
  okButton: {
    width: '100%',
    height: responsiveHeight(6.65),
    borderRadius: responsiveWidth(3.73),
    backgroundColor: 'rgba(255, 168, 107, 1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e1e1e',
    marginTop: responsiveWidth(7),
  },
  okButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[16],
    color: '#1e1e1e',
  },
});

export default React.memo(StreamEndedUserModal);

