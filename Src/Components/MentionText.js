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

  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const onTextLayout = useCallback((e) => {
    if (maxLines && !expanded) {
      setIsTruncated(e.nativeEvent.lines.length > maxLines);
    }
  }, [maxLines, expanded]);

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

  return (
    <>
      <Text
        style={style}
        numberOfLines={maxLines && !expanded ? maxLines : undefined}
        onTextLayout={maxLines ? onTextLayout : undefined}
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
      {isTruncated && !expanded && (
        <Text onPress={toggleExpanded} style={[style, styles.readMoreLess]}>
          Read more
        </Text>
      )}
      {expanded && isTruncated && (
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
