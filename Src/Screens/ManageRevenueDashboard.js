import {StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator} from 'react-native';
import React, {useEffect, useState, useRef} from 'react';
import HalfDonutChart from '../../HalfDonutChart';
import NativeRevenueBarChart from './revenue/NativeRevenueBarChart';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Image} from 'expo-image';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
// import {FlatList} from 'react-native-gesture-handler'; // FlatList removed as it caused nesting warnings
import AnimatedButton from '../Components/AnimatedButton';
import {navigate} from '../../Navigation/RootNavigation';
import { useNavigation } from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {toggleConfirmBankDetails, toggleBankDetailsModal, toggleShowBankDetailsModal} from '../../Redux/Slices/NormalSlices/HideShowSlice';
import {useLazyGetTotalEarningsQuery, useLazyGetWeeklyEarningQuery, useLazyAlreadyFilledBankDetailsQuery} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import BankDetailsModal from './revenue/BankDetailsModal';
import MoneyTransferModal from './revenue/MoneyTransferModal';
import ShowBankDetails from './revenue/ShowBankDetails';
import VerifiedModal from '../Components/Verification/VerifiedModal';
import {LoginPageErrors} from '../Components/ErrorSnacks';
import RevenueChartShimmer from '../Components/Shimmers/RevenueChartShimmer';
import RevenueFilterModal from './revenue/RevenueFilterModal';
import moment from 'moment';
import Loader from '../Components/Loader';

const earningsData = [
  {id: '1', label: 'Live', amount: '100', color: '#FFD2B2'},
  {id: '2', label: 'Subscription', amount: '30k', color: '#FFCFD2'},
  {id: '3', label: 'Tip', amount: '200', color: '#EBB0FF'},
  {id: '4', label: 'Referral', amount: '500', color: '#D5FFDE'},
  {id: '5', label: 'Call', amount: '100k', color: '#CFE5FF'},
  {id: '6', label: 'Chat', amount: '100k', color: '#FBF8CC'},
  {id: '7', label: 'Wishlist', amount: '100k', color: '#CFBAF0'},
  {id: '8', label: 'PPV', amount: '100k', color: '#CCCCCC'},
];

const earningsDataList = [
  {id: '1', label: 'Balance', value: '2320', showInfo: false},
  {id: '2', label: 'Hold', value: '20', showInfo: true},
  {id: '3', label: 'TDS', value: '0', showInfo: true},
  {id: '4', label: 'Withdrawable', value: '2300', showInfo: false},
];

