//todo:This modal will popup when user click on clip in chatWindow Text Input

import {StyleSheet, Text, View, Animated, TouchableOpacity, FlatList, PermissionsAndroid, ToastAndroid, Platform} from 'react-native';
import React, {useCallback, useState, useEffect} from 'react';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {useSelector, useDispatch, shallowEqual} from 'react-redux';
import Modal from 'react-native-modal';
import {toggleChatWindowClipModal, toggleChatWindowAttachmentPreviewModal, toggleAttachmentMediaLoading, toggleChatWindowPreviewSheet} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {chatWindowAttachmentList} from '../../../DesiginData/Data';
import DIcon from '../../../DesiginData/DIcons';
import * as DocumentPicker from '@react-native-documents/picker';
import {setMediaData} from '../../../Redux/Slices/NormalSlices/MessageSlices/ChatWindowPreviewDataSlice';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {generateBase64Image} from '../../../FFMPeg/FFMPegModule';
import {ChatWindowError} from '../ErrorSnacks';
import ImageCropPicker from 'react-native-image-crop-picker';
import {makeid, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {Image} from 'expo-image';

export const selectDocument = async () => {
  try {
    const [docInfo] = await DocumentPicker.pick({
      type: [DocumentPicker.types.pdf],
      copyTo: 'cachesDirectory',
      allowMultiSelection: false,
    });
    if (docInfo?.size > 60000000) {
      //60MB
      ChatWindowError('PDF Size must be lower than 60 MB');
      return 0;
    }
    return docInfo;
  } catch (e) {
    console.log('CWClip SelectDocument Error', e.message);
    return undefined;
  }
};

export const selectMediaImage = async type => {
  try {
    if (type === 'photo') {
      let image;
      try {
        image = await ImageCropPicker.openPicker({
          mediaType: 'photo',
          multiple: false,
          forceJpg: true, // Automatically converts HEIC/HEIF to JPEG!
          compressImageQuality: 0.7, // More aggressive compression to speed up picking large images
          compressImageMaxWidth: 1920, // Downscale at pick time — no need for full 4K
          compressImageMaxHeight: 1920,
        });
      } catch (err) {
        if (err.code === 'E_PICKER_CANCELLED') {
          return {didCancel: true};
        }
        throw err;
      }

      if (image) {
        // Map the ImageCropPicker payload to the expected structure
        const asset = {
          uri: image.path,
          fileName: image.filename || image.path.split('/').pop(),
          type: image.mime,
          fileSize: image.size,
        };

        if (!asset.type || !asset.type.startsWith('image/')) {
          ChatWindowError('Please select an image file only');
          return {didCancel: true};
        }

        if (asset.fileSize > 20000000) {
          //20 MB
          ChatWindowError('Image Size must be lower than 20 MB');
          return {didCancel: true};
        }

        let dePixeldPreviewBase64MediaInfo = await generateBase64Image(asset.uri);
        return {
          mediaImageInfo: {uri: asset.uri, name: asset.fileName, type: asset.type},
          dePixeldPreviewBase64MediaInfo,
        };
      }

      return {didCancel: true};
    } else {
      const mediaImageInfo = await ImageCropPicker.openCamera({mediaType: 'photo'});
      let dePixeldPreviewBase64MediaInfo = await generateBase64Image(mediaImageInfo?.path);
      return {
        mediaImageInfo: {uri: mediaImageInfo?.path, name: makeid(6) + 'frommsgcam', type: mediaImageInfo?.mime},
        dePixeldPreviewBase64MediaInfo,
      };
    }
  } catch (e) {
    console.log('CWClip SelectMediaImage Error', e.message);
    return {didCancel: true};
  }
};

export const selectMediaVideo = async () => {
  try {
    const mediaVideoInfo = await launchImageLibrary({
      mediaType: 'video',
      selectionLimit: 1,
      assetRepresentationMode: Platform.OS === 'android' ? 'auto' : 'current', // Fix for Android
      includeBase64: false,
      includeExtra: true, // Important for Android to get proper file info
      videoQuality: 'high',
    });

    if (mediaVideoInfo?.didCancel) {
      return undefined;
    }

    if (mediaVideoInfo?.assets && mediaVideoInfo.assets.length > 0) {
      const asset = mediaVideoInfo.assets[0];

      // Strict video type validation
      if (!asset.type || !asset.type.startsWith('video/')) {
        ChatWindowError('Please select a video file only');
        return undefined;
      }

      // Android specific: Check if fileSize exists, if not try to get from uri
      let fileSize = asset.fileSize;

      if (!fileSize && Platform.OS === 'android') {
        console.log('Android: fileSize not available directly, video might be large');
        // For Android, if fileSize is undefined, it might be a very large file
        ChatWindowError('Unable to determine video size. Please try a smaller video.');
        return undefined;
      }

      const isValidFormat = asset.type.includes('mp4') || asset.type.includes('mov') || asset.type.includes('quicktime') || asset.type.includes('3gpp'); // Add 3gpp for some Android devices

      if (!isValidFormat) {
        ChatWindowError('Only mp4 or mov video format allowed');
        return undefined;
      }

      if (fileSize && fileSize > 60000000) {
        // 60MB
        ChatWindowError('Video size must be lower than 60 MB');
        return undefined;
      }

      return mediaVideoInfo;
    }

    return undefined;
  } catch (e) {
    console.log('CWClip SelectMediaVideo Error', e.message);
    // Check if error is related to file size on Android
    if (Platform.OS === 'android' && e.message) {
      if (e.message.includes('size') || e.message.includes('large')) {
        ChatWindowError('Video file is too large. Please select a smaller video.');
      }
    }
    return undefined;
  }
};

export const afterImageClipSelected = (dispatcher, type = 'photo') => {
  console.log('Selected One 🖼️');

  selectMediaImage(type).then(e => {
    if (e?.didCancel !== true) {
      console.log('🖼️ File selected');
      dispatcher(setMediaData({type: 1, mediaImageInfoSet: e}));
      type === 'photo' ? dispatcher(toggleChatWindowClipModal()) : console.log('Was Camera 🎃');
      dispatcher(toggleChatWindowPreviewSheet({show: 1}));
      dispatcher(toggleAttachmentMediaLoading({show: false}));
    } else {
      console.log('🖼️  No media selected', e.message);
      dispatcher(toggleAttachmentMediaLoading({show: false}));
    }
  });
};

const ChatWindowClipModal = () => {
  const modalVisibility = useSelector(state => state.hideShow.visibility.chatWindowClipModal);

  const dispatcher = useDispatch();

  const handleClipSelectedMedia = ({id}) => {
    dispatcher(toggleAttachmentMediaLoading({show: true}));

    if (id === 1) {
      afterImageClipSelected(dispatcher);
    } else if (id === 2) {
      console.log('Selected Two 🎥');
      selectMediaVideo().then(e => {
        dispatcher(toggleAttachmentMediaLoading({show: false}));

        if (e) {
          dispatcher(setMediaData({type: 2, fileData: e?.assets[0]}));
          dispatcher(toggleChatWindowClipModal());
          dispatcher(toggleChatWindowPreviewSheet({show: 1}));
        } else {
          console.log('📁 No Video file selected');
          dispatcher(toggleAttachmentMediaLoading({show: false}));
        }
      });
    } else {
      console.log('Selected Three 📝');
      selectDocument().then(e => {
        if (e) {
          console.log('📁 Selected file ', e);
          dispatcher(setMediaData({type: 3, fileData: e}));
          dispatcher(toggleChatWindowClipModal());
          dispatcher(toggleChatWindowPreviewSheet({show: 1}));
          dispatcher(toggleAttachmentMediaLoading({show: false}));
        } else {
          console.log('📁 No file selected');
          dispatcher(toggleAttachmentMediaLoading({show: false}));
        }
      });
    }
  };

  return (
    modalVisibility && (
      <Modal
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        animationInTiming={250}
        animationOutTiming={50}
        onRequestClose={() => dispatcher(toggleChatWindowClipModal())}
        transparent={true}
        isVisible={modalVisibility}
        backdropColor="transparent"
        onBackButtonPress={() => dispatcher(toggleChatWindowClipModal())}
        onBackdropPress={() => dispatcher(toggleChatWindowClipModal())}
        useNativeDriver={true}
        style={{
          width: '100%',
          alignSelf: 'center',
          height: '100%',
          justifyContent: 'flex-start',
        }}>
        <View style={styles.modalInnerWrapper}>
          <FlatList
            data={chatWindowAttachmentList}
            renderItem={({item, index}) => (
              <TouchableOpacity onPress={handleClipSelectedMedia.bind(null, {id: item.id})}>
                <View style={styles.eachSortModalList}>
                  <View style={styles.verifyContainer}>
                    <Image cachePolicy="memory-disk" source={item.url} contentFit="contain" style={{flex: 1}} />
                  </View>
                </View>
              </TouchableOpacity>
            )}
            style={{marginTop: responsiveWidth(3)}}
          />
        </View>
      </Modal>
    )
  );
};

export default ChatWindowClipModal;

const styles = StyleSheet.create({
  modalInnerWrapper: {
    height: responsiveWidth(47.2),
    width: responsiveWidth(16),
    backgroundColor: '#FFF9F5',
    alignSelf: 'flex-center',
    marginLeft: responsiveWidth(6.5),
    marginTop: responsiveHeight(65),
    borderRadius: WIDTH_SIZES[14],
    paddingHorizontal: responsiveWidth(4),
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
    elevation: 1,
  },
  eachSortByModalListText: {
    fontSize: responsiveFontSize(2.5),
    color: '#353535',
    letterSpacing: 1,
  },
  eachSortModalList: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: responsiveWidth(3.4),
  },
  verifyContainer: {
    height: WIDTH_SIZES[24] + WIDTH_SIZES[2],
    width: WIDTH_SIZES[24] + WIDTH_SIZES[2],
    // backgroundColor : 'red'
  },
});
