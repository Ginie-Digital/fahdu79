import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import LiveUserAvatar from './LiveUserAvatar';

const LiveUsersScroll = ({ liveUsers, onUserPress }) => {
    if (!liveUsers || liveUsers.length === 0) return null;

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {liveUsers.map(user => (
                    <LiveUserAvatar
                        key={user.id}
                        username={user.username}
                        avatarUrl={user.avatarUrl}
                        onPress={() => onUserPress(user)}
                    />
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        // marginBottom: 16,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
});

export default LiveUsersScroll;