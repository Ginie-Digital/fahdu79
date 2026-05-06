import React, {useCallback, useState} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {FONT_SIZES} from '../../DesiginData/Utility';
import {Image} from 'expo-image';
import DIcon from '../../DesiginData/DIcons';
import {useDeleteScheduledPostMutation, useLazyGetScheduledPostsQuery} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useSelector} from 'react-redux';
import {chatRoomSuccess, LoginPageErrors} from '../Components/ErrorSnacks';
import {autoLogout} from '../../AutoLogout';
import Moment from 'react-moment';
import {useFocusEffect} from '@react-navigation/native';
import MentionText from '../Components/MentionText';

const ScheduleContents = () => {
  const [data, setData] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const token = useSelector(state => state.auth.user.token);

  const [getScheduledPosts] = useLazyGetScheduledPostsQuery();
  const [deleteScheduledPost] = useDeleteScheduledPostMutation();

  useFocusEffect(
    useCallback(() => {
      const getAllScheduledContent = async () => {
        const {data, error} = await getScheduledPosts({token});

        if (error) {
          if (error?.data?.status_code === 2044) {
            autoLogout();
            return;
          } else {
            LoginPageErrors(error?.data?.message);
          }
        }

        if (data) {
          setData(data?.data);
        }
      };

      getAllScheduledContent();
    }, []),
  );

  const handleDelete = async id => {
    Alert.alert(
      'Delete Scheduled Post',
      'Are you sure you want to delete this scheduled post?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteScheduledPost({token, data: {postId: id}});

              if (response?.error) {
                return LoginPageErrors(response.error?.data?.message);
              }

              setData(prevData => prevData.filter(item => item._id !== id));
              chatRoomSuccess('Successfully deleted scheduled post!');
            } catch (err) {
              console.error('Delete Error:', err);
              LoginPageErrors('Failed to delete scheduled post.');
            }
          },
        },
      ],
      {cancelable: true},
    );
  };

  const toggleExpanded = id => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const truncateText = (text, maxLength = 120) => {
    if (!text || text.trim() === '') return null;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderItem = ({item}) => {
    const isExpanded = expandedIds.has(item._id);
    const hasLongText = item.postContent && item.postContent.length > 120;
    const displayText = truncateText(item.postContent, 120);
    const hasCaption = item.postContent && item.postContent.trim() !== '';

    return (
      <View style={styles.cardContainer}>
        <View style={styles.itemContainer}>
          {/* Thumbnail */}
          <View style={styles.thumbnailContainer}>
            {item?.post_content_files?.[0]?.url ? (
              <Image source={{uri: item.post_content_files[0].url}} style={styles.thumbnail} contentFit="cover" />
            ) : (
              <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
                <DIcon provider={'Ionicons'} name={'image-outline'} size={24} color="#999" />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {hasCaption ? (
              <TouchableOpacity onPress={() => hasLongText && toggleExpanded(item._id)} activeOpacity={hasLongText ? 0.7 : 1}>
                <MentionText 
                  content={isExpanded ? item.postContent : displayText} 
                  style={styles.postText} 
                  numberOfLines={isExpanded ? undefined : 3} 
                />
                {hasLongText && <Text style={styles.readMoreText}>{isExpanded ? 'Show less' : 'Read more'}</Text>}
              </TouchableOpacity>
            ) : (
              <Text style={styles.noCaptionText}>No caption</Text>
            )}

            {/* Schedule Info */}
            <View style={styles.scheduleInfoContainer}>
              <DIcon provider={'Ionicons'} name={'calendar-outline'} size={14} color="#FFA86B" />
              <Text style={styles.scheduleText}>
                Scheduled{' '}
                <Moment style={styles.momentText} element={Text} fromNow>
                  {item?.activate_on}
                </Moment>
              </Text>
            </View>

            {/* Status Badge */}
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Pending</Text>
            </View>
          </View>

          {/* Delete Button */}
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item._id)} activeOpacity={0.7}>
            <DIcon provider={'Ionicons'} name="trash-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <DIcon provider={'Ionicons'} name={'calendar-outline'} size={64} color="#ccc" />
          <Text style={styles.emptyText}>No scheduled posts</Text>
          <Text style={styles.emptySubText}>Your scheduled content will appear here</Text>
        </View>
      ) : (
        <FlatList data={data} keyExtractor={item => item._id} renderItem={renderItem} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  listContainer: {
    padding: 12,
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-start',
  },
  thumbnailContainer: {
    marginRight: 12,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  placeholderThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  postText: {
    fontSize: FONT_SIZES[14],
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    lineHeight: 20,
    marginBottom: 6,
  },
  noCaptionText: {
    fontSize: FONT_SIZES[14],
    fontFamily: 'Rubik-Regular',
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  readMoreText: {
    fontSize: FONT_SIZES[12],
    fontFamily: 'Rubik-Medium',
    color: '#FFA86B',
    marginTop: 4,
  },
  scheduleInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  scheduleText: {
    fontSize: FONT_SIZES[12],
    fontFamily: 'Rubik-Regular',
    color: '#666',
    marginLeft: 4,
  },
  momentText: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999',
    marginRight: 4,
  },
  statusText: {
    fontSize: FONT_SIZES[11],
    fontFamily: 'Rubik-Medium',
    color: '#666',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: FONT_SIZES[18],
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: FONT_SIZES[14],
    fontFamily: 'Rubik-Regular',
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ScheduleContents;
