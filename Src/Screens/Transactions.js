// import { StyleSheet, Text, View, Image, TouchableOpacity, Pressable, ActivityIndicator, Platform } from "react-native";
// import React, { useCallback, useEffect, useState } from "react";
// import DIcon from "../../DesiginData/DIcons";
// import { responsiveWidth, responsiveFontSize } from "react-native-responsive-dimensions";
// import { useDispatch, useSelector } from "react-redux";
// import { toggleTransactionSheet } from "../../Redux/Slices/NormalSlices/HideShowSlice";
// import TransactionsBottomSheet from "../Components/Transactions/TransactionsBottomSheet";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { Table, TableWrapper, Row, Rows, Col, Cols, Cell } from "react-native-reanimated-table";
// import { useLazyTransactionDataQuery } from "../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi";
// import { token as memoizedToken } from "../../Redux/Slices/NormalSlices/AuthSlice";
// import moment from "moment";
// import { autoLogout } from "../../AutoLogout";
// import Loader from "../Components/Loader";
// import { padios } from "../../DesiginData/Utility";

// const tableData = {
//   tableHead: ["Type", "Amount", "Date", "Account", "Category", "Status"],
//   acronymBody: [["WDWL : WITHDRAWAL-WALLET"], ["WDRL : WITHDRAWAL"], ["SUC : SUCCESS"], ["FLD : FAILED"], ["WLT : WALLET"], ["SUBS : SUBSCRIPTION"], ["DEP : DEPOSIT"], ["WISH : WISHLIST"]],
//   skeloton : [
//     ["", "", "", "", "", ""],
//     ["", "", "", "", "", ""],
//     ["", "", "", "", "", ""],
//     ["", "", "", "", "", ""],
//     ["", "", "", "", "", ""],
//     ["", "", "", "", "", ""],
//     ["", "", "", "", "", ""],
//     ["", "", "", "", "", ""],
//     ["", "", "", "", "", ""],
//     ["", "", "", "", "", ""]
//   ]
// };

// const Transactions = () => {
//   const [eachRowData, setEachRowData] = useState([]);

//   const dispatch = useDispatch();

//   const [tableHeadersData, setTableHeaders] = useState([]);

//   const [page, setPage] = useState(1);

//   const [totalPages, setTotalPages] = useState(0);

//   const [disableUpload, setDisableUpload] = useState(false);

//   useEffect(() => {
//     const getTransactionData = async () => {
//       setDisableUpload(true);

//       const { data, error } = await transactionData({ token, page, filter });

//       if (data) {
//         setDisableUpload(false);
//       }

//       if (error?.data?.status_code === 2044) {
//         autoLogout();
//       }

//       setTableHeaders(data.data.headers.filter(x => x !== "TRXNID"));

//       /**
//       @Missing_Transaction_Id
//       */

//       let x = data?.data.transactions.map((v, i) => {
//         return [v.TYPE, v.AMOUNT, moment(v.DATE).format("DD-MM-YYYY"), moment(v.DATE).format("h:mm a") ,v.ACCOUNT, v.CATEGORY, v.STATUS].map((x) => {
//           if (x === "WITHDRAWAL-WALLET") {
//             return "WDWL";
//           } else if (x === "WITHDRAWAL") {
//             return "WDRL";
//           } else if (x === "SUCCESS") {
//             return "SUC";
//           } else if (x === "FAILED") {
//             return "FLD";
//           } else if (x === "WALLET") {
//             return "WLT";
//           } else if (x === "SUBSCRIPTION") {
//             return "SUBS";
//           } else if (x === "DEPOSIT") {
//             return "DEP";
//           } else if (x === "WISHLIST") {
//             return "WISH";
//           } else {
//             return x;
//           }
//         });
//       });
//       if (x?.length > 0) {
//         setEachRowData(x);
//       }

//       if (data?.data?.metadata?.length > 0) {
//         setTotalPages(Number(Math.ceil(Number(data?.data?.metadata[0]?.total) / Number(data?.data?.metadata[0]?.limit))));
//       } else {
//         setTotalPages(0);
//       }
//     };
//     getTransactionData();
//   }, [filter, page]);

//   const pageController = useCallback(
//     (type) => {
//       console.log(type);

//       if (type === "inc") {
//         console.log("fj");
//         if (page >= totalPages) return;

//         setPage(page + 1);

//       }

//       if (type === "dec") {
//         if (page > 1) {
//           setPage(page - 1);
//         }
//       }
//     },
//     [page, totalPages]
//   );

//   useEffect(() => {
//     setPage(1);
//     setEachRowData([])
//   }, [filter]);

//   useEffect(() => {
//     dispatch(toggleTransactionSheet({ show: -1 }));
//   }, []);

//   if (tableHeadersData?.length > 0) {
//     return (
//       <GestureHandlerRootView style={styles.transactionsContainer}>
//         <View style={{ alignSelf: "center", flexDirection: "row", gap: responsiveWidth(1), paddingVertical: responsiveWidth(4) }}>
//           <Text style={{ fontFamily: "MabryPro-Medium", color: "#ffa07a" }}>{filter.charAt(0).toUpperCase() + filter.slice(1)}</Text>
//           <Text style={{ fontFamily: "MabryPro-Medium", color: "#282828" }}>History</Text>
//         </View>

