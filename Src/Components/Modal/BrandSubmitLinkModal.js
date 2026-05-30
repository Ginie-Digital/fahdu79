import {StyleSheet, Text, View, TextInput, Button, Pressable, Image, Platform, Linking} from 'react-native';
import React, {useState} from 'react';
import {Dialog} from 'react-native-simple-dialogs';
import {responsiveWidth, responsiveFontSize, responsiveHeight} from 'react-native-responsive-dimensions';
import {showMessage} from 'react-native-flash-message';
import {useLazyGetInstagramProfileInfoQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import {toggleInstagrmLinkSubmitModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {convertAbbreviationToNumber, extractInstaInfo, isBetween} from '../../../DesiginData/Utility';
import OTPTextView from 'react-native-otp-textinput';
import { ChatWindowError } from '../ErrorSnacks';

import { useVerifyWhatsappOtpMutation, useSubmitMobileNumberForOtpMutation } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { token as memoizedToken, setIsPhoneNumberVerified} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import { Link } from '@react-navigation/native';

const BrandSubmitLinkModal = () => {
  const [instaId, setInstaId] = useState('');


  const token = useSelector(state => state.auth.user.token)

  const [hideInstaSubmitHandle, setHideInstaSubmitHandle] = useState(false);

  const [profileInfo, setProfileInfo] = useState(null);

  const [modalLoading, setModalLoading] = useState(false);

  const [showSubmitPhoneNumber, setShowSubmitPhoneNumber] = useState(false);

  const [getInstagramProfileInfo] = useLazyGetInstagramProfileInfoQuery();

  const [showEligiblityMessage, setShowEligibilityMessage] = useState(false);

  const [whatsappNumber, setWhatsappNumber] = useState();

  const [showOtpSubmit, setShowOtpSubmit] = useState(false)

  const [whatsappOtp, setWhatsappOtp] = useState()

  const [verifyWhatsappOtp] = useVerifyWhatsappOtpMutation()
  
  const [submitMobileNumberForOtp] = useSubmitMobileNumberForOtpMutation()

  const dispatch = useDispatch();

  const visible = useSelector(state => state.hideShow.visibility.instagramLinkSubmitModal);

  const campaignDetails = useSelector(state => state.campaignData.data);

  let {is_phone_verified} = useSelector(state => state.auth.user);

  const handleInstaVerification = () => {

    console.log(convertAbbreviationToNumber(profileInfo?.followers))

    if (is_phone_verified) {
      if (isBetween(Number(campaignDetails?.influencerRange?.min), Number(campaignDetails?.influencerRange?.max), convertAbbreviationToNumber(profileInfo?.followers))) {
        dispatch(toggleInstagrmLinkSubmitModal({show: false}));
      } else {
        setShowEligibilityMessage(true);
      }
    } else {

      console.log("OPening phone nubmer")
      setHideInstaSubmitHandle(true)
      setShowSubmitPhoneNumber(true);
    }
  };

  const handleWhatsappNumber = async () => {
    
    const regex = /^[0-9]{10}$/;

    if (!whatsappNumber) {
      ChatWindowError('WhatsApp number is required.');
      return;
    }

    if (!regex.test(whatsappNumber)) {``
      ChatWindowError('Please enter a valid WhatsApp number (10 digits, no special characters).');
      return;
    }

  

    const {data, error} = await submitMobileNumberForOtp({token, data : {

      mobileNumber : whatsappNumber

 
    }})

    console.log(data, "||||||||||||||||||")


    if(data?.success) {

      ChatWindowError(data?.message)
      
      console.log(data, "::::::::::::")

      
      setShowOtpSubmit(true)


    } else {
      console.log(data, error)
    }


   


  }


  const handleSubmitOtp = async () => {

    const {data, error} = await verifyWhatsappOtp({token, data : {
      mobileNumber : whatsappNumber,
      mobileOtp : whatsappOtp
    }})


    console.log(data, whatsappOtp)
   

    if(data?.success) {
      ChatWindowError("Sucesss")

      dispatch(setIsPhoneNumberVerified({phoneStatus : true}))

      setWhatsappNumber(null)
      setShowOtpSubmit(false)
      setShowSubmitPhoneNumber(false)


      Linking.openURL("https://wa.me/+919041117072?text=%F0%9F%91%8B%2C%20Fahdu%20I'm%20here%20for%20brand%20collaboration%20please%20notify%20me%20on%20new%20updates")


    } else {
      ChatWindowError(data?.message)
    }

  }

  const handleTakeInstaUserName = input => {
    if (input.startsWith('@')) {
      setInstaId(input);
    } else {
      setInstaId('@' + input);
    }
  };

  const handleCheckInstaUserName = async () => {
    setModalLoading(true); // Start loading indicator

    let username = instaId?.trim(); // Ensure instaId is defined and trim whitespace

    // Validation checks
    if (!username) {
      showMessage({
        message: 'Username cannot be empty',
        type: 'danger',
      });
      setModalLoading(false);
      setHideInstaSubmitHandle(false); // Set to false on error
      return;
    }

    if (username.startsWith('@')) {
      username = username.substring(1);
    }

    const usernamePattern = /^[a-zA-Z][a-zA-Z0-9_.]*$/;
    if (!usernamePattern.test(username)) {
      showMessage({
        message: 'Username can only contain letters, numbers, underscores, and dots, and cannot start with a special character',
        type: 'warning',
      });
      setModalLoading(false);
      setHideInstaSubmitHandle(false); // Set to false on validation error
      return;
    }

    if (/^\d/.test(username)) {
      showMessage({
        message: 'Username cannot start with a number',
        type: 'warning',
      });
      setModalLoading(false);
      setHideInstaSubmitHandle(false); // Set to false on validation error
      return;
    }

    // Fetch Instagram profile info using the cleaned username
    const data = await extractInstaInfo(username);

    console.log(data)

    setModalLoading(false); // Stop loading indicator

    if(Object.keys(data).length > 0) {
      setProfileInfo(data); // Update profile info
      setHideInstaSubmitHandle(true);
    } else {
      ChatWindowError("User not")
    }


  };

  return (
    <Dialog
      visible={visible}
      dialogStyle={{
        borderRadius: responsiveWidth(1),
        padding: 0,
        borderStyle: 'dashed',
        borderWidth: responsiveWidth(0.9),
        borderRadius: responsiveWidth(5),
      }}
      onTouchOutside={() => dispatch(toggleInstagrmLinkSubmitModal({show: false}))}>
      <View>
        {
        
        !hideInstaSubmitHandle ? (
          <>
            <Text
              style={{
                color: 'black',
                fontFamily: 'Rubik-SemiBold',
                fontSize: responsiveWidth(4.5),
              }}>
              Check your “Instagram Id” is this correct or Edit
            </Text>

            <TextInput
              style={{
                borderWidth: responsiveWidth(0.5),
                borderRadius: responsiveWidth(4),
                padding: responsiveWidth(2),
                marginTop: responsiveWidth(2),
                color: 'black',
                height: Platform.OS === 'ios' ? responsiveWidth(13) : null,
              }}
              placeholder="Instagram id"
              autoCapitalize="none"
              value={instaId}
              onChangeText={handleTakeInstaUserName}
            />

            <Pressable style={{marginTop: responsiveWidth(3)}} onPress={() => handleCheckInstaUserName()}>
              <Text style={[styles.loginButton, {borderWidth: responsiveWidth(0.5)}]}>Submit</Text>
            </Pressable>
          </>
        ) : showSubmitPhoneNumber ? (



          showOtpSubmit ?

          <View style={{alignItems: 'center'}}>
          <Text
            style={{
              color: 'black',
              fontFamily: 'Rubik-SemiBold',
              fontSize: responsiveWidth(4.5),
            }}>
            Enter Otp sent on Whatsapp ..
          </Text>

          <OTPTextView
            containerStyle={styles.otpContainer}
            handleTextChange={(text) => setWhatsappOtp(text)}
            inputCount={4}
            keyboardType="number-pad"
            textInputStyle={styles.otpInput}
            offTintColor={Array(4).fill(0).map((_, i) => ((whatsappOtp || '')[i] ? '#FFA86B' : 'black'))}
            tintColor={Array(4).fill(0).map((_, i) => ((whatsappOtp || '')[i] ? '#FFA86B' : 'black'))}
          />

          <Pressable style={{marginTop: responsiveWidth(3)}} onPress={() => handleSubmitOtp()}>
              <Text style={[styles.loginButton, {borderWidth: responsiveWidth(0.5)}]}>Submit</Text>
           </Pressable>
          </View>
        
        
        :


          <>
         
     

         
         
         
            <Text style={{color: 'black', fontFamily: 'Rubik-SemiBold', fontSize: responsiveWidth(4.5)}}>Whatsapp number</Text>

            <TextInput
              style={{
                borderWidth: responsiveWidth(0.5),
                borderRadius: responsiveWidth(4),
                padding: responsiveWidth(2),
                marginTop: responsiveWidth(2),
                color: 'black',
                height: Platform.OS === 'ios' ? responsiveWidth(13) : null,
              }}
              placeholder="Whatsapp number"
              keyboardType="number-pad"
              maxLength={10}
              autoCapitalize="none"
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
            />

            <Pressable style={{marginTop: responsiveWidth(3)}} onPress={() => handleWhatsappNumber()}>
              <Text style={[styles.loginButton, {borderWidth: responsiveWidth(0.5)}]}>Get Code</Text>
            </Pressable>



          </>




        ) : !showEligiblityMessage ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#000000',
                gap: responsiveWidth(3),
                padding: responsiveWidth(1),
                width: responsiveWidth(79),
                right: responsiveWidth(4),
                borderRadius: responsiveWidth(5),
                marginTop: responsiveWidth(4),
              }}>
              <View
                style={{
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginVertical: responsiveWidth(4),
                }}>
                {/* <Image source={!item?.brandData?.logoimage?.url ? require("../../../Assets/Images/Shoes.png") : { uri: profileInfo?.brandData?.logoimage?.url }} resizeMethod="resize" style={styles.profileImage} /> */}
                <View style={styles.profileImageContainer}>
                  <Image source={profileInfo?.profilePicture !== "default_image_url" ? {uri : profileInfo?.profilePicture} : require('../../../Assets/Images/Shoes.png') } resizeMethod="resize" style={styles.profileImage} />
                </View>
                <View style={{marginTop: responsiveWidth(2)}}>
                  <Text style={{color: 'white', marginLeft: responsiveWidth(2)}}> {profileInfo?.username}</Text>
                  <View
                    style={{
                      backgroundColor: '#262626',
                      paddingHorizontal: responsiveWidth(2),
                      borderRadius: responsiveWidth(2),
                    }}>
                    <Text style={{color: 'white'}}> {profileInfo?.name}</Text>
                  </View>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  gap: responsiveWidth(3),
                  position: 'absolute',
                  top: responsiveWidth(10),
                  left: responsiveWidth(27),
                }}>
                <View
                  style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: responsiveWidth(2),
                  }}>
                  <Text style={{color: 'white'}}> {profileInfo?.followers}</Text>

                  <Text style={{color: 'white'}}> followers</Text>
                </View>
                <View
                  style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: responsiveWidth(2),
                  }}>
                  <Text style={{color: 'white'}}> {profileInfo?.following}</Text>

                  <Text style={{color: 'white'}}> following</Text>
                </View>
                <View
                  style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: responsiveWidth(2),
                  }}>
                  <Text style={{color: 'white'}}> {profileInfo?.posts}</Text>

                  <Text style={{color: 'white'}}> post</Text>
                </View>

              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                marginTop: responsiveWidth(8),
                gap: responsiveWidth(4),
                left: responsiveWidth(4),
              }}>
              <Pressable onPress={() => setHideInstaSubmitHandle(false)}>
                <View
                  style={{
                    borderWidth: responsiveWidth(0.5),
                    borderRadius: responsiveWidth(4),
                    width: responsiveWidth(30),
                    height: responsiveWidth(13),
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderColor: '#FF7819',
                  }}>
                  <Text style={{color: '#FF7819', fontFamily: 'Rubik-Medium'}}>No</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => handleInstaVerification()}>
                <View
                  style={{
                    borderWidth: responsiveWidth(0.5),
                    borderRadius: responsiveWidth(4),
                    width: responsiveWidth(30),
                    height: responsiveWidth(13),
                    backgroundColor: '#FFA86B',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderColor: '#FF7819',
                  }}>
                  <Text style={{color: 'black', fontFamily: 'Rubik-Medium'}}>Yes</Text>
                </View>
              </Pressable>
            </View>
            {/* <Button
            title="Not me"
            onPress={() => setHideInstaSubmitHandle(false)}
          /> */}

            {/* <Button title="It is me" onPress={() => handleInstaVerification()} /> */}
          </>
        ) : (
          // <>
          //   <Text style={{color:'black',fontFamily:'Rubik-Medium',fontSize:responsiveWidth(4.91),textAlign:'center'}}>

          // We're sorry, but it appears that your profile does not currently align with the brand's criteria for this campaign. We encourage you to explore other opportunities within the app that may be a better fit. Thank you for your understanding.
          // </Text>
          //   <Pressable
          //   style={[styles.loginButton,
          //   {alignItems:'center',marginTop:responsiveWidth(3),borderWidth:responsiveWidth(.5)}]}
          //     title="Theek hai"
          //     onPress={() =>
          //       dispatch(toggleInstagrmLinkSubmitModal({ show: false }))
          //     }
          //   >
          //     <Text style={{color:'black',fontSize:responsiveWidth(4),fontFamily:'Rubik-SemiBold'}}>Back to Home</Text>
          //   </Pressable>
          // </>

          // FOR WHATSAPP NUMBER VERIFICATION

          // Otp Part
          <>
            <View style={{alignItems: 'center'}}>
              <Text
                style={{
                  color: 'black',
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: responsiveWidth(4.5),
                }}>
                Enter Otp sent on Whatsapp ..
              </Text>

              <OTPTextView
                containerStyle={styles.otpContainer}
                handleTextChange={(text) => setWhatsappOtp(text)}
                inputCount={4}
                keyboardType="number-pad"
                textInputStyle={styles.otpInput}
                offTintColor={Array(4).fill(0).map((_, i) => ((whatsappOtp || '')[i] ? '#FFA86B' : 'black'))}
                tintColor={Array(4).fill(0).map((_, i) => ((whatsappOtp || '')[i] ? '#FFA86B' : 'black'))}
              />
              {/* <Pressable onPress={() => handleCheckInstaUserName()} >
  <Text style={{width:responsiveWidth(70),borderRadius:responsiveWidth(3),alignItems:'center',height:responsiveWidth(12),backgroundColor:'#FFA86B'}}> 
    Submit
  </Text>
</Pressable> */}
              <Pressable style={{marginTop: responsiveWidth(3)}} onPress={() => handleCheckInstaUserName()}>
                <Text style={[styles.loginButton, {borderWidth: responsiveWidth(0.5)}]}>Submit</Text>
              </Pressable>
            </View>
            {/* <Button title="submit" /> */}
            {/* <Pressable
        onPress={() =>
          dispatch(toggleInstagrmLinkSubmitModal({ show: false }))
        }
        title="cancel"
      /> */}
          </>
        )}
      </View>
    </Dialog>
  );
};

