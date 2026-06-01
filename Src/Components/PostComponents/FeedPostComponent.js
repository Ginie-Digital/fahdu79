import {StyleSheet, View, Text, FlatList, TouchableOpacity} from 'react-native';
import React, {useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Tabs} from 'react-native-collapsible-tab-view';
import {Image} from 'expo-image';
import DIcon from '../../../DesiginData/DIcons';
import ProfileDescriptionModal from '../../Screens/LoginSignup/ProfileDescriptionModal';
import {toggleProfileDescriptionModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';

//
//
//
//

const FeedPostComponent = ({navigation}) => {
  const initialServiceData = [
    {
      id: '1',
      type: 'Video Call',
      description: 'Video-Connect face-to-face with creators in real-time!',
      icon: 'videocam',
      buttonText: 'Call Now',
      price: 2,
      provider: 'Ionicons',
      url: require('../../../Assets/Images/profileVideo.png'),
      typeServer: 'videoCall_info',
    },
    {
      id: '2',
      type: 'Audio Call',
      description: 'Audio-Discuss your passions over phone calls.',
      icon: 'phone-call',
      buttonText: 'Call Now',
      price: 1,
      provider: 'Feather',
      url: require('../../../Assets/Images/profileCall.png'),
      typeServer: 'audioCall_info',
    },
    {
      id: '3',
      type: 'Chat',
      description: 'Chat-Spark insightful convos with creators',
      icon: 'message1',
      buttonText: 'Chat Now',
      price: 1,
      provider: 'profileVideo',
      url: require('../../../Assets/Images/profileMessage.png'),
      typeServer: 'chat_info',
    },
    {
      id: '4',
      type: 'Live Stream',
      description: 'Livestream-Time to interact and experience exclusive content!',
      icon: 'live-tv',
      buttonText: 'Stream',
      price: null,
      typeServer: 'liveStream_info',
    },
  ];

  const [serviceList, setServiceList] = useState(initialServiceData);

  const userPosts = useSelector(state => state.myProfileFeedCache.data.content);

  const userDetail = useSelector(state => state.auth.user);

  const dispatch = useDispatch();

  console.log(userDetail, 'myProfileFee');

  const handlePressEditDescription = index => {
    console.log(index);

    let type;

    switch (index + 1) {
      case 1:
        type = 'video';
        break;
      case 2:
        type = 'audio';
        break;
      case 3:
        type = 'chat';
        break;
      case 4:
        type = 'liveStream';
        break;
      default:
        type = 'unknown';
    }

    dispatch(toggleProfileDescriptionModal({type, show: true}));
  };

  const card = ({item, index}) => {
    const typeKey = item?.type?.toLowerCase().split(' ').join('');

    console.log(typeKey);

    return (
      <View style={styles.card}>
        <Text style={styles.subheading}>{item.type}</Text>
        <Text style={styles.description}>{item.description}</Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <View style={{height: 18, width: 17}}>
              <Image source={require('../../../Assets/Images/profileTick.png')} contentFit="contain" style={{flex: 1}} />
            </View>
            <Text style={styles.featureText}>{userDetail[`${item?.typeServer}`]?.[0] || 'Full access to the content of \n subscription tier'}</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={{height: 18, width: 17}}>
              <Image source={require('../../../Assets/Images/profileTick.png')} contentFit="contain" style={{flex: 1}} />
            </View>

            <Text style={styles.featureText}>{userDetail[`${item?.typeServer}`]?.[1] || 'Cancel your subscription at any time'}</Text>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.priceRow}>
          {/* Followers Pricing */}
          <View style={styles.priceBox}>
            <Text style={[styles.priceTitle, {color: '#314158'}]}>Followers</Text>
            <View style={styles.priceRightContainer}>
              <Text style={styles.priceValue}>{userDetail?.followerFee?.[typeKey] || 0}</Text>
              <Image source={require('../../../Assets/Images/Coins2.png')} style={styles.coinIcon} contentFit="contain" />
              <Text style={styles.priceLabel}>/{`${index === 2 ? 'msg' : 'min'}`}</Text>
            </View>
          </View>

          {/* Subscribers Pricing */}
          <View style={styles.priceBox}>
            <Text style={[styles.priceTitle, {color: '#314158'}]}>Subscribers</Text>
            <View style={styles.priceRightContainer}>
              <Text style={styles.priceValue}>{userDetail?.subscriberFee?.[typeKey] || 0}</Text>
              <Image source={require('../../../Assets/Images/Coins2.png')} style={styles.coinIcon} contentFit="contain" />
              <Text style={styles.priceLabel}>/{`${index === 2 ? 'msg' : 'min'}`}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.callButton, item.price ? {} : styles.liveStreamButton]} onPress={() => handlePressEditDescription(index)}>
          <View style={styles.priceTag}>
            <View style={{height: 17.83, width: 17.83, backgroundColor: 'transparent', marginRight: 10}}>
              <Image source={require('../../../Assets/Images/edit.png')} contentFit="contain" style={{flex: 1}} />
            </View>
            <Text style={styles.price}>Edit Description</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <Tabs.FlatList
        data={serviceList}
        keyExtractor={item => item.id}
        renderItem={card}
        contentContainerStyle={[styles.listContainer]}
        style={{backgroundColor: '#fff'}}
        ListHeaderComponent={() => {
          return (
            <>
              <View style={styles.containerCategory}>
                <Text style={styles.title}>{userDetail.categoryHeader || 'Dance Creator'}</Text>
                <Text style={styles.description}>
                  {userDetail.categoryDescription ||
                    'As a versatile Dance Creator and Choreographer, I design dynamic routines that blend traditional and modern styles across various genres. I lead teams to deliver impactful performances and incorporate diverse cultural elements. I am committed to mentoring dancersand fostering their growth.'}
                </Text>
              </View>
              <View style={{width: '100%', height: 6, backgroundColor: '#ededed', marginBottom: 24, marginTop: 0}} />
              <Text style={[styles.title, {marginLeft: 24, marginBottom: 16}]}>My Gigs</Text>
            </>
          );
        }}
        ItemSeparatorComponent={() => <View style={{marginVertical: 12}} />}
      />

      <ProfileDescriptionModal />
    </>
  );
};

