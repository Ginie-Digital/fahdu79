import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { responsiveWidth } from "react-native-responsive-dimensions";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import BackSvg from "../../../Assets/svg/back.svg";

const Back = ({ tintColor, color }) => {

    const navigation = useNavigation()
    const iconColor = tintColor || color || "#1E1E1E";

  return (
    <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: responsiveWidth(2), paddingVertical: responsiveWidth(1) }}>
      <BackSvg 
        width={responsiveWidth(3)} 
        height={responsiveWidth(5.1)} 
        color={iconColor} 
      />
    </TouchableOpacity>
  );
};

export default Back;
