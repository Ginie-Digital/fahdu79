// hooks/useMessageNavigation.js
import { useCallback } from "react";
import { useDispatch } from "react-redux";

import {
  setCacheByFilter,
  updateCacheRoomList,
} from "../../Redux/Slices/NormalSlices/RoomListSlice";
import { useLazyGetRoomListQuery } from "../../Redux/Slices/QuerySlices/roomListSliceApi";
import { useGetRoomIdMutation } from "../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi";
import { LoginPageErrors } from "../Components/ErrorSnacks";
import { navigate } from "../../Navigation/RootNavigation";

export const useMessageNavigation = (
  token,
  userProfileDetails,
  chatRoomObject,
) => {
  const dispatch = useDispatch();
  const [getRoomId] = useGetRoomIdMutation();
  const [getRoomList] = useLazyGetRoomListQuery();

  const handleMessageNavigation = useCallback(async () => {
    try {
      if (!userProfileDetails?._id) return;

      const data = { user_id: { user1: userProfileDetails._id } };

      // 🔹 Get roomId
      const e = await getRoomId({ token, data });

      if (e?.error?.status === "FETCH_ERROR") {
        LoginPageErrors(
          "Please check your network or go to chatroom to start conversation"
        );
        return;
      }

      if (e?.data?.statusCode) {
        const chatRoomAndWidowDetails = {
          chatRoomId: e?.data?.data?._id,
          name: userProfileDetails?.displayName,
          profileImageUrl: userProfileDetails?.profile_image?.url,
          role: userProfileDetails?.role,
          id: userProfileDetails?._id,
        };

        // 🔹 If no cached chatRoomObject, fetch fresh list
        if (!chatRoomObject || Object.keys(chatRoomObject).length === 0) {
          const { data, error } = await getRoomList({
            token,
          });

          if (data) {
            dispatch(
              setCacheByFilter({ type: "none", data: data?.data?.rooms })
            );
          }

          if (error?.status === "FETCH_ERROR") {
            LoginPageErrors("Please check your network");
          }
        } else {
          // 🔹 Update existing cache with latest details
          dispatch(
            updateCacheRoomList({
              chatRoomId: chatRoomAndWidowDetails?.chatRoomId,
              createdAt: e?.data?.data?.createdAt,
              message: e?.data?.data?.lastMessage?.hasAttachment
                ? ""
                : e?.data?.data?.lastMessage?.message,
              hasAttachment: e?.data?.data?.lastMessage?.hasAttachment,
              senderId: chatRoomAndWidowDetails?.id,
              profileImage: chatRoomAndWidowDetails?.profileImageUrl,
              userName: chatRoomAndWidowDetails?.name,
              role: chatRoomAndWidowDetails?.role,
            })
          );
        }

        // 🔹 Navigate to chat window
        navigate("Chats", chatRoomAndWidowDetails);
      }
    } catch (err) {
      console.error("Error in handleMessageNavigation:", err);
      LoginPageErrors("Something went wrong. Please try again.");
    }
  }, [token, userProfileDetails, chatRoomObject, navigate, dispatch]);

  return handleMessageNavigation;
};
