import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
const Stack = createNativeStackNavigator();

import { useSelector } from 'react-redux';
import ChatWindow from '../Src/Screens/ChatWindow';
import HeaderLeft from '../Src/Components/ChatWindowComponents/HeaderLeft';
import ChatWindowRightHeader from '../Src/Components/ChatWindowComponents/ChatWindowRightHeader';
import NotificationScreen from '../Src/Screens/NotificationScreen';

import TabNavigation from './TabNavigation';
import About from '../Src/Screens/About';

import CreatePost from '../Src/Screens/CreatePost';
import CropViewScreen from '../Src/Screens/ CropViewScreen';
import CreatePostVideoPreview from '../Src/Components/CreatePostComponents/CreatePostVideoPreview';
import SinglePost from '../Src/Components/MyProfile/SinglePost';
import SettingsPage from '../Src/Screens/SettingsPage';
import ChangePassword from '../Src/Screens/ChangePassword';
import EditProfile from '../Src/Screens/EditProfile';
import CountryScreen from '../Src/Components/Settings/CountryScreen';

import DiscoverScreenTwo from '../Src/Screens/DiscoverScreenTwo';
import PDFViewer from '../Src/Screens/PDFViewer';
import FollowersSubscribersPage from '../Src/Screens/FollowersSubscribersPage';
import WebView from '../Src/Screens/WebView';
import LinkAccount from '../Src/Screens/LinkAccount';

import Transactions from '../Src/Screens/Transactions';
import TransactionHeaderRight from '../Src/Components/Transactions/TransactionHeaderRight';
import CreatePassword from '../Src/Screens/CreatePassword';
import Invites from '../Src/Screens/Invites';
import SubscribeScreen from '../Src/Screens/SubscribeScreen';
import ModalScreen from '../Src/Screens/ModalScreen';
import VerificationStepOne from '../Src/Screens/VerificationStepOne';
import OtherProfileNew from '../Src/Screens/OtherProfileNew';
import ManageRevenueRefferal from '../Src/Screens/ManageRevenueRefferal';
import ManageRevenueDashboard from '../Src/Screens/ManageRevenueDashboard';
import ManageRevenueFeeSetup from '../Src/Screens/ManageRevenueFeeSetup';
import ManageRevenueFeeSetupPricing from '../Src/Screens/ManageRevenueFeeSetupPricing';
import ManageRevenueSubscriptionFeeSetup from '../Src/Screens/ManageRevenueSubscriptionFeeSetup';
import Wallet from '../Src/Screens/Wallet';
import HomeVideoPlayer from '../Src/Components/HomeComponents/HomeVideoPlayer';
import BlockList from '../Src/Screens/BlockList';
import TwoFALanding from '../Src/Components/2FA/TwoFALanding';
import TwoFAAppAuth from '../Src/Components/2FA/TwoFAAppAuth';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeVideoBack from '../Src/Components/HomeComponents/HomeVideoBack';
import Google from '../Src/Screens/Google';
import { nTwinsFont } from '../DesiginData/Utility';
import Management from '../Src/Screens/Account/Management';
import DeleteAccount from '../Src/Screens/Account/DeleteAccount';
import License from '../Src/Screens/Account/License';
import TestPurchase from '../TestPurchase';
import { Platform, View } from 'react-native';
import LiveStream from '../Src/Screens/Stream/LiveStream';
import BeforeStream from '../Src/Screens/Stream/BeforeStream';
import ConfirmLiveStreamJoin from '../Src/Screens/Stream/ConfirmLiveStreamJoin';
import AfterLiveStreamEnd from '../Src/Screens/Stream/AfterLiveStreamEnd';
import AllMyPosts from '../Src/Components/MyProfile/AllMyPosts';
import Testify from '../Testify';
import HeaderCenteredTitle from '../Src/Components/HeaderCenteredTitle';
import AddSvg from '../AddSvg';
import { shareLink } from '../Src/Components/NewOtherProfileComponents/UpperOtherProfile';
import LoginHome from '../Src/Screens/LoginSignup/LoginHome';
import LoginEmail from '../Src/Screens/LoginSignup/LoginEmail';
import LoginPassword from '../Src/Screens/LoginSignup/LoginPassword';
import SignupEmail from '../Src/Screens/LoginSignup/SignupEmail';
import SignupPassword from '../Src/Screens/LoginSignup/SignupPassword';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Back from '../Src/Components/Back/Back';
import ForgetPassword from '../Src/Components/LoginComponent/ForgetPassword';
import EditProfiler from '../Src/Components/EditProfile';
import { responsiveFontSize } from 'react-native-responsive-dimensions';
import Details from '../Src/Screens/revenue/Details';
import CreatorSearch from '../Src/CreatorSearch';
import DIcon from '../DesiginData/DIcons';