export default BrandSubmitLinkModal;

const styles = StyleSheet.create({
  loginButton: {
    padding: Platform.OS === 'ios' ? responsiveWidth(4) : null,
    backgroundColor: 'rgba(255, 168, 107, 1)',
    borderRadius: responsiveWidth(4),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Rubik-Medium',
    // fontWeight: '600',
    width: responsiveWidth(73),
    height: responsiveWidth(14),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderColor: '#FF781A',
    fontSize: responsiveFontSize(2.1),
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    borderWidth: responsiveWidth(1),
    borderRadius: responsiveWidth(10),

    resizeMode: 'cover',
    height: '100%',
  },
  profileImageContainer: {
    borderColor: '#282828',
    height: responsiveWidth(20),
    width: responsiveWidth(20),
    borderRadius: responsiveWidth(10),
    overflow: 'hidden',
    borderWidth: 1,
    // right:responsiveWidth(3)
    // position: "relative",
  },
  otpContainer: {
    width: responsiveWidth(73),

    height: responsiveHeight(8),
    marginTop: responsiveWidth(2),
    marginBottom: responsiveWidth(2),
  },
  otpInput: {
    width: responsiveWidth(16),
    height: responsiveWidth(16),
    borderRadius: responsiveWidth(4),
    borderWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#282828',
    fontSize: responsiveFontSize(3),
    color: 'black',
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    backgroundColor: 'white',
  },
});
