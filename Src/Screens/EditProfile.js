import {StyleSheet, Text, View, TouchableOpacity, TextInput, Pressable, ActivityIndicator, Platform} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import { useAppTheme } from '../Hook/useAppTheme';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import MyProfilePicture from '../Components/MyProfile/MyProfilePicture';
import {useLazyUserProfileQuery, useUpdateProfileMutation} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Loader from '../Components/Loader';
import AnimatedButton from '../Components/AnimatedButton';
import {navigate} from '../../Navigation/RootNavigation';
import {nTwins} from '../../DesiginData/Utility';
import {launchImageLibrary} from 'react-native-image-picker';
import {Image} from 'expo-image';
import {LoginPageErrors, chatRoomSuccess} from '../Components/ErrorSnacks';
import {updateEditProfile} from '../../Redux/Slices/NormalSlices/AuthSlice';

const regex = /^[\w](?!.*?\.{2})[\w.]{1,28}[\w]$/;

const PersonalDetailsCard = ({fullName, username, emailAddress, errors = {}}) => {
  const { colors } = useAppTheme();
  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Text style={[styles.title, {color: colors.text}]}>Personal Details</Text>
        <TouchableOpacity
          onPress={() =>
            navigate('editprofiler', {
              title: 'Personal Info',
              type: 'personal',
              fullName,
              userName: username,
              emailAddress,
            })
          }>
          <Text style={styles.edit}>Edit</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.card, {backgroundColor: colors.card}]}>
        <View style={styles.row}>
          <Text style={[styles.label, {color: colors.textSecondary}]}>Full Name</Text>
          <View style={{flex: 1, alignItems: 'flex-end', marginLeft: 10}}>
            <Text style={[styles.value, {color: colors.text}]} numberOfLines={1} ellipsizeMode="tail">{fullName}</Text>
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, {color: colors.textSecondary}]}>Username</Text>
          <View style={{flex: 1, alignItems: 'flex-end', marginLeft: 10}}>
            <Text style={[styles.value, {color: colors.text}]} numberOfLines={1} ellipsizeMode="tail">{username}</Text>
            {errors.userName && <Text style={styles.errorText}>{errors.userName}</Text>}
          </View>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, {color: colors.textSecondary}]}>Email</Text>
          <View style={{flex: 1, alignItems: 'flex-end', marginLeft: 10}}>
            <Text style={[styles.value, {color: colors.text}]} numberOfLines={1} ellipsizeMode="tail">{emailAddress}</Text>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
        </View>
      </View>
    </View>
  );
};