export default FeedPostComponent;

const styles = StyleSheet.create({
  container: {
    // paddingHorizontal: responsiveWidth(2),
    // margin: 16,
    backgroundColor: '#fff',
    flex: 1,
  },
  containerCategory: {
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 18,
    color: '#1e1e1e',
    marginBottom: 8,
    fontFamily: 'Rubik-SemiBold',
  },
  description: {
    fontSize: 14,
    color: '#1e1e1e',
    lineHeight: 19,
    marginBottom: 8,
    fontFamily: 'Rubik-Regular',
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    fontFamily: 'Rubik-Bold',
  },
  listContainer: {
    paddingBottom: 16,
  },
  card: {
    borderWidth: 2,
    borderColor: '#1e1e1e',
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 32,
    // marginBottom: 16,
    backgroundColor: '#fff',
    marginHorizontal: 24,
  },
  subheading: {
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
    marginBottom: 6,
  },

  featureList: {
    // marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    // alignItems: 'center',
    marginBottom: 16,
    // backgroundColor: 'red',
  },
  featureText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    lineHeight: 18,
    color: '#1e1e1e',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA86B',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
  },
  liveStreamButton: {
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
    flex: 1,
    marginLeft: 7,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    alignSelf: 'center',
  },
  price: {
    fontSize: 14,
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
    marginTop: 3,
  },
  perMin: {
    fontSize: 10,
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
  },

  priceRow: {
    flexDirection: 'column',
    marginBottom: 16,
    gap: 12,
  },

  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3EB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    width: '100%',
  },

  priceTitle: {
    fontSize: 15,
    fontFamily: 'Rubik-SemiBold',
    color: '#344054', // Dark slate/navy to match other profile
  },

  priceRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  priceValue: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    marginRight: 4,
  },

  coinIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },

  priceLabel: {
    fontSize: 10,
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
  },
});
