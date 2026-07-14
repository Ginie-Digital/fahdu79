import { StyleSheet, Text, View, Pressable, Image, Vibration, TouchableOpacity, Platform } from "react-native";
// import Clipboard from "@react-native-clipboard/clipboard";
import React, { useCallback, useEffect, useState } from "react";
import { responsiveWidth, responsiveFontSize } from "react-native-responsive-dimensions";
import DIcon from "../../../DesiginData/DIcons";
import { ScrollView, TextInput } from "react-native-gesture-handler";
import { useEnableThirdPartyAuthMutation } from "../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi";
import { useNavigation } from "@react-navigation/native";
import { LoginPageErrors, chatRoomSuccess } from "../ErrorSnacks";
import { token as memoizedToken } from "../../../Redux/Slices/NormalSlices/AuthSlice";
import { useDispatch, useSelector } from "react-redux";
import { toggleAuthenticatorVia } from "../../../Redux/Slices/NormalSlices/HideShowSlice";
import { padios } from "../../../DesiginData/Utility";
import { useKeyboard } from "@react-native-community/hooks";
import { useAppTheme } from "../../Hook/useAppTheme";

const TwoFAAppAuth = ({ route }) => {
  const { colors, isDark } = useAppTheme();
  const { code, imageUrl } = route?.params;

  const [authCode, setAuthCode] = useState("");

  const [disable, setDisable] = useState(true);

  const navigation = useNavigation();

  const token = useSelector(state => state.auth.user.token);

  const dispatch = useDispatch();

  const [enableThirdPartyAuth] = useEnableThirdPartyAuthMutation();


  const keyboard = useKeyboard()

  const handleCopyToClipBoard = (text) => {
    Vibration.vibrate([25, 50]);
    // Clipboard.setString(code);
    chatRoomSuccess("Code copied to your clipboard");
    setDisable(false);
  };

  const handleEnableThirdPartyAuth = useCallback(async () => {
    const { data, error } = await enableThirdPartyAuth({ token, data: { code: authCode } });

    if (data) {
      setAuthCode("");
      setTimeout(() => {
        navigation.goBack();

        dispatch(toggleAuthenticatorVia({ info: { email: false } }));
      }, 500);
    }

    if (error) {
      LoginPageErrors(error?.data?.message);
      setAuthCode("");
    }
  }, [authCode, token]);

  useEffect(() => {
    dispatch(toggleAuthenticatorVia({ info: { email: false } }));
  }, []);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[{ flexGrow: 1 }, keyboard.keyboardShown && Platform.OS === "ios" ? {paddingBottom : keyboard.keyboardHeight +  responsiveWidth(10)} : {}]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.level]}>1. Copy code or scan QR for the code</Text>
        <View style={{ height: responsiveWidth(15), borderLeftWidth: 2, alignSelf: "center", borderRadius: responsiveWidth(1), borderColor: "#FF7A7A" }} />
        <DIcon provider={"Ionicons"} name={"caret-down-outline"} style={{ alignSelf: "center", color: "#FF7A7A", marginTop: responsiveWidth(-2) }} />
        <View style={[styles.card, isDark && {backgroundColor: colors.card}]}>
          <Image source={{ uri: imageUrl }} style={{ height: responsiveWidth(40), width: responsiveWidth(40), resizeMode: "contain", alignSelf: "center" }} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: responsiveWidth(4) }}>
            <Text style={[styles.code, isDark && {color: colors.text}]}>{code}</Text>
            <DIcon provider={"MaterialIcons"} name={"content-copy"} color={isDark ? '#FFFFFF' : undefined} onPress={() => handleCopyToClipBoard()} />
          </View>
        </View>

        <Text style={[styles.level, { marginTop: responsiveWidth(8) }]}>2. Paste in authenticator app for code generation</Text>
        <View style={{ height: responsiveWidth(10), borderLeftWidth: 2, alignSelf: "center", borderRadius: responsiveWidth(1), borderColor: "#FF7A7A" }} />

        <Text style={[styles.level, { marginTop: responsiveWidth(0) }]}>3. Paste authenticator code below</Text>
        <View style={{ height: responsiveWidth(12), borderLeftWidth: 2, alignSelf: "center", borderRadius: responsiveWidth(1), borderColor: "#FF7A7A" }} />
        <DIcon provider={"Ionicons"} name={"caret-down-outline"} style={{ alignSelf: "center", color: "#FF7A7A", marginTop: responsiveWidth(-2) }} />
        <View placeholder="Code" style={[styles.codeInputContainer, isDark && {borderColor: colors.inputBorder}]}>
          <TextInput style={[styles.codeInput, isDark && {backgroundColor: colors.inputBg, color: colors.text}]} value={authCode} onChangeText={(t) => setAuthCode(t)} />
        </View>

        <View style={{ position: "relative", alignSelf: "center" }}>
          <Pressable onPress={() => handleEnableThirdPartyAuth()}>
            <Text style={[styles.loginButton, {backgroundColor: isDark ? colors.accent : '#ffa07a', color: isDark ? '#000000' : '#282828', borderTopColor: isDark ? 'transparent' : '#282828', borderLeftColor: isDark ? 'transparent' : '#282828'}]}>ENABLE</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default TwoFAAppAuth;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  level: {
    fontFamily: "MabryPro-Medium",
    textAlign: "center",
    color: "#fff",
    backgroundColor: "#FF7A7A",
    alignSelf: "center",
    padding: responsiveWidth(2),
    borderRadius: responsiveWidth(4),
    marginTop: responsiveWidth(4),
    paddingHorizontal: responsiveWidth(4),
    overflow : 'hidden'
  },
  card: {
    backgroundColor: "#fff",
    elevation: 2,
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveWidth(4),
    flexDirection: "column",
    borderRadius: responsiveWidth(2),
    justifyContent: "center",
    alignItems: "center",
    gap: responsiveWidth(4),
    width: responsiveWidth(60),
    alignSelf: "center",
    // height: responsiveWidth(45),
  },

  code: {
    fontFamily: "MabryPro-Bold",
    color: "#282828",
  },

  codeInputContainer: {
    borderWidth: 1,
    marginTop: responsiveWidth(4),
    textAlignVertical: "top",
    width: responsiveWidth(35),
    alignSelf: "center",
    borderRadius: responsiveWidth(2),
    height: responsiveWidth(12),
    overflow: "hidden",
  },

  codeInput: {
    flex: 1,
    textAlignVertical: "top",
    fontFamily: "MabryPro-Medium",
    backgroundColor: "#fff",
    letterSpacing: responsiveWidth(0.4),
    textAlign: "center",
  },

  loginButton: {
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: "#ffa07a",
    borderRadius: responsiveWidth(2),
    color: "#282828",
    textAlign: "center",
    fontFamily: "MabryPro-Bold",
    elevation: 1,
    fontWeight: "600",
    width: responsiveWidth(26),
    height: responsiveWidth(9),
    textAlignVertical: "center",
    alignSelf: "center",
    borderTopColor: "#282828",
    borderLeftColor: "#282828",
    elevation: 1,
    fontSize: responsiveFontSize(2),
    padding: padios(responsiveWidth(2.6)),
    overflow: "hidden",
    marginTop: responsiveWidth(6),
  },
});
