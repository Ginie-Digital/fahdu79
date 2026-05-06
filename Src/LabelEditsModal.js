import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import {useDispatch, useSelector} from 'react-redux';
import {BlurView} from 'expo-blur';
import {TextInput} from 'react-native-gesture-handler';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {FONT_SIZES, nTwins, WIDTH_SIZES} from '../DesiginData/Utility';
import {toggleChatRoomLabelEdit} from '../Redux/Slices/NormalSlices/HideShowSlice';
import AnimatedButton from './Components/AnimatedButton';
import {useLazyGetAllLabelNameQuery, useUpdateLabelTitleMutation} from '../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {chatRoomSuccess} from './Components/ErrorSnacks';

const LabelEditsModal = () => {
  const dispatch = useDispatch();
  const [dialogHeight, setDialogHeight] = useState(0);
  const visible = useSelector(state => state.hideShow.visibility.chatRoomLabelEdit);

  const [editingIndex, setEditingIndex] = useState(0);

  const [getAllLabelNames] = useLazyGetAllLabelNameQuery();

  const [updateLabelTitle] = useUpdateLabelTitleMutation();

  const token = useSelector(state => state.auth.user.token);

  const [labels, setLabels] = useState({});

  const [loading, setLoading] = useState(false);

  const getAllLabelNamesHandler = async () => {
    const {data, error} = await getAllLabelNames({token});

    console.log(data);

    if (data) {
      setLabels({
        LABEL1: data?.data?.LABEL1?.name || '',
        LABEL2: data?.data?.LABEL2?.name || '',
        LABEL3: data?.data?.LABEL3?.name || '',
      });
    }
    if (error) {
      console.log(error, 'PPP error');
    }
  };

  useEffect(() => {
    if (visible) getAllLabelNamesHandler();
  }, [visible]);

  const handleLabelChange = (key, value) => {
    setLabels(prev => ({...prev, [key]: value}));
  };

  const handleSave = async () => {
    console.log('Updated labels:', labels);
    // you can dispatch/save to backend here if needed
    // dispatch(toggleChatRoomLabelEdit({show: false}));

    setLoading(true);

    const {data, error} = await updateLabelTitle({token, data: labels});

    if (data) {
      chatRoomSuccess('Updated labels successfully!');
      dispatch(toggleChatRoomLabelEdit({show: false}));
      setLoading(false);
    }
  };

  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <BlurView intensity={15} style={styles.blurBackground} />
      <Dialog visible={visible} dialogStyle={[styles.dialog]} contentStyle={{padding: 0, paddingTop: 0}} onTouchOutside={() => dispatch(toggleChatRoomLabelEdit({show: false}))}>
        <View
          style={styles.content}
          onLayout={event => {
            const {height} = event.nativeEvent.layout;
            setDialogHeight(height);
          }}>
          <Text style={styles.title}>Edit Labels Name</Text>

          {/* Label 1 */}
          <View style={[styles.labelContainer, editingIndex === 1 && {backgroundColor: '#FFF6F0'}]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
              <View style={[styles.icon, {backgroundColor: '#BBBBFE'}]} />
            </View>
            <TextInput onPress={() => setEditingIndex(1)} style={styles.input} placeholder="Label 1" placeholderTextColor="#999" value={labels.LABEL1} onChangeText={text => handleLabelChange('LABEL1', text)} />
          </View>

          {/* Label 2 */}
          <View style={[styles.labelContainer, editingIndex === 2 && {backgroundColor: '#FFF6F0'}]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
              <View style={[styles.icon, {backgroundColor: '#FBF7A6'}]} />
            </View>
            <TextInput onPress={() => setEditingIndex(2)} style={styles.input} placeholder="Label 2" placeholderTextColor="#999" value={labels.LABEL2} onChangeText={text => handleLabelChange('LABEL2', text)} />
          </View>

          {/* Label 3 */}
          <View style={[styles.labelContainer, editingIndex === 3 && {backgroundColor: '#FFF6F0'}]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
              <View style={[styles.icon, {backgroundColor: '#98FF98'}]} />
            </View>
            <TextInput onPress={() => setEditingIndex(3)} style={styles.input} placeholder="Label 3" placeholderTextColor="#999" value={labels.LABEL3} onChangeText={text => handleLabelChange('LABEL3', text)} />
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <View style={styles.saveButton}>
              <AnimatedButton title={'Save'} showOverlay={false} loading={loading} onPress={handleSave} highlightOnPress={true} highlightColor={'#FFC399'} />
            </View>
            <View style={styles.cancelButton}>
              <AnimatedButton title={'Cancel'} showOverlay={false} onPress={() => dispatch(toggleChatRoomLabelEdit({show: false}))} style={{backgroundColor: '#fff'}} highlightOnPress={true} highlightColor="#FFF3EB" />
            </View>
          </View>
        </View>
      </Dialog>
    </View>
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: responsiveWidth(5.33),
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    padding: 32,
    backgroundColor: '#fff',
    width: nTwins(88, 92),
    borderColor: '#1e1e1e',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZES[16],
    marginBottom: WIDTH_SIZES[16],
    alignSelf: 'flex-start',
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#000',
    borderWidth: WIDTH_SIZES[1.5],
    borderRadius: WIDTH_SIZES[14],
    paddingHorizontal: WIDTH_SIZES[20],
    marginBottom: WIDTH_SIZES[16],
    padding: Platform.OS === 'ios' ? 14 : 0,
  },
  input: {
    flex: 1,
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[14],
    marginLeft: Platform.OS === 'ios' ? 10 : 0,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  saveButton: {
    flexBasis: '48%',
  },
  cancelButton: {
    flexBasis: '48%',
  },
  icon: {
    height: WIDTH_SIZES[12],
    width: WIDTH_SIZES[12],
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
    borderRadius: responsiveWidth(30),
  },
});

export default LabelEditsModal;
