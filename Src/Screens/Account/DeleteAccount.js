// import { StyleSheet, Text, View, ScrollView, Switch, ActivityIndicator, Pressable, ActionSheetIOS, Platform } from "react-native";
// import React, { useState } from "react";
// import { responsiveFontSize, responsiveWidth } from "react-native-responsive-dimensions";
// import { FlatList } from "react-native-gesture-handler";
// import { padios } from "../../../DesiginData/Utility";
// import { navigate } from "../../../Navigation/RootNavigation";
// import { useDeleteUserMutation } from "../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi";
// import { useSelector } from "react-redux";
// import { token as memoizedToken } from "../../../Redux/Slices/NormalSlices/AuthSlice";
// import { ChatWindowError } from "../../Components/ErrorSnacks";
// import { autoLogout } from "../../../AutoLogout";
// import { ConfirmDialog } from "react-native-simple-dialogs";

// const data = [
//   {
//     heading: "Access Termination",
//     desc: "Upon account deletion, you will no longer have access to your FAHDU account, including all associated content and data",
//   },
//   {
//     heading: "Account Recovery Window",
//     desc: "If you wish to recover your account after deletion, you have a 30-day window to initiate the recovery process",
//   },

//   {
//     heading: "Recovery Process",
//     desc: "To recover your deleted account, you must contact FAHDU support via email at support@fahdu.com within the 30-day window\nInclude relevant account details, such as your username and any additional information that can help verify your identity",
//   },

//   {
//     heading: "Verification",
//     desc: "FAHDU may request additional information to verify your identity during the account recovery process",
//   },

//   {
//     heading: "Permanent Deletion",
//     desc: "After the 30-day recovery window expires, your account deletion will be irreversible, and all associated data will be permanently removed from our system",
//   },

//   {
//     heading: "Responsibility",
//     desc: "It is your responsibility to initiate the account recovery process within the specified time frame if you decide to regain access to your deleted account",
//   },
// ];

// const DeleteAccount = () => {
//   const [read, setRead] = useState(false);

//   const [loading, setLoading] = useState(false);

//   const [modalVisible, setModalVisible] = useState(false);

//   const handleDelete = async () => {
//     console.log("helloo");
//   };

//   const [deleteUser] = useDeleteUserMutation();

//   const token = useSelector(state => state.auth.user.token);

//   const deleteAccountApi = async () => {
//     const { data, error } = await deleteUser({ token });

//     if (error) {
//       console.log("error", error);
//     }

//     if (data?.statusCode === 200) {
//       console.log(data);
//       autoLogout();
//     }
//   };

//   const onPress = () => {
//     if (!read) {
//       ChatWindowError("Please accept terms and conditions");
//       return;
//     }

//     if (Platform.OS === "ios") {
//       ActionSheetIOS.showActionSheetWithOptions(
//         {
//           options: ["Cancel", "Delete my account and data", "Close, I changed my mind"],
//           destructiveButtonIndex: 2,
//           cancelButtonIndex: 0,
//           userInterfaceStyle: "light",
//         },
//         (buttonIndex) => {
//           if (buttonIndex === 0) {
//           } else if (buttonIndex === 1) {
//             deleteAccountApi();
//           } else if (buttonIndex === 2) {
//           }
//         }
//       );
//     } else {
//       console.log("android");

//       setModalVisible(true);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 1 }} contentContainerStyle={{ paddingBottom: responsiveWidth(30) }}>
//         <Text style={styles.titleText}>Terms and Conditions for Account Deletion</Text>

//         <FlatList
//           scrollEnabled={false}
//           data={data}
//           renderItem={({ item, index }) => {
//             return (
//               <>
//                 <Text style={styles.normalHeading}>{item.heading}</Text>
//                 <Text>{item.desc}</Text>
//               </>
//             );
//           }}
//           ItemSeparatorComponent={() => <View style={{ height: responsiveWidth(6) }} />}
//           showsVerticalScrollIndicator={false}
//         />

//         <View style={[styles.card, { elevation: 2, backgroundColor: "#fff", marginTop: responsiveWidth(8), alignSelf : 'center' }]}>
//           <Text style={styles.headingRead}>I Accept Terms & conditions</Text>
//           <Switch trackColor={{ false: "#767577", true: "#f89f7b" }} thumbColor={read ? "#f89f7b" : "#f4f3f4"} ios_backgroundColor="#3e3e3e" onValueChange={() => setRead(!read)} value={read} />
//         </View>

