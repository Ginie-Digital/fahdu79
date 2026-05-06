import {StyleSheet, Text, View, TouchableOpacity, FlatList, Pressable} from 'react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {useSelector, useDispatch} from 'react-redux';
import Modal from 'react-native-modal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {chatRoomSortList} from '../../DesiginData/Data';
import {toggleChatRoomModal, toggleConfirmBankDetails, toggleLabelModal} from '../../Redux/Slices/NormalSlices/HideShowSlice';
import {setSelectedSort} from '../../Redux/Slices/NormalSlices/SortSelectedSlice';
import {chatRoomSortMap, FONT_SIZES, WIDTH_SIZES} from '../../DesiginData/Utility';
import {useAssignLabelMutation, useLazyGetAllLabelNameQuery} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {updateLabel} from '../../Redux/Slices/NormalSlices/RoomListSlice';
import {useLabelList} from '../Hook/useLabelList';

const ChatWindowLabelModal = ({roomId, label}) => {
  const dispatcher = useDispatch();

  const [current, setCurrent] = useState('Purple');

  const [isDropdownVisible, setDropdownVisible] = useState(false);

  const visible = useSelector(state => state.hideShow.visibility.labelModal);

  const [getAllLabelNames] = useLazyGetAllLabelNameQuery();

  const hasMounted = useRef(false);

  const token = useSelector(state => state.auth.user.token);

  const [assignLabel] = useAssignLabelMutation();

  //Hook for calling and applying lable list
  const {labelList, getAllLabelNamesHandler} = useLabelList(token);

  // const [labelList, setLabelList] = useState([
  //   {
  //     id: 1,
  //     name: 'Purple',
  //     color: '#BBBBFE',
  //     iconName: 'back-in-time',
  //     labelName: 'LABEL1',
  //   },
  //   {
  //     id: 2,
  //     name: 'Yellow',
  //     color: '#FBF7A6',
  //     iconName: 'arrow-down',
  //     labelName: 'LABEL2',
  //   },
  //   {
  //     id: 3,
  //     name: 'Green',
  //     iconName: 'mail-unread-outline',
  //     color: '#98FF98',
  //     labelName: 'LABEL3',
  //   },
  // ]);

  useEffect(() => {
    getAllLabelNamesHandler();
  }, []);

  const handleRoomListSort = async id => {
    console.log('🟣 handleRoomListSort called with id:', id);

    const selected = labelList[Number(id) - 1]?.labelName;
    console.log('🔵 Selected label:', selected);

    if (!selected) {
      console.log('❌ No label found for this id!');
      return;
    }

    // Update local state
    setCurrent(selected);
    console.log('🟠 setCurrent called → current =', selected);

    // API CALL inside try–catch
    try {
      console.log('📤 Sending assignLabel API request...');

      const {data, error} = await assignLabel({
        token,
        data: {
          label: selected,
          roomId: roomId,
        },
      });

      if (error) {
        console.log('❌ assignLabel returned error:', error);
      } else {
        console.log('📥 assignLabel success:', data);
      }
    } catch (err) {
      console.log('🔥 Exception during assignLabel API call:', err);
    }

    // Redux update
    console.log('🟢 Dispatching updateLabel...');
    dispatcher(
      updateLabel({
        data: {
          roomId,
          current: selected,
        },
      }),
    );

    // Close modal
    console.log('🔚 Closing modal...');
    dispatcher(toggleLabelModal({show: false}));

    console.log('✅ handleRoomListSort completed.\n\n');
  };

  // const getAllLabelNamesHandler = async () => {
  //   const {data, error} = await getAllLabelNames({token});

  //   console.log(data);

  //   if (data?.data) {
  //     const updatedList = labelList.map(label => {
  //       const updatedName = data.data?.[label.labelName]?.name;
  //       return {
  //         ...label,
  //         name: updatedName || label.name, // fallback to original if not found
  //       };
  //     });

  //     setLabelList(updatedList);
  //   }

  //   if (error) {
  //     console.log(error, 'PPP error');
  //   }
  // };

  // useEffect(() => {
  //   if (visible) getAllLabelNamesHandler();
  // }, [visible]);

  useEffect(() => {
    setCurrent(label);
  }, []);

  return (
    visible && (
      <Modal
        animationIn="fadeInDown"
        animationOut="fadeOutUp"
        animationInTiming={150}
        animationOutTiming={150}
        transparent
        backdropColor="#ffffff"
        isVisible={visible} // make sure you control this from parent if needed
        onBackdropPress={() => dispatcher(toggleLabelModal({show: false}))}
        onBackButtonPress={() => dispatcher(toggleLabelModal({show: false}))}
        style={styles.modalStyle}
        useNativeDriver>
        <View style={styles.modalInnerWrapper}>
          {/* Label Header inside Modal */}

          <Pressable
            onPress={() => setDropdownVisible(prev => !prev)}
            style={({pressed}) => [
              styles.dropdownHeader,
              !isDropdownVisible && {borderBottomWidth: 0},
              pressed && {backgroundColor: '#FFF3EB'}, // change bg color on press
            ]}>
            <Text style={styles.heading}>Labels</Text>
            <Ionicons name={isDropdownVisible ? 'chevron-up' : 'chevron-down'} size={16} color="#1e1e1e" />
          </Pressable>
          {/* Dropdown List - only visible when toggled */}
          {isDropdownVisible && (
            <FlatList
              data={labelList}
              keyExtractor={item => item.id.toString()}
              ItemSeparatorComponent={() => <View style={{backgroundColor: '#e9e9e9', height: WIDTH_SIZES[1.5]}} />}
              renderItem={({item}) => {
                const isSelected = current === item.labelName;

                return (
                  <TouchableOpacity onPress={() => handleRoomListSort(item.id)}>
                    <View style={styles.eachSortModalList}>
                      <View style={styles.radioWrapper}>
                        <View style={[styles.radioOuter, {borderColor: '#1e1e1e'}]}>{isSelected && <View style={[styles.radioInner, {backgroundColor: item.color}]} />}</View>
                      </View>
                      <Text style={styles.label}>{item.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>
    )
  );
};

export default ChatWindowLabelModal;

const styles = StyleSheet.create({
  modalStyle: {
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'flex-start',
    margin: 0,
  },
  modalInnerWrapper: {
    width: responsiveWidth(40),
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
    marginRight: '6.5%',
    marginTop: '14%',
    borderRadius: WIDTH_SIZES[14],

    paddingBottom: 10,

    // Darker, heavier iOS shadow
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4, // Increased blackness
    shadowRadius: 12,

    // Darker Android shadow
    elevation: 16,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: responsiveHeight(1),
    borderBottomWidth: WIDTH_SIZES[1.5],
    borderBottomColor: '#E9E9E9',
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: FONT_SIZES[16],
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  eachSortModalList: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsiveHeight(1.2),
    gap: responsiveWidth(3),
    paddingHorizontal: 24,
  },
  radioWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuter: {
    height: WIDTH_SIZES[16],
    width: WIDTH_SIZES[16],
    borderRadius: WIDTH_SIZES[16] / 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  radioInner: {
    height: WIDTH_SIZES[16],
    width: WIDTH_SIZES[16],
    borderRadius: WIDTH_SIZES[8] / 2,
  },
  label: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: FONT_SIZES[16],
  },
});
