import {Button, StyleSheet, Text, View, TouchableOpacity, Pressable, ActivityIndicator, FlatList, Vibration, Platform, Alert} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {CropView} from 'react-native-image-crop-tools';
import {useNavigation} from '@react-navigation/native';
import {responsiveHeight, responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import {useUpdatePicturesMutation, useUploadAttachmentMutation} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import {token as memoizedToken, updateCoverProfilePicture, updatePicture} from '../../Redux/Slices/NormalSlices/AuthSlice';
import {autoLogout} from '../../AutoLogout';
import {LoginPageErrors, chatRoomSuccess} from '../Components/ErrorSnacks';
import {padios} from '../../DesiginData/Utility';
import AnimatedButton from '../Components/AnimatedButton';
import RNFS from 'react-native-fs';
import {Image} from 'expo-image';
import {resizeImage, resizeCoverImage, convertPngToJpeg} from '../../FFMPeg/FFMPegModule';
import {ScrollView} from 'react-native-gesture-handler';

const aspectImages = [
  {
    id: 1,
    uri: require('../../Assets/Images/CreatePost/1.png'),
    height: 40,
    width: 32,
  },
  {
    id: 2,
    uri: require('../../Assets/Images/CreatePost/2.png'),
    height: 32,
    width: 32,
  },
];

const CropViewScreen = ({route}) => {
  console.log(route?.params, 'PPP');

  RNFS.stat(route?.params?.uri)
    .then(stat => {
      console.log(`File size: ${stat.size} bytes`);
      console.log(`File size: ${(stat.size / 1024).toFixed(2)} KB`);
      console.log(`File size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
    })
    .catch(error => {
      console.error('Error getting file size:', error);
    });

  const cropViewRef = useRef();

  const navigation = useNavigation();

  const [width, setWidth] = useState(4);
  const [height, setHeight] = useState(5);
  const [cropAreaWidth, setCropAreaWidth] = useState(null);
  const [cropAreaHeight, setCropAreaHeight] = useState(null);

  const {uri} = route.params;

  const token = useSelector(state => state.auth.user.token);

  const handleSaveImage = () => {
    let x = cropViewRef.current.saveImage(true, 100);
    console.log(x);
  };

  const [uploadAttachment, {error}] = useUploadAttachmentMutation();
  const [updatePicture] = useUpdatePicturesMutation();

  const userInfo = useSelector(state => state.auth.user);

  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState('');

  const [selected, setSelected] = useState(0);

  const dispatch = useDispatch();

  const handleSelectImage = async x => {
    console.log('📸 handleSelectImage called with:', {
      uri: x?.uri,
      width: x?.width,
      height: x?.height,
      correctedWidth: x?.correctedWidth,
      correctedHeight: x?.correctedHeight,
      type: route?.params?.type,
      cropAreaWidth,
      cropAreaHeight,
    });

    if (route?.params?.type === undefined) {
      // Create post flow - Only dimension cut, no further optimization
      // Create post flow - Navigate to Filter Screen
      navigation.navigate('filterScreen', {
        height: x?.height,
        width: x?.width,
        uri: x?.uri,
      });
    } else if (route?.params?.type === 'massMessage') {
      setUploading(true);
      setStatusText('Processing...');
      let convertedImage = await convertPngToJpeg(x?.uri, `${RNFS.TemporaryDirectoryPath}${Date.now()}.jpg`);
      setUploading(false);
      setStatusText('');
      navigation.navigate('massMessageMedia', {
        height: x?.height,
        width: x?.width,
        uri: convertedImage,
      });
    } else {
      // Profile or Cover photo update
      const timestamp = Date.now();
      const outputPath = Platform.select({
        ios: `${RNFS.TemporaryDirectoryPath}output_resized_${timestamp}.jpg`,
        android: `${RNFS.CachesDirectoryPath}/output_resized_${timestamp}.jpg`,
      });

      try {
        setUploading(true);
        setStatusText('Optimizing image...');

        const inputPath = Platform.select({
          ios: x?.uri,
          android: x?.uri,
        });

        console.log('🔧 Starting resize with:', {inputPath, outputPath, type: route?.params?.type});

        try {
          // 1. Resize Image
          const resizedPath = await (route?.params?.type === 'Cover'
            ? resizeCoverImage(inputPath, outputPath)
            : resizeImage(inputPath, outputPath));

          console.log('✅ Image resized successfully at:', resizedPath);
          setStatusText('Uploading to server...');

          // 2. Upload Attachment
          let formData = new FormData();
          formData.append('keyName', 'profile');
          formData.append('file', {
            name: 'editProfile',
            type: 'image/jpeg',
            uri: `file://${resizedPath}`,
          });

          const uploadRes = await uploadAttachment({token, formData});
          
          if (uploadRes?.data?.statusCode === 200) {
            const uploadedUrl = uploadRes?.data?.data?.url;
            console.log('✅ Upload successful:', uploadedUrl);
            setStatusText('Updating profile...');

            // 3. Update Picture Metadata
            const updateData = {
              profile_image: {
                url: route?.params?.type === 'Profile' ? uploadedUrl : userInfo?.currentUserProfilePicture,
                type: 'profile',
              },
              cover_photo: {
                url: route?.params?.type === 'Cover' ? uploadedUrl : userInfo?.currentUserCoverPicture,
                type: 'coverImage',
              },
            };

            const updateRes = await updatePicture({token, data: updateData});

            if (updateRes?.data?.statusCode === 200) {
              console.log('✅ Profile updated successfully');
              dispatch(
                updateCoverProfilePicture({
                  coverUrl: updateRes?.data?.data?.cover_photo?.url,
                  profileUrl: updateRes?.data?.data?.profile_image?.url,
                }),
              );
              chatRoomSuccess(`Successfully updated your ${route?.params?.type} picture`);
              navigation.goBack();
            } else {
              console.log('❌ Update Picture failed:', updateRes);
              LoginPageErrors(updateRes?.data?.message || 'Failed to update profile');
            }
          } else {
            console.log('❌ Upload Attachment failed:', uploadRes);
            if (uploadRes?.error?.status === 'FETCH_ERROR') {
              LoginPageErrors('Please check your network');
            } else {
              LoginPageErrors(uploadRes?.data?.message || 'Upload failed');
            }
          }
        } finally {
          // Cleanup resized file
          RNFS.exists(outputPath).then(exists => {
            if (exists) RNFS.unlink(outputPath).catch(() => {});
          });
        }
      } catch (error) {
        console.error('❌ Selective image update failed:', error);
        LoginPageErrors('An error occurred during update. Please try again.');
      } finally {
        setUploading(false);
        setStatusText('');
      }
    }
  };

  const handleSetAspectRatio = (h, w, index) => {
    console.log('🔵 handleSetAspectRatio called:', {h, w, index});

    if (Platform.OS === 'android') {
      Vibration.vibrate(10);
    }

    setSelected(index);
    setWidth(w);
    setHeight(h);

    // Calculate fixed crop dimensions based on aspect ratio
    const screenWidth = responsiveWidth(90);
    let newCropWidth, newCropHeight;

    if (w / h > 1) {
      // Wider than tall
      newCropWidth = screenWidth;
      newCropHeight = (screenWidth * h) / w;
    } else {
      // Taller than wide or square
      newCropHeight = screenWidth;
      newCropWidth = (screenWidth * w) / h;
    }

    console.log('🟢 Calculated crop dimensions:', {
      screenWidth,
      newCropWidth,
      newCropHeight,
      aspectRatio: `${w}:${h}`,
      calculatedRatio: (newCropWidth / newCropHeight).toFixed(2),
    });

    setCropAreaWidth(newCropWidth);
    setCropAreaHeight(newCropHeight);
  };

  // Create a unique key based on aspect ratio to force re-render
  const cropViewKey = `${width}-${height}`;

  console.log('🎯 Current state:', {
    width,
    height,
    cropAreaWidth,
    cropAreaHeight,
    cropViewKey,
    routeType: route?.params?.type,
    shouldLockAspectRatio: route?.params?.type === 'Profile' || route?.params?.type === 'Cover',
  });

  useEffect(() => {
    console.log('🟡 useEffect triggered with route.params.type:', route?.params?.type);

    if (route?.params?.type) {
      if (route?.params?.type === 'Profile') {
        // Lock to 1:1 for Profile
        console.log('🔴 Setting Profile mode - 1:1 aspect ratio');
        setWidth(1);
        setHeight(1);
        const size = responsiveWidth(90);
        console.log('🔴 Profile crop size:', size);
        setCropAreaWidth(size);
        setCropAreaHeight(size);
      } else if (route?.params?.type === 'Cover') {
        // Lock to 16:9 for Cover
        console.log('🟠 Setting Cover mode - 16:9 aspect ratio');
        setWidth(16);
        setHeight(9);
        const screenWidth = responsiveWidth(90);
        const calculatedHeight = (screenWidth * 9) / 16;
        console.log('🟠 Cover crop dimensions:', {
          width: screenWidth,
          height: calculatedHeight,
          ratio: (screenWidth / calculatedHeight).toFixed(2),
        });
        setCropAreaWidth(screenWidth);
        setCropAreaHeight(calculatedHeight);
      }
    } else {
      // For create post, default to 4:5
      console.log('🟣 Setting CreatePost mode - 4:5 aspect ratio');
      const screenWidth = responsiveWidth(90);
      const calculatedWidth = (screenWidth * 4) / 5;
      console.log('🟣 CreatePost crop dimensions:', {
        width: calculatedWidth,
        height: screenWidth,
        ratio: (calculatedWidth / screenWidth).toFixed(2),
      });
      setCropAreaHeight(screenWidth);
      setCropAreaWidth(calculatedWidth);
    }
  }, [route?.params?.type]);

  // Define aspect ratios based on type
  const allRatios =
    route?.params?.type === 'Profile'
      ? [{h: 1, w: 1}] // Only 1:1 for Profile
      : route?.params?.type === 'Cover'
      ? [{h: 16, w: 9}] // Only 16:9 for Cover
      : [
          {h: 4, w: 5},
          {h: 1, w: 1},
        ];

  // Show aspect ratio selector only for create post and mass message
  const shouldShowAspectSelector = route?.params?.type === undefined || route?.params?.type === 'massMessage';

  // Determine if aspect ratio should be locked
  const shouldLockAspectRatio = route?.params?.type === 'Profile' || route?.params?.type === 'Cover';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {uri ? (
        <>
          {console.log('🖼️ Rendering CropView with props:', {
            key: cropViewKey,
            aspectRatio: {width, height},
            cropAreaWidth,
            cropAreaHeight,
            keepAspectRatio: true,
            lockAspectRatio: true,
          })}

          <CropView
            key={cropViewKey}
            sourceUrl={uri}
            style={[styles.cropView, route?.params?.type === undefined ? {height: 425} : {height: responsiveWidth(130)}]}
            ref={cropViewRef}
            onImageCrop={res => {
              console.log('✂️ onImageCrop callback (BEFORE correction):', {
                width: res?.width,
                height: res?.height,
                uri: res?.uri,
                expectedAspectRatio: `${width}:${height}`,
                actualRatio: res?.width && res?.height ? (res.width / res.height).toFixed(2) : 'N/A',
              });

              // Force correct aspect ratio by recalculating dimensions
              let correctedWidth = res?.width;
              let correctedHeight = res?.height;

              if (res?.width && res?.height) {
                const expectedRatio = width / height;
                const actualRatio = res.width / res.height;

                // If ratio doesn't match (with 0.5% tolerance), fix it
                if (Math.abs(actualRatio - expectedRatio) > expectedRatio * 0.005) {
                  console.log('⚠️ Aspect ratio mismatch detected! Correcting...');

                  // Keep width, adjust height to match aspect ratio
                  correctedHeight = Math.round(res.width / expectedRatio);

                  console.log('✅ Corrected dimensions:', {
                    originalWidth: res.width,
                    originalHeight: res.height,
                    correctedWidth,
                    correctedHeight,
                    correctedRatio: (correctedWidth / correctedHeight).toFixed(2),
                    expectedRatio: expectedRatio.toFixed(2),
                  });
                }
              }

              handleSelectImage({
                ...res,
                height,
                width,
                correctedWidth,
                correctedHeight,
              });
            }}
            aspectRatio={{width, height}}
            keepAspectRatio={true}
            lockAspectRatio={true}
            {...(cropAreaWidth && cropAreaHeight
              ? {
                  cropAreaWidth,
                  cropAreaHeight,
                }
              : {})}
          />

          {route?.params?.type === undefined && <Text style={{textAlign: 'left', fontFamily: 'Rubik-Medium', color: '#282828', marginTop: 24, fontSize: responsiveFontSize(2.3), marginLeft: 26}}>Choose Aspect Ratio</Text>}

          {shouldShowAspectSelector && (
            <FlatList
              data={allRatios}
              showsHorizontalScrollIndicator={false}
              horizontal
              renderItem={({item, index}) => (
                <TouchableOpacity key={`AspectResizer${index}`} style={[styles.eachRatioBox, index === selected ? styles.selectedBox : {}]} onPress={() => handleSetAspectRatio(item.w, item.h, index)}>
                  <View style={{height: aspectImages[index].height, width: aspectImages[index].width}}>
                    <Image source={aspectImages[index]?.uri} contentFit="contain" style={{flex: 1}} />
                  </View>
                  <Text style={styles.aspectRatioNumber}>{`${item.h}:${item.w}`}</Text>
                </TouchableOpacity>
              )}
              style={{alignSelf: 'center', marginHorizontal: 18, marginTop: 12, maxHeight: 119}}
              keyExtractor={(item, index) => index.toString()}
              ItemSeparatorComponent={() => <View style={{marginHorizontal: 9}} />}
            />
          )}

          {statusText !== '' && (
            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Rubik-Medium', color: '#FF7043', fontSize: responsiveFontSize(1.8) }}>
                {statusText}
              </Text>
            </View>
          )}

          <View style={{position: 'relative', alignSelf: 'center', width: responsiveWidth(90), marginBottom: responsiveWidth(8)}}>
            <AnimatedButton title={route?.params?.type === undefined ? 'Next' : 'Update'} loading={uploading} onPress={() => cropViewRef.current.saveImage()} buttonMargin={route?.params?.type === undefined || route?.params?.type === 'massMessage' ? 6 : 30} />
          </View>
        </>
      ) : (
        <Text>Uri Not Present</Text>
      )}
    </ScrollView>
  );
};

