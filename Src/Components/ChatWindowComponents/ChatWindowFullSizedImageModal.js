import {StyleSheet, Text, View, Image, Platform, TouchableOpacity} from 'react-native';
import React from 'react';

import Modal from 'react-native-modal';
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';
import {useSelector, useDispatch} from 'react-redux';
import { toggleChatWindowFullSizedImageModal } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import Pinchable from 'react-native-pinchable';
import DIcon from '../../../DesiginData/DIcons';
import { getStatusBarHeight } from 'react-native-status-bar-height';


const ChatWindowFullSizedImageModal = ({ uri }) => {
  const dispatch = useDispatch();
  

  

  const previewModalShow = useSelector(
    state => state.hideShow.visibility.chatWindowFullSizedImageModal,
  );

return (
      
      <Modal
        animationIn={'fadeInUp'}
        animationOut={'fadeOut'}
        animationInTiming={150}
        animationOutTiming={150}
        onRequestClose={() => dispatch(toggleChatWindowFullSizedImageModal())}
        transparent={true}
        isVisible={previewModalShow}
        backdropColor="black"
        onBackButtonPress={() => dispatch(toggleChatWindowFullSizedImageModal())}
        onBackdropPress={() => dispatch(toggleChatWindowFullSizedImageModal())}
        style={{
          flex: 1,
          backgroundColor: '#fffdf6',
          alignSelf: 'center',
          width: '100%',
          margin: 0,
        }}>
          <View style={ [styles.fullSizeImageContainer, Platform.OS === "ios" ? { marginTop : getStatusBarHeight(true)} : {}] }>
            <TouchableOpacity style = {styles.cross} onPress={() => dispatch(toggleChatWindowFullSizedImageModal())}>
              <DIcon name={'x'} provider={'Feather'} size = {responsiveWidth(8)} />
            </TouchableOpacity>
            <View style={ styles.innerImageWrapper }>
            <Pinchable>
              <Image source={{ uri }} resizeMethod='resize' resizeMode='contain' style={styles.fullSizedImage}/>
            </Pinchable>
            </View>              
          </View>
       </Modal>
    
  );
};

export default ChatWindowFullSizedImageModal;

const styles = StyleSheet.create({
    fullSizeImageContainer: {
        flex: 1,
        justifyContent : 'center',
        position : 'relative',
        // backgroundColor : 'red'
    },
    fullSizedImage: {
        // flex: 1,
        width: "100%",
        height : "100%",
        
    },
    innerImageWrapper: {
        
        
        height: responsiveWidth(100),
        width: "100%",
        resizeMode : 'contain',
    },
    cross : {
      // borderWidth : 1,
      width : responsiveWidth(10),
      height : responsiveWidth(10),
      justifyContent : 'center',
      alignItems : 'center',
      position : 'absolute',
      top : responsiveWidth(4),
      right : responsiveWidth(6),
    }
});
