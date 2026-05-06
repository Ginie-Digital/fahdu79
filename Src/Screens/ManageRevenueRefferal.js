import {StyleSheet, Text, TouchableOpacity, View, FlatList, Animated, Platform} from 'react-native';
import React, {useEffect, useState} from 'react';
import {FONT_SIZES, WIDTH_SIZES} from '../../DesiginData/Utility';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import {Clipboard} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Image} from 'expo-image';
import {useLazyGetRefferalLinkDetailsQuery, useLazyRefferalDetailsQuery, useLazyRefferalListQuery} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useSelector} from 'react-redux';
import {chatRoomSuccess, LoginPageErrors} from '../Components/ErrorSnacks';
import {ScrollView} from 'react-native-gesture-handler';

const ReferralLevel = ({level, users}) => {
  const [expanded, setExpanded] = useState(true);
  const animatedHeight = new Animated.Value(expanded ? 1 : 0);

  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(animatedHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  return (
    <View style={styles.levelContainer}>
      {/* Level Header */}
      <TouchableOpacity onPress={toggleExpand} style={styles.levelHeader}>
        <Text style={styles.levelText}>Level {level}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#000" />
      </TouchableOpacity>

      {/* Expandable List */}
      <Animated.View style={{overflow: 'hidden', maxHeight: animatedHeight.interpolate({inputRange: [0, 1], outputRange: [0, 300]})}}>
        <FlatList
          data={users}
          keyExtractor={item => item.id.toString()}
          ItemSeparatorComponent={() => <View style={{width: '100%', height: WIDTH_SIZES[1.5], backgroundColor: '#E9E9E9'}} />}
          renderItem={({item}) => (
            <View style={styles.userContainer}>
              <View style={styles.avatar}>
                <Image cachePolicy="memory-disk" source={{uri: item?.profile_image}} contentFit="contain" style={{flex: 1}} />
              </View>

              <View style={{flexDirection: 'column', gap: WIDTH_SIZES[4] + WIDTH_SIZES[2]}}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userHandle}>{item.username}</Text>
              </View>
            </View>
          )}
        />
      </Animated.View>
    </View>
  );
};

const CommissionCard = ({level, commission, referrals, percentage}) => {
  const [detailsLayout, setDetailsLayout] = useState({width: 0, height: 0});

  const handleLayout = event => {
    const {width, height} = event.nativeEvent.layout;
    setDetailsLayout({width, height});
  };

  return (
    <View style={{position: 'relative'}}>
      <View style={[styles.overlayTwo, {width: detailsLayout.width, height: detailsLayout.height}]} />
      <View style={styles.containerCard} onLayout={handleLayout}>
        <Text style={styles.level}>Level {level}</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Total Commission</Text>
          <Text style={styles.value}>₹{commission}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>No. of Referral</Text>
          <Text style={styles.value}>{referrals}</Text>
        </View>
        <View style={[styles.detailRow, {marginBottom: 0}]}>
          <Text style={styles.label}>Commission %</Text>
          <Text style={styles.percentage}>{percentage}%</Text>
        </View>
      </View>
    </View>
  );
};

