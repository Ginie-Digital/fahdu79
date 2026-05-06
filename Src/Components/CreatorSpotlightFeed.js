import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, Animated } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSelector } from 'react-redux';
import { Image } from 'expo-image';
import { useLazyTrendingCreatorsQuery, useLazyNewCreatorsQuery } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { formatNiche, WIDTH_SIZES } from '../../DesiginData/Utility';
import { navigate } from '../../Navigation/RootNavigation';
import { creatorMessages } from '../../DesiginData/Data';
import { useIsFocused } from '@react-navigation/native';
import DIcon from '../../DesiginData/DIcons';

const { width } = Dimensions.get('window');

const SpotlightCard = ({ item, index, isVisible }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [carouselIndex, setCarouselIndex] = useState(0);

  const hasVideo = useMemo(() => {
     const hash = item._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
     return hash % 5 === 0;
  }, [item._id]);

  const hasImage = useMemo(() => {
     if (hasVideo) return false;
     const hash = item._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
     return hash % 3 === 0; 
  }, [item._id, hasVideo]);

  const videoUrl = useMemo(() => {
    if (!hasVideo) return null;
    const sampleVideos = [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4'
    ];
    const hash = item._id.split('').reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
    return sampleVideos[hash % sampleVideos.length];
  }, [item._id, hasVideo]);

  const player = useVideoPlayer(videoUrl, player => {
    player.loop = true;
    player.muted = true;
    if (isVisible && hasVideo) {
      player.play();
    }
  });

  useEffect(() => {
    if (isVisible && hasVideo) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, hasVideo, player]);

  const shouldHighlightSubscribe = useMemo(() => {
     const hash = item._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
     return hash % 2 === 0;
  }, [item._id]);

  const cardImages = useMemo(() => {
    if (!hasImage) return [];
    const count = 5;
    return Array.from({ length: count }, (_, i) => 
      `https://picsum.photos/400/500?random=${item._id}-${i}`
    );
  }, [item._id, hasImage]);

  const cardType = useMemo(() => {
    if (item.is_online) return 'LIVE';
    return (index % 3 === 0) ? 'NEW' : 'REGULAR';
  }, [item.is_online, index]);

  const randomMessage = useMemo(() => {
    if (cardType === 'LIVE') return `${item.displayName} is online now`;
    if (cardType === 'NEW') return `New creator - subscribe to support ${item.displayName}`;
    const category = item.niche && item.niche.length > 0 ? formatNiche(item.niche?.[0]) : 'LifeStyle';
    const messages = creatorMessages[category] || creatorMessages['LifeStyle'];
    const template = messages[Math.floor(Math.random() * messages.length)];
    return template.replace('{name}', item.displayName || 'Creator');
  }, [item._id, cardType]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: index * 100, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, delay: index * 100, useNativeDriver: true }),
    ]).start();

    if (cardType === 'LIVE') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [cardType]);

  const handleAction = (action) => {
    navigate('othersProfile', { userName: item.displayName, userId: item._id, role: 'creator' });
  };

  return (
    <Animated.View style={[styles.cardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], borderColor: cardType === 'LIVE' ? '#FF4B4B' : (cardType === 'NEW' ? '#FFA86B' : '#eee'), backgroundColor: '#FFFFFF', borderWidth: 1 }]}>
      <View style={styles.cardHeader}>
        <View style={styles.imageWrapper}>
            <Image source={{ uri: item.profile_image?.url }} style={styles.avatar} contentFit="cover" />
            {cardType === 'LIVE' && (
                <View style={styles.liveAvatarBadge}>
                     <Animated.View style={[styles.pulsingDot, { transform: [{ scale: pulseAnim }] }]} />
                </View>
            )}
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
              <Text style={styles.name}>{item.displayName}</Text>
              {cardType === 'LIVE' && <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>}
              {cardType === 'NEW' && <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>}
          </View>
          <Text style={styles.handle}>@{item.displayName?.replace(/\s+/g, '').toLowerCase()}</Text>
          <View style={styles.statsRow}>
            <DIcon name="star-fill" provider="Octicons" size={12} color="#FFA86B" />
            <Text style={styles.statText}>4.8</Text>
            <View style={styles.statDivider} />
            <Text style={styles.statText}>100 followers</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.messageText, cardType === 'LIVE' && styles.messageTextBold]}>"{randomMessage}"</Text>

      {hasImage && cardImages.length > 0 && (
        <View style={styles.carouselWrapper}>
          <FlatList
            data={cardImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setCarouselIndex(Math.round(e.nativeEvent.contentOffset.x / (width - 64)))}
            renderItem={({ item: imageUri }) => <Image source={{ uri: imageUri }} style={styles.carouselImage} contentFit="cover" />}
          />
          <View style={styles.paginationContainer}>
            {cardImages.map((_, i) => <View key={i} style={[styles.paginationDot, i === carouselIndex && styles.paginationDotActive]} />)}
          </View>
        </View>
      )}

      {hasVideo && videoUrl && (
        <View style={styles.videoWrapper}>
            <VideoView player={player} style={styles.videoStyle} contentFit="cover" nativeControls={false} />
            <View style={styles.videoOverlay}><DIcon name="device-camera-video" provider="Octicons" size={14} color="#FFF" /></View>
        </View>
      )}

      <View style={styles.actionButtonsRow}>
        {cardType === 'LIVE' ? (
             <>
                <TouchableOpacity style={[styles.primaryButton, {backgroundColor: '#FF4B4B'}]} onPress={() => handleAction('JoinLive')}><DIcon name="videocam" provider="Ionicons" size={16} color="#FFF" style={{marginRight: 6}} /><Text style={styles.primaryButtonText}>Join Live</Text></TouchableOpacity>
                 <ActionIconBtn icon="chatbubble-outline" provider="Ionicons" onPress={() => handleAction('Chat')} />
                 <ActionIconBtn icon="star-outline" provider="Ionicons" onPress={() => handleAction('Subscribe')} />
                 <ActionIconBtn icon="radio-outline" provider="Ionicons" onPress={() => handleAction('RequestLive')} />
             </>
        ) : shouldHighlightSubscribe ? (
            <>
                <ActionIconBtn icon="chatbubble-outline" provider="Ionicons" onPress={() => handleAction('Chat')} />
                <ActionIconBtn icon="call-outline" provider="Ionicons" onPress={() => handleAction('Audio')} />
                <TouchableOpacity style={[styles.primaryButton, {backgroundColor: '#FFA86B', flex: 1, marginHorizontal: 8}]} onPress={() => handleAction('Subscribe')}><Text style={styles.primaryButtonText}>Subscribe</Text></TouchableOpacity>
                 <ActionIconBtn icon="videocam-outline" provider="Ionicons" onPress={() => handleAction('Video')} />
                 <ActionIconBtn icon="radio-outline" provider="Ionicons" onPress={() => handleAction('RequestLive')} />
            </>
        ) : (
            <>
                <ActionButton icon="comment" provider="Octicons" label="Chat" onPress={() => handleAction('Chat')} />
                <ActionButton icon="call-outline" provider="Ionicons" label="Audio" onPress={() => handleAction('Audio')} />
                <ActionButton icon="videocam-outline" provider="Ionicons" label="Video" onPress={() => handleAction('Video')} />
                <ActionButton icon="star-outline" provider="Ionicons" label="Join" onPress={() => handleAction('Subscribe')} />
                <ActionButton icon="pulse" provider="Ionicons" label="Live" onPress={() => handleAction('RequestLive')} />
            </>
        )}
      </View>
    </Animated.View>
  );
};

