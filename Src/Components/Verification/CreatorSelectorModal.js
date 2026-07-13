import React, {useEffect, useState, useRef, memo} from 'react';
import {View, Text, StyleSheet, Pressable, Dimensions, FlatList, TextInput, ActivityIndicator, Keyboard, Platform, useWindowDimensions} from 'react-native';
import {responsiveFontSize, responsiveWidth, responsiveHeight} from 'react-native-responsive-dimensions';
import Modal from 'react-native-modal';
import {useDispatch, useSelector} from 'react-redux';
import {toggleCreatorSelectorModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {FONT_SIZES, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {triggerImpactLight} from '../../Utils/Haptics';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useLazySearchedCreatorsQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {Image} from 'expo-image';
import { useAppTheme, darkColors, lightColors } from '../../Hook/useAppTheme';

const {width: WINDOW_WIDTH} = Dimensions.get('window');

const CreatorSelectorModal = ({onSelect, onClose, initialSearch = '', isDark: customIsDark}) => {
  const { colors: themeColors, isDark: systemIsDark } = useAppTheme();
  const isDark = customIsDark !== undefined ? customIsDark : systemIsDark;
  const colors = isDark ? darkColors : lightColors;

  const {width: windowWidth, height: windowHeight} = useWindowDimensions();
  const dispatch = useDispatch();
  const visible = useSelector(state => state.hideShow.visibility.creatorSelectorModal);
  
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const dialogMaxHeight = keyboardHeight > 0 
    ? (windowHeight * 0.42) 
    : (windowHeight * 0.5);
  const inputRef = useRef(null);

  const [triggerSearch, {data, isFetching, isLoading}] = useLazySearchedCreatorsQuery();
  const [localCreators, setLocalCreators] = useState([]);

  // Sync RTK Query results into local state
  useEffect(() => {
    if (data?.data?.users) {
      setLocalCreators(data.data.users);
    }
  }, [data]);

  useEffect(() => {
    if (visible) {
      setSearchQuery(initialSearch);
      setLocalCreators([]); // Clear old results on open
      if (initialSearch) triggerSearch({name: initialSearch});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) triggerSearch({name: searchQuery});
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSelect = (creator) => {
    triggerImpactLight();
    Keyboard.dismiss();
    handleClose();
    onSelect(creator); // Pass the full creator object
  };

  const handleClose = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    onClose && onClose();
    dispatch(toggleCreatorSelectorModal({show: false}));
  };

  const renderCreator = ({item, index}) => (
    <Pressable 
      style={[styles.row, { borderBottomColor: isDark ? colors.border : '#F5F5F5' }, index === localCreators.length - 1 && {borderBottomWidth: 0}]} 
      onPress={() => handleSelect(item)}
    >
      <View style={styles.creatorInfo}>
        <Image 
          source={{uri: item.profile_image?.url}} 
          style={[styles.avatar, { backgroundColor: colors.card }]} 
          placeholder={require('../../../Assets/Images/DefaultProfile.jpg')}
          contentFit="cover"
        />
        <View style={styles.textDetails}>
          <Text style={[styles.fullName, { color: colors.text }]} numberOfLines={1}>{item.fullName}</Text>
          <Text style={[styles.displayName, { color: isDark ? colors.textSecondary : '#888' }]} numberOfLines={1}>@{item.displayName}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={responsiveFontSize(2)} color={isDark ? colors.textSecondary : '#CCC'} />
    </Pressable>
  );

  return (
    <Modal
      isVisible={visible}
      avoidKeyboard={Platform.OS === 'ios'}
      backdropColor="#00000060"
      onBackButtonPress={handleClose}
      onBackdropPress={handleClose}
      onModalShow={() => {
        // Delay focus so the modal fully settles before keyboard triggers avoidKeyboard repositioning
        setTimeout(() => inputRef.current?.focus(), 150);
      }}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={300}
      animationOutTiming={250}
      backdropTransitionInTiming={300}
      backdropTransitionOutTiming={250}
      hideModalContentWhileAnimating={true}
      useNativeDriver={true}
      useNativeDriverForBackdrop={true}
      style={styles.modalContainer}
    >
      <View style={[styles.dialog, { width: windowWidth, maxHeight: dialogMaxHeight, backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={[styles.indicator, { backgroundColor: isDark ? colors.border : '#E0E0E0' }]} />
          <Text style={[styles.mainHeading, { color: colors.text }]}>Select Creator</Text>
        </View>

        {/* Results */}
        {localCreators.length > 0 ? (
          <FlatList
            data={localCreators}
            renderItem={renderCreator}
            keyExtractor={(item) => item._id}
            style={styles.listStyle}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          searchQuery.length > 0 && !isFetching && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No creators found</Text>
            </View>
          )
        )}

        {/* Bottom Search Input */}
        <View style={[styles.bottomInputWrapper, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={[styles.searchPill, { backgroundColor: isDark ? colors.inputBg : '#F5F5F5' }]}>
            <Ionicons name="search" size={responsiveFontSize(2)} color={isDark ? colors.textSecondary : '#999'} style={styles.searchIcon} />
            <TextInput 
              ref={inputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search creator..."
              placeholderTextColor={isDark ? colors.placeholder : '#999'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {(isFetching || isLoading) ? (
              <ActivityIndicator size="small" color={isDark ? colors.textSecondary : '#999'} />
            ) : searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={responsiveFontSize(2)} color={isDark ? colors.textSecondary : '#999'} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  dialog: {
    borderTopLeftRadius: responsiveWidth(6),
    borderTopRightRadius: responsiveWidth(6),
    backgroundColor: '#fff',
    width: WINDOW_WIDTH,
    maxHeight: responsiveHeight(50),
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(5),
    paddingTop: responsiveHeight(1.2),
    paddingBottom: responsiveHeight(1),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  indicator: {
    width: responsiveWidth(9),
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: responsiveHeight(1),
  },
  mainHeading: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2),
    color: '#1e1e1e',
    marginBottom: responsiveHeight(0.5),
  },
  listStyle: {
    flexGrow: 0,
    flexShrink: 1,
  },
  listContent: {
    paddingHorizontal: responsiveWidth(5),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: responsiveHeight(1.2),
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: responsiveWidth(2),
  },
  avatar: {
    width: responsiveWidth(11),
    height: responsiveWidth(11),
    borderRadius: responsiveWidth(5.5),
    marginRight: responsiveWidth(3),
    backgroundColor: '#F0F0F0',
  },
  textDetails: {
    flex: 1,
  },
  fullName: {
    fontFamily: 'Rubik-Bold',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.8),
  },
  displayName: {
    fontFamily: 'Rubik-Regular',
    color: '#888',
    fontSize: responsiveFontSize(1.5),
    marginTop: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: responsiveHeight(3),
  },
  emptyText: {
    fontFamily: 'Rubik-Medium',
    color: '#999',
    fontSize: responsiveFontSize(1.7),
  },
  bottomInputWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: responsiveWidth(5),
    paddingVertical: responsiveHeight(1.2),
    paddingBottom: Platform.OS === 'ios' ? responsiveHeight(3.5) : responsiveHeight(1.2),
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(3),
    height: responsiveHeight(5),
    backgroundColor: '#F5F5F5',
    borderRadius: responsiveWidth(6),
  },
  searchIcon: {
    marginRight: responsiveWidth(2),
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.7),
    color: '#1e1e1e',
    padding: 0,
    backgroundColor: 'transparent',
  },
});

export default memo(CreatorSelectorModal);
