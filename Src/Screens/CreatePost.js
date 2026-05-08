import {StyleSheet, Text, View, Image, TextInput, TouchableOpacity, Switch, Pressable, KeyboardAvoidingView, ScrollView, Platform, InputAccessoryView, Keyboard, Alert} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {launchImageLibrary} from 'react-native-image-picker';
import {useNavigation} from '@react-navigation/native';

import {useDispatch, useSelector} from 'react-redux';
import {toggleDateTimePicker, toggleShowProgress, resetDateTimePicker, toggleCreatorSelectorModal} from '../../Redux/Slices/NormalSlices/HideShowSlice';
import {useCreatePostMutation, useCreatePostUploadAttachmentMutation, useLazyMyPostListQuery} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {generateBase64Image, generateVideoThumbnail, getImageSize, getVideoMetadata, videoReducer} from '../../FFMPeg/FFMPegModule';
import {LoginPageErrors, successSnacks} from '../Components/ErrorSnacks';
import DIcon from '../../DesiginData/DIcons';
import {dismissProgressNotification, displayNotificationProgressIndicator} from '../../Notificaton';
import {autoLogout} from '../../AutoLogout';
import {FONT_SIZES, padios, WIDTH_SIZES} from '../../DesiginData/Utility';
import {PERMISSIONS, RESULTS, checkMultiple, request} from 'react-native-permissions';
import ImageCropPicker from 'react-native-image-crop-picker';
import {addNewPostToMyProfileCache, setFeedCacheMyPost} from '../../Redux/Slices/NormalSlices/Posts/MyProfileFeedCacheSlice';
import Upload from '../../Assets/svg/uploadP.svg';
import {check} from 'react-native-permissions';
import Ionicons from 'react-native-vector-icons/Ionicons'; // Import Ionicons
import AnimatedButton from '../Components/AnimatedButton';
import RNFS from 'react-native-fs';

import {resetPostIndex, resetUploadProgress, setPostIndex, setUploadProgress, startProcessing, startUpload} from '../../Redux/Slices/NormalSlices/UploadSlice';
import {navigate} from '../../Navigation/RootNavigation';
import Carousel from 'react-native-reanimated-carousel';
import CreatorSelectorModal from '../Components/Verification/CreatorSelectorModal';


