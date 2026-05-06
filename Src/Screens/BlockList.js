import { StyleSheet, Text, View, Image, TouchableOpacity, FlatList, Pressable, Button, Platform } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import { useLazyGetBlockListQuery, useLazyGetFSDQuery, useLazyGetFSQuery, useLazyIsValidFollowQuery, useUnblockUserMutation } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { LinearGradient } from 'expo-linear-gradient';
import DIcon from '../../DesiginData/DIcons';
import { LoginPageErrors, chatRoomSuccess } from '../Components/ErrorSnacks';
import { WIDTH_SIZES } from '../../DesiginData/Utility';

const BlockList = ({ route, navigation }) => {
  const [isValidFollow] = useLazyIsValidFollowQuery();

  const [blockListArr, setBlockListArr] = useState([]);

  const [unblockId, setUnblockId] = useState([]);

  const [getBlockList] = useLazyGetBlockListQuery();

  const [unblockUser] = useUnblockUserMutation();

  const handleUnblock = async id => {
    const { error, data } = await unblockUser({ token: route?.params?.token, data: { id } });

    if (error) {
      if (error?.status === 'FETCH_ERROR') {
        LoginPageErrors('Please check your network');
      }
    }

    if (data) {
      chatRoomSuccess('We have unblocked user');
      setUnblockId(x => [...x, id]);
    }
  };

  const handleGoToOthersProfile = useCallback(
    async (userName, userId) => {
      console.log('Callijg', userId, userName);

      if (unblockId.includes(userId)) {
        navigation.navigate('othersProfile', { userName, userId });
      }
    },
    [unblockId],
  );

  const EachList = ({ item }) => {
    return (
      <>
        <Pressable style={styles.eachListContainer} android_ripple={{ color: 'white' }} onPress={() => handleGoToOthersProfile(item?.displayName, item?._id)}>
          <View style={{ flexDirection: 'row', gap: responsiveWidth(2) }}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: item?.profile_image?.url }} resizeMethod="resize" resizeMode="cover" style={styles.profileImage} />
              {item?.role === 'creator' ? (
                <View style={{ position: 'absolute', transform: [{ translateX: responsiveWidth(8.4) }, { translateY: responsiveWidth(-5) }] }}>
                  <DIcon provider={'MaterialIcons'} name={'verified'} color="#FFA07A" size={responsiveWidth(4.5)} />
                </View>
              ) : null}
            </View>

            <View style={styles.detailContainer}>
              <Text style={styles.name}>{item?.fullName}</Text>
              <Text style={styles.userName}>@{item?.displayName}</Text>
            </View>
          </View>

          {!unblockId?.includes(item?._id) && (
            <Pressable onPress={() => handleUnblock(item?._id)} style={({ pressed }) => [styles.unblockWrapper, { backgroundColor: pressed ? '#FFC399' : '#FFA86B' }]}>
              <Text style={styles.unbockText}>Unblock</Text>
            </Pressable>
          )}


        </Pressable>
      </>
    );
  };

  useEffect(() => {
    const blockLists = async () => {
      const { data, error } = await getBlockList({ token: route?.params?.token });

      if (error) {
        if (error?.status === 'FETCH_ERROR') {
          LoginPageErrors('Check your network');
        }
      }

      if (data) {
        console.log(data?.data);
        setBlockListArr(data?.data?.users);
      }
    };

    blockLists();
  }, [route?.params?.token]);

  if (blockListArr?.length <= 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.userName}>No Blocked User Found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={blockListArr}
        ItemSeparatorComponent={() => (
          <LinearGradient colors={['#FFFDF650', '#43423D50', '#FFFDF650']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.linearGradient}>
            <View style={{ height: 1 }} />
          </LinearGradient>
        )}
        renderItem={({ item, index }) => <EachList item={item} index={index} />}
      />
    </View>
  );
};

export default BlockList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopColor: '#282828',
  },

  eachListContainer: {
    flexDirection: 'row',
    gap: responsiveWidth(4),
    paddingLeft: responsiveWidth(4),
    paddingVertical: responsiveWidth(3),
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: responsiveWidth(4),
  },

  imageContainer: {
    borderColor: 'purple',
    borderRadius: responsiveWidth(12),
    position: 'relative',
    borderColor: '#282828',
    resizeMode: 'cover',
    height: responsiveWidth(12),
    width: responsiveWidth(12),
    justifyContent: 'center',
  },

  profileImage: {
    flex: 1,
    borderRadius: responsiveWidth(12),
    borderWidth: 1,
    borderColor: '#282828',
  },

  name: {
    fontFamily: 'MabryPro-Medium',
    fontSize: responsiveFontSize(1.8),
    color: '#282828',
  },

  userName: {
    fontFamily: 'MabryPro-Regular',
    fontSize: responsiveFontSize(1.6),
    color: '#282828',
  },

  detailContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },

  choiceContainer: {
    paddingLeft: responsiveWidth(4),
    flexDirection: 'row',
    marginTop: responsiveWidth(2),
  },

  button: {
    backgroundColor: '#fff',
    padding: responsiveWidth(2),
    borderRadius: responsiveWidth(2),
    fontFamily: 'MabryPro-Regular',
    color: '#282828',
    borderWidth: 1,
  },

  buttonSelected: {
    backgroundColor: '#ffa07a',
    padding: responsiveWidth(2),
    borderRadius: responsiveWidth(2),
    fontFamily: 'MabryPro-Regular',
    color: '#282828',
    borderWidth: 1,
  },

  unbockText: {
    color: '#1e1e1e',
    fontFamily: 'Rubik-Medium',
    fontSize: 12,
  },

  unblockWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: responsiveWidth(2),
    paddingVertical: responsiveWidth(1.5),
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
    backgroundColor: '#FFA86B',
    paddingHorizontal: responsiveWidth(4),
  },
});