const ManageRevenueDashboard = () => {
  const navigation = useNavigation();
  const [graphData, setGraphData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('Weekly');
  const [customRange, setCustomRange] = useState({ start: null, end: null });
  const [chartType, setChartType] = useState('donut'); // 'donut' or 'bar'

  const token = useSelector(state => state.auth.user.token);

  const {bankDetailsModal, confirmBankDetailsModal, transferModal, bankDetails, appliedVerify} = useSelector(state => state.hideShow.visibility);

  console.log(confirmBankDetailsModal, '::::::');

  const dispatch = useDispatch();

  const [formDetails, setFormDetails] = useState({});
  const liveBoxListRef = useRef(null);

  const [totalEarningList, setTotalEarningList] = useState([]);

  const [cardEarningList, setCardEarningList] = useState([]);

  const [getWeeklyEarning] = useLazyGetWeeklyEarningQuery();

  const [getTotalEarnings] = useLazyGetTotalEarningsQuery();
  const [alreadyFilledBankDetails] = useLazyAlreadyFilledBankDetailsQuery();


  async function callGraphApi(startDate = null, endDate = null) {
    let params = { token };
    
    if (startDate && endDate) {
      params.startDate = moment(startDate).format('YYYY-MM-DD');
      params.endDate = moment(endDate).format('YYYY-MM-DD');
    }

    const {data, error} = await getWeeklyEarning(params);

    console.log(data);

    console.log(data?.data?.orderedEarnings, 'GRaph');

    const labelToColorMap = earningsData.reduce((map, item) => {
      const key = item.label.toUpperCase();
      map[key] = item.color;
      if (key === 'REFERRAL') map['REFERRALS'] = item.color;
      return map;
    }, {});

    const earnedArrWithColors = data?.data?.orderedEarnings?.map(item => ({
      ...item,
      color: labelToColorMap[item.category] || '#CCCCCC',
    }));

    setGraphData({
      orderedEarnings: earnedArrWithColors,
      totalEarningsWeek: data?.data?.totalEarningsWeek,
    });

    // console.log(earnedArrWithColors);
  }

  async function callGetTotalEarnings() {
    const {data, error} = await getTotalEarnings({token});

    console.log(data?.data, '||||');

    const labelToColorMap = earningsData.reduce((map, item) => {
      const key = item.label.toUpperCase();
      map[key] = item.color;
      if (key === 'REFERRAL') map['REFERRALS'] = item.color;
      return map;
    }, {});

    const earnedArrWithColors = data?.data?.orderedEarnings?.map(item => ({
      ...item,
      color: labelToColorMap[item.category] || '#CCCCCC',
    }));

    setTotalEarningList(earnedArrWithColors);

    setCardEarningList(data?.data?.earningsDataList);
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([callGraphApi(), callGetTotalEarnings()]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Dashboard',
      headerTitleStyle: { fontFamily: 'Rubik-Bold', fontSize: 20, color: '#1e1e1e' },
      headerTintColor: '#1e1e1e',
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
          <TouchableOpacity onPress={() => setFilterVisible(true)}>
            <Ionicons name="filter" size={24} color="#1e1e1e" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  const handleApplyFilter = async (type, start, end) => {
    setCurrentFilter(type);
    if (type === 'Custom') {
      setCustomRange({ start, end });
      setIsLoading(true);
      await callGraphApi(start, end);
      setIsLoading(false);
    } else {
      setCustomRange({ start: null, end: null });
      setIsLoading(true);
      await callGraphApi(); // Default weekly
      setIsLoading(false);
    }
  };

  const getFilterLabel = () => {
    if (currentFilter === 'Weekly') return 'This Week';
    if (currentFilter === 'Custom' && customRange.start && customRange.end) {
      return `${moment(customRange.start).format('MMM D')} - ${moment(customRange.end).format('MMM D')}`;
    }
    return 'This Week';
  };

  const handlePress = async () => {
    try {
      setIsActionLoading(true);
      const bankDetailsRes = await alreadyFilledBankDetails({ token }).unwrap();

      if (bankDetailsRes?.data) {
        dispatch(toggleShowBankDetailsModal({
          show: true,
        }));
      } else {
        dispatch(toggleBankDetailsModal({ show: true }));
      }
    } catch (err) {
      console.error('Error in Transfer flow:', err);
      LoginPageErrors('Failed to process transfer request');
    } finally {
      setIsActionLoading(false);
    }
  };

  const LiveBox = () => {
    const [showBreakdown, setShowBreakdown] = useState(true);

    const formatAmount = (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
      }
      return num.toLocaleString('en-IN');
    };

    return (
      <View style={{ width: '100%', marginTop: 20 }}>
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}
          onPress={() => setShowBreakdown(!showBreakdown)}
        >
            <Text style={{ fontFamily: 'Rubik-Medium', fontSize: 13, color: '#1e1e1e', marginRight: 5 }}>
                {showBreakdown ? 'Hide Features Breakdown' : 'Show Features Breakdown'}
            </Text>
            <Ionicons name={showBreakdown ? "chevron-down" : "chevron-up"} size={16} color="#1e1e1e" />
        </TouchableOpacity>

        {showBreakdown && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {(() => {
                const list = graphData?.orderedEarnings || [];
                const filteredList = list.filter(item => 
                    !['Mass Msg.', 'Mass Msg'].includes(item.category)
                );
                
                return filteredList.map((item, index) => (
                <View 
                    key={item.id || item.category} 
                    style={[
                        styles.eachBoxContainer, 
                        { 
                            backgroundColor: item.color,
                            width: (item.category.toLowerCase() === 'wishlist' || item.category.toLowerCase() === 'ppv') 
                                ? '48.5%' 
                                : (index === filteredList.length - 1 ? '100%' : '32%'), 
                            height: 64, 
                            marginBottom: 10,
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'flex-start',
                            paddingHorizontal: 10,
                            borderWidth: 1.5,
                            borderRadius: 12,
                        }
                    ]}
                >
                <Text 
                    style={[styles.text, { fontSize: 12, marginBottom: 5 }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {item.category.toUpperCase() === 'PPV' 
                      ? 'PPV' 
                      : item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase()
                    }
                </Text>
                
                <Text style={[styles.textValue, { marginLeft: 0, fontSize: 16, fontFamily: 'Rubik-Bold' }]}>
                    ₹{formatAmount(item.earnings)}
                </Text>
                </View>
            ))})()}
            </View>
        )}
      </View>
    );
  };

  const EarningsCard = () => {
    return (
      <View style={{marginTop: responsiveWidth(6.4), width: '100%'}}>
        <Text style={styles.heading}>Your Earnings</Text>
        <View style={styles.card}>
            {cardEarningList.map((item, index) => (
                <View key={item.id}>
                    {index > 0 && <View style={{height: responsiveWidth(5.87)}} />}
                    <View style={styles.row}>
                        <View style={styles.labelContainer}>
                        <Text style={styles.label}>{item.label}</Text>
                        {item.showInfo && <Ionicons name="information-circle-outline" size={14} color="#1e1e1e" style={styles.infoIcon} />}
                        </View>
                        <View style={styles.valueContainer}>
                        <Text style={styles.value}>
                            {parseFloat(item.value || 0).toLocaleString('en-IN')}
                        </Text>
                        <View style={styles.coinIcon}>
                            <Image source={require('../../Assets/Images/Coins2.png')} contentFit="contain" style={{flex: 1}} />
                        </View>
                        </View>
                    </View>
                </View>
            ))}
        </View>
      </View>
    );
  };

  const FullDetailsButton = () => {
    return (
      <TouchableOpacity style={styles.buttonDashed} activeOpacity={0.7} onPress={() => navigate('details')}>
        <Text style={styles.textDashedButton}>See Full Details</Text>
        <Ionicons name="chevron-forward" size={18} color="#1e1e1e" />
      </TouchableOpacity>
    );
  };

  const handleChartClick = (categoryName) => {
    console.log("Chart clicked:", categoryName);
    // Find index of the category in graphData.orderedEarnings
    const list = graphData?.orderedEarnings || [];
    const index = list.findIndex(item => item.category === categoryName);
    console.log("Found index:", index);

    if (index !== -1 && liveBoxListRef.current) {
      liveBoxListRef.current.scrollToIndex({
        index: index,
        animated: true,
        viewPosition: 0.5 // Center the item
      });
    }
  };

  return (
    <ScrollView 
      style={{flex: 1, backgroundColor: '#fff'}} 
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >



      {isLoading ? (
        <RevenueChartShimmer />
      ) : (
        <>
          <View style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.totalEarningsLabel}>Total Earnings</Text>
                <Text style={styles.totalEarningsValue}>
                  ₹{graphData?.totalEarningsWeek ? parseFloat(graphData.totalEarningsWeek).toLocaleString('en-IN') : '0'}
                </Text>
              </View>
              <Text style={styles.dateRangeText}>
                 {currentFilter === 'Weekly' 
                    ? `${moment().startOf('week').format('MMM D')} - ${moment().endOf('week').format('MMM D')}` 
                    : (customRange.start && customRange.end 
                        ? `${moment(customRange.start).format('MMM D')} - ${moment(customRange.end).format('MMM D')}`
                        : `${moment().startOf('week').format('MMM D')} - ${moment().endOf('week').format('MMM D')}`
                      )
                 }
              </Text>
            </View>
            <View style={styles.divider} />
            
            <NativeRevenueBarChart 
                graphData={graphData}
                onChartClick={handleChartClick} 
            />

            <LiveBox />
          </View>

          <EarningsCard />
          <FullDetailsButton />
          <View style={{width: '100%'}}>
            <AnimatedButton title={'Check Bank Details'} onPress={handlePress} />
          </View>
        </>
      )}

      <BankDetailsModal visible={bankDetailsModal} setFormDetails={setFormDetails} />
      <MoneyTransferModal visible={transferModal} formDetails={formDetails} />
      <ShowBankDetails visible={bankDetails} />
      {/* <VerifiedModal visible={appliedVerify} type={'dashboard'} /> */}
      <RevenueFilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleApplyFilter}
      />
      {isActionLoading && (
        <View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 999}]}>
          <ActivityIndicator size="large" color="#FFA86B" />
        </View>
      )}
    </ScrollView>
  );
};

