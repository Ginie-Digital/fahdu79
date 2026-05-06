import React, {useState, useEffect, useRef} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Platform} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {Image} from 'expo-image';
import {NICHES} from '../../DesiginData/Data';
import {WIDTH_SIZES} from '../../DesiginData/Utility';
import DiscoverFilterModal from '../../Navigation/DiscoverFilterModal';
import PagerView from 'react-native-pager-view';
import DiscoverFeed from '../Components/DiscoverFeed';

import { toggleTabBar } from '../../Redux/Slices/NormalSlices/HideShowSlice';

const {width} = Dimensions.get('window');

export default function DiscoverScreen() {
  const [selectedCategory, setSelectedCategory] = useState(NICHES[0]);
  const categoryListRef = useRef(null);
  const pagerViewRef = useRef(null);
  const [tab, setTab] = useState('New'); // New | Popular | Spotlight
  const navigation = useNavigation();
  const dispatch = useDispatch();

  // Scroll category visible when selectedCategory changes
  useEffect(() => {
    const index = NICHES.findIndex(n => n.id === selectedCategory.id);
    if (index !== -1 && categoryListRef.current) {
      categoryListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [selectedCategory]);

  // Ensure Parent Tab Bar is shown
  React.useLayoutEffect(() => {
    dispatch(toggleTabBar({ show: true }));
    navigation.setOptions({
      headerShown: true,
    });

    return () => {
      dispatch(toggleTabBar({ show: true }));
    };
  }, [navigation, dispatch]);

  return (
    <View style={styles.container}>
      {/* CATEGORY FILTER */}
      <FlatList
          ref={categoryListRef}
          data={NICHES}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryList}
          keyExtractor={item => item.id}
          renderItem={({item, index}) => (
            <TouchableOpacity
              style={[styles.category, selectedCategory.id === item.id && styles.categoryActive]}
              onPress={() => {
                setSelectedCategory(item);
                pagerViewRef.current?.setPage(index);
              }}>
              <Text style={[styles.categoryText, selectedCategory.id === item.id && styles.categoryTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          )}
          onScrollToIndexFailed={info => {
            categoryListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
        />
      <Text style={styles.title}>{tab}</Text>

      {/* CONTENT AREA */}
      <View style={styles.contentWrapper}>
        <PagerView
          ref={pagerViewRef}
          style={styles.pagerView}
          initialPage={0}
          onPageSelected={e => {
            const index = e.nativeEvent.position;
            // Prevent redundant updates if index matches current selectedCategory
            if (NICHES[index].id !== selectedCategory.id) {
              setSelectedCategory(NICHES[index]);
            }
          }}>
          {NICHES.map(niche => (
            <View key={niche.id} style={{flex: 1}}>
              <DiscoverFeed niche={niche} tab={tab} />
            </View>
          ))}
        </PagerView>

        {/* NEW / POPULAR / SPOTLIGHT FLOATING FILTER */}
        <View style={styles.tabBox}>
          <TouchableOpacity style={[styles.tab, tab === 'New' && styles.tabActive]} onPress={() => setTab('New')}>
            <Image source={require('../../Assets/Images/new_creator_icon.png')} style={styles.tabIcon} contentFit="contain" />
            <Text style={[styles.tabLabel, tab === 'New' && styles.tabLabelActive]}>New</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tab, tab === 'Popular' && styles.tabActive]} onPress={() => setTab('Popular')}>
            <Image source={require('../../Assets/Images/popular_creator_icon.png')} style={styles.tabIcon} contentFit="contain" />
            <Text style={[styles.tabLabel, tab === 'Popular' && styles.tabLabelActive]}>Popular</Text>
          </TouchableOpacity>

        </View>
      </View>
      <DiscoverFilterModal isVisible={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#fff9f5',
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 16,
    color: '#1e1e1e',
    fontFamily: 'Rubik-SemiBold',
  },
  categoryList: {
    marginBottom: 20,
    flexGrow: 0,
    height: 50,
  },
  category: {
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: Platform.OS === 'ios' ? 24 : 18,
    borderRadius: 20,
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
    backgroundColor: 'white',
    marginRight: 10,
    height: 40,
    justifyContent: 'center',
  },
  categoryActive: {
    backgroundColor: '#FFA86B',
    borderColor: '#1e1e1e',
  },
  categoryText: {
    fontSize: 16,
    color: '#1e1e1e',
    fontFamily: 'Rubik-Medium',
  },
  categoryTextActive: {
    color: '#1e1e1e',
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  pagerView: {
    flex: 1,
  },
  tabBox: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    padding: 4,
    borderRadius: 30,
    position: 'absolute',
    bottom: 30,
    elevation: 8,
    shadowColor: '#1e1e1e',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 10,
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20, // Reduced padding to fit 3 items
    borderRadius: 30,
  },
  tabActive: {
    backgroundColor: '#FFA86B',
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
  },
  tabIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 13,
    color: '#999', // Default color for inactive
    fontFamily: 'Rubik-SemiBold',
  },
  tabLabelActive: {
    color: '#1e1e1e',
  },
});
