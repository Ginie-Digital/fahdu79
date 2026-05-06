import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet, Pressable, Platform, Image, Dimensions, TouchableOpacity, ScrollView, Animated} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {useDispatch, useSelector} from 'react-redux';
import {toggleBankDetailsModal, toggleChatRoomLabelEdit, toggleChatRoomModal, toggleConfirmBankDetails, toggleLabelModal, toggleShowBankDetailsModal} from '../../Redux/Slices/NormalSlices/HideShowSlice';
import {WINDOW_WIDTH} from '@gorhom/bottom-sheet';
import {FONT_SIZES, WIDTH_SIZES} from '../../DesiginData/Utility';
import CustomCheckbox from './CustomCheckbox';
import {resetLabel, setLabel, setSelectedSort, setOnlineFilter} from '../../Redux/Slices/NormalSlices/SortSelectedSlice';
import {sortByLabel} from '../../Redux/Slices/NormalSlices/RoomListSlice';
import {useLabelList} from '../Hook/useLabelList';
import Icon from 'react-native-vector-icons/FontAwesome';
import {triggerImpactLight} from '../Utils/Haptics';

const LabelModal = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const token = useSelector(state => state.auth.user.token);

  const visible = useSelector(state => state.hideShow.visibility.chatRoomSortModal);
  const lable = useSelector(state => state.sortBy.selected.label);
  const currentOnlineFilter = useSelector(state => state.sortBy.selected.onlineFilter);

  // Local state for label selection before hitting 'Done'
  const [currentLabelName, setCurrentLabelName] = useState('none');

  const [contentHeight, setContentHeight] = useState(0);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

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

  const {labelList, getAllLabelNamesHandler} = useLabelList(token);

  // Height calculations
  const buttonHeight = 64; // Footer height matching styles.resetDoneRow
  const maxModalHeight = Dimensions.get('window').height * 0.8;

  const handleContentLayout = event => {
    const {height} = event.nativeEvent.layout;
    setContentHeight(height);
  };

  const [filters, setFilters] = useState({
    followers: true,
    yellow: false,
    green: false,
    recent: true,
    old: false,
    new: false,
    online: false,
    offline: false,
  });

  /**
   * @UPDATE___STATE
   */

  const [updatesFilter, setUpdateFilter] = useState({
    old: false,
    new: false,
  });

  const [currentUpdateId, setCurrentUpdateId] = useState(1);

  const current = useSelector(state => state.sortBy.selected.sort);

  function toggleUpdatedCheckbox(key) {
    const newId = currentUpdateId === key ? 1 : key; // Toggle off if clicked again
    setCurrentUpdateId(newId);

    setUpdateFilter({
      old: newId === 2,
      new: newId === 3,
    });
  }

  useEffect(() => {
    setCurrentUpdateId(current);

    setUpdateFilter({
      old: current === 2,
      new: current === 3,
    });
  }, [current]);

  /**
   * @ONLINE_OFFLINE_STATE
   */

  const [onlineState, setOnlineState] = useState({
    online: false,
    offline: false,
  });

  const [currentStatusId, setCurrentStatusId] = useState(1);

  function toggleUpdateStatus(key) {
    const newId = currentStatusId === key ? 1 : key; // Toggle off if clicked again
    setCurrentStatusId(newId);

    console.log('🎯 Status filter changed:', newId);

    setOnlineState({
      online: newId === 2,
      offline: newId === 3,
    });
  }

  // ✅ Initialize from Redux state
  useEffect(() => {
    if (visible) {
      console.log('📱 Modal opened, current filter:', currentOnlineFilter);

      // Restore state from Redux
      setCurrentLabelName(lable);

      if (currentOnlineFilter === 'all') {
        setCurrentStatusId(1);
        setOnlineState({online: false, offline: false});
      } else if (currentOnlineFilter === 'online') {
        setCurrentStatusId(2);
        setOnlineState({online: true, offline: false});
      } else if (currentOnlineFilter === 'offline') {
        setCurrentStatusId(3);
        setOnlineState({online: false, offline: true});
      }

      getAllLabelNamesHandler();
    }
  }, [visible]);

  const handleDone = () => {
    triggerImpactLight();
    console.log('✅ Applying filters:', {
      sort: currentUpdateId,
      onlineStatus: currentStatusId,
      label: lable,
    });

    // ✅ Update sort filter
    dispatch(setSelectedSort({sortNumber: currentUpdateId}));

    // ✅ NEW: Update online filter in Redux
    let onlineFilterValue = 'all';
    if (currentStatusId === 2) {
      onlineFilterValue = 'online';
    } else if (currentStatusId === 3) {
      onlineFilterValue = 'offline';
    }

    console.log('💾 Saving online filter:', onlineFilterValue);
    dispatch(setOnlineFilter({filter: onlineFilterValue}));

    // ✅ Update label in Redux
    dispatch(setLabel({label: currentLabelName}));
    
    dispatch(sortByLabel({data: currentLabelName}));
    dispatch(toggleChatRoomModal());
  };

  const handleReset = () => {
    triggerImpactLight();
    console.log('🔄 Reset filters');

    // Trigger rotation animation
    rotateAnim.setValue(0);
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Reset to defaults
    setCurrentUpdateId(1);
    setUpdateFilter({
      old: false,
      new: false,
    });

    setCurrentStatusId(1);
    setOnlineState({
      online: false,
      offline: false,
    });

    setCurrentLabelName('none');
  };

  const handlePress = () => {
    console.log('✏️ Edit labels');

    dispatch(toggleChatRoomModal());

    setTimeout(() => {
      dispatch(toggleChatRoomLabelEdit({show: true}));
    }, 500);
  };

  return (
    visible && (
      <View style={styles.overlay}>
        <BlurView intensity={15} style={styles.blurBackground} />
        <Pressable style={styles.touchOutside} onPress={() => dispatch(toggleChatRoomModal())} />
        <Animated.View style={[styles.dialog, {transform: [{translateY: slideAnim}]}]}>
          <ScrollView bounces={false} style={{paddingTop: 16}} showsVerticalScrollIndicator={false}>
            <View onLayout={handleContentLayout}>
              <View style={[styles.section, {paddingVertical: 0, paddingBottom: WIDTH_SIZES[16], paddingTop: 0}]}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: WIDTH_SIZES[16]}}>
                  <Text style={[styles.heading, {marginBottom: 0}]}>LABELS</Text>
                  <TouchableOpacity onPress={handlePress}>
                    <Text style={styles.edit}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {labelList.map((label, index) => (
                  <View key={label.id} style={[styles.row, index === labelList.length - 1 && styles.rowLast]}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
                      <View style={[styles.icon, {backgroundColor: label.color}]} />
                      <Text style={styles.label}>{label.name}</Text>
                    </View>

                    <CustomCheckbox checked={currentLabelName === label.labelName} onToggle={() => setCurrentLabelName(currentLabelName === label.labelName ? 'none' : label.labelName)} />
                  </View>
                ))}
              </View>

              {/* States */}
              <View style={styles.section}>
                <Text style={styles.heading}>STATES</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Read</Text>
                  <CustomCheckbox checked={updatesFilter.old} onToggle={() => toggleUpdatedCheckbox(2)} />
                </View>
                <View style={styles.rowLast}>
                  <Text style={styles.label}>Unread</Text>
                  <CustomCheckbox checked={updatesFilter.new} onToggle={() => toggleUpdatedCheckbox(3)} />
                </View>
              </View>

              {/* Status */}
              <View style={[styles.section, {borderBottomWidth: 0, paddingBottom: 32}]}>
                <Text style={styles.heading}>STATUS</Text>

                <View style={styles.row}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
                    <View style={[styles.icon, {backgroundColor: '#2FD159'}]} />
                    <Text style={styles.label}>Online</Text>
                  </View>

                  <CustomCheckbox checked={onlineState.online} onToggle={() => toggleUpdateStatus(2)} />
                </View>

                <View style={styles.rowLast}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
                    <View style={[styles.icon, {backgroundColor: '#FF4539'}]} />
                    <Text style={styles.label}>Offline</Text>
                  </View>

                  <CustomCheckbox checked={onlineState.offline} onToggle={() => toggleUpdateStatus(3)} />
                </View>
              </View>
            </View>
          </ScrollView>

          <SafeAreaView edges={['bottom']} style={{backgroundColor: '#fff'}}>
            <View style={styles.resetDoneRow}>
              <Pressable onPress={handleReset} style={[styles.resetButton, {flexDirection: 'row', alignItems: 'center', gap: 8}]}>
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: rotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  }}>
                  <Icon name="refresh" size={16} color="#1e1e1e" />
                </Animated.View>
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
              <Pressable onPress={handleDone} style={styles.doneButton}>
                <Text style={styles.doneText}>Done</Text>
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
    borderBottomWidth: WIDTH_SIZES[1.5],
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
  resetDoneRow: {
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
  resetButton: {
    paddingHorizontal: 16,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetText: {
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

export default LabelModal;