export default ManageRevenueDashboard;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingBottom: 30,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  headerTitle: {
    fontFamily: 'Rubik-Bold',
    fontSize: 20,
    color: '#1e1e1e',
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  filterLabel: {
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    alignSelf: 'center',
  },

  eachBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFC6A5', // Light peach background
    borderRadius: responsiveWidth(3.74),
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    height: responsiveWidth(13.33),
    paddingHorizontal: 12, // Padding for spacing
    alignSelf: 'flex-start', // Adjust width based on content
  },
  text: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(2),
    color: '#1e1e1e',
  },

  textValue: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.8),
    marginLeft: responsiveWidth(7.73),
    color: '#1e1e1e',
  },

  //Card Design

  card: {
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    borderStyle: 'dashed', // Added as per request
    borderRadius: 10,
    padding: 15,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#fff',
  },
  heading: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    color: '#1e1e1e',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#1e1e1e',
  },
  infoIcon: {
    marginLeft: 4,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    color: '#1e1e1e',
  },
  coinIcon: {
    height: 19,
    width: 19,
    marginLeft: 10,
  },

  //Button

  // Main Card Styles
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    elevation: 3, // Android shadow
    shadowColor: '#1e1e1e', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginTop: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  totalEarningsLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: 13,
    color: '#1e1e1e',
    marginBottom: 4,
  },
  totalEarningsValue: {
    fontFamily: 'Rubik-Bold',
    fontSize: 28,
    color: '#1e1e1e',
  },
  dateRangeText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 13,
    color: '#1e1e1e',
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#E6E6E6', // Fixed valid hex code
    width: '100%',
    marginBottom: 5,
  },

  buttonDashed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    borderStyle: 'dashed',
    paddingHorizontal: 15,
    width: '100%',
    marginTop: responsiveWidth(6.4),
  },
  textDashedButton: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.8),
    color: '#1e1e1e',
  },
});
