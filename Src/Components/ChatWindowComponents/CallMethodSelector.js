//todo:This modal will popup when user click on clip in chatWindow Text Input

import {StyleSheet, View, TouchableOpacity, FlatList, Pressable} from 'react-native';
import React from 'react';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import {useSelector, useDispatch} from 'react-redux';
import {toggleCallMethodSelector, toggleCallPriceModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {callMethodSelectorList} from '../../../DesiginData/Data';
import {WIDTH_SIZES} from '../../../DesiginData/Utility';
import {Image} from 'expo-image';

const CallMethodSelector = () => {
  const modalVisibility = useSelector(state => state.hideShow.visibility.callMethodSelector);

  const dispatcher = useDispatch();

  const handleClipSelectedMedia = ({id}) => {
    if (id === 1) {
      console.log('Video call');
      dispatcher(toggleCallMethodSelector({show: false}));
      setTimeout(() => {
        dispatcher(toggleCallPriceModal({show: true, type: 'video', callSelectors: false}));
      }, 200);
    }

    if (id === 2) {
      console.log('Audio call');
      dispatcher(toggleCallMethodSelector({show: false}));
      setTimeout(() => {
        dispatcher(toggleCallPriceModal({show: true, type: 'audio', callSelectors: false}));
      }, 200);
    }
  };

  const handleBackdropPress = () => {
    dispatcher(toggleCallMethodSelector({show: false}));
  };

  if (!modalVisibility) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={handleBackdropPress} />
      
      {/* Popup positioned above the call icon */}
      <View style={styles.popupContainer}>
        <FlatList
          data={callMethodSelectorList}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          renderItem={({item}) => (
            <TouchableOpacity onPress={handleClipSelectedMedia.bind(null, {id: item.id})}>
              <View style={styles.eachSortModalList}>
                <View style={styles.verifyContainer}>
                  <Image cachePolicy="memory-disk" source={item.url} contentFit="contain" style={{flex: 1}} />
                </View>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id.toString()}
        />
      </View>
    </>
  );
};

export default CallMethodSelector;

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 998,
  },
  popupContainer: {
    position: 'absolute',
    bottom: responsiveWidth(14),
    right: responsiveWidth(4),
    backgroundColor: '#FFF9F5',
    borderRadius: 14,
    paddingHorizontal: responsiveWidth(2),
    paddingVertical: responsiveWidth(1),
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 999,
  },
  eachSortModalList: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsiveWidth(1.5),
  },
  verifyContainer: {
    height: WIDTH_SIZES[24] + WIDTH_SIZES[2],
    width: WIDTH_SIZES[24] + WIDTH_SIZES[2],
  },
});