//         <View style={{ position: "relative", alignSelf: "center", marginTop: responsiveWidth(4) }} id="LoginButton">
//           <Pressable onPress={() => onPress()}>{loading ? <ActivityIndicator size={"small"} color="#1e1e1e" style={[styles.loginButton]} /> : <Text style={[styles.loginButton]}>DELETE MY ACCOUNT</Text>}</Pressable>
//         </View>
//       </ScrollView>
//       <ConfirmDialog
//         title="Delete account permanently"
//         message="Are you sure about that?"
//         visible={modalVisible}
//         onTouchOutside={() => console.log("fuck off")}
//         titleStyle={{ fontFamily: "Rubik-Medium" }}
//         messageStyle={{ fontFamily: "Rubik-Regular" }}
//         dialogStyle={{ borderRadius: responsiveWidth(2) }}
//         positiveButton={{
//           title: "YES",
//           onPress: () => {
//             setModalVisible(false);
//             deleteAccountApi()
//           },
//         }}
//         negativeButton={{
//           title: "NO",
//           onPress: () => setModalVisible(false),
//           titleStyle: { color: "red" },
//         }}
//       />
//     </View>
//   );
// };

// export default DeleteAccount;

// const styles = StyleSheet.create({
//   container: {
//     paddingHorizontal: responsiveWidth(4),
//     borderTopWidth: Platform.OS === "ios" ? 0 : 1,
//     borderColor: "#1e1e1e",
//     flex: 1,
//     backgroundColor: "#fffaf0",
//     paddingTop: responsiveWidth(2),
//   },
//   titleText: {
//     fontFamily: "Rubik-Bold",
//     color: "#1e1e1e",
//     fontSize: responsiveFontSize(3),
//     textAlign: "center",
//     marginBottom: responsiveWidth(10),
//   },
//   normalHeading: {
//     fontSize: responsiveFontSize(2),
//     marginVertical: responsiveWidth(1),
//     fontFamily: "Rubik-Medium",
//   },
//   description: {
//     fontSize: responsiveFontSize(1.8),
//     fontFamily: "Rubik-Regular",
//     color: "#1e1e1e",
//   },
//   card: {
//     backgroundColor: "#fff",
//     elevation: 2,
//     paddingHorizontal: responsiveWidth(4),
//     paddingVertical: responsiveWidth(3),
//     flexDirection: "row",
//     borderRadius: responsiveWidth(2),
//     width: responsiveWidth(85),
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   headingRead: {
//     fontFamily: "Rubik-Bold",
//     color: "#1e1e1e",
//     fontSize: responsiveFontSize(1.8),
//   },
//   loginButton: {
//     paddingHorizontal: responsiveWidth(2),
//     backgroundColor: "#ff6961",
//     borderRadius: responsiveWidth(4),
//     color: "#fff",
//     textAlign: "center",
//     fontFamily: "Rubik-Bold",
//     elevation: 1,
//     fontWeight: "600",
//     width: responsiveWidth(60),
//     height: responsiveWidth(9),
//     textAlignVertical: "center",
//     alignSelf: "center",
//     borderTopColor: "#1e1e1e",
//     borderLeftColor: "#1e1e1e",
//     elevation: 1,
//     fontSize: responsiveFontSize(2),
//     padding: padios(responsiveWidth(2.6)),
//     overflow: "hidden",
//     marginTop: responsiveWidth(6),
//   },
// });
import {StyleSheet, Text, View, ScrollView, Pressable, Switch, ActivityIndicator, Platform} from 'react-native';
import React, {useState} from 'react';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {FlatList} from 'react-native-gesture-handler';
import {FONT_SIZES, padios, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {navigate} from '../../../Navigation/RootNavigation';
import {useDeleteUserMutation, useDisableMailTwoFAMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {ChatWindowError} from '../../Components/ErrorSnacks';
import {autoLogout} from '../../../AutoLogout';
import {ConfirmDialog} from 'react-native-simple-dialogs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AnimatedButton from '../../Components/AnimatedButton';
import DeleteAccountModal from '../LoginSignup/DeleteAccountModal';
import { toggleAccountDeleteModal } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useAppTheme} from '../../Hook/useAppTheme';

const data = [
  {
    heading: 'Access termination',
    desc: 'Upon account deletion, you will no longer have access to your FAHDU account, including all associated content and data.',
  },
  {
    heading: 'Account Recovery Window',
    desc: 'If you wish to recover your account after deletion, you have a 30-day window to initiate the recovery process.',
  },
  {
    heading: 'Recovery Process',
    desc: 'To recover your deleted account, you must contact FAHDU support via email at support@fahdu.com within the 30-day window.\nInclude relevant account details, such as your username and any additional information that can help verify your identity.',
  },
  {
    heading: 'Verification',
    desc: 'FAHDU may request additional information to verify your identity during the account recovery process.',
  },
  {
    heading: 'Permanent Deletion',
    desc: 'After the 30-day recovery window expires, your account deletion will be irreversible, and all associated data will be permanently removed from our system.',
  },
  {
    heading: 'Responsibility',
    desc: 'It is your responsibility to initiate the account recovery process within the specified time frame if you decide to regain access to your deleted account.',
  },
];

const DeleteAccount = () => {
  const {colors, isDark} = useAppTheme();
  const [read, setRead] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteUser] = useDeleteUserMutation();
  const token = useSelector(state => state.auth.user.token);

  const deleteAccountApi = async () => {
    const {data, error} = await deleteUser({token});
    if (error) console.log('error', error);
    if (data?.statusCode === 200) {
      autoLogout();
    }
  };

  const dispatch = useDispatch()

  const onPress = () => {
    if (!read) {
      ChatWindowError('Please accept terms and conditions');
      return;
    }

    dispatch(toggleAccountDeleteModal({show: true}));
  };

  return (
    <View style={[styles.container, {backgroundColor: isDark ? '#121212' : '#FFFFFF'}]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: responsiveWidth(30)}}>
        <FlatList
          scrollEnabled={false}
          data={data}
          renderItem={({item, index}) => (
            <View>
              <Text style={[styles.normalHeading, {color: isDark ? '#FFFFFF' : '#000000'}]}>{`${index + 1}. ${item.heading}`}</Text>
              <Text style={[styles.description, {color: isDark ? '#9E9E9E' : '#1e1e1e'}]}>{item.desc}</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{height: responsiveWidth(6)}} />}
        />

        <Pressable onPress={() => setRead(!read)} style={styles.checkboxContainer}>
          <View style={[
            styles.checkbox,
            {
              backgroundColor: isDark ? '#171717' : (read ? '#f89f7b' : '#FFFFFF'),
              borderColor: isDark ? '#1F1F1F' : '#1e1e1e',
            },
            read && isDark && {borderColor: '#FF9E65'}
          ]}>
            {read && <Icon name="check" size={12} color={isDark ? '#FF9E65' : '#000000'} />}
          </View>
          <Text style={[styles.checkboxLabel, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>I accept terms & conditions</Text>
        </Pressable>

        {/* Leave space here for custom button */}

        <View style={{width: '98%'}}>
          <AnimatedButton title={'Delete My Account'} buttonMargin={8} onPress={onPress} isDark={isDark} />
        </View>
      </ScrollView>

      <DeleteAccountModal deleteAccountApi={deleteAccountApi} />
    </View>
  );
};

export default DeleteAccount;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
    backgroundColor: '#121212',
  },
  titleText: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.5),
    textAlign: 'center',
    marginBottom: responsiveWidth(8),
    color: '#FFFFFF',
  },
  normalHeading: {
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
    marginBottom: responsiveWidth(1),
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    lineHeight: responsiveFontSize(2.2),
    color: '#9E9E9E',
  },
  card: {
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveWidth(4),
    flexDirection: 'row',
    borderRadius: responsiveWidth(2),
    width: responsiveWidth(85),
    alignSelf: 'center',
    justifyContent: 'flex-start',
    marginTop: responsiveWidth(8),
    borderWidth: 1,
  },
  headingRead: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.8),
    color: '#FFFFFF',
  },

  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: responsiveWidth(8),
    alignSelf: 'flex-start',
    gap: 9,
  },
  checkbox: {
    height: 17,
    width: 17,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#1F1F1F',
    backgroundColor: '#171717',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
