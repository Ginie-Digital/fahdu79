import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Dialog } from 'react-native-simple-dialogs';
import Feather from 'react-native-vector-icons/Feather';
import { BlurView } from 'expo-blur';
import { useDispatch, useSelector } from 'react-redux';
import { responsiveFontSize, responsiveWidth, responsiveHeight } from 'react-native-responsive-dimensions';
import { FONT_SIZES, nTwins, WIDTH_SIZES } from '../../../DesiginData/Utility';
import { useHelpCenterRequestMutation, useLazyGetSupportRoomIdQuery } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { toggleHelpCenterModal } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import { LoginPageErrors } from '../../Components/ErrorSnacks';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../Hook/useAppTheme';

const HelpCenterModal = ({ visible , phone }) => {
  const {colors, isDark} = useAppTheme();
  console.log(phone)

  const dispatch = useDispatch();
  const [selected, setSelected] = useState(null);

  const [dialogHeight, setDialogHeight] = useState(null);
  const contentRef = useRef(null);
  const token = useSelector(state => state.auth.user.token);

  const [getSupportRoomId] = useLazyGetSupportRoomIdQuery()

  const navigation = useNavigation()


  const currentUserDetails = useSelector(state => state?.auth?.user);

  


  const options = [
    { label: 'Call Request', icon: 'phone', title : "call" },
    { label: 'Chat', icon: 'message-circle', title : "message" },
    { label: 'Email', icon: 'mail', title : "email" },
  ];

  // Measure content height whenever selection changes
  useEffect(() => {
    if (contentRef.current) {
      setTimeout(() => {
        contentRef.current.measure((x, y, width, height) => {
          // Add padding (32 top + 32 bottom = 64)
          // Add extra space for safe area on iOS
          const extraSpace = Platform.OS === 'ios' ? responsiveHeight(4) : 0;
          setDialogHeight(height + 64 + extraSpace);
        });
      }, 50); // Small delay to ensure layout is complete
    }
  }, [selected, visible]);

  const [helpCenterRequest] = useHelpCenterRequestMutation()


  const handleApi = async (label, title) => {
    try {
      setSelected(label);
  
      const response = await helpCenterRequest({
        token,
        data: { phoneNumber: phone, requestType: title },
      });
  
      if (response?.data?.statusCode !== 200) {
        return LoginPageErrors('There was some error');
      }
  
        await navigateToSupportChat();
      
    } catch (error) {
      LoginPageErrors('An unexpected error occurred');
    }
  };
  
  const navigateToSupportChat = async () => {
    try {
      const { data, error } = await getSupportRoomId({ token });
 
      console.log(error)
  
      if (error || !data?.data?.supportRoomId) {
        return LoginPageErrors('Failed to retrieve support room');
      }
  
      dispatch(toggleHelpCenterModal({ show: false }));
  
      setTimeout(() => {
        navigation.navigate('Chats', {
          chatRoomId: data.data.supportRoomId,
          name: 'Fahdu support',
          profileImageUrl:
            'https://fahdu-bucket.s3.amazonaws.com/profile/Fahdu_1739531899469_1739531899469-1739531899469.editProfile',
          role: 'admin',
          id: currentUserDetails?.currentUserDisplayName,
        });
      }, 500);
    } catch (error) {
      LoginPageErrors('Error while navigating to chat');
    }
  };
  





  return (
    visible && (
      <View style={styles.overlay}>
        <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={styles.blurBackground} experimentalBlurMethod='dimezisBlurView'/>
        <Dialog
          visible={visible}
          dialogStyle={[
            styles.dialog, 
            { 
              height: dialogHeight + WIDTH_SIZES[16]|| undefined, // Use undefined instead of 'auto'
              minHeight: responsiveHeight(30), // Ensure minimum height
              maxHeight: responsiveHeight(80), // Ensure doesn't exceed screen
              backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF',
              borderColor: '#1E1E1E',
            }
          ]}
          contentStyle={{ padding: 0 }}
          onTouchOutside={() => dispatch(toggleHelpCenterModal({show: false}))}
          animationType="fade"
        >
          <View
            ref={contentRef}
            style={styles.content}
            onLayout={() => {
              // This is a fallback if measure doesn't work
              contentRef.current.measure((x, y, width, height) => {
                setDialogHeight(height + 64);
              });
            }}
          >
            <Text style={[styles.heading, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>Select Your Preferred Help Option:</Text>

            {options.map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: isDark ? '#1A1A1A' : (selected === option.label ? '#FF9E65' : '#FFFFFF'),
                    borderColor: isDark ? '#2A2A2A' : '#1e1e1e',
                  },
                  selected === option.label && isDark && styles.selectedOption,
                ]}
                onPress={() => handleApi(option.label, option.title)}
              >
                <Feather
                  name={option.icon}
                  size={responsiveFontSize(2.5)}
                  color={isDark ? (selected === option.label ? '#1e1e1e' : '#FFFFFF') : '#1e1e1e'}
                    />
                <Text
                  style={[
                    styles.optionText,
                    {color: isDark ? (selected === option.label ? '#1e1e1e' : '#FFFFFF') : '#1e1e1e'},
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Dialog>
      </View>
    )
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: responsiveWidth(5.33),
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 32,
    width: nTwins(88, 92),
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[16],
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: responsiveWidth(71),
    height: 48,
    paddingHorizontal: responsiveWidth(5),
    borderWidth: 2,
    borderRadius: WIDTH_SIZES[14],
    marginVertical: responsiveWidth(2),
  },
  selectedOption: {
    backgroundColor: '#FF9E65',
    borderColor: '#FF7819',
  },
  optionText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(2.2),
    marginLeft: responsiveWidth(3),
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
});

export default HelpCenterModal;