const CreatePost = ({route}) => {
  console.log(route?.params?.uri, '{}{}{})__+_+_+_+_+');

  const scrollViewRef = useRef(null);
  const textInputRef = useRef(null);

  if (route?.params?.uris) {
    route.params.uris.forEach((uri, i) => {
      RNFS.stat(uri)
        .then(stat => {
          console.log(`File ${i + 1} size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
        })
        .catch(error => {
          console.error('Error getting file size:', error);
        });
    });
  }

  console.log(route?.params, '::::::');

  const handleTextInputFocus = () => {
    setTimeout(() => {
      textInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
        scrollViewRef.current?.scrollTo({
          y: pageY - 100, // Adjust this offset as needed
          animated: true,
        });
      });
    }, 100);
  };

  const [activeIndex, setActiveIndex] = useState(0);
  const [count, setCount] = React.useState(0);

  const inputAccessoryViewID = 'createPost';

  // const [uploadAttachment, {error}] = useUploadAttachmentMutation();

  const [createPostUploadAttachment, {isLoading}] = useCreatePostUploadAttachmentMutation();

  const {postIndex, isUploading, processing, progress} = useSelector(state => state.upload);

  const navigation = useNavigation();

  const dispatch = useDispatch();

  const [createPost] = useCreatePostMutation();

  const {status: dateTimePickerStatus, date: dateString} = useSelector(state => state.hideShow.visibility.dateTimePickerData);
  const date = new Date(dateString);

  const [caption, setCaption] = useState('');

  const token = useSelector(state => state.auth.user.token);
  const userRole = useSelector(state => state.auth.user.role || 'creator');

  const [base64Image, setBase64Image] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [mediaUris, setMediaUris] = useState([]);

  const [videoUrl, setVideoUrl] = useState(undefined);

  const [isMediaVideo, setIsMediaVideo] = useState(false); //Generate thumbnail and have to add play button I'll utilize prebuild image componenet

  const [mediaSelected, setMediaSelected] = useState(false);

  const [bitRate, setBitRate] = useState(null);

  const [postList] = useLazyMyPostListQuery();

  const getPostContent = useSelector(state => state.myProfileFeedCache.data.content);

  const [selection, setSelection] = useState({start: 0, end: 0});
  const [mentions, setMentions] = useState([]); // [{ id, name, start, length }]
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');

  const syncMentions = (newText, prevText, prevMentions, currentSelection) => {
    const diff = newText.length - prevText.length;
    if (diff === 0) return prevMentions;

    const cursor = currentSelection.start;
    const changeIndex = diff > 0 ? cursor - diff : cursor;

    // Remove mentions that are affected by deletion
    let filteredMentions = prevMentions;
    if (diff < 0) {
      const deletedRange = [cursor, cursor + Math.abs(diff)];
      filteredMentions = prevMentions.filter(m => {
        const mEnd = m.start + m.name.length + 1; // +1 for @
        const isHit = (deletedRange[0] < mEnd && deletedRange[1] > m.start);
        return !isHit;
      });
    }

    // Shift remaining mentions
    return filteredMentions.map(m => {
      if (m.start >= changeIndex) {
        return { ...m, start: m.start + diff };
      }
      return m;
    });
  };
  const prevCaptionRef = useRef('');

  const getRawCaption = () => {
    let raw = caption;
    // Sort mentions descending to replace from end to avoid index shifting issues
    const sortedMentions = [...mentions].sort((a, b) => b.start - a.start);
    
    sortedMentions.forEach(m => {
      const tag = `@[${m.name}](userId:${m.id})`;
      raw = raw.slice(0, m.start) + tag + raw.slice(m.start + m.name.length + 1);
    });
    return raw;
  };

  const handleTextInput = x => {
    const diff = x.length - caption.length;
    
    // Atomic deletion logic
    if (diff < 0) {
      const cursor = selection.start;
      // Adjust range due to potentially stale selection state: 
      // characters were deleted just before the current selection
      const deletedRange = [cursor - Math.abs(diff), cursor];
      
      const hitMention = mentions.find(m => {
        const mEnd = m.start + m.name.length + 1;
        return (deletedRange[0] < mEnd && deletedRange[1] > m.start);
      });

      if (hitMention) {
        const mStart = hitMention.start;
        const mEnd = hitMention.start + hitMention.name.length + 1;
        const newCaption = caption.slice(0, mStart) + caption.slice(mEnd);
        
        const newMentions = mentions.filter(m => m !== hitMention).map(m => {
          if (m.start > mStart) {
            return { ...m, start: m.start - (mEnd - mStart) };
          }
          return m;
        });
        
        setMentions(newMentions);
        setCaption(newCaption);
        setCount(newCaption.length);
        return;
      }
    }

    const updatedMentions = syncMentions(x, caption, mentions, selection);
    setMentions(updatedMentions);
    
    setCount(x?.length);
    setCaption(x);
  };

  useEffect(() => {
    // Check if the change was a deletion
    const isDeletion = caption.length < prevCaptionRef.current.length;
    prevCaptionRef.current = caption;

    // Detect @ trigger for mentions using latest caption and selection
    const cursorPosition = selection.start;
    const textBeforeCursor = caption.slice(0, cursorPosition);
    
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      
      // If there's no space between @ and cursor, it's a potential mention search
      if (!textAfterAt.includes(' ')) {
        // Check if this is already an established mention to blink re-triggering
        const isAlreadyMention = mentions.some(m => m.start === lastAtIndex);
        
        if (isAlreadyMention || isDeletion) {
          setMentionSearchQuery('');
          return;
        }

        setMentionSearchQuery(textAfterAt);
        if (textBeforeCursor.endsWith('@') || textAfterAt.length > 0) {
           dispatch(toggleCreatorSelectorModal({show: true}));
        }
      } else {
        setMentionSearchQuery('');
      }
    } else {
      setMentionSearchQuery('');
    }
  }, [caption, selection.start, mentions]);

  const handleCreatorSelect = (creator) => {
    const {displayName, _id} = creator;
    
    const textBeforeCursor = caption.slice(0, selection.start);
    const textAfterCursor = caption.slice(selection.start);
    
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const newText = textBeforeCursor.slice(0, lastAtIndex) + '@' + displayName + textAfterCursor;
      
      // Update mentions metadata
      const newMention = {
        id: _id,
        name: displayName,
        start: lastAtIndex
      };
      
      setMentions([...mentions, newMention]);
      setCaption(newText);
      setCount(newText.length);
      setMentionSearchQuery(''); // Reset search query after selection
    }
  };

  const [visibility, setVisibility] = useState('all'); // 'all' | 'user' | 'creator' (Admin only)
  const [forSubscribers, setForSubscribers] = useState(false); // (Non-Admin only)

  const [isEnabled, setIsEnabled] = useState(false);

  const toggleSwitch = () => {
    if (!isEnabled) {
      dispatch(toggleDateTimePicker({
        show: 1,
        type: 'datetime',
        date: new Date(Date.now() + 120000).toISOString()
      }));
    } else {
      setIsEnabled(false);
    }
  };

  useEffect(() => {
    dispatch(resetPostIndex());
    dispatch(resetUploadProgress());

    if (!isEnabled) {
      dispatch(toggleShowProgress({show: true}));
    } else {
      dispatch(toggleShowProgress({show: false}));
    }

    console.log('EMNA', isEnabled);
  }, [isEnabled]);

  useEffect(() => {
    return () => {
      dispatch(resetDateTimePicker());
    };
  }, []);

  const resetMediaState = () => {
    console.log('Resetting all media states...');

    setBase64Image(undefined);
    setLoading(false);
    setMediaUris([]);
    setVideoUrl(undefined);
    setIsMediaVideo(false);
    setMediaSelected(false);
  };

  const selectMedia = async () => {
    console.log('Selecting media');
    if (loading) return;

    try {
      setLoading(true);
      const media = await ImageCropPicker.openPicker({
        multiple: true,
        maxFiles: 5,
        mediaType: 'any',
        forceJpg: true,
        compressImageQuality: 1.0,
        compressVideoPreset: 'Passthrough',
      });

      if (!media || media.length === 0) {
        setLoading(false);
        return;
      }

      const hasVideo = media.some(item => 
        (item.mime && item.mime.startsWith('video/')) || 
        ['mp4', 'mov', 'avi', 'mkv', 'm4v', '3gp'].includes((item.path || item.filename || '').split('.').pop()?.toLowerCase())
      );
      const hasImage = media.some(item => 
        (item.mime && item.mime.startsWith('image/')) || 
        !((item.mime && item.mime.startsWith('video/')) || ['mp4', 'mov', 'avi', 'mkv', 'm4v', '3gp'].includes((item.path || item.filename || '').split('.').pop()?.toLowerCase()))
      );

      console.log('SELECT_MEDIA_DEBUG:', {
        hasVideo,
        media: media.map(m => ({ mime: m.mime, path: m.path }))
      });

      if (hasVideo && hasImage) {
        LoginPageErrors('Please select either images or a video, not both.');
        setLoading(false);
        return;
      }

      setIsMediaVideo(hasVideo);

      if (hasVideo && media.length > 1) {
        LoginPageErrors('You can only select one video at a time.');
        setLoading(false);
        return;
      }

      if (hasImage && media.length > 5) {
        LoginPageErrors('You can select up to 5 images only.');
        setLoading(false);
        return;
      }

      if (hasVideo) {
        // Video selected — stay on CreatePost, set video state
        const video = media[0];
        
        // 1. Size check (150MB)
        if (video.size > 150 * 1024 * 1024) {
          LoginPageErrors('Video size must be less than 150MB.');
          setLoading(false);
          return;
        }

        // 2. Metadata checks (Duration and Resolution)
        const meta = await getVideoMetadata(video.path);
        if (meta) {
          // Duration check (60s = 60000ms)
          if (meta.duration > 60000) {
            LoginPageErrors('Video duration must be less than 1 minute.');
            setLoading(false);
            return;
          }

          // Resolution check (1080p max)
          const isTooLarge = Math.max(meta.width || 0, meta.height || 0) > 1920;
          if (isTooLarge) {
            LoginPageErrors('Video resolution must be 1080p or lower (4K is not supported).');
            setLoading(false);
            return;
          }
        }

        resetMediaState();
        setVideoUrl(video.path);
        setIsMediaVideo(true);
        setMediaSelected(true);

        generateVideoThumbnail(video.path).then(thumbnailUri => {
          if (thumbnailUri) {
            setMediaUris([thumbnailUri]);
          }
        });
        setLoading(false);
      } else {
        // Images selected — go to FilterScreen
        navigation.navigate('filterScreen', {
          uris: media.map(img => img.path),
          width: 4,
          height: 5,
        });
        setLoading(false);
      }
    } catch (err) {
      console.error('Error selecting media:', err);
      if (err.message && err.message.includes('permission')) {
        Alert.alert(
          'Photo Access Required',
          'Please allow access to your photo library to select images for your post.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              const { Linking } = require('react-native');
              Linking.openSettings();
            }},
          ]
        );
      } else if (err.message !== 'User cancelled image selection') {
        LoginPageErrors('An unexpected error occurred.');
      }
      setLoading(false);
    }
  };

  const openVideoPreview = () => {
    navigation.navigate('CreatePostVideoPreview', {videoUri: videoUrl});
  };

  useEffect(() => {
    if (dateTimePickerStatus === 'confirmed') {
      setIsEnabled(true);
    }
  }, [dateTimePickerStatus]);

  useEffect(() => {
    if (route?.params?.uris) {
      console.log('URIs received in CreatePost:', route.params.uris);
      setMediaUris(route.params.uris);
      setMediaSelected(true);
      // Clear video state when images arrive from FilterScreen
      setIsMediaVideo(false);
      setVideoUrl(undefined);
    }
  }, [route?.params?.uris]);

  // Handle video passed directly from BottomSheet
  useEffect(() => {
    const validateAndSetVideo = async () => {
      if (route?.params?.uri && route?.params?.isVideo) {
        console.log('Video URI received in CreatePost:', route.params.uri);

        try {
          // 1. Size check
          const stat = await RNFS.stat(route.params.uri);
          if (stat.size > 150 * 1024 * 1024) {
            LoginPageErrors('Video size must be less than 150MB.');
            resetMediaState();
            return;
          }

          // 2. Metadata checks
          const meta = await getVideoMetadata(route.params.uri);
          if (meta) {
            if (meta.duration > 60000) {
              LoginPageErrors('Video duration must be less than 1 minute.');
              resetMediaState();
              return;
            }
            if (Math.max(meta.width || 0, meta.height || 0) > 1920) {
              LoginPageErrors('Video resolution must be 1080p or lower (4K is not supported).');
              resetMediaState();
              return;
            }
          }

          setVideoUrl(route.params.uri);
          setIsMediaVideo(true);
          setMediaSelected(true);

          // Generate thumbnail for the video
          const thumbnailUri = await generateVideoThumbnail(route.params.uri);
          if (thumbnailUri) {
            console.log('Video thumbnail generated:', thumbnailUri);
            setMediaUris([thumbnailUri]);
          }
        } catch (error) {
          console.error('Error handling BottomSheet video:', error);
          LoginPageErrors('Could not process the selected video.');
        }
      }
    };

    validateAndSetVideo();
  }, [route?.params?.uri, route?.params?.isVideo]);

  const getFirstNonPinnedIndex = posts => {
    if (!posts || posts.length === 0) return -1;
    return posts.findIndex(post => !post.pinned);
  };

  // const getPostList = async () => {
  //   let {data: postData} = await postList({token}, false);

  //   if (postData) {
  //     let pinnedPost = postData?.data?.pinnedPosts.map(x => ({
  //       ...x,
  //       pinned: true,
  //     }));

  //     let combinedPinnedUnPinnedPosts = [...pinnedPost, ...postData?.data?.posts];

  //     dispatch(setFeedCacheMyPost({data: combinedPinnedUnPinnedPosts}));
  //   }
  // };

  const getPostList = async () => {
    let {data: postData} = await postList({token}, false);

    if (postData) {
      let pinnedPost = postData?.data?.pinnedPosts.map(x => ({
        ...x,
        pinned: true,
      }));

      let combinedPinnedUnPinnedPosts = [...pinnedPost, ...postData?.data?.posts];

      dispatch(setFeedCacheMyPost({data: combinedPinnedUnPinnedPosts}));

      // just get the index
      const firstNonPinnedIndex = getFirstNonPinnedIndex(combinedPinnedUnPinnedPosts);
      console.log('First non-pinned index:', firstNonPinnedIndex);
      dispatch(setPostIndex(firstNonPinnedIndex));
    }
  };

  useEffect(() => {
    if (getPostContent?.length <= 0) {
      console.log(getPostContent.length, 'IOIOIOIOIO');

      getPostList();
    }
  }, [getPostContent]);

  const handleSendPost = async () => {
    if (isUploading || processing) {
      LoginPageErrors('Please wait, posting your last post...');
      return;
    }

    dispatch(resetUploadProgress());

    if (!mediaUris || mediaUris.length === 0) {
      LoginPageErrors('Please select any media');
      return;
    }

    const previewUri = mediaUris[0]?.startsWith('file://') ? mediaUris[0] : `file://${mediaUris[0]}`;
    
    dispatch(startProcessing({previewUrl: previewUri}));
    navigate('home');

    setLoading(true);
    await displayNotificationProgressIndicator();
    
    const uploadedFiles = [];
    let videoThumbnailUrl = '';
    
    try {
        dispatch(startUpload());

        if (isMediaVideo && videoUrl) {
            // 0. Normalize URI: On Android, content:// URIs can't be read by FormData.
            //    Copy to a local cache file first.
            let normalizedVideoUrl = videoUrl;
            if (Platform.OS === 'android' && videoUrl.startsWith('content://')) {
                try {
                    const localPath = `${RNFS.CachesDirectoryPath}/video_upload_${Date.now()}.mp4`;
                    await RNFS.copyFile(videoUrl, localPath);
                    normalizedVideoUrl = `file://${localPath}`;
                    console.log('📁 Copied content:// video to local path:', normalizedVideoUrl);
                } catch (copyErr) {
                    console.error('❌ Failed to copy content:// video:', copyErr);
                    // Fall through with original URI as last resort
                }
            }

            // 1. Compress the video first
            const compressedVideoUrl = await videoReducer(normalizedVideoUrl);
            const finalVideoUrl = compressedVideoUrl || normalizedVideoUrl;

            console.log('📤 Video upload URI:', finalVideoUrl);

            // Ensure the final URI has the correct prefix
            const uploadUri = finalVideoUrl.startsWith('file://') || finalVideoUrl.startsWith('content://') 
                ? finalVideoUrl 
                : `file://${finalVideoUrl}`;

            // 2. Upload the (compressed) video
            const videoFormData = new FormData();
            videoFormData.append('keyName', 'create_post');
            videoFormData.append('file', {
                name: `video_${Date.now()}.mp4`,
                type: 'video/mp4',
                uri: uploadUri,
            });

            const vidResponse = await createPostUploadAttachment({ token, formData: videoFormData }).unwrap();
            if (vidResponse?.data?.statusCode === 200) {
                uploadedFiles.push({
                    url: vidResponse.data.data.url,
                    type: 'post',
                    format: 'video'
                });
            } else {
                throw new Error('Video upload failed');
            }

            // 3. Upload the thumbnail
            const thumbUri = mediaUris[0];
            const thumbFormData = new FormData();
            thumbFormData.append('keyName', 'create_post');
            thumbFormData.append('file', {
                name: `thumb_${Date.now()}.jpeg`,
                type: 'image/jpeg',
                uri: thumbUri.startsWith('file://') || thumbUri.startsWith('content://') ? thumbUri : `file://${thumbUri}`,
            });

            const thumbResponse = await createPostUploadAttachment({ token, formData: thumbFormData }).unwrap();
            if (thumbResponse?.data?.statusCode === 200) {
                videoThumbnailUrl = thumbResponse.data.data.url;
            }
        } else {
            // Upload images
            for (let i = 0; i < mediaUris.length; i++) {
                const uri = mediaUris[i];
                const fileUri = uri.startsWith('file://') || uri.startsWith('content://') ? uri : `file://${uri}`;
                
                const formData = new FormData();
                formData.append('keyName', 'create_post');
                formData.append('file', {
                    name: `photo_${i}.jpeg`,
                    type: 'image/jpeg',
                    uri: fileUri,
                });

                const response = await createPostUploadAttachment({ token, formData }).unwrap();
                
                if (response?.data?.statusCode === 200) {
                    uploadedFiles.push({
                        url: response.data.data.url,
                        type: 'post',
                        format: 'image'
                    });
                } else {
                    throw new Error('Upload failed for one or more files');
                }
            }
        }

        // All files uploaded, now create the post
        let imagePreviewUrl = '';
        const isCurrentlySubOnly = userRole === 'admin' ? false : forSubscribers;
        if (isCurrentlySubOnly && mediaUris.length > 0) {
            // Generate preview from the first media item (if video, this is the thumbnail)
            const firstImageUri = mediaUris[0].startsWith('file://') || mediaUris[0].startsWith('content://') ? mediaUris[0] : `file://${mediaUris[0]}`;
            imagePreviewUrl = await generateBase64Image(firstImageUri);
        }

        const mediaObject = {
            postContent: getRawCaption().trim(),
            post_content_files: uploadedFiles,
            image: !isMediaVideo ? {
                hasAspectRatio: true,
                aspectRatio: {
                    width: route?.params?.width || 4,
                    height: route?.params?.height || 5
                },
                thumbnail: {
                    url: isCurrentlySubOnly ? imagePreviewUrl : uploadedFiles[0]?.url,
                    type: 'image_thumbnail',
                    format: 'image',
                },
                hasThumbnail: true,
                hasPreview: isCurrentlySubOnly,
                hasImage: true,
            } : undefined,
            video: isMediaVideo ? {
                thumbnail: {
                    url: videoThumbnailUrl,
                    type: 'video_thumbnail',
                    format: 'image',
                },
                hasPreview: isCurrentlySubOnly,
                hasThumbnail: true,
                hasVideo: true,
            } : undefined,
            image_preview: {
                url: imagePreviewUrl,
                type: 'image',
                format: 'png',
                mobilePreview: '',
            },
            for_subscribers: isCurrentlySubOnly,
            activate_on: isEnabled ? date : '',
            forcreator: userRole === 'admin' ? (visibility === 'all' || visibility === 'creator') : true,
            foruser: userRole === 'admin' ? (visibility === 'all' || visibility === 'user') : true,
        };

        console.log('CREATE_POST_PAYLOAD:', JSON.stringify(mediaObject, null, 2));

        const postResponse = await createPost({ token, data: mediaObject }).unwrap();
        
        if (postResponse?.statusCode === 200) {
            successSnacks('Created your post successfully.');
            dispatch(addNewPostToMyProfileCache({ newPost: postResponse.data }));
            
            // Full state reset
            setCaption('');
            setIsEnabled(false);
            setMediaUris([]);
            setMediaSelected(false);
            setVideoUrl(null);
            setIsMediaVideo(false);
            setVisibility('all');
            setForSubscribers(false);
            setActiveIndex(0);
            dispatch(resetDateTimePicker());
            
            dismissProgressNotification();
            getPostList();
        } else {
            LoginPageErrors('Failed to create post');
        }
    } catch (error) {
        console.error('Post creation error:', error);
        LoginPageErrors(error.message || 'Something went wrong');
        dismissProgressNotification();
    } finally {
        setLoading(false);
        dispatch(resetUploadProgress());
    }
  };

  return (
    <View style={styles.container} testID="create-post-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // Adjust this value based on your header height
      >
        <ScrollView keyboardDismissMode="on-drag" ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: Platform.OS === 'ios' ? 20 : 40, paddingHorizontal: responsiveWidth(4), paddingTop: responsiveWidth(4)}} keyboardShouldPersistTaps="handled">
          <View style={{borderWidth: responsiveWidth(0.5), borderRadius: responsiveWidth(3.73), width: responsiveWidth(92)}}>
            <View style={styles.FollowersSubScribersToggle}>
              {userRole === 'admin' ? (
                <>
                  <TouchableOpacity 
                    testID="create-post-all-toggle" 
                    onPress={() => setVisibility('all')} 
                    style={[styles.visibilityTab, visibility === 'all' ? styles.activeTabStyle : null]}
                  >
                    <Text style={styles.tabText}>All</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    testID="create-post-user-toggle" 
                    onPress={() => setVisibility('user')} 
                    style={[styles.visibilityTab, visibility === 'user' ? styles.activeTabStyle : null]}
                  >
                    <Text style={styles.tabText}>User</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    testID="create-post-creator-toggle" 
                    onPress={() => setVisibility('creator')} 
                    style={[styles.visibilityTab, visibility === 'creator' ? styles.activeTabStyle : null]}
                  >
                    <Text style={styles.tabText}>Creator</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    testID="create-post-followers-toggle" 
                    onPress={() => setForSubscribers(false)} 
                    style={[styles.Followers, forSubscribers === false ? styles.activeTabStyle : null]}
                  >
                    <Text style={styles.tabText}>Followers</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    testID="create-post-subscribers-toggle" 
                    onPress={() => setForSubscribers(true)} 
                    style={[styles.SubScribers, forSubscribers === true ? styles.activeTabStyle : null]}
                  >
                    <Text style={styles.tabText}>Subscribers</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View style={styles.textInputContainer}>
            {mediaUris && mediaUris.length > 0 ? (
              <View style={styles.carouselContainer}>
                <Carousel
                    loop={false}
                    width={responsiveWidth(92) - 26}
                    height={isMediaVideo ? (responsiveWidth(92) - 26) * (9/16) : (responsiveWidth(92) - 26) * (305/319)}
                    autoPlay={false}
                    data={mediaUris}
                    onSnapToItem={(index) => setActiveIndex(index)}
                    renderItem={({ item, index }) => (
                        <View style={styles.carouselItem}>
                            <Image 
                                source={{uri: item.startsWith('file://') ? item : `file://${item}`}} 
                                resizeMethod="resize" 
                                resizeMode="cover" 
                                style={{height: '100%', width: '100%', borderRadius: 10}} 
                            />
                            <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: '#000000'}} pointerEvents="none" />
                            {isMediaVideo && (
                                <TouchableOpacity 
                                    testID="create-post-video-preview-btn"
                                    style={{position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -WIDTH_SIZES['36'] / 2 }, { translateY: -WIDTH_SIZES['36'] / 2 }]}} 
                                    onPress={() => openVideoPreview()}
                                >
                                    <DIcon name={'play-circle'} provider={'FontAwesome5'} color="#fff" size={WIDTH_SIZES['36']} />
                                </TouchableOpacity>
                            )}
                            {!isMediaVideo && (
                                <View style={styles.imageIndexIndicator}>
                                    <Text style={styles.imageIndexText}>{index + 1}/{mediaUris.length}</Text>
                                </View>
                            )}
                        </View>
                    )}
                />
                {!isMediaVideo && mediaUris.length > 1 && (
                <View style={styles.dotsContainer}>
                  {mediaUris.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        i === activeIndex ? styles.activeDot : styles.inactiveDot,
                      ]}
                    />
                  ))}
                </View>
                )}
                <TouchableOpacity testID="create-post-change-media-btn" onPress={selectMedia} style={styles.selectMedia}>
                  <Image source={require('../../Assets/Images/ChangeProfile.png')} style={{height: responsiveWidth(8), width: responsiveWidth(8), resizeMode: 'contain', zIndex: 8, alignSelf: 'center', marginRight: responsiveWidth(1)}} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity testID="create-post-select-media-btn" style={styles.selectImageBox} onPress={selectMedia}>
                <View style={[styles.imageContainer, {marginVertical: WIDTH_SIZES['10'], marginTop: WIDTH_SIZES['84']}]}>
                  {/* <Image source={require("../../Assets/Images/selectMedia.png")} resizeMethod="resize" resizeMode="contain" style={{ width: "100%" }} /> */}
                  <Upload />
                </View>
                <Text style={{fontFamily: 'Rubik-Medium', textAlign: 'center', color: '#282828', fontSize: 14, marginBottom: 80}}>Click to upload your files </Text>
              </TouchableOpacity>
            )}

            <View style={{position: 'relative', marginTop: 8}}>
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Text style={[styles.textInputStyle, {color: '#1e1e1e'}]}>
                  {(() => {
                    let lastIndex = 0;
                    const parts = [];
                    const sortedMentions = [...mentions].sort((a, b) => a.start - b.start);
                    
                    sortedMentions.forEach((m, i) => {
                      parts.push(<Text key={`text-${i}`}>{caption.slice(lastIndex, m.start)}</Text>);
                      parts.push(
                        <Text key={`mention-${i}`} style={{color: '#FFA86B'}}>
                          {`@${m.name}`}
                        </Text>
                      );
                      lastIndex = m.start + m.name.length + 1;
                    });
                    parts.push(<Text key="last">{caption.slice(lastIndex)}</Text>);
                    return parts;
                  })()}
                </Text>
              </View>

              <TextInput
                testID="create-post-caption-input"
                ref={textInputRef}
                selectionColor={'#1e1e1e'}
                cursorColor={'#1e1e1e'}
                onFocus={handleTextInputFocus}
                placeholderTextColor={'#7e7e7e'}
                inputAccessoryViewID={inputAccessoryViewID}
                onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
                value={caption}
                style={[styles.textInputStyle, {color: 'transparent', zIndex: 1}]}
                maxLength={500}
                placeholder={caption ? "" : "Write caption here..."}
                multiline
                autoCorrect={false}
                spellCheck={false}
                onChangeText={x => handleTextInput(x)}
              />
            </View>
            <Text style={styles.charCount}>{`${count}/500`}</Text>
          </View>

          {isEnabled && (
            <TouchableOpacity activeOpacity={0.8} onPress={toggleSwitch} style={styles.scheduleActiveRow}>
              <View style={styles.scheduleActiveLeft}>
                <Ionicons name="time-outline" size={18} color="#1e1e1e" />
                <Text style={styles.scheduleActiveText}>
                  {date.toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'})} at {date.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'})}
                </Text>
              </View>
              <DIcon provider={'MaterialIcons'} name={'close'} size={18} color="#999" />
            </TouchableOpacity>
          )}

          {!isEnabled && (
            <TouchableOpacity activeOpacity={0.7} onPress={toggleSwitch} style={styles.scheduleRow}>
              <View style={styles.scheduleRowLeft}>
                <Ionicons name="time-outline" size={18} color="#1e1e1e" />
                <Text style={styles.scheduleRowText}>Schedule this Post</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#BFBFBF" />
            </TouchableOpacity>
          )}

          <View style={{width: '99%', justifyContent: 'center'}}>
            <AnimatedButton testID="create-post-submit-btn" title={'Post'} buttonMargin={0} loading={loading} onPress={() => handleSendPost()} disabled={!mediaSelected} />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
      <CreatorSelectorModal 
        onSelect={handleCreatorSelect} 
        onClose={() => setMentionSearchQuery('')}
        initialSearch={mentionSearchQuery} 
      />
    </View>
  );
};

