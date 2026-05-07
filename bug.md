# Fahdu Bug Fix Report

This document tracks the status of bugs reported in the application based on the recent QA session.

| BUG_ID | Page | Bug Summary | Status |
| :--- | :--- | :--- | :--- |
| **BUG_01** | Get Verified | User not able to add Date of Birth (DOB). | ✅ Fixed |
| **BUG_02** | User Edit Profile | Edit/View profile button is not working after completing profile. | ✅ Fixed |
| **BUG_03** | Home page (Image) | User not able to add comment on image posts. | ✅ Fixed |
| **BUG_04** | Home page (Video) | User not able to add comment on video posts. | ✅ Fixed |
| **BUG_05** | Chat | Sending message shows "Something went wrong" error. | ✅ Fixed |
| **BUG_06** | Creator Profile | Rating option is not clickable (Rating modal not showing). | ✅ Fixed |
| **BUG_07** | My Profile | Wallet is showing old iOS packs. | ✅ Fixed |
| **BUG_08** | Wallet | Wallet balance is not correct. | ✅ Fixed |
| **BUG_09** | Livestream | OK button on "Livestream Ended" modal is not working/clickable. | 🔴 Not Fixed |
| **BUG_10** | Chat | Coin setting icon is not working. | 🔴 Not Fixed |
| **BUG_11** | Call Disconnect | Call disconnect modal opens repeatedly while using the app. | 🔴 Not Fixed |
| **BUG_12** | Add Post | Schedule post functionality is not working. | 🔴 Not Fixed |
| **BUG_13** | Creator Edit Profile | Edit profile button button is not working. | 🔴 Not Fixed |
| **BUG_14** | Other Creator Profile | Video post scrolling is not working properly. | 🔴 Not Fixed |
| **BUG_15** | Livestream (Creator) | Livestream ends automatically from creator side without manual end. | 🔴 Not Fixed |
| **BUG_16** | Creator Chat PPV | Creator not able to add amount while sending paid PPV. | 🔴 Not Fixed |

---

### Detailed Bug Descriptions

#### BUG_01: Get Verified - User not able to add DOB
- **Steps:** Upload cover/profile images -> Enter name/username -> Try to enter DOB.
- **Expected:** User should be able to select and add DOB.
- **Actual:** User is unable to add DOB.
- **Implemented Fix:** Updated `DateTimePickerSheet.js` to programmatically expand the BottomSheet when `dateTimeVisibility` state changes. Increased snap points to ensure enough vertical space for the picker on all devices.

#### BUG_02 / BUG_13: Edit Profile Button
- **Steps:** Go to settings -> Click Edit Profile -> Click View Profile button.
- **Expected:** View Profile button should navigate correctly.
- **Actual:** Button was previously unresponsive.
- **Implemented Fix:** Standardized navigation logic in `RootNavigation.js` to correctly target the `chatRoomTab` for `profile`, `home`, `chatroom`, and `discover` routes.

#### BUG_03 / BUG_04: Adding Comments
- **Steps:** Choose any post -> Click on comment icon.
- **Expected:** User should be able to add a comment.
- **Actual:** User is not able to add comment.
- **Implemented Fix:** Eliminated conditional rendering in `Home.js` and `OtherProfileNew.js` to prevent race conditions. Added `requestAnimationFrame` to the `present()` call in `CreateCommentBottomSheet.js` to ensure the modal ref is ready before activation.

#### BUG_05: Chat Error Message
- **Steps:** Click on creator chat -> Send message.
- **Expected:** Message sends without error popup.
- **Actual:** Error "Something went wrong" appeared despite message potentially sending.
- **Implemented Fix:** Replaced incorrect `soundObj.play()` call with `soundObj.replayAsync()` (Expo AV standard) and wrapped it in a try-catch block to prevent sound failures from crashing the message sending flow.

#### BUG_06: Creator Profile Rating
- **Steps:** Visit creator profile -> Try to rate.
- **Expected:** Rating modal should appear.
- **Actual:** Rating modal does not show up.
- **Implemented Fix:** Resolved Redux state mismatch in `OtherProfileNew.js` where the component was listening to `otherProfileRatingSheet` instead of `ratingModal`. Updated the component to always render or listen to the correct state.

#### BUG_07: Wallet iOS Packs
- **Steps:** Visit "My Profile" -> Click Wallet.
- **Expected:** Updated iOS packs should show.
- **Actual:** Old iOS packs are still visible.
- **Implemented Fix:** Added `false` flag to `getWalletPack` query to bypass cache and force a fresh fetch. Added detailed debug logging to track the `os` parameter and API response data for further verification.

#### BUG_08: Wallet Balance
- **Steps:** Click Settings -> Visit Wallet page.
- **Expected:** Wallet balance should be accurate.
- **Actual:** Wallet balance is incorrect.
- **Implemented Fix:** Switched to `useFocusEffect` in `Wallet.js` to automatically refresh the balance whenever the user navigates back to the wallet. Removed the hardcoded `setBalance(350)` value.

#### BUG_09: Livestream OK Button
- **Steps:** Join livestream -> Creator ends stream -> OK button appears.
- **Expected:** OK button should be clickable to dismiss the modal.
- **Actual:** OK button was previously not working.

#### BUG_10: Chat Coin Setting
- **Steps:** Creator clicks on user chat -> Click setting coin icon.
- **Expected:** Setting coin icon should be functional.
- **Actual:** Setting coin icon is not working.

#### BUG_11: Call Disconnect Loop
- **Steps:** Use app normally.
- **Expected:** Call disconnect modal should only show when a call actually disconnects.
- **Actual:** Modal was opening repeatedly during app usage.

#### BUG_12: Schedule Post
- **Steps:** Add post -> Select image -> Click schedule post.
- **Expected:** Schedule post option should function.
- **Actual:** Schedule post option is not working.

#### BUG_14: Video Post Scrolling
- **Steps:** Visit creator profile -> Scroll through video posts.
- **Expected:** Scrolling should be smooth and functional.
- **Actual:** Video post scrolling was previously buggy.

#### BUG_15: Livestream Auto-End
- **Steps:** Creator starts live -> User joins and pays coins.
- **Expected:** Livestream stays active until creator ends it.
- **Actual:** Livestream ends automatically prematurely.

#### BUG_16: Creator Chat PPV Amount
- **Steps:** Creator sends paid PPV -> Enter amount.
- **Expected:** Creator should be able to input amount.
- **Actual:** Creator is unable to add amount.
