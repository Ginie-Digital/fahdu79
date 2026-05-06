import React, {useEffect, useState, useRef, memo} from 'react';
import {View, Text, StyleSheet, Pressable, Dimensions, ScrollView, Animated, TextInput} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {useDispatch, useSelector} from 'react-redux';
import {setConfirmedNiches, toggleNicheSelectorModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import CustomCheckbox from '../CustomCheckbox';
import {FONT_SIZES, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {triggerImpactLight} from '../../Utils/Haptics';
import Ionicons from 'react-native-vector-icons/Ionicons';

const WINDOW_WIDTH = Dimensions.get('window').width;

const NicheSelectorModal = () => {
  const dispatch = useDispatch();
  const visible = useSelector(state => state.hideShow.visibility.nicheSelectorModal);
  const confirmed = useSelector(state => state.hideShow.visibility.confirmedNiches);
  
  const [tempSelected, setTempSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const slideAnim = useRef(new Animated.Value(600)).current;

  const options = ['Health & Wellness', 'Lifestyle', 'Education & Career', 'Culinary', 'Personal Development', 'Travel', 'Entertainment', 'Astrology', 'Dating Expert'];

  const filteredOptions = options.filter(option => 
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (visible) {
      setTempSelected(confirmed || []);
      setSearchQuery('');
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(600);
    }
  }, [visible, confirmed]);

  const toggleSelection = (item) => {
    triggerImpactLight();
    let updated = [...tempSelected];
    if (updated.includes(item)) {
      updated = updated.filter(i => i !== item);
    } else {
      if (updated.length < 3) {
        updated.push(item);
      }
    }
    setTempSelected(updated);
  };

  const handleApply = () => {
    triggerImpactLight();
    dispatch(setConfirmedNiches(tempSelected));
    dispatch(toggleNicheSelectorModal({show: false}));
  };

  const handleClose = () => {
    dispatch(toggleNicheSelectorModal({show: false}));
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={15} style={styles.blurBackground} />
      <Pressable style={styles.touchOutside} onPress={handleClose} />
      <Animated.View style={[styles.dialog, {transform: [{translateY: slideAnim}]}]}>
        <View style={styles.header}>
            <View style={styles.indicator} />
            <Text style={styles.mainHeading}>Select Creator's Niche</Text>
            <Text style={styles.subHeading}>Choose up to 3 categories that best describe your content.</Text>
            
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
                <TextInput 
                    style={styles.searchInput}
                    placeholder="Search niche..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color="#999" />
                    </Pressable>
                )}
            </View>
        </View>

        <ScrollView style={styles.scrollView} bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item, index) => (
              <Pressable 
                key={item} 
                style={[
                  styles.row, 
                  index === filteredOptions.length - 1 && { borderBottomWidth: 0 }
                ]} 
                onPress={() => toggleSelection(item)}
              >
                <Text style={styles.label}>{item}</Text>
                <CustomCheckbox 
                  checked={tempSelected.includes(item)} 
                  onToggle={() => toggleSelection(item)} 
                />
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No niche found matching "{searchQuery}"</Text>
            </View>
          )}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <View style={styles.applyRow}>
            <Text style={styles.selectionCount}>{tempSelected.length}/3 Selected</Text>
            <Pressable onPress={handleApply} style={styles.doneButton}>
              <Text style={styles.doneText}>Apply</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 9999,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  touchOutside: {
    flex: 1,
  },
  dialog: {
    borderTopLeftRadius: responsiveWidth(8),
    borderTopRightRadius: responsiveWidth(8),
    backgroundColor: '#fff',
    width: WINDOW_WIDTH,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    maxHeight: Dimensions.get('window').height * 0.8,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  indicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 16,
  },
  mainHeading: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.2),
    color: '#1e1e1e',
    marginBottom: 4,
  },
  subHeading: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.5),
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    width: '100%',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[14],
    color: '#1e1e1e',
    padding: 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    minHeight: 100,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  label: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: FONT_SIZES[16],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: 'Rubik-Medium',
    color: '#999',
    fontSize: FONT_SIZES[14],
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  applyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  selectionCount: {
    fontFamily: 'Rubik-Medium',
    color: '#666',
    fontSize: FONT_SIZES[14],
  },
  doneButton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 100,
    paddingHorizontal: 24,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  doneText: {
    fontFamily: 'Rubik-Bold',
    color: '#FFFFFF',
    fontSize: FONT_SIZES[14],
  },
});

export default memo(NicheSelectorModal);
