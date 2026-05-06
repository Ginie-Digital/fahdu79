import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, TouchableOpacity, Modal, FlatList, Platform, Keyboard } from 'react-native';
import { responsiveWidth, responsiveFontSize, responsiveHeight } from 'react-native-responsive-dimensions';
import { LoginPageErrors } from '../Components/ErrorSnacks';
import { useSelector } from 'react-redux';
import { Image } from 'expo-image';
import AnimatedButton from '../Components/AnimatedButton';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { selectionTwin } from '../../DesiginData/Utility';
import LottieView from 'lottie-react-native';
import { useSubmitFeedbackMutation } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

const feedbackTypes = [
  { id: '1', name: 'Bug Report', icon: require('../../Assets/Images/VerificationDown.png') }, // Placeholder icon or use Svg if available
  { id: '2', name: 'Suggestion', icon: require('../../Assets/Images/VerificationDown.png') },
  { id: '3', name: 'Creator Request', icon: require('../../Assets/Images/VerificationDown.png') },
  { id: '4', name: 'Other', icon: require('../../Assets/Images/VerificationDown.png') },
];

export default function FeedbackScreen({ navigation }) {
  const [selectedType, setSelectedType] = useState(feedbackTypes[0]);
  const [description, setDescription] = useState('');
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const token = useSelector(state => state.auth.user.token);
  const [submitFeedback] = useSubmitFeedbackMutation();

  const handleSubmit = async () => {
    if (!selectedType) return LoginPageErrors('Please select a feedback type.');
    if (!description.trim()) return LoginPageErrors('Please enter a description.');

    setLoading(true);
    try {
      const response = await submitFeedback({
        token,
        data: { type: selectedType.name, feedback: description }
      }).unwrap();

      if (response.statusCode === 200) {
        setShowSuccess(true);
        setTimeout(() => {
          navigation.goBack();
        }, 2200);
      } else {
        LoginPageErrors(response.message || 'Failed to submit feedback');
      }
    } catch (e) {
      console.log('Submission Error:', e);
      LoginPageErrors(e?.data?.message || 'Error submitting feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSpacer} />
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>What's on your mind?</Text>
          <Text style={styles.sectionSubtitle}>Help us improve by sharing your experience or reporting issues.</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>Feedback Type</Text>
          <Pressable
            style={[styles.dropdownTrigger, isDropdownVisible && styles.activeBorder]}
            onPress={() => {
              Keyboard.dismiss();
              setIsDropdownVisible(true);
            }}
          >
            <Text style={[styles.dropdownValue, !selectedType && { color: '#B2B2B2' }]}>
              {selectedType ? selectedType.name : 'Select a category'}
            </Text>
            <View style={styles.iconContainer}>
              <Image 
                source={require('../../Assets/Images/VerificationDown.png')} 
                contentFit="contain" 
                style={styles.chevronIcon} 
              />
            </View>
          </Pressable>

          <Text style={[styles.inputLabel, { marginTop: 24 }]}>Detailed Description</Text>
          <View style={[styles.textAreaContainer, isFocused && styles.activeBorder]}>
            <TextInput
              testID="feedback-description-input"
              accessibilityLabel="feedback-description-input"
              selectionColor={selectionTwin()}
              cursorColor={'#1e1e1e'}
              placeholder="Tell us everything... The more details the better!"
              placeholderTextColor="#B2B2B2"
              multiline
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              maxLength={300}
              textAlignVertical="top"
              spellCheck={false}
              autoCorrect={false}
              autoCapitalize={'sentences'}
            />
            <Text style={styles.charCount}>{description.length}/300</Text>
          </View>
        </View>

        <View style={styles.buttonWrapper}>
          <AnimatedButton 
            title="Submit Feedback" 
            onPress={handleSubmit} 
            loading={loading}
          />
        </View>
      </KeyboardAwareScrollView>

      {/* Modern Center Modal for Type Selection - Converted to Absolute View to prevent Android Layout Push */}
      {isDropdownVisible && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]}>
          <Pressable 
            style={styles.modalBackdrop} 
            onPress={() => setIsDropdownVisible(false)}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Category</Text>
              </View>
              <FlatList
                data={feedbackTypes}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.optionItem,
                      selectedType?.id === item.id && styles.selectedOptionItem
                    ]}
                    onPress={() => {
                      setSelectedType(item);
                      setIsDropdownVisible(false);
                    }}
                  >
                    <View style={styles.optionContent}>
                      <Text style={[
                        styles.optionText,
                        selectedType?.id === item.id && styles.selectedOptionText
                      ]}>
                        {item.name}
                      </Text>
                    </View>
                    {selectedType?.id === item.id && (
                      <View style={styles.checkMarker} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </Pressable>
        </View>
      )}

      {showSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <LottieView
              source={require('../../Assets/Animation/Thanks.json')}
              autoPlay
              loop={false}
              style={styles.lottieView}
            />
            <Text style={styles.successText}>Thank you for your feedback!</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerSpacer: {
    height: 10,
  },
  sectionContainer: {
    paddingHorizontal: responsiveWidth(6),
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(3),
    color: '#282828',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.8),
    color: '#777',
    marginTop: 4,
    lineHeight: 22,
  },
  formContainer: {
    paddingHorizontal: responsiveWidth(6),
  },
  inputLabel: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.9),
    color: '#282828',
    marginBottom: 10,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    borderRadius: 16,
    height: 60,
    paddingHorizontal: 16,
  },
  activeBorder: {
    borderColor: '#FF6F00',
    backgroundColor: '#fff',
  },
  dropdownValue: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(2),
    color: '#282828',
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronIcon: {
    width: 14,
    height: 14,
    opacity: 0.6,
  },
  textAreaContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    borderRadius: 16,
    height: responsiveHeight(22),
    padding: 12,
  },
  textArea: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.9),
    color: '#282828',
    height: '100%',
    paddingBottom: 20,
  },
  charCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.6),
    color: '#B2B2B2',
  },
  buttonWrapper: {
    paddingHorizontal: responsiveWidth(6),
    marginTop: 30,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.2),
    color: '#282828',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  selectedOptionItem: {
    backgroundColor: '#FFF3EB',
    borderColor: '#FF6F0066',
    borderWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(2),
    color: '#444',
  },
  selectedOptionText: {
    color: '#FF6F00',
  },
  checkMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6F00',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    alignItems: 'center',
    width: responsiveWidth(80),
  },
  lottieView: {
    width: responsiveWidth(60),
    height: responsiveWidth(60),
  },
  successText: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.4),
    color: '#282828',
    textAlign: 'center',
    marginTop: 20,
  },
});

