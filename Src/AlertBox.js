import React, {useEffect} from 'react';
import {View, Text, StyleSheet, Dimensions, Platform} from 'react-native';
import {BlurView} from 'expo-blur';
import Icon from 'react-native-vector-icons/Ionicons';
import {WIDTH_SIZES} from '../DesiginData/Utility';
import {useDispatch, useSelector} from 'react-redux';
import {hideAlertModal} from '../Redux/Slices/NormalSlices/HideShowSlice';

const {width} = Dimensions.get('window');

const AlertBox = () => {
  const {message, show, type} = useSelector(state => state.hideShow.visibility.alertModal);

  const dispatch = useDispatch();

  useEffect(() => {
    let timer;

    if (show) {
      timer = setTimeout(() => {
        dispatch(hideAlertModal());
      }, 3000);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [show]);

  if (!show) return null;

  return (
    <View style={styles.absoluteContainer} pointerEvents="box-none">
      {/* Blur behind entire alert - non-interactive */}
      <View pointerEvents="none">
        <BlurView intensity={20} style={styles.blurContainer} />
      </View>

      {/* White box with border on top - non-interactive */}
      <View style={styles.boxContainer} pointerEvents="none">
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: type ? '#A4FFB8' : '#FF8080',
              borderColor: '#1e1e1e',
            },
          ]}>
          <Icon name={type ? 'checkmark' : 'close'} size={20} color={'#1e1e1e'} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{type === true ? 'Success' : 'Error'}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  blurContainer: {
    // ...StyleSheet.absoluteFillObject,
    // borderRadius: 23,
    height: 150,
  },
  boxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff', // solid white box
    borderWidth: 2,
    borderColor: '#1e1e1e',
    borderRadius: 23,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignSelf: 'center',
    position: 'absolute',
    // top : 105,
    marginHorizontal: 10,
    marginTop: 65,
    // flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: WIDTH_SIZES['1.5'],
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    marginBottom: 2,
    color: '#1e1e1e',
  },
  message: {
    fontSize: 12,
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
  },
});

export default AlertBox;
