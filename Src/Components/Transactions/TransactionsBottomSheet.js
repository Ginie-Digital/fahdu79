import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  ToastAndroid,
  BackHandler,
} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect} from 'react';
import {
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';
import BottomSheet from '@gorhom/bottom-sheet';
import {useDispatch, useSelector} from 'react-redux';
import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {toggleTransactionSheet} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {setTransactionFilter} from '../../../Redux/Slices/NormalSlices/TransactionSlice';
import {transactionFilterData} from '../../../DesiginData/Data';

const TransactionsBottomSheet = () => {
  const bottomSheetRef = useRef(null);

  const dispatch = useDispatch();

  const transactionBottomSheetVisibility = useSelector(
    state => state.hideShow.visibility.transactionSheet,
  );

  const token = useSelector(state => state.auth.user.token);

  const [loading, setLoading] = useState(false);

  const snapPoints = useMemo(() => ['42%', '43%', '44%'], []);

  const [currentlySelected, setCurrentlySelected] = useState(1);

  const handleSheetChanges = useCallback(index => {
    if (index === -1) {
      dispatch(toggleTransactionSheet({show: -1}));
    }
  }, []);

  const onBackPress = () => {
    if (bottomSheetRef !== null) {
      bottomSheetRef.current?.close();
      return true;
    }
  };

  const filter = useSelector(state => state.transaction.data.filter);

  useEffect(() => {
    if (transactionBottomSheetVisibility === -1) {
      bottomSheetRef.current.close();
      console.log('Closing');
    } else {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => {
        backHandler.remove();
      };
    }
  }, [transactionBottomSheetVisibility]);

  const handleEachOptions = useCallback((index, name) => {
    setCurrentlySelected(index);
    dispatch(setTransactionFilter({filterName: String(name).toLowerCase()}));
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={transactionBottomSheetVisibility}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      backgroundStyle={{backgroundColor: '#fffef9'}}>
      <View style={styles.contentContainer}>
        <View style={{paddingHorizontal: responsiveWidth(4)}}>
          <FlatList
            data={transactionFilterData}
            renderItem={({item, index}) => (
              <TouchableOpacity
                onPress={() => handleEachOptions(item.id, item.title)}
                key={item.id}>
                <View style={styles.eachSortModalList}>
                  <Image
                    source={item.source}
                    style={{
                      height: responsiveWidth(6),
                      width: responsiveWidth(6),
                      resizeMode: 'contain',
                      alignSelf: 'center',
                    }}
                  />
                  <Text
                    style={[
                      styles.eachSortByModalListText,
                      filter === item.title.toLocaleLowerCase()
                        ? {color: '#ffa07a'}
                        : {color: '#282828'},
                    ]}>
                    {item.title}
                  </Text>

                  {filter === item.title.toLocaleLowerCase() && (
                    <Text
                      style={{
                        textAlign: 'right',
                        marginLeft: 'auto',
                        fontWeight: 'bold',
                        color: '#ffa07a',
                      }}>
                      {' '}
                      {'-'}{' '}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            style={{marginTop: responsiveWidth(3)}}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default TransactionsBottomSheet;

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: '#fffef9',
    height: '100%',
    paddingHorizontal: responsiveWidth(4),
  },
  headerLeftWrapper: {
    height: responsiveWidth(12),
    justifyContent: 'center',
    // borderWidth : 1,
    flexBasis: '50%',
  },
  headerLeftContentContainer: {
    height: '100%',
    borderColor: 'blue',
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(4),
  },
  profileImageContainer: {
    borderColor: '#282828',
    height: responsiveWidth(9),
    width: responsiveWidth(9),
    borderRadius: responsiveWidth(10),
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: responsiveWidth(10),
    position: 'relative',
  },

  profileImage: {
    width: '100%',
    resizeMode: 'cover',
    height: '100%',
  },

  userName: {
    fontFamily: 'Lexend-Bold',
    color: '#282828',
    fontSize: responsiveFontSize(1.9),
  },

  status: {
    fontSize: responsiveFontSize(1.6),
    letterSpacing: 0.5,
    color: '#282828',
    fontFamily: 'MabryPro-Regular',
  },

  cardHeaderWrapper: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#282828',
    paddingVertical: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(4),
    borderRadius: responsiveWidth(2),
  },

  likeCommentText: {
    fontFamily: 'MabryPro-Medium',
    marginLeft: responsiveWidth(1),
    color: '#282828',
  },

  eachSortByModalListText: {
    fontSize: responsiveFontSize(2),
    color: '#282828',
    fontFamily: 'MabryPro-Bold',
  },

  eachSortModalList: {
    flexDirection: 'row',
    gap: responsiveWidth(5),
    alignItems: 'center',
    marginVertical: responsiveWidth(3),
  },

  loginButton: {
    borderWidth: 1,
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#ffa07a',
    borderRadius: responsiveWidth(2),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Lexend-Medium',
    elevation: 1,
    width: '100%',
    height: responsiveWidth(10),
    textAlignVertical: 'center',
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
    fontSize: responsiveFontSize(2),
  },

  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: responsiveWidth(1),
    borderColor: '#282828',
    height: responsiveWidth(12),
    borderWidth: 1,
    alignSelf: 'center',
    borderRadius: responsiveWidth(2),
    width: responsiveWidth(45),
    fontFamily: 'MabryPro-Regular',
  },
  titleSetPrice: {
    fontSize: responsiveFontSize(2),
    backgroundColor: '#e3dff2',
    height: '90%',
    borderRadius: responsiveWidth(2),
    textAlign: 'center',
    textAlignVertical: 'center',
    flexBasis: '50%',
    fontFamily: 'MabryPro-Bold',
    color: '#282828',
  },
});
