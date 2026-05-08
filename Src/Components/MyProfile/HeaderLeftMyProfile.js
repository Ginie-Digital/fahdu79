import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { responsiveFontSize, responsiveWidth } from "react-native-responsive-dimensions";
import { useSelector } from "react-redux";

import { useNavigation } from "@react-navigation/native";
import DIcon from "../../../DesiginData/DIcons";
import { nTwinsFont } from "../../../DesiginData/Utility";

const HeaderLeftMyProfile = () => {
  const navigation = useNavigation();
  

  return (
    <View style={styles.headerLeftWrapper}>
      <View style={styles.headerLeftContentContainer}>
        {/* HeaderLeftMyProfile now empty as title is handled by navigation headerTitle */}
      </View>
    </View>
  );
};

export default HeaderLeftMyProfile;

const styles = StyleSheet.create({
  headerLeftWrapper: {
    height: responsiveWidth(12),
    width: "58%",
    marginRight: responsiveWidth(18),
    justifyContent: "center",
    paddingLeft: responsiveWidth(1),
  },
  headerLeftContentContainer: {
    height: "100%",
    borderColor: "blue",
    flexDirection: "row",
    gap: responsiveWidth(4),
    alignItems : 'center',
  },
 
  headerInformation: {
    // borderWidth: 1,
    width: Platform.OS === "ios" ? "100%" :  "80%",
    justifyContent: "center",
  },
  userName: {
    fontFamily: "Lexend-Bold",
    color: "#282828",
    fontSize: nTwinsFont(2.4, 2.2) ,
    marginLeft : responsiveWidth(2)
  },
  status: {
    fontSize: responsiveFontSize(1.6),
    letterSpacing: 0.5,
    color: "#282828",
    fontFamily: "MabryPro-Regular",
  },
});