const ManageRevenueRefferal = () => {
  const token = useSelector(state => state.auth.user.token);

  const [refferalDetails] = useLazyRefferalDetailsQuery();

  const [refferalList] = useLazyRefferalListQuery();

  const [dashboardData, setDashboardData] = useState({});

  const [listDataState, setListDataState] = useState([]);

  const flatListPupulator = async () => {
    const {data, error} = await refferalDetails({token});

    const {data: listData, error: listError} = await refferalList({token});

    const transformedData = [
      {
        level: 1,
        users: listData?.data?.level1?.map(user => ({
          id: user._id,
          name: user.fullName,
          username: user.displayName,
          profile_image: user.profile_image,
        })),
      },
    ];

    setListDataState(transformedData);

    if (data?.statusCode === 200) {
      setDashboardData(data?.data);
    }

    if (error) {
      console.log('Error', error?.data, error?.message);
      LoginPageErrors('Something went wrong!');
    }
  };

  useEffect(() => {
    flatListPupulator();
  }, []);

  const copyToClipboard = () => {
    Clipboard.setString(dashboardData?.referralLink);
    chatRoomSuccess('Copied to clipboard!');
  };

  const [isNotDashboardScreen, setIsNotDashboardScreen] = useState(false);

  return (
    <View style={[styles.container, {paddingHorizontal: !isNotDashboardScreen ? WIDTH_SIZES[24] : null}]}>
      <View style={{paddingHorizontal: isNotDashboardScreen ? WIDTH_SIZES[24] : null}}>
        <View style={{borderWidth: responsiveWidth(0.5), borderRadius: responsiveWidth(3.73), width: '100%'}}>
          <View style={styles.FollowersSubScribersToggle}>
            <TouchableOpacity onPress={() => setIsNotDashboardScreen(!isNotDashboardScreen)} style={[styles.Followers, isNotDashboardScreen === false ? {backgroundColor: '#FFA86B', borderWidth: responsiveWidth(0.3), borderRadius: responsiveWidth(2.5)} : null]}>
              <Text style={{fontFamily: 'Rubik-SemiBold', fontSize: FONT_SIZES[14], color: '#282828'}} key={'1Followers'}>
                Dashboard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsNotDashboardScreen(!isNotDashboardScreen)} style={[styles.SubScribers, isNotDashboardScreen === true ? {backgroundColor: '#FFA86B', borderWidth: responsiveWidth(0.3), borderRadius: responsiveWidth(2.5)} : null]}>
              <Text style={{fontFamily: 'Rubik-SemiBold', fontSize: FONT_SIZES[14], color: '#282828'}}>List</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {!isNotDashboardScreen ? (
        <ScrollView showsVerticalScrollIndicator={false} style={{paddingRight: WIDTH_SIZES['2'] + WIDTH_SIZES['1.5'], paddingBottom: 100}}>
          <View style={styles.containerClip}>
            <Text style={styles.text}>Refer and earn commission on every friend that joins Fahdu through your referral.</Text>
            <View style={styles.linkRow}>
              <Text style={styles.link}>{dashboardData?.referralLink}</Text>
              <TouchableOpacity onPress={copyToClipboard}>
                <View style={{width: 14, height: 16}}>
                  <Image cachePolicy="memory-disk" source={require('../../Assets/Images/ClipBoard.png')} contentFit="contain" style={{flex: 1}} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <CommissionCard level={1} commission={dashboardData?.level1Earnings} referrals={dashboardData?.level1} percentage={dashboardData?.level1Rate} />
          </View>
        </ScrollView>
      ) : (
        listDataState?.map(item => <ReferralLevel key={item.level} level={item.level} users={item.users} />)
      )}
    </View>
  );
};

export default ManageRevenueRefferal;

const styles = StyleSheet.create({
  container: {
    // padding: WIDTH_SIZES[24],
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 24,
  },
  FollowersSubScribersToggle: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: responsiveWidth(2.8),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: responsiveWidth(2),
    // backgroundColor: "#f3f3f3",
    height: 54,
    padding: responsiveWidth(1),
  },
  Followers: {
    flexBasis: '48.2%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  SubScribers: {
    flexBasis: '48.2%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  //Clip

  containerClip: {
    borderStyle: 'dashed',
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
    borderRadius: WIDTH_SIZES[14],
    padding: WIDTH_SIZES[20],
    width: '100%',
    alignSelf: 'center',
    marginTop: WIDTH_SIZES[24],
  },
  text: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[14],
    color: '#1e1e1e',
    marginBottom: 20,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  link: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[16],
    color: '#1e1e1e',
  },

  //Card

  containerCard: {
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
    borderRadius: WIDTH_SIZES[14],
    padding: WIDTH_SIZES[20],
    marginTop: WIDTH_SIZES[24],
    backgroundColor: '#fff',
    shadowColor: '#1e1e1e',
    shadowOffset: {width: 2, height: 2},
  },
  level: {
    fontFamily: 'Rubik-Medium',
    fontSize: FONT_SIZES[16],
    marginBottom: WIDTH_SIZES[20],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: WIDTH_SIZES[16],
  },
  label: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[14],
    color: '#1e1e1e',
  },
  value: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[16],
    color: '#1e1e1e',
  },
  percentage: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[16],
    color: '#1e1e1e',
  },

  overlayTwo: {
    position: 'absolute',
    top: Platform.OS === 'android' ? '12.5%' : '14%',
    left: '1.2%',
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    zIndex: -1,
    borderWidth: WIDTH_SIZES[1.5],
  },

  //Flatlist leve

  levelContainer: {
    backgroundColor: '#fff',
    marginBottom: 10,
    overflow: 'hidden',
    marginTop: WIDTH_SIZES[24],
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: WIDTH_SIZES[24],
    paddingVertical: WIDTH_SIZES[8] - WIDTH_SIZES[2],
    backgroundColor: '#f3f3f3',
  },
  levelText: {
    fontFamily: 'Rubik-Medium',
    fontSize: FONT_SIZES[14],
    color: '#1e1e1e',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: WIDTH_SIZES[24],
    paddingVertical: WIDTH_SIZES[14],
  },
  avatar: {
    width: WIDTH_SIZES[36] + WIDTH_SIZES[10],
    height: WIDTH_SIZES[36] + WIDTH_SIZES[10],
    borderRadius: responsiveWidth(30),
    marginRight: WIDTH_SIZES[12],
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
    overflow: 'hidden',
  },
  userName: {
    fontFamily: 'Rubik-Medium',
    fontSize: FONT_SIZES[16],
    color: '#1e1e1e',
  },
  userHandle: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[12],
    color: '#1e1e1e',
  },
});
