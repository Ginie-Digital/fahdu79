import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { useNavigation } from "@react-navigation/native";
import { useVideoPlayer, VideoView } from 'expo-video';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CreatePostVideoPreview = ({ route }) => {
  const navigation = useNavigation();
  const videoUri = route?.params?.videoUri || "https://fahdu.s3.ap-south-1.amazonaws.com/post/video-1679564683518.mp4";

  const player = useVideoPlayer(videoUri, player => {
    player.loop = true;
    player.play();
  });

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <VideoView
        style={{
          flex: 1,
          width: "100%",
        }}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 40,
          left: 20,
          padding: 10,
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: 20,
        }}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default CreatePostVideoPreview;

const styles = StyleSheet.create({});
