import React, {memo, useState, useCallback} from 'react';
import {Text, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';

/**
 * MentionText parses strings for the pattern @[Display Name](userId:65ec...)
 * and renders them as highlighted, tappable text.
 *
 * Props:
 *  - maxLines (number, optional): When provided, clamps text to this many lines
 *    and shows a "Read more" / "Read less" toggle.
 */

// Regex to match the tagged format: @[Name](userId:id)
const MENTION_REGEX = /(@\[[^\]]+?\]\(userId:[^)]+?\))/gi;

const MentionText = ({content, style, mentionStyle, maxLines, ...props}) => {
  const navigation = useNavigation();
  const currentUserId = useSelector(state => state.auth.user.currentUserId);
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  // Track whether we've completed the initial measurement pass.
  // On iOS, onTextLayout only reports the clamped line count when
  // numberOfLines is set, so we must measure WITHOUT numberOfLines first.
  const [measured, setMeasured] = useState(!maxLines);

  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const onTextLayout = useCallback((e) => {
    if (maxLines && !measured) {
      // First render has no numberOfLines, so we get the TRUE line count
      setIsTruncated(e.nativeEvent.lines.length > maxLines);
      setMeasured(true);
    }
  }, [maxLines, measured]);

  const handleMentionPress = useCallback((tag) => {
    const idMatch = tag.match(/\(userId:([^)]+)\)/i);
    const nameMatch = tag.match(/@\[([^\]]+)\]/i);
    
    if (idMatch && idMatch[1]) {
      const userId = idMatch[1];
      if (userId === currentUserId) {
        navigation.navigate('profile');
      } else {
        navigation.navigate('othersProfile', {
          userId: userId,
          userName: nameMatch ? nameMatch[1] : '', 
          role: 'creator',
        });
      }
    }
  }, [currentUserId, navigation]);

  if (!content) return null;

  const parts = content.split(MENTION_REGEX);

  // During the measurement pass (measured === false), render WITHOUT
  // numberOfLines so onTextLayout reports all lines. Use opacity 0
  // to avoid a visual flash of the full unclamped text.
  const isClampActive = measured && maxLines && !expanded;

  return (
    <>
      <Text
        style={[style, !measured && { opacity: 0 }]}
        numberOfLines={isClampActive ? maxLines : undefined}
        onTextLayout={maxLines && !measured ? onTextLayout : undefined}
        {...props}
      >
        {parts.map((part, index) => {
          if (part.match(MENTION_REGEX)) {
            const displayNameMatch = part.match(/@\[([^\]]+)\]/i);
            const displayName = displayNameMatch ? `@${displayNameMatch[1]}` : part;

            return (
              <Text
                key={index}
                style={[styles.mention, mentionStyle]}
                onPress={() => handleMentionPress(part)}
              >
                {displayName}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
      {measured && isTruncated && !expanded && (
        <Text onPress={toggleExpanded} style={[style, styles.readMoreLess]}>
          Read more
        </Text>
      )}
      {measured && expanded && isTruncated && (
        <Text onPress={toggleExpanded} style={[style, styles.readMoreLess]}>
          Read less
        </Text>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  mention: {
    fontFamily: 'Rubik-Bold',
    color: '#FFA86B',
  },
  readMoreLess: {
    fontFamily: 'Rubik-Medium',
    color: '#FFA86B',
    marginTop: 2,
  },
});

export default memo(MentionText);
