import React, {useEffect, useState, useRef, memo} from 'react';
import {View, Text, StyleSheet, Pressable, Dimensions, FlatList, TextInput, ActivityIndicator, Keyboard, Platform} from 'react-native';
import {responsiveFontSize, responsiveWidth, responsiveHeight} from 'react-native-responsive-dimensions';
import Modal from 'react-native-modal';
import {useDispatch, useSelector} from 'react-redux';
import {toggleCreatorSelectorModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {FONT_SIZES, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {triggerImpactLight} from '../../Utils/Haptics';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useLazySearchedCreatorsQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {Image} from 'expo-image';

const {width: WINDOW_WIDTH} = Dimensions.get('window');

const CreatorSelectorModal = ({onSelect, onClose, initialSearch = ''}) => {
  const dispatch = useDispatch();
  const visible = useSelector(state => state.hideShow.visibility.creatorSelectorModal);
  
  const [searchQuery, setSearchQuery] = useState(initialSearch);
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
      // Allow modal slide-in animation to finish before focusing
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [visible, initialSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) triggerSearch({name: searchQuery});
    }, 500);
    return () => clearTimeout(timer);
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
      style={[styles.row, index === localCreators.length - 1 && {borderBottomWidth: 0}]} 
      onPress={() => handleSelect(item)}
    >
      <View style={styles.creatorInfo}>
        <Image 
          source={{uri: item.profile_image?.url}} 
          style={styles.avatar} 
          placeholder={require('../../../Assets/Images/DefaultProfile.jpg')}
          contentFit="cover"
        />
        <View style={styles.textDetails}>
          <Text style={styles.fullName} numberOfLines={1}>{item.fullName}</Text>
          <Text style={styles.displayName} numberOfLines={1}>@{item.displayName}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={responsiveFontSize(2)} color="#CCC" />
    </Pressable>
  );

  return (
    <Modal
      isVisible={visible}
      avoidKeyboard={true}
      backdropColor="#00000060"
      onBackButtonPress={handleClose}
      onBackdropPress={handleClose}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={200}
      animationOutTiming={200}
      style={styles.modalContainer}
    >
      <View style={styles.dialog}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.indicator} />
          <Text style={styles.mainHeading}>Select Creator</Text>
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
              <Text style={styles.emptyText}>No creators found</Text>
            </View>
          )
        )}

        {/* Bottom Search Input */}
        <View style={styles.bottomInputWrapper}>
          <View style={styles.searchPill}>
            <Ionicons name="search" size={responsiveFontSize(2)} color="#999" style={styles.searchIcon} />
            <TextInput 
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search creator..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {(isFetching || isLoading) ? (
              <ActivityIndicator size="small" color="#999" />
            ) : searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={responsiveFontSize(2)} color="#999" />
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
