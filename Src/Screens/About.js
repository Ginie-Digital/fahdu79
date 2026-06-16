import { StyleSheet, Text, View, Image } from "react-native";

import React from "react";

import { responsiveWidth } from "react-native-responsive-dimensions";
import DeviceInfo from "react-native-device-info";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SVGs from "../../Assets/svg/FAHDU.svg";

const About = () => {
  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <Image source={require("../../Assets/Images/About.png")} style={{ height: responsiveWidth(50), width: responsiveWidth(50), resizeMode: "contain", alignSelf: "center" }} />
        <Text style={[styles.versionTitle, {color : "#282828"}]}>Version {DeviceInfo.getVersion()}</Text>
        <Text style={[styles.versionTitle, { fontSize: responsiveWidth(3), position: "absolute", bottom: 0 }]}>Copyright 2025, Ginie Digital Pvt. Ltd.</Text>
      </View>
    </View>
  );
};

export default About;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: responsiveWidth(10),
    justifyContent: "center",
  },
  innerContainer: {
    width: "100%",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "80%",
    paddingVertical: responsiveWidth(4),
  },
  versionTitle: {
    color: "#7A7A7A",
    fontFamily: "Rubk-Regular",
    fontSize: responsiveWidth(3.5),
  },
});