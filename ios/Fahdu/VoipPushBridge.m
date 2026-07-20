#import "VoipPushBridge.h"

@interface RNVoipPushNotificationManager : NSObject
+ (void)didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(NSString *)type;
+ (void)didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(NSString *)type;
+ (void)addCompletionHandler:(NSString *)uuid completionHandler:(void (^)(void))completionHandler;
+ (void)removeCompletionHandler:(NSString *)uuid;
@end

@implementation VoipPushBridge

+ (void)didUpdateCredentials:(PKPushCredentials *)credentials forType:(NSString *)type {
  if ([RNVoipPushNotificationManager respondsToSelector:@selector(didUpdatePushCredentials:forType:)]) {
    [RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:type];
  }
}

+ (void)didReceiveIncomingPush:(PKPushPayload *)payload
                       forType:(NSString *)type
                    completion:(void (^)(void))completion {
  NSDictionary *data = payload.dictionaryPayload ?: @{};
  NSString *notificationType = [data[@"type"] isKindOfClass:[NSString class]] ? data[@"type"] : @"";

  NSSet *endTypes = [NSSet setWithArray:@[
    @"call_unavailable",
    @"call_ended",
    @"call_rejected",
    @"call_cancelled",
    @"call_canceled",
    @"call_completed",
  ]];

  if ([endTypes containsObject:notificationType]) {
    if ([RNVoipPushNotificationManager respondsToSelector:@selector(didReceiveIncomingPushWithPayload:forType:)]) {
      [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:type];
    }
    if (completion) {
      completion();
    }
    return;
  }

  // Prefer server-provided uuid so JS onVoipNotificationCompleted can finish early.
  NSString *uuid = nil;
  if ([data[@"uuid"] isKindOfClass:[NSString class]] && [data[@"uuid"] length] > 0) {
    uuid = data[@"uuid"];
  } else if ([data[@"callUUID"] isKindOfClass:[NSString class]] && [data[@"callUUID"] length] > 0) {
    uuid = data[@"callUUID"];
  }

  __block BOOL completed = NO;
  void (^finish)(void) = ^{
    if (completed) {
      return;
    }
    completed = YES;
    if (completion) {
      completion();
    }
  };

  if (uuid.length > 0 &&
      [RNVoipPushNotificationManager respondsToSelector:@selector(addCompletionHandler:completionHandler:)]) {
    [RNVoipPushNotificationManager addCompletionHandler:uuid completionHandler:finish];
  }

  if ([RNVoipPushNotificationManager respondsToSelector:@selector(didReceiveIncomingPushWithPayload:forType:)]) {
    [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:type];
  }

  // Always finish PushKit within 2.5s even if JS uuid does not match.
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    if (uuid.length > 0 &&
        [RNVoipPushNotificationManager respondsToSelector:@selector(removeCompletionHandler:)]) {
      [RNVoipPushNotificationManager removeCompletionHandler:uuid];
    }
    finish();
  });
}

@end