import { Image } from 'expo-image';
import FeeSetupInfoRight from '../Src/Components/FeeSetupInfoRight';
import ScheduleContents from '../Src/Screens/ScheduleContents';
import UserInfoForm from '../Src/Screens/HelpCenter/UserInfoForm';
import MassMessageMedia from '../Src/Screens/MassMessageMedia';
import SharedPost from '../Src/Components/HomeComponents/SharedPost';
import WalletRechargeScreen from '../Src/WalletRechargeScreen';
import CallScreen from '../Src/Components/Calling/CallScreen';
import CFPayments from '../Src/Cashfree/CFPayments';
import PhonePe from '../Src/Cashfree/PhonePe';
import ChevronLoader from '../Src/ChevronLoader';
import VideoCallScreen from '../Src/Components/Calling/VideoCallScreen';
import { navigate } from './RootNavigation';
import { HeaderBackButton } from '@react-navigation/elements';
import WishlistPayoutFinal from '../Src/Components/PostComponents/WishlistPayoutFinal';
import WishlistPayoutSuccess from '../Src/Components/PostComponents/WishlistPayoutSuccess';

import { OnboardingNavigator } from './OnboardingNavigator';
import OtherProfileReels from '../Src/Components/NewOtherProfileComponents/OtherProfileReels';
import FilterScreen from '../Src/Screens/FilterScreen';
import CallRequestsScreen from '../Src/Screens/CallRequests/CallRequestsScreen';
import SelectDuration from '../Src/Screens/CallRequests/SelectDuration';
import ScheduleCallScreen from '../Src/Screens/CallRequests/ScheduleCallScreen';
import IncomingCallScreen from '../Src/Components/Calling/IncomingCalll';
import EditPostScreen from '../Src/Screens/EditPostScreen';
import WishListDonateScreen from '../Src/Screens/WishListDonateScreen';
import ChatMediaPreviewScreen from '../Src/Screens/ChatMediaPreviewScreen';
import ChatPPVFeeScreen from '../Src/Screens/ChatPPVFeeScreen';
import CompleteDetailsScreen from '../Src/Screens/CompleteDetailsScreen';
import FeedbackScreen from '../Src/Screens/FeedbackScreen';
import NetworkLoggerScreen from '../Src/Screens/NetworkLoggerScreen';

