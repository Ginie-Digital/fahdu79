import {StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import React, {useState} from 'react';

import {useSelector} from 'react-redux';
import { useAppTheme } from '../../Hook/useAppTheme';
import {Image} from 'expo-image';
import {Tabs} from 'react-native-collapsible-tab-view';
import {useGetRoomIdMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {navigate} from '../../../Navigation/RootNavigation';
import {useMessageNavigation} from '../../Hook/useMessageNavigation';
import {ActivityIndicator} from 'react-native';
import {LoginPageErrors} from '../ErrorSnacks';
import {triggerImpactLight} from '../../Utils/Haptics';

const OtherProfileFeedPost = ({contactDescription}) => {
  console.log({contactDescription});
  const { colors, isDark } = useAppTheme();

  const {profileDetails, haveFollowed} = useSelector(state => state.profileFeedCache.data);
  const token = useSelector(state => state.auth.user.token);

  const chatRoomObject = useSelector(state => state.roomList.data.none);

  const goChat = useMessageNavigation(token, profileDetails, chatRoomObject);

  const [getRoomId] = useGetRoomIdMutation();
  const [isCallLoading, setIsCallLoading] = useState(null);

  const data = [
    {
      id: '1',
      type: 'Chat',
      description: 'Spark insightful convos with creators',
      url: require('../../../Assets/Images/profileMessage.png'),
      buttonText: 'Chat',
    },

    {
      id: '2',
      type: 'Live Stream',
      description: 'Time to interact and experience exclusive content!',
      url: require('../../../Assets/Images/live.png'),
      buttonText: 'Join',
    },

    {
      id: '3',
      type: 'Audio Call',
      description: 'Discuss your passions over phone calls.',
      url: require('../../../Assets/Images/profileCall.png'),
      buttonText: 'Call',
    },
    {
      id: '4',
      type: 'Video Call',
      description: 'Connect face-to-face with creators in real-time!',
      url: require('../../../Assets/Images/profileVideo.png'),
      buttonText: 'Call',
    },
  ];

  const handleButtonPress = async index => {
    triggerImpactLight();
    if (index === 0) {
      goChat();
    } else if (index === 2 || index === 3) {
      if (!haveFollowed) {
        LoginPageErrors('Please follow the creator to initiate a call.');
        return;
      }
      // Audio Call (2) or Video Call (3)
      try {
        setIsCallLoading(index);
        const data = {user_id: {user1: profileDetails?._id}};
        const response = await getRoomId({token, data});

        if (response?.data?.statusCode === 200) {
          const roomId = response?.data?.data?._id;
          navigate('SelectDuration', {
            callType: index === 2 ? 'Audio' : 'Video',
            userId: profileDetails?._id,
            roomId: roomId,
          });
        }
      } catch (error) {
        console.error('Error initiating call from profile:', error);
      } finally {
        setIsCallLoading(null);
      }
    } else {
      console.log('index ', index);
    }
  };

  const card = ({item, index}) => {
    // Default features (can be overridden from API)
    const sampleFeatures = ['Full access to the content offffjjslkdfiii', 'Cancel Your subscription at any time'];
    const priceUnit = index === 0 ? 'msg' : 'min';

    return (
      <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderColor: isDark ? '#212121' : '#1e1e1e' }]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#101828' }]}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
          <Text style={[styles.cardSubtitle, { color: isDark ? '#FFFFFF' : '#1e1e1e' }]}>{data[index]?.description}</Text>
        </View>

        {/* Feature List */}
        <View style={styles.featureList}>
          {sampleFeatures.map((feature, fIndex) => (
            <View key={fIndex} style={styles.featureItem}>
              <View style={styles.checkCircle}>
                <View style={styles.checkMark} />
              </View>
              <Text style={[styles.featureText, { color: isDark ? '#FFFFFF' : '#1e1e1e' }]} numberOfLines={1}>
                {item?.descriptions?.[fIndex] || feature}
              </Text>
            </View>
          ))}
        </View>

        {/* Bottom Row: Pricing + Button */}
        <View style={[styles.bottomRow, { borderTopColor: isDark ? '#212121' : '#F3F4F6', borderTopWidth: isDark ? 2 : 1 }]}>
          {/* Pricing Container */}
          <View style={styles.pricingContainer}>
            {/* Follower Price */}
            <View style={styles.priceLineRow}>
              <View style={styles.priceTextWrap}>
                <Text style={[styles.priceValueWhite, { color: isDark ? '#FFFFFF' : '#101828' }]}>
                  ₹{item?.followerFee || 499}
                </Text>
                <Text style={[styles.priceUnitWhite, { color: isDark ? '#FFFFFF' : '#101828' }]}>/{priceUnit}</Text>
              </View>
              <View style={[styles.followerBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#F3F4F6', borderWidth: isDark ? 0 : 1, borderColor: '#1e1e1e' }]}>
                <Text style={[styles.followerBadgeText, { color: isDark ? '#FFFFFF' : '#6A7282' }]}>FOLLOWERS</Text>
              </View>
            </View>

            {/* Subscriber Price */}
            <View style={styles.priceLineRow}>
              <View style={styles.priceTextWrap}>
                <Text style={styles.priceValueOrange}>
                  ₹{item?.subscriptionFee || 299}
                </Text>
                <Text style={styles.priceUnitOrange}>/{priceUnit}</Text>
              </View>
              <View style={[styles.subscriberBadge, { borderWidth: isDark ? 0 : 1, borderColor: '#1e1e1e' }]}>
                <Text style={styles.subscriberBadgeText}>SUBSCRIBERS</Text>
              </View>
            </View>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={[styles.ctaButton, isCallLoading === index && {opacity: 0.7}]}
            onPress={() => handleButtonPress(index)}
            disabled={isCallLoading !== null}
            activeOpacity={0.8}>
            {isCallLoading === index ? (
              <ActivityIndicator size="small" color="#1e1e1e" />
            ) : (
              <Text style={styles.ctaButtonText}>
                {data[index]?.buttonText + ' Now'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Tabs.FlatList
      data={contactDescription}
      keyExtractor={item => item.type}
      renderItem={card}
      contentContainerStyle={styles.listContainer}
      style={{backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF'}}
      ItemSeparatorComponent={() => <View style={{marginVertical: 10}} />}
      ListHeaderComponent={() => {
        return (
          <>
            <View style={[styles.containerCategory, { backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF' }]}>
              <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1e1e1e' }]}>
                {profileDetails?.categoryHeader || 'Fahdu Creator'}
              </Text>
              <Text style={[styles.descriptionText, { color: isDark ? '#FFFFFF' : '#1e1e1e' }]}>
                {profileDetails?.categoryDescription ||
                  'As a versatile Dance Creator and Choreographer, I design dynamic routines that blend traditional and modern styles across various genres. I lead teams to deliver impactful performances and incorporate diverse cultural elements. I am committed to mentoring dancersand fostering their growth.'}
              </Text>
            </View>
            <View
              style={{
                width: '100%',
                height: 6,
                backgroundColor: isDark ? '#171717' : '#ededed',
                marginBottom: 24,
                marginTop: 0,
              }}
            />
            <Text style={[styles.title, {marginLeft: 24, marginBottom: 16, color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>
              Contact Info
            </Text>
          </>
        );
      }}
    />
  );
};

export default OtherProfileFeedPost;

const styles = StyleSheet.create({
  containerCategory: {
    padding: 24,
  },
  title: {
    fontSize: 18,
    marginBottom: 8,
    fontFamily: 'Rubik-SemiBold',
    lineHeight: 18,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
    fontFamily: 'Rubik-Regular',
  },
  listContainer: {
    paddingBottom: 16,
  },

  // ── Card ──────────────────────────────────────────────
  card: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 24,
    marginHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
  },

  // ── Header ────────────────────────────────────────────
  headerRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 22,
    width: '100%',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
    lineHeight: 16,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    lineHeight: 12,
  },

  // ── Feature List ──────────────────────────────────────
  featureList: {
    gap: 12,
    marginBottom: 22,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C4FFC7',
  },
  checkMark: {
    width: 7,
    height: 4,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#1E1E1E',
    transform: [{rotate: '-45deg'}],
    marginTop: -2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    lineHeight: 19,
  },

  // ── Bottom Row ────────────────────────────────────────
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 10,
    width: '100%',
  },

  // ── Pricing ───────────────────────────────────────────
  pricingContainer: {
    gap: 14,
  },
  priceLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceTextWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValueWhite: {
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
    letterSpacing: -0.4,
    lineHeight: 16,
  },
  priceUnitWhite: {
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
    letterSpacing: -0.4,
    lineHeight: 16,
  },
  priceValueOrange: {
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
    color: '#FFA86B',
    letterSpacing: -0.4,
    lineHeight: 16,
  },
  priceUnitOrange: {
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
    color: '#FFA86B',
    letterSpacing: -0.4,
    lineHeight: 16,
  },

  // ── Badges ────────────────────────────────────────────
  followerBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followerBadgeText: {
    fontSize: 9,
    fontFamily: 'Rubik-Bold',
    letterSpacing: 0.225,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  subscriberBadge: {
    backgroundColor: 'rgba(255, 168, 107, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscriberBadgeText: {
    fontSize: 9,
    fontFamily: 'Rubik-Bold',
    color: '#FFA86B',
    letterSpacing: 0.225,
    textTransform: 'uppercase',
    lineHeight: 14,
  },

  // ── CTA Button ────────────────────────────────────────
  ctaButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFA86B',
    borderWidth: 2,
    borderColor: '#FF7819',
    borderRadius: 14,
    minWidth: 90,
    height: 44,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  ctaButtonText: {
    fontSize: 14,
    fontFamily: 'Rubik-SemiBold',
    color: '#1E1E1E',
    textAlign: 'center',
    lineHeight: 14,
  },
});