//         {!disableUpload ? (
//           <Table borderStyle={{ borderWidth: 1, borderColor: "gray" }}>
//             <Row data={tableHeadersData} style={styles.head} textStyle={styles.headText} />
//             <Rows data={eachRowData} textStyle={styles.text} />
//           </Table>
//         ) : (
//           <Table borderStyle={{ borderWidth: 1, borderColor: "gray" }}>
//             <Row data={tableHeadersData} style={styles.head} textStyle={styles.headText} />
//             <Rows data={tableData.skeloton} textStyle={styles.text} />
//           </Table>
//         )}

//         {totalPages !== 0 && <Text style={{ fontFamily: "MabryPro-Medium", color: "#282828", textAlign: "center", marginTop: responsiveWidth(6) }}>{page + " of " + totalPages + " Pages"}</Text>}

//         {totalPages !== 0 && (
//           <View style={styles.controllerContainer}>
//             <View style={{ position: "relative", alignSelf: "center" }}>

//               <Pressable onPress={() => (disableUpload ? console.log("Disabled") : pageController("dec"))}>
//                 <Text style={[disableUpload ? styles.loginButtonSelect : styles.loginButton]}>BACK</Text>
//               </Pressable>
//             </View>

//             <View style={{ position: "relative", alignSelf: "center" }}>

//               <Pressable onPress={() => (disableUpload ? console.log("Disabled") : pageController("inc"))}>
//                 <Text style={[disableUpload ? styles.loginButtonSelect : styles.loginButton]}>NEXT</Text>
//               </Pressable>
//             </View>
//           </View>
//         )}

//         {totalPages === 0 && !disableUpload && (
//           <View style={{ justifyContent: "center", alignItems: "center", marginTop: responsiveWidth(4) }}>
//             <Text style={styles.heading}>No Transactions Found</Text>
//             <Text style={styles.description}>Please do select another category to explore</Text>
//           </View>
//         )}

//         {totalPages !== 0 && (
//           <Table borderStyle={{ borderColor: "gray" }} style={{ marginTop: responsiveWidth(15) }}>
//             <Rows data={tableData.acronymBody} textStyle={[styles.text, { textAlign: "left", marginLeft: responsiveWidth(4), marginTop: responsiveWidth(2) }]} />
//           </Table>
//         )}

//         <TransactionsBottomSheet />
//       </GestureHandlerRootView>
//     );
//   } else {
//     return <Loader/>
//   }
// };

import {StyleSheet, Text, TouchableOpacity, View, FlatList, SectionList, Image, Pressable, ActivityIndicator} from 'react-native';
import React, {useEffect, useState, useRef, useMemo} from 'react';
import {FONT_SIZES, WIDTH_SIZES} from '../../DesiginData/Utility';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import TransactionDetailsModal from './revenue/TransactionDetailsModal';
import {useLazyTransactionDataQuery} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import { useAppTheme } from '../Hook/useAppTheme';

import moment from 'moment';
import {toggleTransactionDetailModal} from '../../Redux/Slices/NormalSlices/HideShowSlice';
import TransactionShimmer from '../Components/Shimmers/TransactionShimmer';

function formatTransactionData(rawData) {
  return rawData?.map(monthObj => {
    const formattedTransactions = monthObj.transactions.map(txn => ({
      id: txn?._id,
      name: txn?.FROM?.displayName,
      image: txn?.FROM?.profile_image?.url,
      amount: txn?.TYPE === 'CR' ? parseFloat(txn?.AMOUNT) : parseFloat(txn?.AMOUNT),
      date: moment(txn?.DATE).format('DD MMM YYYY'),
      time: moment(txn?.DATE).format('hh:mm A'),
      account: txn?.ACCOUNT,
      category: txn?.CATEGORY,
      status: txn?.STATUS,
      type: txn?.TYPE,
    }));

    return {
      month: monthObj.month,
      totalEarning: monthObj.totalEarning,
      data: formattedTransactions,
    };
  });
}

