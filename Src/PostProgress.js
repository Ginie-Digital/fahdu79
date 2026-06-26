import React, {useEffect, useState} from 'react';
import {View, Text, Image, Pressable, StyleSheet} from 'react-native';
import * as Progress from 'react-native-progress';
import ShimmerText from './TextShimmer';
import {useDispatch, useSelector} from 'react-redux';
import {WIDTH_SIZES} from '../DesiginData/Utility';
import {useLazyMyPostListQuery} from '../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {navigate} from '../Navigation/RootNavigation';
import {resetPostIndex} from '../Redux/Slices/NormalSlices/UploadSlice';
import AnimatedButton from './Components/AnimatedButton';

export default function PostProgress() {
  // states: 'processing' | 'uploading' | 'finished'
  const [status, setStatus] = useState('processing');

  const profilePic = {uri: 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_7.png'};

  const {progress, isUploading, previewUrl, isModalVisible, processing, postIndex} = useSelector(state => state.upload);

  const showProgress = useSelector(state => state.hideShow.visibility.showPostProgress);

  const displayName = useSelector(state => state.auth.user.currentUserDisplayName);

  const dispatch = useDispatch();

  // useEffect(() => {
  //   console.log({postIndex});

  //   if (postIndex) {
  //     navigate('allmyposts', {scrollIndex: postIndex});
  //   }
  // }, [postIndex]);

  console.log('SHOWPROG', showProgress);

  const handleSendPost = () => {
    console.log(postIndex);

    if (postIndex != null) {
      navigate('allmyposts', {scrollIndex: postIndex});
    }

    dispatch(resetPostIndex());
  };

  if (showProgress) {
    return (
      isModalVisible && (
        <View style={[styles.container, isUploading || postIndex >= 0 || processing ? {paddingVertical: 18} : null]}>
          {processing && (
            <View style={styles.row}>
              {previewUrl && <Image source={{uri: previewUrl}} style={styles.image} />}
              <View style={{flex: 1}}>
                <ShimmerText>Post is being processed...</ShimmerText>
              </View>
            </View>
          )}

          {isUploading && (
            <View style={styles.row}>
              <Image source={{uri: previewUrl}} style={styles.image} />
              <View style={{flex: 1}}>
                <ShimmerText>{`Uploading to ${displayName}`}</ShimmerText>
                <Progress.Bar progress={Number(progress) / 100} width={null} height={4} borderRadius={6} color="#FFA86B" borderColor="#2A2A2A" unfilledColor="#2A2A2A" style={{marginTop: 6}} />
              </View>
            </View>
          )}

          {!processing && !isUploading && (
            <View style={styles.row}>
              <Image source={profilePic} style={styles.image} />
              <View style={{flex: 1}}>
                <Text style={styles.text}>Boom! Your post is up 🚀</Text>
              </View>
              {/* 
            <Pressable   style={({pressed}) => [styles.button, {backgroundColor: pressed ? '#FFC399' : '#FFA86B'}]}>
              <Text style={styles.btnText}>See Now</Text>
            </Pressable> */}
              <View style={styles.button}>
                <AnimatedButton onPress={handleSendPost} disabled={!Number(postIndex >= 0)} showOverlay={false} title={'See Now'} buttonMargin={0} style={{height: 32, borderRadius: 10}} />
              </View>
            </View>
          )}
        </View>
      )
    );
  }
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    backgroundColor: '#0D0D0D',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 43,
    height: 43,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#2A2A2A',
  },
  text: {
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
    color: '#FFFFFF',
    // fontWeight: '500',
  },
  button: {
    height: 36,
    borderRadius: 100,
    width: 95,
    // borderWidth: 1,
    // alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-SemiBold',
    fontSize: 12,
  },
});