const ActionIconBtn = ({ icon, provider, onPress }) => (
    <TouchableOpacity style={styles.iconBtn} onPress={onPress}><DIcon name={icon} provider={provider} size={20} color="#1E1E1E" /></TouchableOpacity>
);

const ActionButton = ({ icon, provider, label, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}><View style={styles.iconCircle}><DIcon name={icon} provider={provider} size={18} color="#1E1E1E" /></View><Text style={styles.actionLabel}>{label}</Text></TouchableOpacity>
);

const CreatorSpotlightFeed = ({ niche }) => {
  const [page, setPage] = useState(1);
  const [allCreators, setAllCreators] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const isFocused = useIsFocused();
  const [activeViewableIndex, setActiveViewableIndex] = useState(0);
  
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => { if (viewableItems && viewableItems.length > 0) setActiveViewableIndex(viewableItems[0].index); }).current;
  const token = useSelector(state => state.auth.user.token);
  const filter = useSelector(state => state.hideShow.visibility.discoverFilter.type);
  const [fetchCreators, { data, isLoading, isFetching }] = useLazyTrendingCreatorsQuery();

  useEffect(() => { setPage(1); setAllCreators([]); setHasMore(true); }, [niche, filter]);
  useEffect(() => { fetchData(); }, [niche, page, filter]);
  const fetchData = () => { fetchCreators({ token, niche: niche.value || 'all', filter, page }); };

  useEffect(() => {
    if (!data?.data?.users) return;
    const newUsers = data.data.users;
    const metadata = data.data.metadata?.[0];
    if (page === 1) setAllCreators(newUsers);
    else setAllCreators(prev => [...prev, ...newUsers.filter(u => !prev.find(p => p._id === u._id))]);
    if (metadata) setHasMore(page < Math.ceil(metadata.total / metadata.limit));
    else setHasMore(newUsers.length > 0);
  }, [data, page]);

  const handleLoadMore = () => { if (!isFetching && hasMore && allCreators.length > 0) setPage(prev => prev + 1); };

  if (isLoading && page === 1) return <ActivityIndicator size="large" color="#FF6A33" style={{ marginTop: 100 }} />;
  if (allCreators.length === 0 && !isLoading) return <View style={styles.emptyContainer}><Text style={styles.emptyText}>No creators found</Text></View>;

  return (
    <FlatList
      data={allCreators}
      keyExtractor={(item, index) => `${item._id}-${index}`}
      renderItem={({ item, index }) => <SpotlightCard item={item} index={index} isVisible={isFocused && index === activeViewableIndex} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={() => (isFetching && page !== 1) ? <View style={styles.footerLoader}><ActivityIndicator size="small" color="#FF6A33" /></View> : null}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
    />
  );
};

