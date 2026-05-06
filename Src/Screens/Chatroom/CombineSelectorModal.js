import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet, Pressable, Platform, Image, Dimensions, ScrollView, Animated} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
// Dialog replaced with custom overlay to avoid SafeAreaView push issue
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {useDispatch, useSelector} from 'react-redux';
import {WINDOW_WIDTH} from '@gorhom/bottom-sheet';
import {toggleChatRoomLabelEdit, toggleCombineSelectorModal, toggleFloatingViews, toggleShowChatRoomSelector} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {sortByLabel} from '../../../Redux/Slices/NormalSlices/RoomListSlice';
import {setLabel, setSelectedSort} from '../../../Redux/Slices/NormalSlices/SortSelectedSlice';
import CustomCheckbox from '../../Components/CustomCheckbox';
import {FONT_SIZES, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {useLazyGetAllLabelNameQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {resetMassMessage, setAudienceType, setMassMessageLabel, setMassMessageTargetOnlinleOffline} from '../../../Redux/Slices/NormalSlices/MessageSlices/MassMessage';
import {navigate} from '../../../Navigation/RootNavigation';
import {useLabelList} from '../../Hook/useLabelList';
import {setSelectedAudience} from '../../../Redux/Slices/NormalSlices/AudienceSelectedSlice';
import Icon from 'react-native-vector-icons/FontAwesome';
import {triggerImpactLight} from '../../Utils/Haptics';

const CombineSelectorModal = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const token = useSelector(state => state.auth.user.token);

  const visible = useSelector(state => state.hideShow.visibility.combineSelectorModal);
  const lable = useSelector(state => state.massMessage.data.target.label);
  const status = useSelector(state => state.massMessage.data.status);
  const audienceType = useSelector(state => state.massMessage.data.audienceType);

  const [contentHeight, setContentHeight] = useState(0);

  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(600);
    }
  }, [visible]);

  console.log('audiencetype', audienceType);

  const {labelList, getAllLabelNamesHandler} = useLabelList(token);

  const [getAllLabelNames] = useLazyGetAllLabelNameQuery();

  // Height calculations
  const buttonHeight = 64; // Footer height matching styles.cancelDoneRow
  const padding = 0;
  const minModalHeight = 0;
  const maxModalHeight = Dimensions.get('window').height * 0.85;

  const handleContentLayout = event => {
    const {height} = event.nativeEvent.layout;
    setContentHeight(height);
  };

  const calculateModalHeight = () => {
    const totalHeight = contentHeight + buttonHeight;
    return Math.min(totalHeight > 0 ? totalHeight : minModalHeight, maxModalHeight);
  };

  const handlePress = () => {
    console.log('hello');

    dispatch(toggleCombineSelectorModal({show: false}));

    setTimeout(() => {
      dispatch(toggleChatRoomLabelEdit({show: true}));
    }, 500);
  };

  const handleRandomSelection = () => {
    triggerImpactLight();
    dispatch(toggleShowChatRoomSelector({show: true}));

    // setTimeout(() => {
    handleCloseModal(false);

    setTimeout(() => {
      dispatch(toggleFloatingViews({show: 'showSelected'}));

      // if (audienceType.subscribers) {
      //   dispatch(setSelectedAudience({audienceNumber: 2}));
      // }
    }, 500);
  };

  const handleSelection = () => {
    triggerImpactLight();
    // dispatch(toggleShowChatRoomSelector({show : true}))

    // dispatch(toggleCombineSelectorModal({show: false}));
    handleCloseModal(false);

    setTimeout(() => {
      // dispatch(toggleFloatingViews({show : "showSelected"}))

      navigate('massMessageMedia');
    }, 500);
  };

  useEffect(() => {
    if (visible) {
      console.log('VISIBLE', visible);
      getAllLabelNamesHandler();
    }
  }, [visible]);

  function handleCloseModal(shouldResetMassmessage) {
    if (shouldResetMassmessage === true) {
      dispatch(resetMassMessage());
    }
    dispatch(toggleCombineSelectorModal({show: false}));
  }

  return (
    visible && (
      <View style={styles.overlay}>
        <BlurView intensity={15} style={styles.blurBackground} />
        <Pressable style={styles.touchOutside} onPress={() => handleCloseModal(true)} />
        <Animated.View style={[styles.dialog, {transform: [{translateY: slideAnim}]}]}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <View onLayout={handleContentLayout}>
              {/* Audience Type Section */}
              <View style={[styles.section, {paddingVertical: WIDTH_SIZES[16], borderBottomWidth: WIDTH_SIZES[1.5], borderBottomColor: '#E9E9E9'}]}>
                <Text style={styles.heading}>AUDIENCE</Text>

                <View style={styles.row}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
                    <Text style={styles.label}>All</Text>
                  </View>
                  <CustomCheckbox checked={audienceType.all} onToggle={() => dispatch(setAudienceType({audienceType: 'all'}))} />
                </View>

                <View style={styles.row}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
                    <Text style={styles.label}>Followers</Text>
                  </View>
                  <CustomCheckbox checked={audienceType.followers} onToggle={() => dispatch(setAudienceType({audienceType: 'followers'}))} />
                </View>

                <View style={styles.rowLast}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
                    <Text style={styles.label}>Subscribers</Text>
                  </View>
                  <CustomCheckbox checked={audienceType.subscribers} onToggle={() => dispatch(setAudienceType({audienceType: 'subscribers'}))} />
                </View>
              </View>

              {/* Labels Section */}
              <View style={[styles.section, {paddingVertical: WIDTH_SIZES[16], borderBottomWidth: WIDTH_SIZES[1.5], borderBottomColor: '#E9E9E9'}]}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: WIDTH_SIZES[16]}}>
                  <Text style={[styles.heading, {marginBottom: 0}]}>LABELS</Text>
                </View>

                <View style={styles.row}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
                    <View style={[styles.icon, {backgroundColor: '#BBBBFE'}]} />
                    <Text style={styles.label}>{labelList[0]?.name}</Text>
                  </View>
                  <CustomCheckbox checked={lable.includes(labelList[0]?.labelName)} onToggle={() => dispatch(setMassMessageLabel({label: labelList[0]?.labelName}))} />
                </View>
                <View style={styles.row}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
                    <View style={[styles.icon, {backgroundColor: '#FBF7A6'}]} />
                    <Text style={styles.label}>{labelList[1]?.name}</Text>
                  </View>
                  <CustomCheckbox checked={lable.includes(labelList[1]?.labelName)} onToggle={() => dispatch(setMassMessageLabel({label: labelList[1]?.labelName}))} />
                </View>
                <View style={styles.rowLast}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
                    <View style={[styles.icon, {backgroundColor: '#98FF98'}]} />
                    <Text style={styles.label}>{labelList[2]?.name}</Text>
                  </View>
                  <CustomCheckbox checked={lable.includes(labelList[2]?.labelName)} onToggle={() => dispatch(setMassMessageLabel({label: labelList[2]?.labelName}))} />
                </View>
              </View>

              {/* Status Section */}
              <View style={[styles.section, {borderBottomWidth: 0}]}>
                <Text style={styles.heading}>STATUS</Text>

                <View style={styles.row}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
                    <View style={[styles.icon, {backgroundColor: '#2FD159'}]} />
                    <Text style={styles.label}>Online</Text>
                  </View>
                  <CustomCheckbox
                    checked={status.online}
                    onToggle={() =>
                      dispatch(
                        setMassMessageTargetOnlinleOffline({
                          status: {
                            online: !status.online,
                            offline: status.offline,
                          },
                        }),
                      )
                    }
                  />
                </View>

                <View style={styles.rowLast}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
                    <View style={[styles.icon, {backgroundColor: '#FF4539'}]} />
                    <Text style={styles.label}>Offline</Text>
                  </View>
                  <CustomCheckbox
                    checked={status.offline}
                    onToggle={() =>
                      dispatch(
                        setMassMessageTargetOnlinleOffline({
                          status: {
                            online: status.online,
                            offline: !status.offline,
                          },
                        }),
                      )
                    }
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <SafeAreaView edges={['bottom']} style={{backgroundColor: '#fff'}}>
            <View style={styles.cancelDoneRow}>
              <Pressable onPress={handleRandomSelection} style={[styles.cancelDoneButton, {flexDirection: 'row', alignItems: 'center', gap: 8}]}>
                <Icon name="random" size={16} color="#1e1e1e" />
                <Text style={styles.cancelText}>Random Audience</Text>
              </Pressable>
              <Pressable onPress={handleSelection} style={styles.doneButton}>
                <Text style={styles.doneText}>Apply</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    )
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderTopLeftRadius: responsiveWidth(5.33),
    borderTopRightRadius: responsiveWidth(5.33),
    backgroundColor: '#fff',
    width: WINDOW_WIDTH,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    maxHeight: Dimensions.get('window').height * 0.8,
  },
  touchOutside: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 999,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },

  //new
  section: {
    // borderBottomWidth: WIDTH_SIZES[1.5],
    paddingHorizontal: WIDTH_SIZES[32],
    borderBottomColor: '#E9E9E9',
    paddingVertical: WIDTH_SIZES[16],
  },
  heading: {
    fontFamily: 'Rubik-Medium',
    color: '#D9D9D9',
    marginBottom: WIDTH_SIZES[16],
    fontSize: FONT_SIZES[14],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 17,
  },
  rowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: FONT_SIZES[14],
  },
  edit: {
    fontFamily: 'Rubik-Regular',
    color: '#1E1E1E',
    textDecorationLine: 'underline',
    fontSize: FONT_SIZES[12],
  },
  icon: {
    height: WIDTH_SIZES[14],
    width: WIDTH_SIZES[14],
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
    borderRadius: responsiveWidth(30),
  },
  cancelDoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: WIDTH_SIZES[16],
    height: 64,
    backgroundColor: '#fff',
  },
  doneButton: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    borderRadius: 66,
    paddingHorizontal: 16,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 52,
  },
  cancelText: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: FONT_SIZES[16],
  },
  doneText: {
    fontFamily: 'Rubik-SemiBold',
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default CombineSelectorModal;
