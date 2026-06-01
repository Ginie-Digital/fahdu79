import React, {useState} from 'react';
import {View, Text, TextInput, StyleSheet, Pressable} from 'react-native';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {useUpdateProfileMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {chatRoomSuccess, LoginPageErrors} from '../ErrorSnacks';
import {useDispatch, useSelector} from 'react-redux';
import {navigate} from '../../../Navigation/RootNavigation';
import AnimatedButton from '../AnimatedButton';
import InputOverlay from '../InputOverlay';
import useKeyboardHook from '../../CustomHooks/useKeyboardHook';
import {setAboutUser, setCategoryDescription, setCategoryHeader, setCurrentUserFullName, updateDisplayName, updateEditProfile} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {nTwins, selectionTwin} from '../../../DesiginData/Utility';
import {autoLogout} from '../../../AutoLogout';

const regex = /^[\w](?!.*?\.{2})[\w.]{1,28}[\w]$/;

const EditProfiler = ({route, navigation}) => {
  console.log(route?.params?.categoryHeader);

  const token = useSelector(state => state.auth.user.token);

  const [loading, setLoading] = useState(false);

  const [bio, setBio] = useState(route?.params?.bio);
  const [descriptionHeading, setDescriptionHeading] = useState(route?.params?.categoryHeader);
  const [description, setDescription] = useState(route?.params?.categoryDescription);
  const [fullName, setFullName] = useState(route?.params?.fullName);
  const [userName, setUserName] = useState(route?.params?.userName);

  const dispatch = useDispatch();

  const [focusedInput, setFocusedInput] = useState(null);

  const [updateProfile] = useUpdateProfileMutation();

  // ✅ NEW: Validation errors state
  const [errors, setErrors] = useState({
    fullName: '',
    userName: '',
    bio: '',
    descriptionHeading: '',
    description: '',
  });

  const characterLimits = {
    bio: 150,
    descriptionHeading: 50,
    description: 500,
  };

  // ✅ NEW: Validation functions
  const validateFullName = name => {
    if (!name || name.trim().length < 2) {
      return 'Full name must be at least 2 characters';
    }
    if (name.length > 50) {
      return 'Full name must be less than 50 characters';
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

  const validateBio = bioText => {
    if (bioText && bioText.length > 150) {
      return 'Bio must be less than 150 characters';
    }
    return '';
  };

  const validateDescriptionHeading = heading => {
    if (heading && heading.length > 50) {
      return 'Heading must be less than 50 characters';
    }
    return '';
  };

  const validateDescription = desc => {
    if (desc && desc.length > 500) {
      return 'Description must be less than 500 characters';
    }
    return '';
  };

  // ✅ NEW: Validate all fields before saving
  const validateFields = () => {
    const newErrors = {
      fullName: '',
      userName: '',
      bio: '',
      descriptionHeading: '',
      description: '',
    };

    if (route?.params?.type === 'personal') {
      newErrors.fullName = validateFullName(fullName);
      newErrors.userName = validateUsername(userName);
    }

    if (route?.params?.type === 'bio') {
      newErrors.bio = validateBio(bio);
    }

    if (route?.params?.type === 'desc') {
      newErrors.descriptionHeading = validateDescriptionHeading(descriptionHeading);
      newErrors.description = validateDescription(description);
    }

    setErrors(newErrors);

    // Return true if no errors
    return !Object.values(newErrors).some(error => error !== '');
  };

  // ✅ UPDATED: onSave with validation
  const onSave = () => {
    // Validate before saving
    if (!validateFields()) {
      LoginPageErrors('Please fix the errors before saving');
      return;
    }

    setLoading(true);

    let data = Object.assign({});

    if (route?.params?.type === 'personal') {
      data = {
        fullName,
        displayName: userName,
      };
    }

    if (route?.params?.type === 'bio') {
      data = {
        aboutUser: bio,
      };
    }

    if (route?.params?.type === 'desc') {
      data = {
        categoryHeader: descriptionHeading,
        categoryDescription: description,
      };
    }

    updateProfile({token, data}).then(e => {
      console.log(e?.error, '::::::');
      if (e?.error?.status === 'FETCH_ERROR') {
        LoginPageErrors('Please check your network');
        setLoading(false);
      } else {
        if (!e?.error) {
          if (e?.data?.statusCode === 200) {
            console.log(e?.data?.data?.displayName, '|||||');

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

            navigate('editProfile');
          }
        } else {
          if (e?.error?.data?.status_code === 2044) {
            autoLogout();
          }
          LoginPageErrors(e?.error?.data?.message);
          setLoading(false);
        }
      }
    });
  };

  const {isKeyboardVisible} = useKeyboardHook();

  return (
    <View style={styles.container}>
      {route?.params?.type === 'personal' && (
        <>
          <Text style={styles.fieldName}>Full Name</Text>
          <View style={{position: 'relative', marginTop: responsiveWidth(2), overflow: 'visible'}} collapsable={false}>
            {focusedInput === 'fullName' && (
              <InputOverlay isVisible={isKeyboardVisible} />
            )}
            <View style={[styles.textInputContainer, {marginTop: 0}, errors.fullName && styles.inputError]}>
              <TextInput
                selectionHandleColor={'#ffa86b'}
                selectionColor={selectionTwin()}
                cursorColor={'#1e1e1e'}
                placeholderTextColor="#B2B2B2"
                placeholder="Enter Your Full Name"
                spellCheck={false}
                autoCorrect={false}
                autoCapitalize={'sentences'}
                style={styles.textInputs}
                onChangeText={t => {
                  setFullName(t);
                  // Clear error on change
                  if (errors.fullName) {
                    setErrors(prev => ({...prev, fullName: ''}));
                  }
                }}
                value={fullName}
                onFocus={() => setFocusedInput('fullName')}
                onBlur={() => setFocusedInput(null)}
                maxLength={30}
              />
            </View>
          </View>
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

          <Text style={styles.fieldName}>Username</Text>
          <View style={{position: 'relative', marginTop: responsiveWidth(2), overflow: 'visible'}} collapsable={false}>
            {focusedInput === 'userName' && (
              <InputOverlay isVisible={isKeyboardVisible} />
            )}
            <View style={[styles.textInputContainer, {marginTop: 0}, errors.userName && styles.inputError]}>
              <TextInput
                selectionHandleColor={'#ffa86b'}
                selectionColor={selectionTwin()}
                cursorColor={'#1e1e1e'}
                placeholderTextColor="#B2B2B2"
                placeholder="Enter Your Username"
                spellCheck={false}
                autoCorrect={false}
                autoCapitalize={'none'}
                style={styles.textInputs}
                onChangeText={t => {
                  setUserName(t);
                  // Clear error on change
                  if (errors.userName) {
                    setErrors(prev => ({...prev, userName: ''}));
                  }
                }}
                value={userName}
                onFocus={() => setFocusedInput('userName')}
                onBlur={() => setFocusedInput(null)}
                maxLength={30}
              />
            </View>
          </View>
          {errors.userName && <Text style={styles.errorText}>{errors.userName}</Text>}
        </>
      )}

      {route?.params?.type === 'bio' && (
        <>
          <View style={{position: 'relative', marginTop: responsiveWidth(2), overflow: 'visible'}} collapsable={false}>
            {focusedInput === 'bio' && (
              <InputOverlay isVisible={isKeyboardVisible} />
            )}
            <View style={[styles.textInputContainer, {marginTop: 0}, errors.bio && styles.inputError]}>
              <TextInput
                selectionHandleColor={'#ffa86b'}
                selectionColor={selectionTwin()}
                cursorColor={'#1e1e1e'}
                placeholderTextColor="#B2B2B2"
                placeholder="Enter Bio"
                spellCheck={false}
                autoCorrect={false}
                autoCapitalize={'sentences'}
                style={[styles.textInputs, {height: 129, paddingTop: nTwins(4, 4), paddingRight: responsiveWidth(4)}]}
                onChangeText={t => {
                  setBio(t);
                  // Clear error on change
                  if (errors.bio) {
                    setErrors(prev => ({...prev, bio: ''}));
                  }
                }}
                value={bio}
                onFocus={() => setFocusedInput('bio')}
                onBlur={() => setFocusedInput(null)}
                multiline
                textAlignVertical="top"
                maxLength={150}
              />
              <Text style={styles.characterCount}>
                {bio?.length || 0}/<Text style={{color: '#1e1e1e'}}>{characterLimits.bio}</Text>
              </Text>
            </View>
          </View>
          {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
        </>
      )}

      {route?.params?.type === 'desc' && (
        <>
          <Text style={styles.fieldName}>What's your role?</Text>
          <View style={{position: 'relative', marginTop: responsiveWidth(2), overflow: 'visible'}} collapsable={false}>
            {focusedInput === 'descriptionHeading' && (
              <InputOverlay isVisible={isKeyboardVisible} />
            )}
            <View style={[styles.textInputContainer, {marginTop: 0}, errors.descriptionHeading && styles.inputError]}>
              <TextInput
                selectionHandleColor={'#ffa86b'}
                selectionColor={selectionTwin()}
                cursorColor={'#1e1e1e'}
                placeholderTextColor="#B2B2B2"
                placeholder="Heading (e.g., Dance Creator)"
                spellCheck={false}
                autoCorrect={false}
                autoCapitalize={'sentences'}
                style={styles.textInputs}
                onChangeText={t => {
                  setDescriptionHeading(t);
                  // Clear error on change
                  if (errors.descriptionHeading) {
                    setErrors(prev => ({...prev, descriptionHeading: ''}));
                  }
                }}
                value={descriptionHeading}
                onFocus={() => setFocusedInput('descriptionHeading')}
                onBlur={() => setFocusedInput(null)}
                maxLength={50}
              />
            </View>
          </View>
          {errors.descriptionHeading && <Text style={styles.errorText}>{errors.descriptionHeading}</Text>}

          <Text style={styles.fieldName}>Describe your role</Text>
          <View style={{position: 'relative', marginTop: responsiveWidth(2), overflow: 'visible'}} collapsable={false}>
            {focusedInput === 'description' && (
              <InputOverlay isVisible={isKeyboardVisible} />
            )}
            <View style={[styles.textInputContainer, {marginTop: 0}, errors.description && styles.inputError]}>
              <TextInput
                selectionHandleColor={'#ffa86b'}
                selectionColor={selectionTwin()}
                cursorColor={'#1e1e1e'}
                placeholderTextColor="#B2B2B2"
                placeholder="Description to show your skills and interests!"
                spellCheck={false}
                autoCorrect={false}
                autoCapitalize={'sentences'}
                style={[styles.textInputs, {height: 205, paddingTop: responsiveWidth(4), paddingRight: responsiveWidth(4)}]}
                onChangeText={t => {
                  setDescription(t);
                  // Clear error on change
                  if (errors.description) {
                    setErrors(prev => ({...prev, description: ''}));
                  }
                }}
                multiline
                value={description}
                onFocus={() => setFocusedInput('description')}
                onBlur={() => setFocusedInput(null)}
                textAlignVertical="top"
                maxLength={500}
              />

              <Text style={styles.characterCount}>
                {description?.length || 0}/<Text style={{color: '#1e1e1e'}}>{characterLimits.description}</Text>
              </Text>
            </View>
          </View>
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </>
      )}

      <AnimatedButton title={'Save'} loading={loading} onPress={() => onSave()} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 0,
    backgroundColor: '#fff',
  },

  heading: {
    fontFamily: 'Rubik-Bold',
    color: '#1e1e1e',
    fontSize: 24,
  },
  subHead: {
    width: responsiveWidth(90),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    fontSize: 14,
    marginTop: 10,
  },
  subHeadHighlight: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: 14,
  },
  fieldName: {
    marginTop: responsiveWidth(5.5),
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.97),
  },
  textInputContainer: {
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: responsiveWidth(3.73),
    paddingLeft: responsiveWidth(5.33),
    width: '100%',
    marginTop: responsiveWidth(2),
    borderColor: '#1e1e1e',
  },
  textInputs: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    flex: 1,
    height: responsiveHeight(6.65),
    borderRadius: responsiveWidth(3.73),
    backgroundColor: '#fff',
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#888',
    alignSelf: 'flex-end',
    marginRight: responsiveWidth(4),
    marginBottom: responsiveWidth(4),
  },
  // ✅ NEW: Error styles
  errorText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: '#E74C3C',
    marginTop: 4,
    marginLeft: responsiveWidth(2),
  },
  inputError: {
    borderColor: '#E74C3C',
    borderWidth: 1.5,
  },
});

export default EditProfiler;