const styles = StyleSheet.create({
  listContent: { padding: 16, paddingBottom: 150, backgroundColor: '#fff9f5' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, backgroundColor: '#fff9f5' },
  emptyText: { fontSize: 16, color: '#999', fontFamily: 'Rubik-Regular' },
  cardContainer: { borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, shadowOpacity: 0.05 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  imageWrapper: { position: 'relative', marginRight: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  liveAvatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  pulsingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF4B4B' },
  headerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontFamily: 'Rubik-SemiBold', color: '#1E1E1E', marginRight: 8 },
  liveBadge: { backgroundColor: '#FF4B4B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveBadgeText: { color: '#FFF', fontSize: 8, fontFamily: 'Rubik-Bold' },
  newBadge: { backgroundColor: '#FFA86B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { color: '#FFF', fontSize: 8, fontFamily: 'Rubik-Bold' },
  handle: { fontSize: 12, fontFamily: 'Rubik-Regular', color: '#666', marginBottom: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 12, fontFamily: 'Rubik-Medium', color: '#1E1E1E', marginLeft: 4 },
  statDivider: { height: 12, width: 1, backgroundColor: '#ccc', marginHorizontal: 8 },
  messageText: { fontSize: 14, fontFamily: 'Rubik-Regular', color: '#1E1E1E', marginBottom: 16, lineHeight: 20, fontStyle: 'italic' },
  messageTextBold: { fontFamily: 'Rubik-Medium', color: '#FF4B4B' },
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionButton: { alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  primaryButton: { height: 40, paddingHorizontal: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFF', fontFamily: 'Rubik-SemiBold', fontSize: 14 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF5EB', justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255, 168, 107, 0.2)' },
  actionLabel: { fontSize: 10, fontFamily: 'Rubik-Medium', color: '#1E1E1E' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  carouselWrapper: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F5F5F5' },
  carouselImage: { width: width - 64, aspectRatio: 0.8, borderRadius: 12 },
  paginationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, backgroundColor: '#FFFFFF' },
  paginationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DDDDDD', marginHorizontal: 3 },
  paginationDotActive: { backgroundColor: '#FFA86B', width: 16 },
  videoWrapper: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', width: width - 64, aspectRatio: 0.8 },
  videoStyle: { width: '100%', height: '100%' },
  videoOverlay: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.4)', padding: 6, borderRadius: 12 }
});

export default CreatorSpotlightFeed;
