#import <Foundation/Foundation.h>
#import <PushKit/PushKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface VoipPushBridge : NSObject

+ (void)didUpdateCredentials:(PKPushCredentials *)credentials forType:(NSString *)type;

+ (void)didReceiveIncomingPush:(PKPushPayload *)payload
                       forType:(NSString *)type
                    completion:(nullable void (^)(void))completion;

@end

NS_ASSUME_NONNULL_END
