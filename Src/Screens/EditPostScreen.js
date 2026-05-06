import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, Platform, TextInput, KeyboardAvoidingView, ScrollView} from 'react-native';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {useDispatch, useSelector} from 'react-redux';
import {usePostEditMutation} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {chatRoomSuccess, LoginPageErrors} from '../Components/ErrorSnacks';
import {editMyPostCaption} from '../../Redux/Slices/NormalSlices/Posts/MyProfileFeedCacheSlice';
import AnimatedButton from '../Components/AnimatedButton';
import {useNavigation} from '@react-navigation/native';

const EditPostScreen = ({route}) => {
  const {postId, postContent: initialContent} = route.params;
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const token = useSelector(state => state.auth.user.token);
  const [description, setDescription] = useState(initialContent || '');
  const [loading, setLoading] = useState(false);
  const [postEdit] = usePostEditMutation();
  const [mentions, setMentions] = useState([]); // [{ id, name, start, length, originalTag }]
  const [selection, setSelection] = useState({start: 0, end: 0});

  // Parse initial content once on mount
  useEffect(() => {
    if (initialContent) {
      const mentionRegex = /@\[([^\]]+?)\]\(userId:([^)]+?)\)/gi;
      let displayMsg = initialContent;
      const parsedMentions = [];
      let match;

      // We need to find all matches and their positions in the *original* string
      // then calculate their positions in the *result* string.
      // But it's easier to use replace with a callback to build the displayMsg and mentions metadata.
      
      let currentOffset = 0;
      const parts = [];
      let lastIndex = 0;

      while ((match = mentionRegex.exec(initialContent)) !== null) {
        const [fullTag, name, id] = match;
        const index = match.index;
        
        // Add text before the match
        parts.push(initialContent.slice(lastIndex, index));
        
        const start = parts.join('').length;
        const displayName = `@${name}`;
        parts.push(displayName);
        
        parsedMentions.push({
          id,
          name,
          start,
          length: displayName.length,
          originalTag: fullTag
        });
        
        lastIndex = index + fullTag.length;
      }
      parts.push(initialContent.slice(lastIndex));
      
      setDescription(parts.join(''));
      setMentions(parsedMentions);
    }
  }, [initialContent]);

  const getRawCaption = (displayText, currentMentions) => {
    let raw = displayText;
    // Sort mentions descending to replace from end to avoid index shifting issues
    const sortedMentions = [...currentMentions].sort((a, b) => b.start - a.start);
    
    sortedMentions.forEach(m => {
      raw = raw.slice(0, m.start) + m.originalTag + raw.slice(m.start + m.length);
    });
    return raw;
  };

  const handleDescriptionChange = (newText) => {
    const diff = newText.length - description.length;
    
    // The range that was selected before the change occurred
    const {start: selStart, end: selEnd} = selection;
    
    // Determine if the change affects any mention range
    const isIntersecting = mentions.some(m => {
      const mStart = m.start;
      const mEnd = m.start + m.length;
      
      if (selStart !== selEnd) {
        // Range replacement/deletion: check if the selected range overlaps with the mention
        return (selStart < mEnd && selEnd > mStart);
      } else {
        // Cursor-based change
        if (diff > 0) {
          // Insertion: check if cursor is inside the mention (exclusive of boundaries)
          return selStart > mStart && selStart < mEnd;
        } else {
          // Deletion: check if the deleted characters (before the cursor) overlap with the mention
          const deletedStart = selStart - Math.abs(diff);
          const deletedEnd = selStart;
          return (deletedStart < mEnd && deletedEnd > mStart);
        }
      }
    });

    if (isIntersecting) {
      // Reject the change
      return;
    }

    // If valid change, calculate how much to shift subsequent mentions.
    // The net shift is simply 'diff'.
    // The point from which to shift is the start of the change.
    const changeIndex = selStart !== selEnd ? selStart : (diff > 0 ? selStart : selStart + diff);

    const updatedMentions = mentions.map(m => {
      if (m.start >= changeIndex) {
        return { ...m, start: m.start + diff };
      }
      return m;
    });

    setMentions(updatedMentions);
    setDescription(newText);
  };

  const handleSave = useCallback(async () => {
    if (description.trim() === '') {
      LoginPageErrors('Description Required \nPlease enter a post description.');
      return;
    }

    setLoading(true);
    const rawContent = getRawCaption(description, mentions);

    try {
      const {data, error} = await postEdit({token, data: {postId, postContent: rawContent.trim()}});

      if (error) {
        if (error?.status === 'FETCH_ERROR') {
          LoginPageErrors('Please check your network');
        } else {
          LoginPageErrors(error?.data?.message || 'Update failed');
        }
        setLoading(false);
        return;
      }

      if (data?.data) {
        chatRoomSuccess(data?.message || 'Post updated successfully');
        dispatch(editMyPostCaption({postId, caption: rawContent.trim()}));
        setLoading(false);
        navigation.goBack();
      }
    } catch (err) {
      console.log('PostEdit Error:', err);
      setLoading(false);
      LoginPageErrors('Something went wrong. Please try again.');
    }
  }, [postId, description, token, dispatch, postEdit, navigation, mentions]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.textInputContainer}>
          <View style={{position: 'relative'}}>
            <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}} pointerEvents="none">
              <Text style={[styles.textInputs, {color: '#1e1e1e'}]}>
                {(() => {
                  let lastIndex = 0;
                  const parts = [];
                  const sortedMentions = [...mentions].sort((a, b) => a.start - b.start);
                  
                  sortedMentions.forEach((m, i) => {
                    parts.push(<Text key={`text-${i}`}>{description.slice(lastIndex, m.start)}</Text>);
                    parts.push(
                      <Text key={`mention-${i}`} style={{color: '#FFA86B'}}>
                        {`@${m.name}`}
                      </Text>
                    );
                    lastIndex = m.start + m.length;
                  });
                  parts.push(<Text key="last">{description.slice(lastIndex)}</Text>);
                  return parts;
                })()}
              </Text>
            </View>
            <TextInput
              value={description}
              onChangeText={handleDescriptionChange}
              onSelectionChange={e => setSelection(e.nativeEvent.selection)}
              maxLength={500}
              selectionColor={'#1e1e1e'}
              cursorColor={'#1e1e1e'}
              placeholderTextColor="#B2B2B2"
              placeholder={description ? "" : "Write your post description..."}
              spellCheck={false}
              autoCorrect={false}
              autoCapitalize={'none'}
              style={[styles.textInputs, {color: 'transparent', zIndex: 1}]}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              autoFocus
            />
          </View>
          <Text style={styles.charCounter}>
            {description.length}/<Text style={{color: '#1e1e1e', fontFamily: 'Rubik-Medium'}}>500</Text>
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <View style={{flexBasis: '48%'}}>
            <AnimatedButton title={'Cancel'} showOverlay={false} style={{backgroundColor: '#fff'}} buttonMargin={0} onPress={handleCancel} />
          </View>
          <View style={{flexBasis: '48%'}}>
            <AnimatedButton title={'Save'} showOverlay={false} loading={loading} onPress={handleSave} buttonMargin={0} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: responsiveWidth(5),
  },
  textInputContainer: {
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    backgroundColor: '#fff',
    borderRadius: responsiveWidth(4),
    padding: responsiveWidth(3),
    marginBottom: responsiveWidth(4),
  },
  textInputs: {
    width: '100%',
    paddingLeft: 0,
    paddingRight: 0,
    fontFamily: 'Rubik-Regular',
    textAlignVertical: 'top',
    marginTop: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingVertical: 0,
    fontSize: responsiveFontSize(1.8),
    color: '#1e1e1e',
    lineHeight: 20,
    includeFontPadding: false,
    letterSpacing: 0,
    minHeight: 180,
  },
  charCounter: {
    alignSelf: 'flex-end',
    color: '#4D4D4D',
    fontSize: responsiveFontSize(1.4),
    fontFamily: 'Rubik-Regular',
    marginTop: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 12 : 8,
    width: '100%',
  },
});

export default EditPostScreen;
