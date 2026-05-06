// RandomAudienceHeader.js
import React from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {useDispatch} from 'react-redux';
import {FONT_SIZES, WIDTH_SIZES} from '../../../DesiginData/Utility';
import Icon from 'react-native-vector-icons/Ionicons';
import {toggleFloatingViews, toggleShowChatRoomSelector} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {resetMassMessage} from '../../../Redux/Slices/NormalSlices/MessageSlices/MassMessage';
import {setSelectedAudience} from '../../../Redux/Slices/NormalSlices/AudienceSelectedSlice';

const RandomAudienceHeader = () => {
  const dispatch = useDispatch();

  const backAction = () => {
    dispatch(toggleShowChatRoomSelector({show: false}));
    dispatch(toggleFloatingViews({show: 'showMessageFloat'}));
    dispatch(resetMassMessage());
    dispatch(setSelectedAudience({audienceNumber: 1}));
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={backAction} style={styles.backButton}>
        <Icon name="chevron-back" size={24} color="#1e1e1e" />
      </Pressable>
      <Text style={styles.title}>Random Audience</Text>
      <View style={styles.placeholder} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: WIDTH_SIZES[16],
    paddingVertical: WIDTH_SIZES[12],
    borderBottomWidth: 1,
    borderBottomColor: '#E9E9E9',
  },
  backButton: {
    padding: WIDTH_SIZES[8],
  },
  title: {
    fontFamily: 'Rubik-Medium',
    fontSize: FONT_SIZES[18],
    color: '#1e1e1e',
  },
  placeholder: {
    width: 40,
  },
});

export default RandomAudienceHeader;