const EditProfile = ({route}) => {
  const { colors, isDark } = useAppTheme();
  const [updateProfile] = useUpdateProfileMutation({});
  const [userProfile] = useLazyUserProfileQuery({refetchOnFocus: true});
  const token = useSelector(state => state.auth.user.token);
  const userInfo = useSelector(state => state.auth.user);
  const navigation = useNavigation();
  const creatorOrUser = useSelector(state => state.auth.user.role);
  const dispatch = useDispatch();

  const [bio, setBio] = useState('');
  const [fullName, setFullName] = useState('');
  const [userName, setUserName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [mounted, setMounted] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [screenLoading, setScreenLoading] = useState(true);
  const [categoryHeader, setCategoryHeader] = useState('Heading (e.g., Dance Creator)');
  const [categoryDescription, setCategoryDescription] = useState('Add a detailed description to showcase your skills and interests!');

  // ✅ NEW: Validation state
  const [errors, setErrors] = useState({
    fullName: '',
    userName: '',
    email: '',
    bio: '',
    categoryHeader: '',
    categoryDescription: '',
  });

  // ✅ NEW: Validation functions
  const validateEmail = email => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return 'Email is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validateUsername = username => {
    if (!username || username.trim().length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (username.length > 30) {
      return 'Username must be less than 30 characters';
    }
    if (!regex.test(username)) {
      return 'Username can only contain letters, numbers, dots and underscores';
    }
    return '';
  };

  const validateFullName = name => {
    if (!name || name.trim().length < 2) {
      return 'Full name must be at least 2 characters';
    }
    if (name.length > 50) {
      return 'Full name must be less than 50 characters';
    }
    return '';
  };

  const isUser = creatorOrUser !== 'creator' && creatorOrUser !== 'admin';
  const validateBio = bioText => {
    const limit = isUser ? 60 : 150;
    const maxNewlines = isUser ? 1 : 9;
    if (bioText && bioText.length > limit) {
      return `Bio must be less than ${limit} characters`;
    }
    if (bioText && (bioText.match(/\n/g) || []).length > maxNewlines) {
      return `Bio must have at most ${maxNewlines} return lines`;
    }
    return '';
  };

  const validateCategoryHeader = header => {
    if (header && header.length > 50) {
      return 'Header must be less than 50 characters';
    }
    return '';
  };

  const validateCategoryDescription = description => {
    if (description && description.length > 500) {
      return 'Description must be less than 500 characters';
    }
    return '';
  };

  // ✅ NEW: Validate all fields
  const validateAllFields = () => {
    const newErrors = {
      fullName: validateFullName(fullName),
      userName: validateUsername(userName),
      email: isUser ? '' : validateEmail(emailAddress),
      bio: validateBio(bio),
      categoryHeader: validateCategoryHeader(categoryHeader),
      categoryDescription: validateCategoryDescription(categoryDescription),
    };

    setErrors(newErrors);

    // Return true if no errors
    return !Object.values(newErrors).some(error => error !== '');
  };

  useFocusEffect(
    useCallback(() => {
      async function getSettingProfile() {
        let userDetail = await userProfile({token}, false);
        const data = userDetail?.data?.data;

        console.log(data, 'User Edit profile Data');

        setBio(data?.aboutUser || '');
        setFullName(data?.fullName || '');
        setUserName(data?.displayName || '');
        setEmailAddress(data?.email || '');
        setCategoryDescription(data?.categoryDescription || '');
        setCategoryHeader(data?.categoryHeader || '');
        setScreenLoading(false);
      }

      getSettingProfile();
    }, [token, userProfile]),
  );

  const handleDiscard = () => {
    navigation.goBack();
  };

  const handleSave = () => {
    if (!validateAllFields()) {
      LoginPageErrors('Please fix the errors before saving');
      return;
    }

    setLoading(true);
    const data = {
      fullName,
      displayName: userName,
      aboutUser: bio,
    };

    updateProfile({token, data}).then(e => {
      if (e?.error?.status === 'FETCH_ERROR') {
        LoginPageErrors('Please check your network');
        setLoading(false);
      } else {
        if (!e?.error) {
          if (e?.data?.statusCode === 200) {
            chatRoomSuccess('Successfully updated your profile!');
            dispatch(
              updateEditProfile({
                currentUserDisplayName: e?.data?.data?.displayName,
                currentUserFullName: e?.data?.data?.fullName,
                aboutUser: e?.data?.data?.aboutUser,
                categoryHeader: e?.data?.data?.categoryHeader,
                categoryDescription: e?.data?.data?.categoryDescription,
              }),
            );
            setLoading(false);
            navigation.goBack();
          }
        } else {
          LoginPageErrors(e?.error?.data?.message || 'Update failed');
          setLoading(false);
        }
      }
    });
  };

  const handlePictureChange = useCallback(async type => {
    const mediaInfo = await launchImageLibrary({mediaType: 'photo', selectionLimit: 1});

    if (!mediaInfo.didCancel) {
      const image = mediaInfo?.assets[0];

      if (image?.fileSize > 6 * 1024 * 1024) {
        LoginPageErrors('Selected image exceeds 6MB limit. Please choose a smaller image.');
        return;
      }

      navigation.navigate('cropViewScreen', {uri: image?.uri, type: type});
    } else {
      console.log('User Canceled the selection');
    }
  }, [navigation]);

  if (screenLoading) {
    return <Loader />;
  }

  // ✅ UPDATED: onEdit with validation
  const onEdit = componentName => {
    // Clear previous errors for this component
    const newErrors = {...errors};

    if (componentName === 'description') {
      // Validate category fields
      const headerError = validateCategoryHeader(categoryHeader);
      const descError = validateCategoryDescription(categoryDescription);

      newErrors.categoryHeader = headerError;
      newErrors.categoryDescription = descError;
      setErrors(newErrors);

      if (headerError || descError) {
        return; // Don't navigate if validation fails
      }

      navigation.navigate('editprofiler', {
        type: 'desc',
        categoryHeader,
        categoryDescription,
        title: 'Description',
      });
    }

    if (componentName === 'bio') {
      navigation.navigate('editprofiler', {
        type: 'bio',
        bio,
        title: 'Bio',
      });
    }

    if (componentName === 'personal') {
      // Validate personal info
      const fullNameError = validateFullName(fullName);
      const userNameError = validateUsername(userName);
      const emailError = validateEmail(emailAddress);

      newErrors.fullName = fullNameError;
      newErrors.userName = userNameError;
      newErrors.email = emailError;
      setErrors(newErrors);

      if (fullNameError || userNameError || emailError) {
        return; // Don't navigate if validation fails
      }

      navigation.navigate('editprofiler', {
        title: 'Personal Info',
        type: 'personal',
        fullName,
        userName,
        emailAddress,
      });
    }
  };

  if (isUser) {
    return (
      <GestureHandlerRootView style={{flex: 1, backgroundColor: colors.background}}>
        <KeyboardAwareScrollView style={{flex: 1}} contentContainerStyle={{flexGrow: 1, paddingBottom: 40}} keyboardDismissMode="interactive">
          
          {/* Centered Profile Picture with Pencil Edit Button */}
          <View style={{alignSelf: 'center', marginTop: 32, marginBottom: 24}}>
            <View style={[styles.userProfilePicContainer, {backgroundColor: isDark ? '#121212' : '#FFFFFF', borderColor: '#1E1E1E'}]}>
              <Image
                placeholder={require('../../Assets/Images/DefaultProfile.jpg')}
                source={userInfo?.currentUserProfilePicture ? {uri: userInfo?.currentUserProfilePicture} : require('../../Assets/Images/DefaultProfile.jpg')}
                style={styles.userProfilePic}
                resizeMethod="resize"
                contentFit="contain"
              />
            </View>
            <Pressable
              onPress={() => handlePictureChange('Profile')}
              style={[styles.userEditIconContainer, {backgroundColor: isDark ? '#121212' : '#FFFFFF', borderColor: '#1E1E1E'}]}
            >
              <Image source={require('../../Assets/Images/ChangeProfile.png')} style={[styles.userEditIcon, isDark && {tintColor: '#FFFFFF'}]} />
            </Pressable>
          </View>

          {/* Form Fields */}
          <View style={styles.userFormContainer}>
            <Text style={[styles.userLabel, {color: colors.text}]}>Full Name*</Text>
            <View style={[styles.userInputContainer, {backgroundColor: isDark ? '#1A1A1A' : '#FFF9F6', borderColor: isDark ? '#2A2A2A' : '#000000'}, errors.fullName && styles.userInputError]}>
              <TextInput
                style={[styles.userTextInput, {color: colors.text}]}
                value={fullName}
                onChangeText={t => {
                  setFullName(t);
                  if (errors.fullName) setErrors(prev => ({...prev, fullName: ''}));
                }}
                placeholder="Enter Full Name"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            {errors.fullName ? <Text style={styles.userErrorText}>{errors.fullName}</Text> : null}

            <Text style={[styles.userLabel, {color: colors.text, marginTop: 20}]}>Username*</Text>
            <View style={[styles.userInputContainer, {backgroundColor: isDark ? '#1A1A1A' : '#FFF9F6', borderColor: isDark ? '#2A2A2A' : '#000000'}, errors.userName && styles.userInputError]}>
              <TextInput
                style={[styles.userTextInput, {color: colors.text}]}
                value={userName}
                onChangeText={t => {
                  setUserName(t);
                  if (errors.userName) setErrors(prev => ({...prev, userName: ''}));
                }}
                placeholder="Enter Username"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
              />
            </View>
            {errors.userName ? <Text style={styles.userErrorText}>{errors.userName}</Text> : null}

            <Text style={[styles.userLabel, {color: colors.text, marginTop: 20}]}>Bio*</Text>
            <View style={[styles.userInputContainer, {height: 120, alignItems: 'flex-start', paddingTop: 12, backgroundColor: isDark ? '#1A1A1A' : '#FFF9F6', borderColor: isDark ? '#2A2A2A' : '#000000'}, errors.bio && styles.userInputError]}>
              <TextInput
                style={[styles.userTextInput, {color: colors.text, height: '100%', width: '100%', textAlignVertical: 'top'}]}
                value={bio}
                onChangeText={t => {
                  let sanitized = t.replace(/\n{3,}/g, '\n\n');
                  if ((sanitized.match(/\n/g) || []).length > 1) {
                    return; // limit return lines to 1
                  }
                  setBio(sanitized);
                  if (errors.bio) setErrors(prev => ({...prev, bio: ''}));
                }}
                placeholder="Enter Bio"
                placeholderTextColor={colors.placeholder}
                multiline
                maxLength={60}
              />
            </View>
            {errors.bio ? <Text style={styles.userErrorText}>{errors.bio}</Text> : null}
          </View>

          {/* Action Buttons */}
          <View style={styles.userButtonContainer}>
            <TouchableOpacity
              style={[styles.userDiscardButton, {backgroundColor: isDark ? '#171717' : '#FFFFFF', borderColor: isDark ? '#1F1F1F' : '#1E1E1E'}]}
              onPress={handleDiscard}
            >
              <Text style={[styles.userDiscardButtonText, {color: isDark ? '#FFFFFF' : '#1E1E1E'}]}>Discard Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.userSaveButton, {backgroundColor: '#FFA86B', borderColor: isDark ? '#FF7819' : '#1E1E1E'}, loading && {opacity: 0.7}]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#1E1E1E" />
              ) : (
                <Text style={[styles.userSaveButtonText, {color: '#1E1E1E'}]}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: colors.background}}>
      <KeyboardAwareScrollView style={{flex: 1}} contentContainerStyle={{flexGrow: 1, paddingBottom: 60}} keyboardDismissMode="interactive">
        <MyProfilePicture setRefresh={setRefresh} isEditable={true} isDark={isDark} />

        <PersonalDetailsCard fullName={fullName} username={userName} emailAddress={emailAddress} errors={errors} />

        <View style={[styles.detailContainer, {backgroundColor: colors.background}]}>
          {/* Bio Section */}
          <View style={[styles.section, {borderColor: colors.border}]}>
            <View style={styles.headerRow}>
              <Text style={[styles.heading, {color: colors.text}]}>Bio</Text>
              <Pressable onPress={() => onEdit('bio')}>
                <Text style={styles.edit}>Edit</Text>
              </Pressable>
            </View>
            <Text style={[styles.textContent, {color: colors.textSecondary}]}>{bio || 'Add a short bio to introduce yourself!'}</Text>
          </View>

          {/* Description Section */}
          {creatorOrUser === 'creator' && (
            <View style={[styles.section, {borderColor: colors.border}]}>
              <View style={styles.headerRow}>
                <Text style={[styles.heading, {color: colors.text}]}>Description</Text>
                <Pressable onPress={() => onEdit('description')}>
                  <Text style={styles.edit}>Edit</Text>
                </Pressable>
              </View>
              <Text style={[styles.subheading, {color: colors.textLabel}]}>{categoryHeader || 'Heading (e.g., Dance Creator)'}</Text>
              {errors.categoryHeader && <Text style={styles.errorText}>{errors.categoryHeader}</Text>}
              <Text style={[styles.textContent, {color: colors.textSecondary}]}>{categoryDescription || 'Add a detailed description to showcase your skills and interests!'}</Text>
              {errors.categoryDescription && <Text style={styles.errorText}>{errors.categoryDescription}</Text>}
            </View>
          )}

          <View style={{padding: 24, paddingTop: 0}}>
            <AnimatedButton isDark={isDark} title={'View Profile'} buttonMargin={0} onPress={() => navigate('chatRoomTab', {screen: 'profile'})} />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </GestureHandlerRootView>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  detailContainer: {
    backgroundColor: '#0D0D0D',
  },
  section: {
    padding: 24,
    borderTopWidth: 6,
    borderColor: '#1A1A1A',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  subheading: {
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
    color: '#E0E0E0',
    marginTop: 8,
  },
  editButton: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.8),
    color: '#FFA86B',
  },
  textContent: {
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 20,
    marginTop: 8,
  },
  input: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.6),
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: responsiveWidth(1),
    padding: responsiveWidth(2),
    backgroundColor: '#1A1A1A',
  },
  counter: {
    textAlign: 'right',
    marginTop: responsiveWidth(1),
    fontFamily: 'Rubik-Regular',
    color: '#555555',
    fontSize: responsiveFontSize(1.4),
  },
  cardContainer: {
    padding: 24,
    marginTop: 32,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Rubik-SemiBold',
    color: '#FFFFFF',
  },
  edit: {
    fontSize: 12,
    color: '#FFA86B',
    fontFamily: 'Rubik-Regular',
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FF7819',
    width: nTwins(89, 98.5),
    alignSelf: 'center',
    flexDirection: 'column',
    gap: Platform.OS === 'ios' ? 23 : 14,
    marginTop: Platform.OS === 'android' ? 16 : 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#9E9E9E',
    fontFamily: 'Rubik-Regular',
  },
  value: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    color: '#FFFFFF',
  },
  // ✅ NEW: Error text style
  errorText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 11,
    color: '#FF6B6B',
    marginTop: 4,
  },
  
  // User role specific styles
  userProfilePicContainer: {
    width: 119,
    height: 119,
    borderRadius: 59.5,
    borderWidth: 1.71852,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userProfilePic: {
    width: 112.56,
    height: 112.56,
    borderRadius: 56.28,
  },
  userEditIconContainer: {
    position: 'absolute',
    left: 82,
    top: 92,
    borderWidth: 2.025,
    borderRadius: 13.5,
    width: 27,
    height: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userEditIcon: {
    height: 12,
    width: 12,
    resizeMode: 'contain',
  },
  userFormContainer: {
    paddingHorizontal: 24,
    marginTop: 10,
  },
  userLabel: {
    fontSize: 14,
    fontFamily: 'Rubik-SemiBold',
    marginBottom: 8,
  },
  userInputContainer: {
    borderWidth: 2,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  userInputError: {
    borderColor: '#FF5252',
  },
  userTextInput: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    padding: 0,
  },
  userErrorText: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    color: '#FF5252',
    marginTop: 4,
  },
  userButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 30,
    marginBottom: 40,
  },
  userDiscardButton: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userDiscardButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
  },
  userSaveButton: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  userSaveButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
  },
});
