import { StyleSheet, Text, View, Image, Pressable, Platform, BackHandler } from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { responsiveFontSize, responsiveWidth } from "react-native-responsive-dimensions";
import DIcon from "../../../DesiginData/DIcons";
import { useNavigation } from "@react-navigation/native";
import { navigate } from "../../../Navigation/RootNavigation";
import { millisToMinutesAndSeconds, WIDTH_SIZES } from "../../../DesiginData/Utility";
import Paisa from "../../../Assets/svg/paisa.svg";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useSendLiveStreamDetailsMutation } from "../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi";
import { token as memoizedToken } from "../../../Redux/Slices/NormalSlices/AuthSlice";
import { useSelector } from "react-redux";
import Kanta from '../../../Assets/svg/kanta.svg';


const AfterLiveStreamEnd = ({ route }) => {
  console.log(":::::::::::", route?.params);

  const [duration, setDuration] = useState("");

  const token = useSelector(state => state.auth.user.token);

  const [sendLiveStreamDetails] = useSendLiveStreamDetailsMutation();

  const navigation = useNavigation();

  useEffect(() => {
    let difference = new Date(route?.params?.data?.endTime) - new Date(route?.params?.data?.startTime);

    console.log(difference, ":::");

    let date = new Date(difference);

    let x = millisToMinutesAndSeconds(date);

    setDuration(x);

    console.log(date);
  }, [route?.params?.data]);

  // Handle hardware back press to navigate to home
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigate("home")
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, []);

  const { currentUserId } = useSelector((state) => state.auth.user);

  const updateStreamDetails = async () => {
    let { data, error } = await sendLiveStreamDetails({
      token,
      data: {
        _id: currentUserId,
        id: "66751de6a9b9ab0a10b882f1",
        details: {
          earning: route?.params?.data?.total,
          duration: duration,
          startTime: route?.params?.data?.startTime,
        },
      },
    });

    if (error) {
      console.log(error?.data);
    }

    if (data) {
      console.log(data);
    }

    // console.log({
    //   earning: route?.params?.data?.total,
    //   duration: duration,
    //   startTime: route?.params?.data?.startTime,
    // }, "::::::");
  };

  return (
    <SafeAreaProvider style={styles.flexOne}>
      <SafeAreaView style={styles.flexOne}>
        <View style={[styles.flexOne, styles.container]}>

          <Pressable
            style={{
              alignSelf: "flex-end",
              marginVertical: responsiveWidth(4),
              top: responsiveWidth(5.5),
              right: responsiveWidth(2),
            }}
            onPress={() => navigate("home")}
          >
            {({ pressed }) => (
              <DIcon
                provider={"AntDesign"}
                name={"close"}
                size={responsiveWidth(5)}
                style={{ color: pressed ? "#999" : "#1e1e1e" }}
              />
            )}
          </Pressable>

          <Text style={styles.titleText}>Livestream Report</Text>

          <View style={{ top: responsiveWidth(15), borderStyle: "dashed", borderWidth: responsiveWidth(0.5), borderRadius: responsiveWidth(4), backgroundColor: "#FFF6F0" }}>
            <View style={[styles.card, { backgroundColor: "#FFF6F0", flexDirection: "column", marginTop: responsiveWidth(8), bottom: responsiveWidth(3) }]}>
              <View style={[styles.card, { elevation: 0 }]}>
                <View style={styles.cardLeftView}>
                  <Text style={styles.heading}>Summary</Text>



                  <View style={styles.eachDetailWrapper}>
                    <Text style={styles.description}>Duration</Text>

                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                      <Text style={[styles.description, { fontFamily: 'Rubik-Medium' }]}>{duration}</Text>
                    </View>
                  </View>

                  <View style={styles.eachDetailWrapper}>
                    <Text style={styles.description}>Viewers</Text>

                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                      <Text style={[styles.description, { fontFamily: 'Rubik-Medium' }]}>{route?.params?.data?.audience}</Text>
                    </View>
                  </View>

                  <View style={styles.eachDetailWrapper}>
                    <Text style={styles.description}>Earnings</Text>

                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: responsiveWidth(2) }}>
                      <Text style={[styles.description, { fontFamily: 'Rubik-Medium' }]}>{route?.params?.data?.earnings}</Text>

                      <Paisa />
                    </View>
                  </View>

                  <View style={[styles.eachDetailWrapper, { backgroundColor: "#FFA86B", marginBottom: 0 }]}>
                    <Text style={styles.description}>Tips</Text>

                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: responsiveWidth(2) }}>
                      <Text style={[styles.description, { fontFamily: 'Rubik-Medium' }]}>{route?.params?.data?.tip}</Text>

                      {/* <Image source={require("../../../Assets/Images/Coin.png")} style={{ height: responsiveWidth(3.5), width: responsiveWidth(3.5), resizeMode: "contain", alignSelf: "center", marginLeft: responsiveWidth(1) }} /> */}
                      <Paisa />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={{ marginTop: responsiveWidth(18), backgroundColor: "#FFF6F0", borderRadius: responsiveWidth(4), borderStyle: "dashed", top: responsiveWidth(4), borderWidth: responsiveWidth(0.5), borderColor: "black" }}>
            <View style={[styles.card, { borderRadius: responsiveWidth(4), bottom: responsiveWidth(4), flexDirection: "column", marginTop: responsiveWidth(8) }]}>
              <View style={[styles.card]}>
                <View style={styles.cardLeftView}>
                  <Text style={styles.heading}>Total earnings</Text>

                  <View style={[styles.eachDetailWrapper, { marginBottom: 0 }]}>
                    <Text style={styles.description}>Coins</Text>

                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: responsiveWidth(2) }}>
                      <Text style={[styles.description, { fontFamily: 'Rubik-Medium' }]}>{route?.params?.data?.total}</Text>
                      <Paisa />
                      {/* <Image source={require("../../../Assets/Images/Coin.png")} style={{ height: responsiveWidth(3.5), width: responsiveWidth(3.5), resizeMode: "contain", alignSelf: "center", marginLeft: responsiveWidth(1) }} /> */}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>


        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default AfterLiveStreamEnd;

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingHorizontal: responsiveWidth(4),
  },

  titleText: {
    fontFamily: "Rubik-SemiBold",
    fontWeight: "700",
    color: "#1e1e1e",
    fontSize: responsiveFontSize(2.6),
    textAlign: "center",
    // marginBottom: responsiveWidth(10),,
    bottom: responsiveWidth(5),
  },

  card: {
    backgroundColor: "#FFF6F0",
    // elevation: 2,
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveWidth(3),
    flexDirection: "row",
    // borderRadius: responsiveWidth(2),
    width: responsiveWidth(85),
    justifyContent: "space-between",
    alignItems: "center",
  },

  heading: {
    fontFamily: "Rubik-SemiBold",
    color: "#1e1e1e",
    fontSize: responsiveFontSize(2.2),
    marginBottom: WIDTH_SIZES[14]
  },

  description: {
    fontFamily: "Rubik-Medium",
    color: "#1e1e1e",
    fontSize: responsiveFontSize(1.8),
    padding: Platform.OS == 'ios' ? responsiveWidth(1) : null
  },

  cardLeftView: {
    width: "100%",
    gap: responsiveWidth(2),
  },

  title: {
    fontFamily: "Rubik-Medium",
    color: "#1e1e1e",
    fontSize: responsiveFontSize(2),
    textAlign: "center",
  },

  eachDetailWrapper: {
    backgroundColor: "#fff",
    width: "100%",
    padding: responsiveWidth(2),
    borderRadius: WIDTH_SIZES[14],
    borderWidth: WIDTH_SIZES[1.5],
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(4),
    borderStyle: "dashed",
    borderColor: "#FF7819",
    marginBottom: WIDTH_SIZES[16]
  },
});
