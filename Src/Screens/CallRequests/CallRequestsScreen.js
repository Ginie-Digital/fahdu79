import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import PagerView from 'react-native-pager-view';
import { responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { useSelector } from 'react-redux';
import DIcon from '../../../DesiginData/DIcons';
import PendingTab from './PendingTab';
import ScheduledTab from './ScheduledTab';
import CompletedTab from './CompletedTab';
import MissedTab from './MissedTab';
import DenyConfirmationModal from './DenyConfirmationModal';
import { useDeclineCallRequestMutation, useStartCallMutation } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { LoginPageErrors, CommonSuccess } from '../../Components/ErrorSnacks';
import { AppLog } from '../../../Src/Utils/Logger';
import socketServcies from '../../../SocketServices';
import Back from '../../../Assets/svg/back.svg';
import MicPermissionModal from '../../Components/Calling/MicPermissionModal';

const TABS = [
  { id: 'pending', label: 'Pending', badge: 0 },
  { id: 'scheduled', label: 'Scheduled', badge: 0 },
  { id: 'completed', label: 'Completed' },
  { id: 'missed', label: 'Missed' },
];

const CallRequestsScreen = ({ route }) => {
  const navigation = useNavigation();
  const token = useSelector(state => state.auth.user.token);
  const currentUserId = useSelector(state => state.auth.user.currentUserId);

  const [activeTab, setActiveTab] = useState('pending');
  const [denyModalVisible, setDenyModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showMicModal, setShowMicModal] = useState(false);
  const [micModalCallType, setMicModalCallType] = useState('audio');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [pendingCalls, setPendingCalls] = useState([]);
  const [scheduledCalls, setScheduledCalls] = useState([]);
  const [completedCalls, setCompletedCalls] = useState([]);
  const [missedCalls, setMissedCalls] = useState([]);

  const [counts, setCounts] = useState({ pending: 0, scheduled: 0 });

  // Pagination state per tab
  const [pagination, setPagination] = useState({
    pending:   { page: 1, total: 0, hasMore: true },
    scheduled: { page: 1, total: 0, hasMore: true },
    completed: { page: 1, total: 0, hasMore: true },
    missed:    { page: 1, total: 0, hasMore: true },
  });
  const [loadingMore, setLoadingMore] = useState({ pending: false, scheduled: false, completed: false, missed: false });

  const scrollViewRef = useRef(null);
  const pagerRef = useRef(null);
  const tabLayouts = useRef({});
  const scrollViewWidth = useRef(0);

  const PAGE_LIMIT = 10;

  const fetchCallLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const endpoints = [
      { key: 'scheduled', url: 'https://api.fahdu.com/api/stream/scheduled/calls' },
      { key: 'pending', url: 'https://api.fahdu.com/api/stream/pending/calls' },
      { key: 'completed', url: 'https://api.fahdu.com/api/stream/completed/calls' },
      { key: 'missed', url: 'https://api.fahdu.com/api/stream/missed/calls' },
    ];

    try {
      const results = await Promise.all(
        endpoints.map(ep =>
          axios.get(ep.url, {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: PAGE_LIMIT },
            timeout: 15000,
          }).catch(err => {
            console.error(`Error fetching ${ep.key}:`, err);
            return { data: { data: { data: [], metadata: [{ total: 0, page: 1, limit: PAGE_LIMIT }] } } };
          })
        )
      );

      const [scheduledRes, pendingRes, completedRes, missedRes] = results;

      setScheduledCalls(scheduledRes.data?.data?.data || []);
      setPendingCalls(pendingRes.data?.data?.data || []);
      setCompletedCalls(completedRes.data?.data?.data || []);
      setMissedCalls(missedRes.data?.data?.data || []);

      // Update pagination metadata
      const newPagination = {};
      const keys = ['scheduled', 'pending', 'completed', 'missed'];
      results.forEach((res, i) => {
        const meta = res.data?.data?.metadata?.[0] || { total: 0 };
        const total = meta.total || 0;
        newPagination[keys[i]] = { page: 1, total, hasMore: total > PAGE_LIMIT };
      });
      setPagination(prev => ({ ...prev, ...newPagination }));

      setCounts({
        pending: pendingRes.data?.data?.metadata?.[0]?.total || 0,
        scheduled: scheduledRes.data?.data?.metadata?.[0]?.total || 0,
      });

    } catch (error) {
      console.error('Error fetching call logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Load more for a specific tab
  const loadMoreForTab = useCallback(async (tabKey) => {
    const pag = pagination[tabKey];
    if (!pag.hasMore || loadingMore[tabKey]) return;

    const nextPage = pag.page + 1;
    setLoadingMore(prev => ({ ...prev, [tabKey]: true }));

    const urlMap = {
      scheduled: 'https://api.fahdu.com/api/stream/scheduled/calls',
      pending: 'https://api.fahdu.com/api/stream/pending/calls',
      completed: 'https://api.fahdu.com/api/stream/completed/calls',
      missed: 'https://api.fahdu.com/api/stream/missed/calls',
    };

    try {
      const res = await axios.get(urlMap[tabKey], {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: nextPage, limit: PAGE_LIMIT },
        timeout: 15000,
      });

      const newData = res.data?.data?.data || [];
      const meta = res.data?.data?.metadata?.[0] || {};
      const total = meta.total || pag.total;

      // Append data
      const setterMap = { scheduled: setScheduledCalls, pending: setPendingCalls, completed: setCompletedCalls, missed: setMissedCalls };
      setterMap[tabKey](prev => [...prev, ...newData]);

      setPagination(prev => ({
        ...prev,
        [tabKey]: {
          page: nextPage,
          total,
          hasMore: nextPage * PAGE_LIMIT < total,
        },
      }));
    } catch (err) {
      console.error(`Error loading more ${tabKey}:`, err);
    } finally {
      setLoadingMore(prev => ({ ...prev, [tabKey]: false }));
    }
  }, [token, pagination, loadingMore]);

  useFocusEffect(
    useCallback(() => {
      fetchCallLogs();
    }, [fetchCallLogs])
  );

  // Auto switch tab when coming from a successful operation (e.g., schedule call)
  useEffect(() => {
    if (route?.params?.refresh) {
        fetchCallLogs(true);
        navigation.setParams({ refresh: undefined });
    }

    if (!loading && route?.params?.activeTab) {
      const tabId = route.params.activeTab;
      const index = TABS.findIndex(t => t.id === tabId);
      if (index !== -1) {
        // Small delay to ensure layout animations / PagerView are ready
        const timer = setTimeout(() => {
          handleTabPress(tabId, index);
          // Clear params so we don't switch again on subsequent focus/renders
          navigation.setParams({ activeTab: undefined });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, route?.params?.activeTab, route?.params?.refresh]);

  const [actionLoading, setActionLoading] = useState({ id: null, type: null });

  const handleAccept = async (item) => {
    if (actionLoading.id) return;
    console.log('Accept & Schedule:', item);
    
    setActionLoading({ id: item._id, type: 'accept' });
    
    // Small delay to show loader before navigation
    setTimeout(() => {
      const itemData = {
        userProfileImage: item?.profileUrl || 'https://randomuser.me/api/portraits/women/44.jpg',
        userName: item?.displayName || 'Unknown User',
        callDuration: item?.requestedDuration || 30,
        callCost: item?.requestedCoins || 0,
        requestCreatedAt: item?.time || new Date().toISOString(),
        requestId: item?._id,
        roomId: item?.chatRoomId,
      };
      
      setActionLoading({ id: null, type: null });
      navigation.navigate('ScheduleCallScreen', itemData);
    }, 600);
  };

  const handleDeny = (item) => {
    if (actionLoading.id) return;
    setSelectedRequest(item);
    setDenyModalVisible(true);
  };

  const [startCall] = useStartCallMutation();
  const [declineCallRequest] = useDeclineCallRequestMutation();

  const confirmDeny = async () => {
    if (!selectedRequest || actionLoading.id) return;

    setActionLoading({ id: selectedRequest._id, type: 'deny' });
    try {
      const payload = {
        roomId: selectedRequest?.chatRoomId,
        callType: selectedRequest?.callType?.toLowerCase() || 'audio',
        userId: selectedRequest?.initiator,
      };

      console.log('Declining Call Request with Payload:', payload);
      const response = await declineCallRequest({ token, data: payload }).unwrap();
      console.log('Call Declined Successfully', response);
      
      CommonSuccess(response?.message || 'Call request declined successfully');
      setDenyModalVisible(false);
      setSelectedRequest(null);
      fetchCallLogs(true); // Refresh list
    } catch (error) {
      console.error('Error declining call', error);
      LoginPageErrors(error?.data?.message || 'Failed to decline call');
    } finally {
      setActionLoading({ id: null, type: null });
    }
  };

  const handleStartCall = async (item) => {
    if (actionLoading.id) return;
    console.log('Start call:', item);
    
    const resolvedCallType = item?.callType?.toLowerCase() || item?.type?.toLowerCase();
    setMicModalCallType(resolvedCallType);

    setActionLoading({ id: item._id, type: 'start' });
    AppLog('CALL', 'Creator clicked Start Call for scheduled request', { roomId: item?.chatRoomId, initiator: item?.initiator });

    // 🔒 Pre-check microphone (and camera) permissions before starting the call
    try {
      const isVideo = resolvedCallType === 'video';
      
      const micPermission = Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO;
      let micStatus = await check(micPermission);
      if (micStatus === RESULTS.DENIED) micStatus = await request(micPermission);

      let camStatus = RESULTS.GRANTED;
      if (isVideo) {
        const camPermission = Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
        camStatus = await check(camPermission);
        if (camStatus === RESULTS.DENIED) camStatus = await request(camPermission);
      }

      const micGranted = micStatus === RESULTS.GRANTED || micStatus === RESULTS.LIMITED;
      const camGranted = camStatus === RESULTS.GRANTED || camStatus === RESULTS.LIMITED;

      if (!micGranted || (isVideo && !camGranted)) {
        setShowMicModal(true);
        setActionLoading({ id: null, type: null });
        return;
      }
    } catch (err) {
      console.log('⚠️ Mic/Cam permission check error:', err);
    }
    
    // Check if socket (redis) is connected, if not force connection
    if (!socketServcies.isConnected()) {
      AppLog('SOCKET', 'Socket disconnected when starting call, forcing reconnection', { roomId: item?.chatRoomId });
      socketServcies.initializeSocket(currentUserId, token);
    }

    try {
      const response = await startCall({
        token,
        data: {
          roomId: item?.chatRoomId,
          callType: item?.callType?.toLowerCase() || 'audio',
          userId: item?.initiator,
        }
      });
      console.log('Start Call Response:', response);
      
      const isSuccess = response?.data?.statusCode === 200 || response?.data?.success || response?.data?.data?.roomId;

      if (isSuccess) {
         AppLog('CALL', 'Call started successfully via API', { roomId: item?.chatRoomId, response: response?.data });
         CommonSuccess(response?.data?.message || "Call initiated successfully");
         
         const resolvedCallType = item?.callType?.toLowerCase() || 'audio';
         const duration = item?.duration || item?.requestedDuration || 0;
         navigation.navigate(resolvedCallType === 'video' ? 'videoCallScreen' : 'callScreen', {
          roomId: item?.chatRoomId,
          name: item?.displayName,
          callType: resolvedCallType,
          callerId: currentUserId,
          profileImageUrl: item?.profileUrl,
          totalDuration: duration,
          initiatorId: item?.initiator, // Pass initiatorId
         });

      } else {
        console.log('Failed to start call:', response?.error);
        const errorMessage = response?.error?.data?.message || response?.error?.message || "Failed to start call";
        LoginPageErrors(errorMessage);
      }
    } catch (error) {
       console.error('Error starting call:', error);
       LoginPageErrors(error?.message || "An unexpected error occurred");
    } finally {
      setActionLoading({ id: null, type: null });
    }
  };

  const scrollToTab = (tabId) => {
    const tabLayout = tabLayouts.current[tabId];
    if (tabLayout && scrollViewRef.current) {
      const scrollX = tabLayout.x + tabLayout.width / 2 - scrollViewWidth.current / 2;
      scrollViewRef.current.scrollTo({ x: scrollX, animated: true });
    }
  };

  const handleTabPress = (tabId, index) => {
    setActiveTab(tabId);
    scrollToTab(tabId);
    pagerRef.current?.setPage(index);
  };

  const handlePageSelected = (e) => {
    const index = e.nativeEvent.position;
    const tabId = TABS[index].id;
    setActiveTab(tabId);
    scrollToTab(tabId);
  };

  const onRefresh = () => {
    fetchCallLogs(true);
  };

  const dynamicTabs = TABS.map(tab => ({
    ...tab,
    badge: counts[tab.id] || 0
  }));

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FFA86B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Back />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call Requests</Text>
        <View style={styles.backButton} />
      </View>

      {/* Tabs - Scrollable */}
      <View style={styles.tabsWrapper}>
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          onLayout={(e) => scrollViewWidth.current = e.nativeEvent.layout.width}
        >
          {dynamicTabs.map((tab, index) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && styles.activeTab,
                index < dynamicTabs.length - 1 && styles.tabSpacing,
              ]}
              onLayout={(event) => {
                tabLayouts.current[tab.id] = event.nativeEvent.layout;
              }}
              onPress={() => handleTabPress(tab.id, index)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
              ]}>
                {tab.label}
              </Text>
              {tab.badge > 0 && (
                <View style={[
                  styles.badge,
                  activeTab !== tab.id && { backgroundColor: '#FFA86B' }
                ]}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content with PagerView */}
      <PagerView 
        style={styles.pagerView} 
        initialPage={0} 
        ref={pagerRef}
        onPageSelected={handlePageSelected}
      >
        <View key="pending">
          <PendingTab 
            data={pendingCalls} 
            onAccept={handleAccept} 
            onDeny={handleDeny}
            currentUserId={currentUserId}
            actionLoading={actionLoading}
            onLoadMore={() => loadMoreForTab('pending')}
            loadingMore={loadingMore.pending}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FFA86B']} />
            }
          />
        </View>
        <View key="scheduled">
          <ScheduledTab 
            data={scheduledCalls} 
            onStartCall={handleStartCall}
            currentUserId={currentUserId}
            actionLoading={actionLoading}
            onLoadMore={() => loadMoreForTab('scheduled')}
            loadingMore={loadingMore.scheduled}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FFA86B']} />
            }
          />
        </View>
        <View key="completed">
          <CompletedTab 
            data={completedCalls}
            onLoadMore={() => loadMoreForTab('completed')}
            loadingMore={loadingMore.completed}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FFA86B']} />
            }
          />
        </View>
        <View key="missed">
          <MissedTab 
            data={missedCalls}
            onLoadMore={() => loadMoreForTab('missed')}
            loadingMore={loadingMore.missed}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FFA86B']} />
            }
          />
        </View>
      </PagerView>

      {/* Deny Confirmation Modal */}
      <DenyConfirmationModal
        visible={denyModalVisible}
        onClose={() => setDenyModalVisible(false)}
        onConfirm={confirmDeny}
        loading={actionLoading.type === 'deny'}
        userName={selectedRequest?.displayName || selectedRequest?.user?.name}
      />

      {/* Mic & Cam Permission Modal */}
      <MicPermissionModal
        visible={showMicModal}
        mode="caller"
        callType={micModalCallType}
        onCancel={() => setShowMicModal(false)}
      />
    </SafeAreaView>
  );
};

export default CallRequestsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveWidth(3),
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(2.2),
    color: '#1E1E1E',
  },
  tabsWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: responsiveWidth(3),
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: responsiveWidth(4),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    backgroundColor: '#FFFFFF',
  },
  tabSpacing: {
    marginRight: 12,
  },
  activeTab: {
    backgroundColor: '#FFA86B',
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
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 11, // Slightly smaller for better fit
    color: '#1e1e1e',
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  pagerView: {
    flex: 1,
  },
});
