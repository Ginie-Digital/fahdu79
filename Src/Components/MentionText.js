import React, {memo} from 'react';
import {Text, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';

/**
 * MentionText parses strings for the pattern @[Display Name](userId:65ec...)
 * and renders them as highlighted, tappable text.
 */
const MentionText = ({content, style, mentionStyle, ...props}) => {
  const navigation = useNavigation();
  const currentUserId = useSelector(state => state.auth.user.currentUserId);

  if (!content) return null;

  // Regex to match the tagged format: @[Name](userId:id)
  // Matches: 
  // 1. @[
  // 2. everything up to ] -> (Display Name)
  // 3. ](userId:
  // 4. Any characters for the ID until the closing )
  // 5. )
  // Using 'gi' for global and case-insensitive matching
  const mentionRegex = /(@\[[^\]]+?\]\(userId:[^)]+?\))/gi;

  const parts = content.split(mentionRegex);

  const handleMentionPress = (tag) => {
    // Extract ID from tag like @[Name](userId:65ec...)
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
  };

  return (
    <Text style={style} {...props}>
      {parts.map((part, index) => {
        if (part.match(mentionRegex)) {
          // It's a mention tag. Extract the display name to show.
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
        // It's regular text
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  mention: {
    fontFamily: 'Rubik-Bold',
    color: '#FFA86B', // Following the orange theme
  },
});

export default memo(MentionText);