const Transactions = () => {
  const { colors, isDark } = useAppTheme();
  const [selected, setSelected] = useState('All');
  const filterListRef = useRef(null);

  const [detailsData, setDetailsData] = useState({});

  const [loading, setLoading] = useState(false);

  const showModal = useSelector(state => state.hideShow.visibility.transactionDetailModal);

  const dispatch = useDispatch();

  const [transactionData] = useLazyTransactionDataQuery({refetchOnFocus: true});

  const token = useSelector(state => state.auth.user.token);

  const filter = useSelector(state => state.transaction.data.filter);

  const [actualTransactionData, setActualTransactionData] = useState([]);

  const userRole = useSelector(state => state.auth.user.role);

  const filters = useMemo(() => {
    return userRole === 'user'
      ? ['All', 'Transfer', 'Deposit', 'Withdrawal', 'Reversal']
      : ['All', 'Transfer', 'Earnings', 'Deposit', 'Withdrawal', 'Reversal'];
  }, [userRole]);

  useEffect(() => {
    const index = filters.indexOf(selected);
    if (index !== -1 && filterListRef.current) {
      filterListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [selected, filters]);

  const changeFilter = async filter => {
    setLoading(true);
    setSelected(filter);

    const {data, error} = await transactionData({token, page: 1, filter: String(filter).toLowerCase()});

    setActualTransactionData(data?.data?.data);
    setLoading(false);
  };

  useEffect(() => {
    changeFilter('All');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  console.log(selected);

  const formatedData = formatTransactionData(actualTransactionData);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{marginVertical: WIDTH_SIZES[24]}}>
        <FlatList
          ref={filterListRef}
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.containerSelector}
          keyExtractor={item => item}
          renderItem={({item}) => (
            <TouchableOpacity 
              style={[
                styles.button, 
                { 
                  borderColor: selected === item ? '#1E1E1E' : (isDark ? '#212121' : '#1e1e1e'), 
                  backgroundColor: selected === item ? '#FFA86B' : (isDark ? '#1C1C1C' : '#fff') 
                }
              ]} 
              onPress={() => changeFilter(item)}>
              <Text style={[styles.text, { color: selected === item ? '#1E1E1E' : (isDark ? '#FFFFFF' : '#1e1e1e') }]}>{item}</Text>
            </TouchableOpacity>
          )}
          onScrollToIndexFailed={info => {
            filterListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
        />
      </View>

      {loading ? (
        <TransactionShimmer />
      ) : (
        <SectionList
          sections={formatedData}
          keyExtractor={item => item.id}
          renderSectionHeader={({section}) => (
            <View style={[styles.header, { backgroundColor: isDark ? '#1A1A1A' : '#F3F3F3' }]}>
              <Text style={[styles.headerText, { color: colors.text }]}>{section.month}</Text>
              <Text style={[styles.headerAmount, { color: colors.text }]}>{'₹ ' + Math.abs(Number(section.totalEarning)).toLocaleString('en-IN')}</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{height: WIDTH_SIZES[1.5], backgroundColor: isDark ? '#1A1A1A' : '#E9E9E9'}} />}
          renderItem={({item}) => (
            <Pressable
              onPress={() => {
                dispatch(toggleTransactionDetailModal({show: true}));
                setDetailsData(item);
              }}
              style={({pressed}) => [
                styles.item, 
                {
                  backgroundColor: pressed ? 'rgba(255, 168, 107, 0.2)' : colors.background,
                  borderTopWidth: 2,
                  borderBottomWidth: 2,
                  borderColor: pressed ? '#FFA86B' : 'transparent',
                }
              ]}>
              <Image source={{uri: item.image}} style={[styles.image, { borderColor: isDark ? colors.border : '#1E1E1E' }]} />
              <View style={styles.details}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.date, { color: colors.textSecondary }]}>{item.date}</Text>
              </View>
              <Text style={[styles.amount, {color: item?.type === 'CR' ? '#10A832' : '#FA3535'}]}>₹{item.amount}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.text }]}>Nothing to show</Text>
              <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>There are no transactions recorded for this filter category yet.</Text>
            </View>
          }
        />
      )}
      <TransactionDetailsModal visible={showModal} transaction={detailsData} isDark={isDark} />
    </View>
  );
};

/**
 * TransactionId, transfer amoiunt, transfer date, transfer tikme, transffer account, transfer category , transffaer sattus
 */

export default Transactions;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  subContainer: {
    paddingHorizontal: WIDTH_SIZES[24],
  },

  //Selector
  containerSelector: {
    flexDirection: 'row', // Ensure items are placed in a row
    gap: 12,
    paddingLeft: WIDTH_SIZES[24],
    alignItems: 'center', // Ensures elements don’t stretch
  },
  button: {
    paddingHorizontal: 16,
    borderRadius: 36,
    borderWidth: 1.5,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#FFA86B',
  },
  text: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  selectedText: {
    color: '#1E1E1E',
  },

  //SectionList

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F3F3',
    paddingVertical: WIDTH_SIZES[4] + WIDTH_SIZES[2],
    fontWeight: 'bold',
    paddingHorizontal: WIDTH_SIZES[24],
    marginVertical: WIDTH_SIZES[8],
    marginBottom: 0,
  },
  headerText: {
    fontSize: FONT_SIZES[14],
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  headerAmount: {
    fontSize: FONT_SIZES[14],
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: WIDTH_SIZES[16],
    paddingHorizontal: WIDTH_SIZES[24],
    backgroundColor: '#fff',
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    marginRight: WIDTH_SIZES[12],
  },
  details: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: FONT_SIZES[16],
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
  },
  date: {
    fontSize: FONT_SIZES[12],
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
  },
  amount: {
    fontSize: FONT_SIZES[16],
    fontFamily: 'Rubik-Medium',
  },

  loadingText: {
    color: '#1e1e1e',
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#7e7e7e',
    textAlign: 'center',
    lineHeight: 20,
  },
});