export default CropViewScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cropView: {
    height: responsiveHeight(50),
    backgroundColor: '#f3f3f3',
  },
  aspectRatioContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  eachRatioBox: {
    padding: responsiveWidth(2),
    width: responsiveWidth(14),
    height: responsiveWidth(14),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: responsiveWidth(2),
    borderColor: '#282828',
    backgroundColor: '#f3f3f3',
  },

  loginButton: {
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#ffa07a',
    borderRadius: responsiveWidth(2),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Rubik-Bold',
    elevation: 1,
    fontWeight: '600',
    width: responsiveWidth(32),
    height: responsiveWidth(10),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
    elevation: 1,
    fontSize: responsiveFontSize(2.4),
    padding: padios(responsiveWidth(2.6)),
    overflow: 'hidden',
    marginTop: responsiveWidth(6),
  },
  eachRatioBox: {
    width: 102,
    height: 119,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  selectedBox: {
    borderColor: '#FF7043',
    backgroundColor: '#fff3eb',
    borderWidth: 1.5,
  },
  innerBox: {
    width: 30,
    height: 20,
    backgroundColor: '#000',
    opacity: 0.2,
    marginBottom: 5,
  },
  aspectRatioNumber: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    textAlign: 'center',
    marginTop: responsiveWidth(2),
    color: '#1e1e1e',
  },
  iconContainer: {
    height: 40,
    width: 32,
  },
});
