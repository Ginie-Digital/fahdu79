import { StyleSheet, Text, View } from "react-native";
import React from "react";
import ChatRoomHeaderLeft from "../Src/Components/ChatRoomHeaderLeft";
import HomeHeaderRight from "../Src/Components/HomeHeaderRight";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { responsiveWidth } from "react-native-responsive-dimensions";
import { getStatusBarHeight } from "react-native-status-bar-height";

import {Header} from '@react-navigation/elements'



const HomeHeader = () => {

  return (


      <Header
      
      headerLeft={() => <ChatRoomHeaderLeft/>}
      headerRight={() => <HomeHeaderRight/>}
      headerShadowVisible = {false}
      
      />

  );
};

export default HomeHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    // justifyContent: "space-between",
    backgroundColor: "#fffdf6",


  },
});