export default CreatePost;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    flex: 1,
    flexDirection: 'column',
  },

  selectImageBox: {
    borderWidth: 1.5,
    borderRadius: 10,
    borderStyle: 'dashed',
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: 319,
    height: 305,
    position: 'relative',
  },

  imageContainer: {
    alignSelf: 'center',
    resizeMode: 'contain',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: responsiveWidth(2),
    width: '100%',
    overflow: 'hidden',
    objectFit: 'cover',
    // backgroundColor : 'red',
  },
  textInputContainer: {
    borderWidth: responsiveWidth(0.5),
    marginTop: responsiveWidth(4),
    padding: 13,
    backgroundColor: '#fff',
    borderRadius: responsiveWidth(4),
    // height: 275,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 10,
  },
  dot: {
    height: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#000000',
  },
  activeDot: {
    width: 16,
    backgroundColor: '#FFA86B',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#FFFFFF',
  },
  textInputStyle: {
    width: '100%',
    paddingLeft: responsiveWidth(2),
    paddingRight: responsiveWidth(2), // Added paddingRight for symmetry
    fontFamily: 'Rubik-Regular',
    textAlignVertical: 'top',
    marginTop: 0, // Set to 0 here to avoid double margin
    paddingTop: 0, // Explicitly set padding to 0
    paddingBottom: 0,
    paddingVertical: 0,
    fontSize: 14,
    color: '#1e1e1e',
    lineHeight: 20,
    includeFontPadding: false,
    letterSpacing: 0, // Ensure no kerning drift
  },

  charCount: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.5),
    textAlign: 'right',
    marginRight: responsiveWidth(0.9),
    // backgroundColor : 'red',
    paddingBottom: responsiveWidth(1),
    // marginBottom : responsiveWidth(7)
  },

  Followers: {
    flexBasis: '50%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  SubScribers: {
    flexBasis: '50%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibilityTab: {
    flexBasis: '33%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTabStyle: {
    backgroundColor: '#FFA86B',
    borderWidth: responsiveWidth(0.3),
    borderRadius: responsiveWidth(2.5),
  },
  tabText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[14],
    color: '#282828',
  },
  FollowersSubScribersToggle: {
    alignSelf: 'center',
    flexDirection: 'row',
    // gap: responsiveWidth(2.8),
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: responsiveWidth(2),
    height: 54,
    padding: responsiveWidth(1),
    width: '100%',
  },

  loginButton: {
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#FFA86B',
    borderTopRightRadius: responsiveWidth(5),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Rubik-Medium',
    elevation: 1,
    fontWeight: '600',
    width: responsiveWidth(90),
    height: responsiveWidth(13),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
    elevation: 1,

    fontSize: responsiveFontSize(2.4),
    padding: padios(responsiveWidth(2.6)),
    overflow: 'hidden',
    marginTop: responsiveWidth(4),
    borderBottomWidth: responsiveWidth(1.5),
  },

  loginButtonSelect: {
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#FFA86B',
    borderRadius: 10,
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Rubik-Medium',
    elevation: 1,
    fontWeight: '600',
    width: responsiveWidth(90),
    height: responsiveWidth(13),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
    elevation: 1,
    fontSize: responsiveFontSize(2.4),
    padding: padios(responsiveWidth(2.6)),
    overflow: 'hidden',
    marginTop: responsiveWidth(4),
    borderBottomWidth: responsiveWidth(1.2),
    borderRightWidth: responsiveWidth(1.2),
    borderLeftWidth: responsiveWidth(0.3),
    borderTopWidth: responsiveWidth(0.3),
  },

  fahduTripodContainer: {
    // borderWidth : 1,
    width: '100%',
    height: responsiveWidth(50),
    resizeMode: 'contain',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveWidth(15),
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F7E6',
    // borderWidth: 1,
    borderColor: 'green',
    borderRadius: responsiveWidth(3.73),
    padding: responsiveWidth(2),
    width: responsiveWidth(92),
    height: responsiveWidth(13),
    paddingLeft: responsiveWidth(3),
    marginTop: WIDTH_SIZES['24'],
  },
  errorIconOld: {
    marginRight: responsiveWidth(2),
  },
  errorIcon: {
    marginRight: responsiveWidth(2),
    position: 'absolute',
    right: 0,
  },
  errorText: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.8),
    color: 'green',
    flexShrink: 1,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F6F2',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    marginTop: WIDTH_SIZES['24'],
  },
  scheduleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduleRowText: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.8),
  },
  scheduleActiveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF4EC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFA86B',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: WIDTH_SIZES['24'] + WIDTH_SIZES['2'],
  },
  scheduleActiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduleActiveText: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.7),
  },
  selectMedia: {
    alignSelf: 'flex-start',
    position: 'absolute',
    height: 36,
    width: 36,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    top: WIDTH_SIZES['10'],
    left: WIDTH_SIZES['10'],
    zIndex: 99,
  },
  carouselContainer: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  carouselItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndexIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(30, 30, 30, 0.73)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
    height: 26,
    zIndex: 10,
  },
  imageIndexText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Rubik-Medium',
    lineHeight: 12,
    textAlign: 'center',
  },
});
