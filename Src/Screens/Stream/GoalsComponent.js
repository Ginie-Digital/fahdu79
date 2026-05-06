import { StyleSheet, Text, View, Platform, FlatList, TouchableOpacity, Image, Pressable, Modal } from 'react-native';
import React, { memo, useState } from 'react';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import { useSelector } from 'react-redux';
import TextTicker from 'react-native-text-ticker';
import { nTwins, nTwinsFont, WIDTH_SIZES } from '../../../DesiginData/Utility';
import { BlurView } from 'expo-blur';


const RIGHT_WIDTH = responsiveWidth(28); // Reserve fixed space for coin+amount

// Update RenderEachItem to accept style prop
const RenderEachItem = memo(({ item, style }) => {
  const progressWidth =
    item.collected === 0
      ? 0
      : `${item?.amount ? (item.collected / item.amount) * 100 : 0}%`;

  return (
    <View
      style={[{
        width: WIDTH_SIZES[345],
        alignSelf: 'center',
        borderWidth: responsiveWidth(0.4),
        borderRadius: responsiveWidth(3.5),
        height: responsiveWidth(13),
        overflow: 'hidden',
        borderColor: '#ffffff60',
        backgroundColor: 'transparent',
      }, style]}>
      <BlurView intensity={30} tint="light" style={{ flex: 1 }}>
        {/* Progress Bar */}
        <View
          style={[
            styles.progress,
            {
              width: progressWidth,
              borderWidth: item.collected === 0 ? 0 : responsiveWidth(0.4),
            },
          ]}
        />

        {/* Row Content */}
        <View
          style={{
            flexDirection: 'row',
            flex: 1,
            alignItems: 'center',
            paddingHorizontal: responsiveWidth(4),
          }}>

          {/* Title (flexible space, ellipsized if too long) */}
          <View style={{ flex: 1, paddingRight: responsiveWidth(2) }}>
            <Text
              style={[
                styles.text,
                {
                  fontSize: responsiveFontSize(2),
                  textAlignVertical: 'center',
                  lineHeight: Platform.OS === 'ios' ? 35 : undefined,
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {item?.title}
            </Text>
          </View>

          {/* Amount + Coin (fixed width, always right aligned) */}
          <View
            style={{
              width: RIGHT_WIDTH,
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}>
            <Text
              style={[
                styles.text,
                {
                  fontFamily: 'Rubik-Medium',
                  textAlignVertical: 'center',
                  lineHeight: Platform.OS === 'ios' ? 35 : undefined,
                  marginRight: responsiveWidth(1),
                },
              ]}>
              {item?.collected}/{item?.amount}
            </Text>
            <Image
              source={require('../../../Assets/Images/Coins2.png')}
              style={{
                height: responsiveWidth(4.5),
                width: responsiveWidth(4.5),
                resizeMode: 'contain',
              }}
            />
          </View>
        </View>
      </BlurView>
    </View>
  );
});

// Modal to show pending goals (excluding the first one already shown)
const GoalsModal = memo(({ visible, onClose, pendingGoals }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>Pending Goals</Text>
          <FlatList
            data={pendingGoals}
            renderItem={({ item }) => (
              <View style={styles.modalGoalItem}>
                <Text style={styles.modalGoalTitle} numberOfLines={1}>{item?.title}</Text>
                <View style={styles.modalGoalProgress}>
                  <Text style={styles.modalGoalAmount}>{item?.collected}/{item?.amount}</Text>
                  <Image
                    source={require('../../../Assets/Images/Coins2.png')}
                    style={styles.modalCoinIcon}
                  />
                </View>
              </View>
            )}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={{ gap: responsiveWidth(2) }}
            showsVerticalScrollIndicator={false}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const GoalsComponent = ({ isStarting }) => {
  const flashGoals = useSelector(state => state.livechats.data.goals);
  const [showGoalsModal, setShowGoalsModal] = useState(false);

  // Get only the first uncompleted goal (where collected < amount)
  const firstUncompletedGoal = flashGoals?.find(goal => goal.collected < goal.amount);

  // Get all pending goals except the first one (for modal)
  const pendingGoalsForModal = flashGoals?.filter((goal, index) => {
    const firstUncompletedIndex = flashGoals?.findIndex(g => g.collected < g.amount);
    return goal.collected < goal.amount && index !== firstUncompletedIndex;
  });

  // Only stream host (isStarting) can see pending goals button
  const hasMultiplePendingGoals = pendingGoalsForModal?.length > 0;

  // If no uncompleted goal, don't render anything
  if (!firstUncompletedGoal) {
    return null;
  }

  return (
    <View behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ marginTop: responsiveWidth(6), width: '100%', alignItems: 'center' }}>
      <View style={[styles.goalsRow, { width: '95%' }]}>
        <RenderEachItem
          item={firstUncompletedGoal}
          style={isStarting && hasMultiplePendingGoals ? { flex: 1, width: 'auto' } : undefined}
        />

        {/* Show Goals button only for stream host (isStarting) */}
        {isStarting && hasMultiplePendingGoals && (
          <Pressable
            style={({ pressed }) => [styles.goalsButton, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => setShowGoalsModal(true)}
          >
            <Text style={styles.goalsButtonText}>Goals</Text>
            <Image
              source={require('../../../Assets/Images/Goals.png')}
              style={styles.goalsButtonIcon}
            />
          </Pressable>
        )}
      </View>

      {/* Goals Modal */}
      <GoalsModal
        visible={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        pendingGoals={pendingGoalsForModal}
      />
    </View>
  );
};

export default GoalsComponent;

const styles = StyleSheet.create({
  text: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(2),
  },

  progress: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#FFA86B',
    borderWidth: WIDTH_SIZES[2],
    borderColor: '#FF7819',
    borderRadius: responsiveWidth(3.5),
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightColor: '#FFA86B',
    ...StyleSheet.absoluteFillObject,
  },

  blurBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: responsiveWidth(3),
    backgroundColor: '#ffffff30',
    height: '100%',
    width: '100%',
  },

  goalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsiveWidth(2),
  },

  goalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA86B',
    paddingHorizontal: responsiveWidth(3),
    paddingVertical: responsiveWidth(3.5),
    borderRadius: responsiveWidth(3.5),
    borderWidth: responsiveWidth(0.4),
    borderColor: '#FF7819',
    gap: responsiveWidth(1.5),
  },

  goalsButtonText: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.8),
    color: '#1e1e1e',
  },

  goalsButtonIcon: {
    width: responsiveWidth(5),
    height: responsiveWidth(5),
    resizeMode: 'contain',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderRadius: responsiveWidth(4),
    padding: responsiveWidth(5),
    width: responsiveWidth(85),
    maxHeight: responsiveWidth(80),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#1e1e1e',
  },

  modalTitle: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.2),
    color: '#1e1e1e',
    marginBottom: responsiveWidth(3),
    textAlign: 'center',
  },

  modalGoalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFA86B30',
    padding: responsiveWidth(3),
    borderRadius: responsiveWidth(2),
    borderWidth: 1,
    borderColor: '#FFA86B',
  },

  modalGoalTitle: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.8),
    color: '#1e1e1e',
    flex: 1,
    marginRight: responsiveWidth(2),
  },

  modalGoalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(1),
  },

  modalGoalAmount: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.6),
    color: '#1e1e1e',
  },

  modalCoinIcon: {
    width: responsiveWidth(4),
    height: responsiveWidth(4),
    resizeMode: 'contain',
  },
});
