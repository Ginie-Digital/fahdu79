#import "VoipPushBridge.h"
#import "RNCallKeep.h"
#import "RNVoipPushNotificationManager.h"

@implementation VoipPushBridge

+ (void)setupEarly {
  // CallKit provider must exist BEFORE any PushKit wake, or reportNewIncomingCall is a no-op.
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    [RNCallKeep setup:@{
      @"appName" : @"Fahdu",
      @"supportsVideo" : @YES,
      @"maximumCallGroups" : @1,
      @"maximumCallsPerCallGroup" : @1,
      @"includesCallsInRecents" : @NO,
    }];
    [RNVoipPushNotificationManager voipRegistration];
    NSLog(@"[VoipPushBridge] Early CallKit + VoIP registration done");
  });
}

+ (void)didUpdateCredentials:(PKPushCredentials *)credentials forType:(NSString *)type {
  [RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:type];
}

+ (NSDictionary *)normalizedPayload:(NSDictionary *)raw {
  if (![raw isKindOfClass:[NSDictionary class]]) {
    return @{};
  }
  NSMutableDictionary *out = [raw mutableCopy];

  id payloadField = raw[@"payload"];
  if ([payloadField isKindOfClass:[NSString class]]) {
    NSData *data = [(NSString *)payloadField dataUsingEncoding:NSUTF8StringEncoding];
    if (data) {
      id parsed = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
      if ([parsed isKindOfClass:[NSDictionary class]]) {
        [out addEntriesFromDictionary:parsed];
        id content = parsed[@"content"];
        if ([content isKindOfClass:[NSDictionary class]]) {
          out[@"content"] = content;
        }
      }
    }
  } else if ([payloadField isKindOfClass:[NSDictionary class]]) {
    [out addEntriesFromDictionary:payloadField];
  }

  id contentField = out[@"content"];
  if ([contentField isKindOfClass:[NSString class]]) {
    NSData *data = [(NSString *)contentField dataUsingEncoding:NSUTF8StringEncoding];
    if (data) {
      id parsed = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
      if ([parsed isKindOfClass:[NSDictionary class]]) {
        out[@"content"] = parsed;
      }
    }
  }

  return out;
}

+ (NSString *)stringFrom:(id)value {
  if ([value isKindOfClass:[NSString class]] && [(NSString *)value length] > 0) {
    return (NSString *)value;
  }
  if ([value isKindOfClass:[NSNumber class]]) {
    return [(NSNumber *)value stringValue];
  }
  return nil;
}

+ (void)didReceiveIncomingPush:(PKPushPayload *)payload
                       forType:(NSString *)type
                    completion:(void (^)(void))completion {
  NSDictionary *raw = payload.dictionaryPayload ?: @{};
  NSDictionary *data = [self normalizedPayload:raw];
  NSDictionary *content =
      [data[@"content"] isKindOfClass:[NSDictionary class]] ? data[@"content"] : data;

  NSString *notificationType = [self stringFrom:data[@"type"]] ?: @"";

  NSSet *endTypes = [NSSet setWithArray:@[
    @"call_unavailable",
    @"call_ended",
    @"call_rejected",
    @"call_cancelled",
    @"call_canceled",
    @"call_completed",
    @"call_disconnected",
    @"missed_call",
  ]];

  NSString *uuid =
      [self stringFrom:data[@"uuid"]] ?:
      [self stringFrom:data[@"callUUID"]] ?:
      [self stringFrom:content[@"uuid"]] ?:
      [self stringFrom:content[@"callUUID"]] ?:
      [[NSUUID UUID] UUIDString];

  if ([endTypes containsObject:notificationType]) {
    NSLog(@"[VoipPushBridge] End call type=%@ uuid=%@", notificationType, uuid);
    @try {
      [RNCallKeep endCallWithUUID:uuid reason:2];
    } @catch (__unused NSException *e) {
    }
    [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:type];
    if (completion) {
      completion();
    }
    return;
  }

  NSString *roomId =
      [self stringFrom:content[@"roomId"]] ?:
      [self stringFrom:content[@"room_id"]] ?:
      [self stringFrom:data[@"roomId"]];

  BOOL isIncoming =
      [notificationType isEqualToString:@"call"] ||
      [notificationType isEqualToString:@"incoming_call"] ||
      (notificationType.length == 0 && roomId.length > 0);

  NSString *callerName =
      [self stringFrom:content[@"displayName"]] ?:
      [self stringFrom:content[@"name"]] ?:
      [self stringFrom:content[@"callerName"]] ?:
      [self stringFrom:data[@"callerName"]] ?:
      @"Incoming Call";

  NSString *handle =
      [self stringFrom:content[@"senderId"]] ?:
      [self stringFrom:content[@"callerId"]] ?:
      [self stringFrom:content[@"roomId"]] ?:
      callerName;

  NSString *callType =
      [self stringFrom:content[@"callType"]] ?:
      [self stringFrom:data[@"callType"]] ?:
      @"audio";
  BOOL hasVideo = [callType isEqualToString:@"video"];

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

  // Required by Apple: report CallKit BEFORE finishing PushKit completion.
  if (isIncoming) {
    NSLog(@"[VoipPushBridge] Report CallKit uuid=%@ caller=%@ video=%d", uuid, callerName, hasVideo);
    [RNVoipPushNotificationManager addCompletionHandler:uuid completionHandler:finish];

    [RNCallKeep reportNewIncomingCall:uuid
                               handle:handle
                           handleType:@"generic"
                             hasVideo:hasVideo
                  localizedCallerName:callerName
                      supportsHolding:NO
                         supportsDTMF:YES
                     supportsGrouping:NO
                   supportsUngrouping:NO
                          fromPushKit:YES
                              payload:data
                withCompletionHandler:nil];
  }

  [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:type];

  // Always finish within Apple's window even if JS uuid mismatch.
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.0 * NSEC_PER_SEC)),
                 dispatch_get_main_queue(), ^{
                   [RNVoipPushNotificationManager removeCompletionHandler:uuid];
                   finish();
                 });
}

@end
