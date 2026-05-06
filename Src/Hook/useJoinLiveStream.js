import { useSelector } from 'react-redux';
import { useLazyJoinLiveStreamQuery } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { ChatWindowError } from '../Components/ErrorSnacks';
import { navigate } from '../../Navigation/RootNavigation';

/**
 * Custom hook to join a live stream
 * Handles API call, error handling, and navigation
 */
const useJoinLiveStream = () => {
    const [joinLiveStreamQuery, { isLoading }] = useLazyJoinLiveStreamQuery();
    const token = useSelector(state => state.auth.user.token);
    const suspended = useSelector(state => state.auth.user.suspended);

    /**
     * Join a live stream by roomId
     * @param {string} roomId - The room ID to join
     * @param {object} creatorInfo - Optional creator info to pass to the stream screen
     * @returns {Promise<boolean>} - Returns true if successful, false otherwise
     */
    const joinLiveStream = async (roomId, creatorInfo = null) => {
        if (suspended) {
            ChatWindowError('Your account is suspended');
            return false;
        }

        if (!roomId) {
            ChatWindowError('Invalid room ID');
            return false;
        }

        try {
            const { error, data } = await joinLiveStreamQuery({ token, roomId });

            if (error?.data?.statusCode === 400) {
                ChatWindowError('Hey!, Livestream has ended');
                return false;
            }

            if (error) {
                ChatWindowError(error?.data?.message || 'Failed to join livestream');
                return false;
            }

            if (data) {
                navigate('confirmlivestreamjoin', {
                    data: data?.data,
                    roomId,
                    creatorInfo
                });
                return true;
            }

            return false;
        } catch (err) {
            console.log('Join livestream error:', err);
            ChatWindowError('Something went wrong. Please try again.');
            return false;
        }
    };

    /**
     * Join a live stream from a link URL
     * Extracts roomId from the link and joins
     * @param {string} link - The livestream link (e.g., "exp+fahdu://live/roomId")
     * @param {object} creatorInfo - Optional creator info
     * @returns {Promise<boolean>}
     */
    const joinLiveStreamFromLink = async (link, creatorInfo = null) => {
        if (!link) {
            ChatWindowError('Invalid livestream link');
            return false;
        }

        const roomId = link.split('/').at(-1);
        return joinLiveStream(roomId, creatorInfo);
    };

    return {
        joinLiveStream,
        joinLiveStreamFromLink,
        isLoading,
    };
};

export default useJoinLiveStream;
