import { StyleSheet, View, Text, Image, Pressable, BackHandler } from "react-native";
import React, { useMemo, useCallback, useRef, useState, useEffect } from "react";
import { responsiveWidth, responsiveFontSize } from "react-native-responsive-dimensions";
import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal } from "@gorhom/bottom-sheet";

import LinearGradient from "react-native-linear-gradient";
import { useDispatch, useSelector } from "react-redux";
import { toggleWho, toggleWhoTippedSheet } from "../../../Redux/Slices/NormalSlices/HideShowSlice";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { token as memoizedToken } from "../../../Redux/Slices/NormalSlices/AuthSlice";
import { useLazyGetTippersListQuery } from "../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi";

import DIcon from "../../../DesiginData/DIcons";
import LottieView from "lottie-react-native";

const TipSheet = () => {
  const bottomSheetRef = useRef(null);

  const { show: homeBottomSheetVisibility, postId } = useSelector((state) => state.hideShow.visibility.whoTippedSheet);

  const dispatch = useDispatch();

  const snapPoints = useMemo(() => ["25%", "35%", "80%"], []);

  const [tippersList, setTippersList] = useState([]);

  const onBackPress = () => {
    if (bottomSheetRef !== null) {
      bottomSheetRef.current?.close();

      return true;
    }
  };

  const handleSheetChanges = useCallback((index) => {
    if (index === -1) {
      dispatch(toggleWhoTippedSheet({ info: { show: -1, postId: undefined } }));
    }
  }, []);

  const navigation = useNavigation();

  const token = useSelector(state => state.auth.user.token);

  const [getTipperList] = useLazyGetTippersListQuery();

  //-------------------------------Modal source code-----------------

  const handlePresentModalPress = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current?.present();
    }
  }, []);

  useEffect(() => {
    if (homeBottomSheetVisibility === -1) {
      bottomSheetRef.current.close();
    } else {
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);

      return () => {
        subscription.remove();
      };
    }
  }, [homeBottomSheetVisibility]);

  useEffect(() => {
    if (homeBottomSheetVisibility === 1) {
      handlePresentModalPress();
    }
  }, [homeBottomSheetVisibility]);

  //-------------------------------Modal source code-----------------

  useFocusEffect(
    useCallback(() => {
      async function getTipLists() {
        const { data, error } = await getTipperList({ token, postId });

        if (data) {
          setTippersList(data?.data?.tip);
        }
      }

      if (postId) {
        getTipLists();
      }
    }, [postId])
  );

  const loggedInUserRole = useSelector((state) => state.auth.user.role);

  const renderBackdrop = useCallback((props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={1} />, []);

  const EachContent = ({ item }) => {
    return (
      <Pressable style={styles.eachListContainer} android_ripple={{ color: "white" }} onPress={() => handleGoToOthersProfile(item?.userDetails?.displayName, item?.userDetails?._id, item?.userDetails?.role)}>
        <View style={{ flexDirection: "row", gap: responsiveWidth(2) }}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: item?.userDetail?.profile_image?.url }} resizeMethod="resize" resizeMode="cover" style={styles.profileImage} />
            {item?.userDetails?.role === "creator" ? (
              <View style={{ position: "absolute", transform: [{ translateX: responsiveWidth(8.4) }, { translateY: responsiveWidth(-5) }] }}>
                <DIcon provider={"MaterialIcons"} name={"verified"} color="#FFA07A" size={responsiveWidth(4.5)} />
              </View>
            ) : null}
          </View>

          <View style={styles.detailContainer}>
            <Text style={styles.name}>{item?.userDetail?.displayName}</Text>
          </View>
        </View>

        <View style={styles.unblockWrapper}>
          <Image source={require("../../../Assets/Images/Coin.png")} style={{ height: responsiveWidth(5), width: responsiveWidth(5), resizeMode: "contain", alignSelf: "center", marginRight: responsiveWidth(1) }} />
          <Text style={[styles.name, { fontSize: responsiveFontSize(2.2) }]}>{item?.amount}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <BottomSheetModal name="HOmeBottom" backdropComponent={renderBackdrop} ref={bottomSheetRef} index={homeBottomSheetVisibility === 1 ? 0 : -1} snapPoints={snapPoints} onChange={handleSheetChanges} enablePanDownToClose={true} enableDynamicSizing={false} backgroundStyle={{ backgroundColor: "#fffef9" }}>
      <View style={styles.contentContainer}>
         { tippersList?.length > 0 && <LottieView
          source={require("../../../Assets/Animation/Sprinkle.json")}
          hardwareAccelerationAndroid
          autoPlay
          loop={false}
          style={{
            height: "100%",
            width: "100%",
            position: "absolute",
          }}
        /> }
        <Text style={styles.title}>Tip Givers</Text>

        <BottomSheetFlatList
          ItemSeparatorComponent={() => (
            <LinearGradient colors={["#FFFDF650", "#43423D50", "#FFFDF650"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.linearGradient}>
              <View style={{ height: 1 }} />
            </LinearGradient>
          )}
          style={{ marginTop: responsiveWidth(4) }}
          data={tippersList}
          renderItem={({ item, index }) => <EachContent item={item} />}

          ListEmptyComponent={() => <Text style = {[styles.userName, {textAlign : 'center'}]}>Sorry! We did'nt recived any tips for this post</Text>}

        />
      </View>
    </BottomSheetModal>
  );
};

export default TipSheet;

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: "#fffef9",
    height: "100%",
    paddingHorizontal: responsiveWidth(4),
  },

  title: {
    fontFamily: "MabryPro-Medium",
    color: "#282828",
    fontSize: responsiveFontSize(2),
    textAlign: "center",
  },

  unblockWrapper: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: responsiveWidth(3),
    paddingVertical: responsiveWidth(1),
    gap: responsiveWidth(2),
    borderColor: "#ff6961",
    paddingHorizontal: responsiveWidth(4),
  },
  headerLeftWrapper: {
    height: responsiveWidth(12),
    justifyContent: "center",
    // borderWidth : 1,
    flexBasis: "50%",
  },
  headerLeftContentContainer: {
    height: "100%",
    borderColor: "blue",
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveWidth(4),
  },
  profileImageContainer: {
    borderColor: "#282828",
    height: responsiveWidth(9),
    width: responsiveWidth(9),
    borderRadius: responsiveWidth(10),
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: responsiveWidth(10),
    position: "relative",
  },
  profileImage: {
    width: "100%",
    resizeMode: "cover",
    height: "100%",
  },
  userName: {
    fontFamily: "Lexend-Bold",
    color: "#282828",
    fontSize: responsiveFontSize(1.9),
  },
  status: {
    fontSize: responsiveFontSize(1.6),
    letterSpacing: 0.5,
    color: "#282828",
    fontFamily: "MabryPro-Regular",
  },
  cardHeaderWrapper: {
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#282828",
    paddingVertical: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(4),
    borderRadius: responsiveWidth(2),
  },
  likeCommentText: {
    fontFamily: "MabryPro-Medium",
    marginLeft: responsiveWidth(1),
    color: "#282828",
  },
  eachSortByModalListText: {
    fontSize: responsiveFontSize(2),
    color: "#282828",

    fontFamily: "MabryPro-Bold",
  },
  eachSortModalList: {
    flexDirection: "row",
    gap: responsiveWidth(5),
    alignItems: "center",
    marginVertical: responsiveWidth(3),
  },

  contentWrapper: {
    borderWidth: 2,
    padding: responsiveWidth(2),
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderRadius: responsiveWidth(2),
  },

  contentImageWrapper: {
    height: responsiveWidth(20),
    width: responsiveWidth(20),
    borderWidth: 1,
    borderRadius: responsiveWidth(2),
    resizeMode: "cover",
    overflow: "hidden",
  },

  sCDetailWrapper: {
    // borderWidth: 1,

    padding: 1,
  },
  timiming: {
    fontSize: responsiveFontSize(1.6),
    paddingLeft: responsiveWidth(2),
    paddingTop: responsiveWidth(0.8),
    color: "#282828",
    paddingVertical: responsiveWidth(2),
    fontFamily: "MabryPro-Medium",
    marginTop: responsiveWidth(2),
  },

  eachListContainer: {
    flexDirection: "row",
    gap: responsiveWidth(4),
    paddingLeft: responsiveWidth(4),
    paddingVertical: responsiveWidth(3),
    justifyContent: "space-between",
  },

  imageContainer: {
    borderColor: "purple",
    borderRadius: responsiveWidth(12),
    position: "relative",
    borderColor: "#282828",
    resizeMode: "cover",
    height: responsiveWidth(12),
    width: responsiveWidth(12),
    justifyContent: "center",
  },

  profileImage: {
    flex: 1,
    borderRadius: responsiveWidth(12),
    borderWidth: 1,
    borderColor: "#282828",
  },

  name: {
    fontFamily: "MabryPro-Medium",
    fontSize: responsiveFontSize(1.8),
    color: "#282828",
  },

  userName: {
    fontFamily: "MabryPro-Regular",
    fontSize: responsiveFontSize(1.6),
    color: "#282828",
  },

  detailContainer: {
    flexDirection: "column",
    justifyContent: "center",
  },
});