const StackNavigation = () => {
  //Redux Work
  const is_user_loggedIn = useSelector(state => state.auth.user.token);

  const agreed = useSelector(state => state.auth.user.licenseAgreed);

  const { shareLink: profileLink } = useSelector(state => state.profileFeedCache.data);

  const showOnboarding = useSelector(state => state.hideShow.visibility.showOnboarding);

  return (
    <SafeAreaProvider>
      <Stack.Navigator
        screenOptions={{
          orientation: 'portrait',
          headerTitleAlign: 'center',
          headerLeft: () => <Back />,
        }}>
        {!is_user_loggedIn ? (
          <>
            <Stack.Screen
              name="LoginHome"
              component={LoginHome}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="LoginEmail"
              component={LoginEmail}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="forgetPassword"
              component={ForgetPassword}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="LoginPassword"
              component={LoginPassword}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="SignupEmail"
              component={SignupEmail}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="SignupPassword"
              component={SignupPassword}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="createPassword"
              component={CreatePassword}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="Invites"
              component={Invites}
              options={{
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                headerShown: false,
              }}
            />
          </>
        ) : !agreed ? (
          <Stack.Screen name="license" component={License} options={{ headerShown: false }} />
        ) : (
          <>
            {/* {agreed ? <Stack.Screen name="license" component={License} options={{ headerShown: false }} />} */}

            <Stack.Screen name="chatRoomTab" component={showOnboarding ? OnboardingNavigator : TabNavigation} options={{ headerShown: false }} />


            <Stack.Screen
              name="settingsPage"
              component={SettingsPage}
              options={{
                title: 'Settings',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: 'white' },
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="feedback"
              component={FeedbackScreen}
              options={{
                title: 'Feedback',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: 'white' },
                headerTintColor: '#1e1e1e',
                animation: 'slide_from_right',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="NetworkLogger"
              component={NetworkLoggerScreen}
              options={{
                title: 'Network Logger',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: 'white' },
                headerTintColor: '#1e1e1e',
                animation: 'slide_from_right',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="changePassword"
              component={ChangePassword}
              options={({ route }) => ({
                title: route.params.title,
                headerShown: false,
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              })}
            />

            <Stack.Screen
              name="userInfoForm"
              component={UserInfoForm}
              options={({ route }) => ({
                headerShown: false,
              })}
            />

            <Stack.Screen
              name="editProfile"
              component={EditProfile}
              options={{
                title: 'Edit profile',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="notifications"
              component={NotificationScreen}
              options={{
                headerTitle: 'Notifications',
                // headerLeft: () => <HeaderCenteredTitle title="Notifications" />,
                headerTitleStyle: { fontFamily: 'Rubik-Medium' },
                headerShadowVisible: false,
                headerStyle: {
                  backgroundColor: '#fff',
                },
              }}
            />

            <Stack.Screen
              name="blocklist"
              component={BlockList}
              options={({ route }) => ({
                title: 'Blocklist',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              })}
            />

            <Stack.Screen
              name="beforeStreamScreen"
              component={BeforeStream}
              options={({ route }) => ({
                title: 'Stream Settings',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              })}
            />

            <Stack.Screen
              name="selectCountry"
              component={CountryScreen}
              options={{
                title: 'Select country',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="pdfReader"
              component={PDFViewer}
              options={{
                title: 'Document',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="verificationStepOne"
              component={VerificationStepOne}
              options={{
                title: 'Get Verified',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name={'ModalScreen'}
              component={ModalScreen}
              options={{
                headerShown: false,
                animationTypeForReplace: 'push',
                animation: 'slide_from_bottom',
              }}
            />

            <Stack.Screen
              name="Chats"
              component={ChatWindow}
              options={{
                headerTitle: '',
                header: () => <HeaderLeft />,
                headerStyle: { backgroundColor: '#fff' },
                headerShadowVisible: false,
                // Add these to ensure smooth transition
                animation: 'slide_from_right', // Consistent animation
                headerBackTitleVisible: false,
                // This prevents the header from animating separately
                headerTransparent: false,
                gestureEnabled: true,
              }}
            />

            <Stack.Screen
              name="CallRequests"
              component={CallRequestsScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
              }}
            />

            <Stack.Screen
              name="SelectDuration"
              component={SelectDuration}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
              }}
            />

            <Stack.Screen
              name="ChatMediaPreview"
              component={ChatMediaPreviewScreen}
              options={{
                headerShown: false,
                animation: 'fade',
                gestureEnabled: true,
              }}
            />

            <Stack.Screen
              name="ChatPPVFee"
              component={ChatPPVFeeScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
              }}
            />

            <Stack.Screen
              name="ScheduleCallScreen"
              component={ScheduleCallScreen}
              options={{
                title: 'Schedule Call',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.2)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff9f5' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen name="Notification" component={NotificationScreen} options={{ headerShadowVisible: false, headerStyle: { backgroundColor: '#fff' } }} />

            <Stack.Screen name="About" component={About} options={{ headerShadowVisible: false, headerShown: false }} />


            <Stack.Screen
              name="createpostpage"
              component={CreatePost}
              options={{
                title: 'Create Post',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: {
                  backgroundColor: '#fff',
                },
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="massMessageMedia"
              component={MassMessageMedia}
              options={{
                title: 'Mass Message',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: {
                  backgroundColor: '#fff',
                },
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="subscribeCreator"
              component={SubscribeScreen}
              options={{
                title: 'Subscription',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: {
                  backgroundColor: '#fff',
                },
                animationTypeForReplace: 'push',
                animation: 'slide_from_bottom',
                headerBackTitleVisible: false,
                headerTintColor: '#1e1e1e',
              }}
            />

            <Stack.Screen
              name="CreatePostVideoPreview"
              component={CreatePostVideoPreview}
              options={{
                title: 'Post video',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: {
                  backgroundColor: '#fff',
                },
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="homevideoplayer"
              component={HomeVideoPlayer}
              options={{
                title: '',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerTransparent: true,
                headerTintColor: '#fff',
                headerStyle: {
                  backgroundColor: 'transparent',
                },
                animationTypeForReplace: 'push',
                animation: 'slide_from_right',
                // headerBackTitleVisible: false,
                // statusBarColor: "transparent",
                // statusBarTranslucent: true,
                headerLeft: () => <HomeVideoBack />,
              }}
            />

            <Stack.Screen
              name="transactions"
              component={Transactions}
              options={{
                title: 'Transactions',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                // headerRight: () => <TransactionHeaderRight />,
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="confirmlivestreamjoin"
              component={ConfirmLiveStreamJoin}
              options={{
                title: 'Livestream',
                headerShown: true,
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_bottom',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="afterlivestreamend"
              component={AfterLiveStreamEnd}
              options={{
                headerShown: false,
                gestureEnabled: false,
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerRight: () => <TransactionHeaderRight />,
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="creatorSearch"
              component={CreatorSearch}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="chooseWallet"
              component={Platform.OS === 'ios' ? TestPurchase : WalletRechargeScreen}
              options={{
                title: 'Payment Gateway',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitle: '',
                headerLeft: props => <HeaderBackButton {...props} labelVisible={false} backTitle="" onPress={() => navigate('home')} />,
              }}
            />

            <Stack.Screen
              name="webView"
              component={WebView}
              options={({ route }) => ({
                title: route.params.title,
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              })}
            />

            <Stack.Screen
              name="editprofiler"
              component={EditProfiler}
              options={({ route }) => ({
                title: route.params.title,
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              })}
            />

            <Stack.Screen
              name="linkAccount"
              component={LinkAccount}
              options={({ route }) => ({
                title: route.params.title,
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              })}
            />

            <Stack.Screen
              name="twoFALanding"
              component={TwoFALanding}
              options={({ route }) => ({
                title: '2FA',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              })}
            />

            <Stack.Screen
              name="deleteaccount"
              component={DeleteAccount}
              options={({ route }) => ({
                title: 'Account Deletion',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_bottom',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              })}
            />

            <Stack.Screen
              name="accountmanagement"
              component={Management}
              options={({ route }) => ({
                title: 'Manage Account',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              })}
            />

            <Stack.Screen
              name="twoFAAppAuth"
              component={TwoFAAppAuth}
              options={({ route }) => ({
                title: 'Security',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              })}
            />

            <Stack.Screen
              name="fsPage"
              component={FollowersSubscribersPage}
              options={({ route }) => ({
                title: route.params.title,
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              })}
            />

            <Stack.Screen
              name="scheduled"
              component={ScheduleContents}
              options={({ route }) => ({
                title: 'Scheduled Contents',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              })}
            />

            <Stack.Screen
              name="allPosts"
              component={SinglePost}
              options={{
                title: 'Posts',

                headerTitleStyle: { fontFamily: 'Rubik-SemiBold', fontSize: Math.round(responsiveFontSize(2.7)), fontSize: nTwinsFont(2, 2.3) },

                headerStyle: { backgroundColor: '#fff' },
                headerShadowVisible: false,
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="sharedPost"
              component={SharedPost}
              options={{
                title: 'Posts',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="completeDetails"
              component={CompleteDetailsScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="allmyposts"
              component={AllMyPosts}
              options={{
                title: 'Posts',

                headerTitleStyle: { fontFamily: 'Rubik-SemiBold', fontSize: Math.round(responsiveFontSize(2.7)), fontSize: nTwinsFont(2, 2.3) },

                headerStyle: { backgroundColor: '#fff' },
                headerShadowVisible: false,
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="editPostScreen"
              component={EditPostScreen}
              options={{
                title: 'Edit Description',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="otherProfileReels"
              component={OtherProfileReels}
              options={{
                headerShown: false,
                animation: 'slide_from_bottom',
              }}
            />

            <Stack.Screen
              name="filterScreen"
              component={FilterScreen}
              options={{
                title: 'Apply Filter',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="cropViewScreen"
              component={CropViewScreen}
              options={{
                title: 'Crop',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: {
                  backgroundColor: '#fff',
                },
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="livestream"
              component={LiveStream}
              options={({ navigation }) => ({
                headerShown: false,
                gestureEnabled: false,
              })}
            />

            <Stack.Screen
              name="callScreen"
              component={CallScreen}
              options={({ navigation }) => ({
                headerShown: false,
                gestureEnabled: false,
              })}
            />

            <Stack.Screen
              name="videoCallScreen"
              component={VideoCallScreen}
              options={({ navigation }) => ({
                headerShown: false,
                gestureEnabled: false,
              })}
            />

            <Stack.Screen
              name="incomingCall"
              component={IncomingCallScreen}
              options={({ navigation }) => ({
                headerShown: false,
                gestureEnabled: false,
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              })}
            />

            <Stack.Screen
              name="cfPayment"
              component={Platform.OS === 'android' ? CFPayments : TestPurchase}
              options={({ navigation }) => ({
                headerShown: false,
                gestureEnabled: false,
              })}
            />

            <Stack.Screen
              name="pPPayment"
              component={Platform.OS === 'android' ? PhonePe : TestPurchase}
              options={({ navigation }) => ({
                headerShown: false,
                gestureEnabled: false,
              })}
            />

            <Stack.Screen
              name="othersProfile"
              component={OtherProfileNew}
              options={{
                headerTitle: 'Profile',
                headerTitleStyle: { fontFamily: 'Rubik-SemiBold', fontSize: Math.round(responsiveFontSize(2.7)), fontSize: nTwinsFont(2, 2.3) },
                // headerLeft: () => <HeaderLeftOtherProfile />,
                headerStyle: { backgroundColor: '#fff' },
                headerShadowVisible: false,
                animation: 'simple_push',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="referral"
              component={ManageRevenueRefferal}
              options={{
                title: 'Referral',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: {
                  backgroundColor: '#fff',
                },
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="mrDashboard"
              component={ManageRevenueDashboard}
              options={{
                title: 'Dashboard',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="wishlistpayoutfinal"
              component={WishlistPayoutFinal}
              options={{
                title: 'Payout Request',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="details"
              component={Details}
              options={{
                title: 'Details',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="wishlistSuccessPayout"
              component={WishlistPayoutSuccess}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen
              name="mrFeeSetup"
              component={ManageRevenueFeeSetup}
              options={{
                title: 'Auto Messages',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="ManageRevenueFeeSetupPricing"
              component={ManageRevenueFeeSetupPricing}
              options={{
                title: 'Fee Setup',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
                headerRight: () => <FeeSetupInfoRight />,
              }}
            />

            <Stack.Screen
              name="cLoader"
              component={ChevronLoader}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="mrSubscriptionFeeSetup"
              component={ManageRevenueSubscriptionFeeSetup}
              options={{
                title: 'Subscription Fee',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="wallet"
              component={Platform.OS === 'android' ? Wallet : TestPurchase}
              options={{
                title: 'Wallet',
                headerTitleStyle: {
                  fontFamily: 'Rubik-SemiBold',
                  fontSize: Math.round(responsiveFontSize(2.7)),
                },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#fff' },
                animation: 'slide_from_right',
                headerTintColor: '#1e1e1e',
                headerBackTitleVisible: false,
              }}
            />

            <Stack.Screen
              name="wishListDonateScreen"
              component={WishListDonateScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_bottom',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </SafeAreaProvider>
  );
};

export default StackNavigation;
