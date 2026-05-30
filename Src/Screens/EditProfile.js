import {StyleSheet, Text, View, TouchableOpacity, TextInput, Pressable, ActivityIndicator, Platform} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
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

const regex = /^[\w](?!.*?\.{2})[\w.]{1,28}[\w]$/;

const PersonalDetailsCard = ({fullName, username, emailAddress, errors = {}}) => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>Personal Details</Text>
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
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Full Name</Text>
          <View style={{flex: 1, alignItems: 'flex-end', marginLeft: 10}}>
            <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">{fullName}</Text>
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Username</Text>
          <View style={{flex: 1, alignItems: 'flex-end', marginLeft: 10}}>
            <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">{username}</Text>
            {errors.userName && <Text style={styles.errorText}>{errors.userName}</Text>}
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <View style={{flex: 1, alignItems: 'flex-end', marginLeft: 10}}>
            <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">{emailAddress}</Text>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
        </View>
      </View>
    </View>
  );
};

const EditProfile = ({route}) => {
  const [updateProfile] = useUpdateProfileMutation({});
  const [userProfile] = useLazyUserProfileQuery({refetchOnFocus: true});
  const token = useSelector(state => state.auth.user.token);
  const navigation = useNavigation();
  const creatorOrUser = useSelector(state => state.auth.user.role);

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

  const validateBio = bioText => {
    if (bioText && bioText.length > 150) {
      return 'Bio must be less than 150 characters';
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
      email: validateEmail(emailAddress),
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

        setBio(data?.aboutUser);
        setFullName(data?.fullName);
        setUserName(data?.displayName);
        setEmailAddress(data?.email);
        setCategoryDescription(data?.categoryDescription);
        setCategoryHeader(data?.categoryHeader);
        setScreenLoading(false);
      }

      getSettingProfile();
    }, []),
  );

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
      // Validate bio
      const bioError = validateBio(bio);
      newErrors.bio = bioError;
      setErrors(newErrors);

      if (bioError) {
        return; // Don't navigate if validation fails
      }

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

  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: '#fff'}}>
      <KeyboardAwareScrollView style={{flex: 1}} contentContainerStyle={{flexGrow: 1, paddingBottom: 60}} keyboardDismissMode="interactive">
        <MyProfilePicture setRefresh={setRefresh} isEditable={true} />

        <PersonalDetailsCard fullName={fullName} username={userName} emailAddress={emailAddress} errors={errors} />

        <View style={styles.detailContainer}>
          {/* Bio Section */}
          <View style={styles.section}>
            <View style={styles.headerRow}>
              <Text style={styles.heading}>Bio</Text>
              <Pressable onPress={() => onEdit('bio')}>
                <Text style={styles.edit}>Edit</Text>
              </Pressable>
            </View>
            <Text style={styles.textContent}>{bio || 'Add a short bio to introduce yourself!'}</Text>
            {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
          </View>

          {/* Description Section */}
          {creatorOrUser === 'creator' && (
            <View style={styles.section}>
              <View style={styles.headerRow}>
                <Text style={styles.heading}>Description</Text>
                <Pressable onPress={() => onEdit('description')}>
                  <Text style={styles.edit}>Edit</Text>
                </Pressable>
              </View>
              <Text style={styles.subheading}>{categoryHeader || 'Heading (e.g., Dance Creator)'}</Text>
              {errors.categoryHeader && <Text style={styles.errorText}>{errors.categoryHeader}</Text>}
              <Text style={styles.textContent}>{categoryDescription || 'Add a detailed description to showcase your skills and interests!'}</Text>
              {errors.categoryDescription && <Text style={styles.errorText}>{errors.categoryDescription}</Text>}
            </View>
          )}

          <View style={{padding: 24, paddingTop: 0}}>
            <AnimatedButton title={'View Profile'} buttonMargin={0} onPress={() => navigate('chatRoomTab', {screen: 'profile'})} />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </GestureHandlerRootView>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  detailContainer: {
    backgroundColor: '#fff',
  },
  section: {
    padding: 24,
    borderTopWidth: 6,
    borderColor: '#EDEDED',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 18,
    color: '#1e1e1e',
  },
  subheading: {
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
    color: '#1e1e1e',
    marginTop: 8,
  },
  editButton: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.8),
    color: '#007AFF',
  },
  textContent: {
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    color: '#1e1e1e',
    lineHeight: 20,
    marginTop: 8,
  },
  input: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.6),
    color: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: responsiveWidth(1),
    padding: responsiveWidth(2),
    backgroundColor: '#ffffff',
  },
  counter: {
    textAlign: 'right',
    marginTop: responsiveWidth(1),
    fontFamily: 'Rubik-Regular',
    color: '#888',
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
    color: '#1e1e1e',
  },
  edit: {
    fontSize: 12,
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: '#FFF3EB',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
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
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
  },
  value: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  // ✅ NEW: Error text style
  errorText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 11,
    color: '#E74C3C',
    marginTop: 4,
  },
});
