import { StyleSheet, FlatList, View, Platform, ActivityIndicator, Dimensions, InteractionManager } from 'react-native';
import React, { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { responsiveWidth, responsiveHeight } from 'react-native-responsive-dimensions';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import MyProfilePostCard from '../PostComponents/MyProfilePostCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AllMyPosts = ({ route }) => {
  console.log(route?.params?.type, ':::hola');

  const allPosts = useSelector(state => state.myProfileFeedCache.data.content);
  const token = useSelector(state => state.auth.user.token);
  const targetIndex = route?.params?.scrollIndex || 0;
  const flatListRef = useRef(null);

  // Scroll to target index after render
  useEffect(() => {
    if (targetIndex > 0 && allPosts?.length > targetIndex) {
      InteractionManager.runAfterInteractions(() => {
        flatListRef.current?.scrollToIndex({
          index: targetIndex,
          animated: false,
          viewPosition: 0,
        });
      });
    }
  }, [targetIndex, allPosts?.length]);

  const SocialPostRender = memo(({ item, index }) => (
    <MyProfilePostCard
      item={item}
      index={index}
      token={token}
      postId={route?.params?.postId}
    />
  ));

  const keyExtractor = useCallback((item) => item._id, []);

  // Pre-calculate layouts for accurate scrolling
  const getItemLayout = useMemo(() => {
    // Exact values from MyProfilePostCard styles
    const topMargin = responsiveHeight(1.6);
    const bottomMargin = responsiveHeight(1);
    
    // Header (approx based on profile image + padding)
    const headerHeight = responsiveWidth(14); 
    
    // Actions section (paddingVertical: 4w * 2 + icon height ~24)
    const actionsHeight = responsiveWidth(8) + 24;
    
    // Add Comment section (paddingVertical: 1w * 2 + height: 8w)
    const addCommentHeight = responsiveWidth(10);
    
    const screenWidth = SCREEN_WIDTH;

    const offsets = [];
    let currentOffset = 0;

    allPosts.forEach((item, index) => {
      let itemHeight = topMargin + bottomMargin;

      if (item?.post_content_files?.[0]?.format === 'video') {
         // Video Case
         // Styles: paddingTop: 0, aspectRatio: 2/3
         const aspectRatio = 2 / 3; 
         itemHeight += screenWidth / aspectRatio;
         
         // Video card also has Actions and Add Comment sections below the video
         itemHeight += actionsHeight;
         itemHeight += addCommentHeight;

      } else {
         // Image Case
         itemHeight += headerHeight;
         
         // Text content
         if (item?.postContent) {
            // Font size is ~14px (responsiveFontSize 1.72), approximate 20px line height
            const approximateLines = Math.ceil(item.postContent.length / 50); 
            // marginVertical: 8 (from styles) + line height
            itemHeight += 16 + (approximateLines * 20); 
         }

         // Image Aspect Ratio
         const ar = item?.image?.hasAspectRatio 
            ? Number(item?.image?.aspectRatio?.width) / Number(item?.image?.aspectRatio?.height) 
            : 1;
         const finalAspectRatio = isNaN(ar) ? 1 : ar;
         itemHeight += screenWidth / finalAspectRatio;

         itemHeight += actionsHeight;
         itemHeight += addCommentHeight;
      }

      offsets[index] = { length: itemHeight, offset: currentOffset, index };
      currentOffset += itemHeight;
    });

    return (data, index) => offsets[index] || { length: 0, offset: 0, index };
  }, [allPosts]);

  return (
    <GestureHandlerRootView style={styles.homeContainer}>
      <FlatList
        ref={flatListRef}
        data={allPosts}
        renderItem={({ item, index }) => <SocialPostRender item={item} index={index} />}
        keyExtractor={keyExtractor}

        // Jump to target
        initialScrollIndex={targetIndex}
        getItemLayout={getItemLayout}

        onScrollToIndexFailed={info => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          });
        }}

        // Standard optimization
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}

        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.5}

        renderToHardwareTextureAndroid
        decelerationRate={Platform.OS === 'ios' ? 0.998 : 'fast'}

        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}

        removeClippedSubviews={Platform.OS === 'android'}
        scrollEventThrottle={16}
      />
    </GestureHandlerRootView>
  );
};

export default AllMyPosts;

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  separator: {
    borderWidth: responsiveWidth(1),
    borderColor: '#EEEEEE',
  },
});