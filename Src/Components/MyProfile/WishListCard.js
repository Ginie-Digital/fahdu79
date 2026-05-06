import { StyleSheet, Text, View, Image, Pressable } from "react-native";
import React from "react";
import { responsiveFontSize, responsiveWidth } from "react-native-responsive-dimensions";
import ProgressBar from "react-native-progress/Bar";
import { useDispatch } from "react-redux";
import { setWishListDonationInfo } from "../../../Redux/Slices/NormalSlices/OtherProfile/WishListDonateSheetSlice";
import { useNavigation } from "@react-navigation/native";

const WishListCard = ({ item, setDonateData, pressDisabled }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const handleDonation = () => {
    dispatch(setWishListDonationInfo({ donationInfo: item }));
    navigation.navigate("wishListDonateScreen");
  };

  return (
    <Pressable disabled={pressDisabled} style={styles.cardWrapper} android_ripple={{ color: "#f3f3f3" }} onPress={handleDonation}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item?.images[0]?.url }} resizeMethod="resize" resizeMode="cover" style={{ width: "100%", height: "100%" }} />
      </View>

      <Text style={styles.wishtitle}>{item?.title}</Text>

      <Text style={styles.description}>{item?.description}</Text>

      <View style={styles.cardBottomView}>
        <View style={styles.cardBottomViewUpper}>
          <Text style={styles.smallTexts}>Fund Raised</Text>
          <Text style={[styles.smallTexts, { flexDirection: "row", }]}>
            {Number(item?.totalCollected).toLocaleString('en-IN')}/{Number(item?.listedCoinsRequired).toLocaleString('en-IN')}
            <Image source={require("../../../Assets/Images/Coin.png")} style={{ height: responsiveWidth(3.5), width: responsiveWidth(3.5), resizeMode: "contain", alignSelf: "center", marginRight: responsiveWidth(1) }} />
          </Text>
        </View>

        <View style={{ width: "100%", paddingHorizontal: responsiveWidth(2), marginTop: responsiveWidth(4) }}>
          <ProgressBar borderWidth={0} height = {responsiveWidth(3)} unfilledColor={"#f2f2f2"} width={responsiveWidth(91)} progress={item?.totalCollected / item?.listedCoinsRequired} color={"#e0383e"} />
        </View>
      </View>
    </Pressable>
  );
};

export default WishListCard;

const styles = StyleSheet.create({
  cardWrapper: {
    borderWidth: 2,
    overflow: "hidden",
    marginTop: responsiveWidth(4),
    borderRadius: responsiveWidth(2),
    backgroundColor : "#fff"
  },
  imageContainer: {
    height: responsiveWidth(60),
  },
  wishtitle: {
    fontFamily: "MabryPro-Bold",
    color: "#282828",
    textAlign: "center",
    fontSize: responsiveFontSize(2),
    marginTop: responsiveWidth(4),
  },
  description: {
    fontFamily: "MabryPro-Regular",
    fontSize: responsiveFontSize(1.7),
    marginLeft: responsiveWidth(2),
    marginTop : responsiveWidth(2),
    color : "#282828"
  },
  cardBottomView: {
    // borderWidth : 1,
    marginTop: responsiveWidth(4),
    height: responsiveWidth(16),
  },
  cardBottomViewUpper: {
    // borderWidth : 1,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: responsiveWidth(2),
  },
  smallTexts: {
    fontSize: responsiveFontSize(1.4),
    color: "#282828",
    fontFamily : 'MabryPro-Bold'
  },
});
