import {StyleSheet, Text, View, StatusBar, TouchableOpacity, Platform} from 'react-native';
import React from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useDispatch, useSelector } from 'react-redux';
import Modal from 'react-native-modal';
import { toggleChatWindowVideoModal } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import DIcon from '../../../DesiginData/DIcons';
import { responsiveWidth } from 'react-native-responsive-dimensions';

const ChatWindowVideoModal = ({ fullVideoModalUri }) => {
  const dispatch = useDispatch();
  const videoUri = fullVideoModalUri || 'https://fahdu.s3.ap-south-1.amazonaws.com/post/video-1679564683518.mp4';
  
  const player = useVideoPlayer(videoUri, player => {
    player.loop = true;
    player.play();
  });

  const previewModalShow = useSelector(
    state => state.hideShow.visibility.chatWindowVideoModal,
  );

  return (
      <Modal
        animationIn={'fadeInUp'}
        animationOut={'fadeOut'}
        animationInTiming={150}
        animationOutTiming={150}
        onRequestClose={() => dispatch(toggleChatWindowVideoModal())}
        transparent={true}
        isVisible={previewModalShow}
        backdropColor="black"
        onBackButtonPress={() => dispatch(toggleChatWindowVideoModal())}
        onBackdropPress={() => dispatch(toggleChatWindowVideoModal())}
        useNativeDriver
        style={{
          flex: 1,
          backgroundColor: 'black',
          alignSelf: 'center',
          width: '100%',
          margin: 0,
        }}>
        <View style={{ flex: 1 }}>
          <VideoView
            style={{
              flex: 1,
              width: '100%',
            }}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
          />
          <TouchableOpacity 
            style={{ position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 16, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }} 
            onPress={() => dispatch(toggleChatWindowVideoModal())}
          >
             <DIcon name={'arrowleft'} provider={'AntDesign'} color="#fff" size={responsiveWidth(5.5)} />
          </TouchableOpacity>
        </View>
      </Modal>
  );
};

export default ChatWindowVideoModal;
