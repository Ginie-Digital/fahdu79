import { StyleSheet, View, TouchableOpacity, Text, Image, Pressable, BackHandler, Platform } from "react-native";
import React, { useMemo, useCallback, useRef, useState, useEffect } from "react";
import { responsiveWidth, responsiveFontSize } from "react-native-responsive-dimensions";
import  { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";

import { useDispatch, useSelector } from "react-redux";
import { setPostsCardType, toggleCreatePostBottomSheet, toggleSwitchBottomSheet } from "../../../Redux/Slices/NormalSlices/HideShowSlice";
import DIcon from "../../../DesiginData/DIcons";
import Bag from'../../../Assets/svg/bagFahdu.svg'
import Logo from'../../../Assets/svg/brandFahdu.svg'

const SwitcherSheet = ({}) => {
  const bottomSheetRef = useRef(null);

  const createPostBottomSheetVisibility = useSelector((state) => state.hideShow.visibility.switchBottomSheet);

  const dispatch = useDispatch();

  const snapPoints = useMemo(() => ["38%", "38%", "38"], []);

  const handleSheetChanges = useCallback((index) => {
    console.log(index);
    if (index === -1) {
      dispatch(toggleSwitchBottomSheet({ show: -1 }));
    }
  }, []);

  const onBackPress = () => {
    if (bottomSheetRef !== null) {
      bottomSheetRef.current?.close();
      return true;
    }
  };
  const handlePresentModalPress = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current?.present();
    }
  }, []);


  useEffect(() => {
    if (createPostBottomSheetVisibility === -1) {
      if(bottomSheetRef.current) {
        bottomSheetRef.current.close();
      }
    } else {
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => {
        subscription.remove();
      };
    }
  }, [createPostBottomSheetVisibility]);

  useEffect(() => {
    if (createPostBottomSheetVisibility === 1) {
      handlePresentModalPress();
    }
  }, [createPostBottomSheetVisibility]);

  const renderBackdrop = useCallback((props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={1} />, []);

  const postCardType = useSelector((state) => state.hideShow.visibility.postCardType);
  const loggedInUserRole = useSelector((state) => state.auth.user.role);

  const handleSwitchApp = (type) => {
    if (type === "Brand") {
      dispatch(toggleSwitchBottomSheet({ show: -1 }));
      setTimeout(() => {
        dispatch(setPostsCardType({ postCardType: "brand" }));
      }, 500);
    } else {
      dispatch(toggleSwitchBottomSheet({ show: -1 }));
      setTimeout(() => {
        dispatch(setPostsCardType({ postCardType: "normal" }));
      }, 500);
    }
  };


  return (
    <BottomSheetModal
      name="switchers"
      backdropComponent={renderBackdrop}
      ref={bottomSheetRef}
      index={createPostBottomSheetVisibility === 1 ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      backgroundStyle={{backgroundColor: '#fffef9'}}>
          <View style={styles.contentContainer}>
            <View style={styles.createPostListContainer}>
              <TouchableOpacity style={[styles.eachlist, { marginTop: responsiveWidth(1) }]} onPress={() => handleSwitchApp("Social")}>
                {/* <Image source={require("../../../Assets/Images/SSocial.png")} style={{ flex: 1, resizeMode: "contain", alignSelf: "center" }} /> */}
                <View style={{borderWidth:responsiveWidth(.5),flex:1, alignSelf: "center",backgroundColor:'#FFA86B',height:responsiveWidth(9),width:responsiveWidth(90),borderRadius:responsiveWidth(4),flexDirection:'row'}}>
                  <View style={{position:'absolute',left:responsiveWidth(10),bottom:responsiveWidth(0)}}>
                    <Logo/>
                  </View>
                  <View style={{left:responsiveWidth(32),gap:responsiveWidth(.5),top:responsiveWidth(5)}}> 
                  <Text style={{fontFamily:"Rubik-Bold",fontSize:responsiveWidth(6),color:"black"}}>Fahdu</Text>
                  <Text  style={{fontFamily:"Rubik-Medium",fontSize:responsiveWidth(3.6),color:"black"}}>Boost Your Earning With Fahdu</Text>
                  </View>
                 

                </View>
                {postCardType === "normal" && (
                  // <View style={styles.check}>
                  //   <DIcon provider={"AntDesign"} name={"checkcircle"} color="white" />
                  // </View>
                  <View style={{height:responsiveWidth(5),borderWidth:responsiveWidth(.3),width:responsiveWidth(5),borderRadius:responsiveWidth(1),position:'absolute',backgroundColor:'white',top:responsiveWidth(9),left:Platform.OS=="ios"?responsiveWidth(6):responsiveWidth(5)}}>
                           <View style={{bottom:Platform.OS=="ios"? responsiveWidth(.2):responsiveWidth(.5),right:responsiveWidth(.5)}}>
                       <DIcon provider={"AntDesign"} name={"check"} color="black" />
                       </View>
                  </View>
                )}
              </TouchableOpacity>
    
              <TouchableOpacity style={styles.eachlist} onPress={() => handleSwitchApp("Brand")}>
                {/* <Image source={require("../../../Assets/Images/SBrand.png")} style={{ flex: 1, resizeMode: "contain", alignSelf: "center" }} /> */}
                <View style={{borderWidth:responsiveWidth(.3),flex:1, alignSelf: "center",backgroundColor:'#000000',height:responsiveWidth(8),width:responsiveWidth(90),borderRadius:responsiveWidth(4)}}>

                <View style={{position:'absolute',left:responsiveWidth(7),top:responsiveWidth(-5)}}>
                  <Bag/>
                </View>
                  <View style={{left:responsiveWidth(32),gap:responsiveWidth(.5),top:responsiveWidth(5)}}> 
                  <Text style={{fontFamily:"Rubik-Bold",fontSize:responsiveWidth(6),color:"white"}}>Brand</Text>
                  <Text  style={{fontFamily:"Rubik-Medium",fontSize:responsiveWidth(3.6),color:"white"}}>Get Your Dream Collaboration</Text>
                  </View>
                 

                </View>

                {postCardType === "brand" && (
                  // <View style={styles.check}>
               
                  // </View>
                  <View style={{borderWidth:responsiveWidth(.3),height:responsiveWidth(5),width:responsiveWidth(5),borderRadius:responsiveWidth(1),position:'absolute',backgroundColor:'white',top:responsiveWidth(9),left:Platform.OS=="ios"?responsiveWidth(6):responsiveWidth(5)}}>
                       
                       <View style={{bottom:Platform.OS=="ios"? responsiveWidth(.2):responsiveWidth(.5),right:responsiveWidth(.5)}}>
                       <DIcon provider={"AntDesign"} name={"check"} color="orange" />
                       </View>
                  </View>

                )}
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetModal>
  );
};

export default SwitcherSheet;

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: "#fffef9",
    height: "100%",
    paddingHorizontal: responsiveWidth(4),
  },

  createPostListContainer: {
    paddingVertical: responsiveWidth(6),

    flexDirection: "column",
    gap: responsiveWidth(5),
  },

  eachlist: {
    width: "100%",
    height: responsiveWidth(21),
    position: "relative",
    backgroundColor: "relative",
  },

  check: {
    position: "absolute",
    width: responsiveWidth(8),
    height: responsiveWidth(8),
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
    top: "34%",
    elevation: 10,
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
});
