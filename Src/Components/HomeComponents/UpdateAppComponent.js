import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import React, { memo, useEffect, useState } from "react";
import { responsiveFontSize, responsiveWidth } from "react-native-responsive-dimensions";
import LottieView from "lottie-react-native";

import DeviceInfo from "react-native-device-info";
import { useDispatch } from "react-redux";
import reduxStorage from "../../../MMKVConfig";

const UpdateAppComponent = () => {


  const [heading, setHeading] = useState("");

  const [descriptions, setDescriptions] = useState("");

  const [version, setVersion] = useState("");

  const [loading, setLoading] = useState(true)

  const dispatch = useDispatch()

  

  if(loading) {
    return null
  }

  if(version !== DeviceInfo.getVersion()) {
    return (
      <View style={styles.container}>
        <View style={styles.lottieContainer}>
          <LottieView
            source={require("../../../Assets/Animation/Rocket.json")}
            autoPlay
            loop
            style={{
              height: "100%",
              width: "100%",
            }}
          />
        </View>
  
        <View style={styles.textContainer}>
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.description}>{descriptions}</Text>
        </View>
  
        <View style={styles.actionWrapper}>
          <Pressable style={styles.getButton} onPress={() => Linking.openURL("https://play.google.com/store/apps/details?id=com.fahdu")}>
            <Text style={styles.getText}>Update</Text>
          </Pressable>
        </View>
      </View>
    );
  } else {
    return null
  }


};

export default memo(UpdateAppComponent);

const styles = StyleSheet.create({
  container: {
    height: responsiveWidth(15),
    backgroundColor: "#1A1A1A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: responsiveWidth(2),
    elevation: 1,
    borderRadius : responsiveWidth(4)
  },
  lottieContainer: {
    flex: 0,
    width: responsiveWidth(16),
    height: responsiveWidth(20),
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    width: responsiveWidth(58),
    flexDirection: "column",
  },

  heading: {
    fontFamily: "MabryPro-Bold",
    color: "#FF6961",
    fontSize: responsiveFontSize(2.3),
  },

  description: {
    fontFamily: "MabryPro-Medium",
    width: responsiveWidth(58),
    color: "#009FF8",
    fontSize: responsiveFontSize(1.6),
  },
  getButton: {
    borderWidth: 2,
    borderColor: "#43e642",
    paddingHorizontal: responsiveWidth(2),
    borderRadius: responsiveWidth(4),
  },
  getText: {
    fontFamily: "MabryPro-Bold",
    color: "#43e642",
  },
  actionWrapper: {
    height: "107%",
    flexDirection: "column",
    justifyContent: "center",
  },
});
