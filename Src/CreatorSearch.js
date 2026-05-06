import {StyleSheet, Text, View, TextInput, FlatList, Pressable} from 'react-native';
import React, {useEffect, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {Image} from 'expo-image';
import {selectionTwin, WIDTH_SIZES} from '../DesiginData/Utility';
import {navigate} from '../Navigation/RootNavigation';
import {useLazySearchProfileQuery} from '../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import {deleteSearchedProfile, updateSearchedProfile} from '../Redux/Slices/NormalSlices/Search/SearchProfileSlice';
import Feather from 'react-native-vector-icons/Feather';
import NotificationScreenShimmer from './Components/Shimmers/NotificationScreenShimmer';
import DIcon from '../DesiginData/DIcons';
import {useNavigation} from '@react-navigation/native';

const CreatorSearch = () => {
  const [searchedProfiles, setSearchedProfiles] = useState([]);

  const [name, setName] = useState('');

  const [searchProfile] = useLazySearchProfileQuery();

  const [focus, setFocus] = useState(false);

  const token = useSelector(state => state.auth.user.token);

  const dispatch = useDispatch();

  const getAllSearchedQueries = useSelector(state => state.searchProfile.data.searchedProfile);

  const [loading, setLoading] = useState(false);

  const navigation = useNavigation();

  useEffect(() => {
    let debounceTimer;

    const fetchProfiles = async name => {
      if (name !== '') {
        setLoading(true);
        const {data, error} = await searchProfile({token, name});
        setSearchedProfiles(data?.data);
        setLoading(false);
      } else {
        setSearchedProfiles([]);
      }
    };

    // Debounce function
    const debounceFetch = name => {
      clearTimeout(debounceTimer); // Clear the previous timer
      debounceTimer = setTimeout(() => {
        fetchProfiles(name);
      }, 300);
    };

    debounceFetch(name); // Call the debounced function

    console.log(name, '::::');

    // Cleanup function to clear the timer
    return () => {
      clearTimeout(debounceTimer);
    };
  }, [name, token]);

  const handleGoToOthersProfile = (displayName, userId, data) => {
    console.log('Calling two times::::::::::');

    // Dispatch the action to update the searched profile
    dispatch(updateSearchedProfile({data}));

    console.log(data, '::');

    // Navigate after 500 milliseconds
    setTimeout(() => {
      navigate('othersProfile', {
        userName: displayName,
        userId: userId,
        role: 'creator',
      });
      setName('');
    }, 500);
  };

  const handleClear = () => {
    setName('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <View style={styles.nonFlatListContainer}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({pressed}) => [
              styles.backButton,
              {
                backgroundColor: pressed ? '#FFEDE0' : 'transparent',
              },
            ]}>
            <DIcon name="chevron-back" provider="IonIcons" size={responsiveFontSize(3)} color="#1E1E1E" />
          </Pressable>

          {/* Search Bar */}
          <View style={[styles.searchBar, {backgroundColor: focus ? '#FFEDE0' : '#fff'}]}>
            <Feather name="search" color="#1E1E1E" size={responsiveFontSize(2.5)} style={styles.searchIcon} />

            <TextInput
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              onChangeText={t => setName(t)}
              value={name}
              selectionHandleColor={'#ffa86b'}
              selectionColor={selectionTwin()}
              cursorColor={'#1e1e1e'}
              placeholderTextColor="#B2B2B2"
              placeholder="Search here...."
              textAlignVertical="center" // Center text vertically
              includeFontPadding={false} // Remove extra font padding on Android
              style={[styles.searchInput, focus ? {backgroundColor: '#FFEDE0'} : {backgroundColor: '#fff'}]}
            />

            {name.length > 0 && <DIcon provider={'Ionicons'} name="close" size={responsiveFontSize(2.5)} color="#1e1e1e" style={styles.closeIcon} onPress={handleClear} />}
          </View>
        </View>

        <Text style={styles.recentSearchText}>Recent Searches</Text>

        {/* List of Recent Searches */}
        {loading ? (
          <NotificationScreenShimmer />
        ) : (
          <FlatList
            data={searchedProfiles?.length >= 1 ? searchedProfiles : getAllSearchedQueries}
            ItemSeparatorComponent={() => <View style={{height: 1.5, backgroundColor: '#E9E9E9'}} />}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({item}) => (
              <Pressable
                style={({pressed}) => [styles.listItem, {backgroundColor: pressed ? '#FFEDE0' : 'transparent'}]}
                onPress={() =>
                  handleGoToOthersProfile(item.displayName, item._id, {
                    profile_image: {
                      url: item.profile_image.url,
                    },
                    _id: item._id,
                    fullName: item.fullName,
                    displayName: item.displayName,
                  })
                }>
                <View style={styles.imageContainer}>
                  <Image source={{uri: item?.profile_image?.url}} style={styles.profileImage} placeholderContentFit="contain" placeholder={require('../Assets/Images/DefaultProfile.jpg')} contentFit="cover" />
                </View>

                <View style={{flexDirection: 'column', gap: responsiveWidth(1.6)}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: responsiveWidth(0.8)}}>
                    <Text style={styles.name}>{item?.fullName}</Text>
                    <View style={styles.verifyContainer}>
                      <Image cachePolicy="memory-disk" source={require('../Assets/Images/verify.png')} contentFit="contain" style={{flex: 1}} />
                    </View>
                  </View>

                  <Text style={styles.username}>{item?.displayName}</Text>
                </View>
                {searchedProfiles?.length < 1 && (
                  <Pressable style={styles.closeButton} onPress={() => dispatch(deleteSearchedProfile({id: item._id}))}>
                    <Ionicons name="close" size={responsiveFontSize(2.5)} color="black" />
                  </Pressable>
                )}
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default CreatorSearch;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  nonFlatListContainer: {
    paddingHorizontal: responsiveWidth(6.4),
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveWidth(2),
    marginBottom: responsiveWidth(4),
    borderRadius: responsiveWidth(3.7),
    width: WIDTH_SIZES[281] - WIDTH_SIZES[20] + WIDTH_SIZES[2],
    height: 52,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    alignSelf: 'center',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.8),
    color: '#1e1e1e',
    paddingTop: 0,
    paddingBottom: 0,
    verticalAlign: 'middle',
    textAlign: 'left',
    textAlignVertical: 'center',
    flex: 1,
  },
  recentSearchText: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.5),
    marginTop: WIDTH_SIZES[20] + WIDTH_SIZES[4],
    marginBottom: responsiveWidth(3.2),
    color: 'black',
    marginLeft: 32,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsiveWidth(4.3),
    paddingHorizontal: responsiveWidth(6.7),
  },

  name: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(2),
    color: 'black',
  },
  username: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.5),
    color: '#1e1e1e',
  },
  closeButton: {
    position: 'absolute',
    right: responsiveWidth(6),
  },
  verifyContainer: {
    width: 15,
    height: 14.32,
  },
  searchIcon: {
    marginRight: responsiveWidth(2),
  },
  backButton: {
    marginRight: responsiveWidth(3),
    borderWidth: WIDTH_SIZES[2],
    height: 52,
    width: 52,
    borderRadius: WIDTH_SIZES[14],
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: responsiveWidth(13.3),
    height: responsiveWidth(13.3),
    borderRadius: responsiveWidth(105),
    marginRight: responsiveWidth(1.5),
    borderWidth: 1.5,
    overflow: 'hidden', // Clip the image if it exceeds the container
    alignItems: 'center', // Center the image horizontally
    justifyContent: 'center', // Center the image vertically
  },
  profileImage: {
    width: '100%', // Fill the container width
    height: '100%', // Fill the container height
    resizeMode: 'cover', // Ensure the image covers the container while maintaining aspect ratio
  },
});
