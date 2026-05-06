// import {FlatList, StyleSheet, Text, View, TouchableOpacity, Pressable, Platform} from 'react-native';
// import React, {useCallback, useState} from 'react';
// import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
// import {audienceList} from '../../DesiginData/Data';
// import DIcon from '../../DesiginData/DIcons';

// import {useSelector, useDispatch} from 'react-redux';

// import {setSelectedAudience} from '../../Redux/Slices/NormalSlices/AudienceSelectedSlice';
// import {toggleChatRoomModal} from '../../Redux/Slices/NormalSlices/HideShowSlice';
// import {nTwins, WIDTH_SIZES} from '../../DesiginData/Utility';
// import Filter from '../../Assets/svg/filter.svg';

// const ChatRoomAudienceSort = item => {
//   const selectedAudinceForFilter = useSelector(state => state.filterBy.selected.audience);

//   const dispatch = useDispatch();

//   let selectSortBoxHandler = useCallback(id => {
//     dispatch(setSelectedAudience({audienceNumber: Number(id)}));
//   }, []);

//   return (
//     <View style={styles.chatRoomAudienceSortContainer}>
//       {/* <FlatList
//         data={audienceList}
//         keyExtractor={(item, index) => index}
//         renderItem={({ item, index }) => {
//           return (
//             <TouchableOpacity style={[styles.sortBoxeContainer, ]} key={index} onPress={() => selectSortBoxHandler(item.id)}>
//               <Text style={styles.sortBoxeText}>{item.activeName}</Text>
//             </TouchableOpacity>
//           );
//         }}
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         scrollEnabled = {false}
//         alwaysBounceHorizontal
//         // ItemSeparatorComponent={<View style={{height:responsiveWidth(12),borderWidth:responsiveWidth(.3),borderTopRightRadius:responsiveWidth(9)}}>

//         // </View>}
//       /> */}

//       <Pressable style={[styles.eachBox, {flexBasis: '26%'}, 1 === selectedAudinceForFilter ? [{backgroundColor: '#ffa86b'}] : null]} onPress={() => selectSortBoxHandler(1)}>
//         <Text style={styles.filterText}>All</Text>
//       </Pressable>
//       <Pressable style={[styles.eachBox, {position: 'absolute', left: responsiveWidth(18), width: responsiveWidth(48)}, 2 === selectedAudinceForFilter ? [{backgroundColor: '#ffa86b'}] : null]} onPress={() => selectSortBoxHandler(2)}>
//         <Text style={styles.filterText}>Subscribers</Text>
//       </Pressable>
//       <Pressable style={[styles.eachBox, 3 === selectedAudinceForFilter ? [{backgroundColor: '#ffa86b'}] : null]} onPress={() => selectSortBoxHandler(3)}>
//         <Text style={styles.filterText}>Followers</Text>
//       </Pressable>
//     </View>
//   );
// };

// export default ChatRoomAudienceSort;

// const styles = StyleSheet.create({
//   chatRoomAudienceSortContainer: {
//     // backgroundColor: "red",
//     height: Platform.OS === 'android' ? responsiveHeight(6) : responsiveHeight(6),
//     display: 'flex',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     position: 'relative',
//     width: responsiveWidth(92),
//     overflow: 'hidden',
//   },

//   eachBox: {
//     flexBasis: '36%',
//     borderWidth: WIDTH_SIZES[1.5],
//     height: responsiveWidth(8),
//     borderRadius: WIDTH_SIZES[14],
//     height: '100%',
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'white',
//   },
//   filterText: {
//     fontFamily: 'Rubik-Medium',
//     fontSize: responsiveFontSize(2),
//     color: '#1e1e1e',
//   },
//   sortBoxeContainer: {
//     paddingVertical: responsiveWidth(1.8),
//     paddingHorizontal: responsiveWidth(6),
//     borderLeftWidth: responsiveWidth(0.5),
//     // height:responsiveWidth(12),
//     // borderColor: "#282828",
//     backgroundColor: '#fff',

//     // borderBottomLeftRadius: responsiveWidth(2),
//     // borderWidth: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   sortBoxeText: {
//     color: '#282828',
//     fontFamily: 'MabryPro-Bold',
//     fontSize: responsiveFontSize(2),
//   },

//   oneSortBoxSelected: {
//     backgroundColor: '#FFA07A',
//     right: responsiveWidth(2),
//     borderRadius: responsiveWidth(2),
//     borderLeftWidth: responsiveWidth(0.5),

//     // borderTopLeftRadius: responsiveWidth(2),
//   },
//   sortModalContainer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'white',
//     borderRadius: responsiveWidth(2),
//     // overflow: "hidden",
//     bottom: responsiveWidth(14),
//     left: responsiveWidth(4),
//     borderWidth: responsiveWidth(0.4),
//     height: responsiveWidth(13),
//     width: responsiveWidth(13),
//     borderRadius: responsiveWidth(4),
//   },
//   textStyle: {
//     fontSize: responsiveWidth(4),
//     fontFamily: 'MabryPro-Regular',
//     marginRight: responsiveWidth(2),
//   },
//   filterWrapper: {
//     borderRadius: responsiveWidth(2.5),
//     paddingVertical: responsiveWidth(1.8),
//     paddingHorizontal: responsiveWidth(3),
//     marginRight: responsiveWidth(2),
//   },
// });

import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import React, { useCallback } from 'react';
import { responsiveFontSize, responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedAudience } from '../../Redux/Slices/NormalSlices/AudienceSelectedSlice';
import { setDefaultSort } from '../../Redux/Slices/NormalSlices/SortSelectedSlice';
import { useNavigation } from '@react-navigation/native';

const ChatRoomAudienceSort = ({ requestsCount = 4 }) => {
  const selectedAudinceForFilter = useSelector(state => state.filterBy.selected.audience);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const tabs = [
    { id: 1, label: 'All' },
    { id: 2, label: 'Subscribers' },
    { id: 3, label: 'Followers' },
  ];

  const selectSortBoxHandler = useCallback((tab) => {
    if (tab.id !== selectedAudinceForFilter) {
      // Reset all filters (sort, label, online) when switching tabs
      dispatch(setDefaultSort());
    }
    dispatch(setSelectedAudience({ audienceNumber: Number(tab.id) }));
  }, [selectedAudinceForFilter]);

  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = tab.id === selectedAudinceForFilter;
        const isFirst = index === 0;
        const isLast = index === tabs.length - 1;

        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              isActive && styles.activeTab,
              isFirst && styles.firstTab,
              isLast && styles.lastTab,
              !isLast && styles.tabWithRightBorder,
            ]}
            onPress={() => selectSortBoxHandler(tab)}
          >
            <Text style={[
              styles.tabText,
              isActive && styles.activeTabText,
            ]}>
              {tab.label}
            </Text>
            {tab.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tab.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default ChatRoomAudienceSort;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  tab: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  activeTab: {
    backgroundColor: '#FFA86B',
  },
  firstTab: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  lastTab: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  tabWithRightBorder: {
    borderRightWidth: 1.5,
    borderRightColor: '#1e1e1e',
  },
  tabText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
    color: '#1e1e1e',
  },
  activeTabText: {
    color: '#1e1e1e',
  },
  badge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 5,
  },
  badgeText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 11,
    color: '#1e1e1e',
  },
});