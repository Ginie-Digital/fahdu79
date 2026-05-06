import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import {BlurView} from 'expo-blur';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import Feather from 'react-native-vector-icons/Feather';
import AnimatedButton from '../../Components/AnimatedButton';
import {toggleEmailVerificationModal, toggleTimeRequestModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useDispatch, useSelector} from 'react-redux';
import {FONT_SIZES, nTwins, toCapitalized, WIDTH_SIZES} from '../../../DesiginData/Utility';
import DatePicker from 'react-native-date-picker';
import dayjs from 'dayjs';
import {useCallRequestMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {chatRoomSuccess, ChatWindowError} from '../ErrorSnacks';

const TimeRequestModal = ({roomId}) => {
  const dispatch = useDispatch();

  // Initialize with current date/time
  const [date, setDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [formattedDate, setFormattedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const token = useSelector(state => state.auth.user.token);
  const {
    callPriceModal: {type},
    timeRequestModal: visible,
  } = useSelector(state => state.hideShow.visibility);
  const [callRequest] = useCallRequestMutation();

  console.log(type, ':::::');

  const handleClose = () => {
    dispatch(toggleTimeRequestModal({show: false, priceModal: false}));
  };

  const handleCallRequest = async () => {
    setLoading(true);

    console.log(type);

    const {data, error} = await callRequest({token, data: {roomId, type: toCapitalized(type), availability: date}});

    console.log(data, error);
    if (data?.data === true) {
      chatRoomSuccess('Call request sent!');
    }

    if (error) {
      ChatWindowError(error?.data?.message);
    }
    setFormattedDate('');
    setLoading(false);
    handleClose();
  };

  return (
    visible && (
      <View style={styles.overlay}>
        <BlurView intensity={15} style={styles.blurBackground} />
        <Dialog visible={visible} dialogStyle={styles.dialog} contentStyle={{padding: 0, paddingTop: 0}} onTouchOutside={() => dispatch(toggleEmailVerificationModal({show: false}))}>
          <View style={styles.content}>
            <Text style={styles.title}>Call Back Availability Date & Time</Text>

            {/* Date Time Picker Field */}
            <TouchableOpacity
              style={styles.dateTimeInput}
              onPress={() => {
                // Reset to current time if no date has been selected yet
                if (!formattedDate) {
                  setDate(new Date());
                }
                setOpen(true);
              }}>
              <Text style={[styles.placeholderText, formattedDate && {color: '#1e1e1e'}]}>{formattedDate ? dayjs(date).format('DD MMM YYYY, hh:mm A') : 'Select date & time'}</Text>
              <Feather name="calendar" size={20} color="#000" />
            </TouchableOpacity>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <View style={{width: '48%'}}>
                <AnimatedButton title={'Save'} buttonMargin={0} showOverlay={false} style={[styles.button, styles.saveButton]} loading={loading} onPress={handleCallRequest} />
              </View>
              <View style={{width: '48%'}}>
                <AnimatedButton title={'Cancel'} buttonMargin={0} showOverlay={false} style={[styles.button, styles.cancelButton]} onPress={handleClose} />
              </View>
            </View>
          </View>
        </Dialog>
        <DatePicker
          modal
          open={open}
          date={date}
          mode="datetime"
          minimumDate={new Date()} // Prevents selecting past dates
          onConfirm={selectedDate => {
            setOpen(false);
            setDate(selectedDate);
            setFormattedDate(selectedDate.toISOString());
            console.log('ISO Date:', selectedDate.toISOString());
          }}
          onCancel={() => {
            setOpen(false);
          }}
        />
      </View>
    )
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    borderRadius: responsiveWidth(5.33),
    alignSelf: 'center',
    backgroundColor: '#fff',
    width: nTwins(88, 92),
    padding: 32,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsiveHeight(3),
  },
  title: {
    fontFamily: 'Rubik-Bold',
    fontSize: FONT_SIZES['16'],
    color: '#1e1e1e',
    textAlign: 'center',
  },
  dateTimeInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: '#1e1e1e',
    borderWidth: WIDTH_SIZES['1.5'],
    borderRadius: WIDTH_SIZES['14'],
    paddingVertical: 16,
    paddingHorizontal: 15,
    width: '100%',
  },
  placeholderText: {
    color: '#aaa',
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.8),
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    height: responsiveHeight(5.91),
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#FFB377',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
});

export default TimeRequestModal;
