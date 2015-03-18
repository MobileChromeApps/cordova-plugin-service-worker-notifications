/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at
 
 http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
 */

#import <Cordova/CDV.h>
#import "CDVNotification.h"
#import "APPLocalNotification.h"
#import <JavaScriptCore/JavaScriptCore.h>
#import "UILocalNotification+APPLocalNotification.h"
#import "UIApplication+APPLocalNotification.h"

@implementation CDVNotification

@synthesize serviceWorker;

- (void) setup:(CDVInvokedUrlCommand*)command
{
    self.serviceWorker = [(CDVViewController*)self.viewController getCommandInstance:@"ServiceWorker"];

    [self hasPermission];
    [self schedule];
    [self update];
    [self clear];
    [self clearAll];
    [self registerPermission];
    [self cancel];
    [self cancelAll];
    
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(didReceiveLocalNotification:) name:CDVLocalNotification object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(didFinishLaunchingWithOptions:) name:UIApplicationDidFinishLaunchingNotification object:nil];
    [serviceWorker.context evaluateScript:@"CDVNotification_setupListeners();"];
        CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

- (void)hasPermission
{
    serviceWorker.context[@"cordova"][@"plugins"][@"notification"][@"local"][@"hasPermission"]= ^(JSValue *callback) {
        [self checkPermission:callback];
    };
}

- (void)schedule
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"CDVNotification_schedule"]= ^(JSValue *options, JSValue *callback) {
        NSArray* notifications = options.toArray;
        [weakSelf.commandDelegate runInBackground:^{
            for (NSDictionary* options in notifications) {
                UILocalNotification* notification;
                notification = [[UILocalNotification alloc]
                                initWithOptions:options];
                [weakSelf cancelForerunnerLocalNotification:notification];
                [[UIApplication sharedApplication] scheduleLocalNotification:notification];
                [weakSelf fireEvent:@"schedule" notification:notification];
                
                if (notifications.count > 1) {
                    [NSThread sleepForTimeInterval:0.01];
                }
            }
            [weakSelf executeCallback:callback];
        }];
    };
}

- (void)update
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"CDVNotification_update"]= ^(JSValue *options, JSValue *callback) {
        NSArray* notifications = options.toArray;
        [weakSelf.commandDelegate runInBackground:^{
            for (NSDictionary* options in notifications) {
                NSString* id = [options objectForKey:@"id"];
                UILocalNotification* notification;
                notification = [[UIApplication sharedApplication] localNotificationWithId:id];
                if (!notification) {
                    continue;
                }
                [weakSelf updateLocalNotification:[notification copy]
                                  withOptions:options];
                [weakSelf fireEvent:@"update" notification:notification];
                if (notifications.count > 1) {
                    [NSThread sleepForTimeInterval:0.01];
                }
            }
            [weakSelf executeCallback:callback];
        }];
    };
}

- (void)clear
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"CDVNotification_clear"]= ^(JSValue *ids, JSValue *callback) {
        [weakSelf.commandDelegate runInBackground:^{
            for (NSString* id in ids.toArray) {
                UILocalNotification* notification;
                notification = [[UIApplication sharedApplication] localNotificationWithId:id];
                if (!notification) {
                    continue;
                }
                [[UIApplication sharedApplication] clearLocalNotification:notification];
                [weakSelf fireEvent:@"clear" notification:notification];
            }
            [weakSelf executeCallback:callback];
        }];
    };
}

- (void)clearAll
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"cordova"][@"plugins"][@"notification"][@"local"][@"clearAll"]= ^(JSValue *callback) {
        [self.commandDelegate runInBackground:^{
            [[UIApplication sharedApplication] clearAllLocalNotifications];
            [[UIApplication sharedApplication] setApplicationIconBadgeNumber:0];
            [weakSelf fireEvent:@"clearall" notification:NULL];
            [weakSelf executeCallback:callback];
        }];
    };
}

- (void)cancel
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"CDVNotification_cancel"]= ^(JSValue *ids, JSValue *callback) {
        [weakSelf.commandDelegate runInBackground:^{
            for (NSString* id in ids.toArray) {
                UILocalNotification* notification;
                notification = [[UIApplication sharedApplication] localNotificationWithId:id];
                if (!notification) {
                    continue;
                }
                [[UIApplication sharedApplication] cancelLocalNotification:notification];
                [weakSelf fireEvent:@"cancel" notification:notification];
            }
            [weakSelf executeCallback:callback];
        }];
    };
}

- (void)cancelAll
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"cordova"][@"plugins"][@"notification"][@"local"][@"cancelAll"]= ^(JSValue *callback) {
        [self.commandDelegate runInBackground:^{
            [[UIApplication sharedApplication] cancelAllLocalNotifications];
            [[UIApplication sharedApplication] setApplicationIconBadgeNumber:0];
            [weakSelf fireEvent:@"cancelall" notification:NULL];
            [weakSelf executeCallback:callback];
        }];
    };
}

- (void)registerPermission
{
    serviceWorker.context[@"cordova"][@"plugins"][@"notification"][@"local"][@"registerPermission"]= ^(JSValue *callback) {
        if([[UIApplication sharedApplication] respondsToSelector:@selector(registerUserNotificationSettings:)])
        {
            if ([[UIApplication sharedApplication]
                 respondsToSelector:@selector(registerUserNotificationSettings:)])
            {
                UIUserNotificationType types;
                UIUserNotificationSettings *settings;
                types = UIUserNotificationTypeAlert|UIUserNotificationTypeBadge|UIUserNotificationTypeSound;
                settings = [UIUserNotificationSettings settingsForTypes:types
                                                             categories:nil];
                [[UIApplication sharedApplication]
                 registerUserNotificationSettings:settings];
            }
        } else {
            [self checkPermission:callback];
        }
    };
}


- (void)didFinishLaunchingWithOptions:(NSNotification*)notification {
    NSDictionary* launchOptions = [notification userInfo];
    UILocalNotification* localNotification;
    localNotification = [launchOptions objectForKey:
                         UIApplicationLaunchOptionsLocalNotificationKey];
    if (localNotification) {
        [self didReceiveLocalNotification:
         [NSNotification notificationWithName:CDVLocalNotification
                                       object:localNotification]];
    }
}

- (void) didReceiveLocalNotification:(NSNotification*)localNotification
{
    UILocalNotification *notification = [localNotification object];
    if ([notification wasUpdated])
        return;
    NSTimeInterval timeInterval = [notification timeIntervalSinceLastTrigger];
    NSString* event = (timeInterval <= 1) ? @"trigger" : @"click";
    [self fireEvent:event notification:notification];
    if (![event isEqualToString:@"click"]) {
        return;
    }
    if ([notification isRepeating]) {
        [self fireEvent:@"clear" notification:notification];
    } else {
        [[UIApplication sharedApplication] cancelLocalNotification:notification];
        [self fireEvent:@"cancel" notification:notification];
    }
}

- (void)checkPermission:(JSValue*)callback
{
        NSString *hasPermission = @"false";
        if ([[UIApplication sharedApplication]
             respondsToSelector:@selector(registerUserNotificationSettings:)])
        {
            UIUserNotificationType types;
            UIUserNotificationSettings *settings;
            settings = [[UIApplication sharedApplication]
                        currentUserNotificationSettings];
            types = UIUserNotificationTypeAlert|UIUserNotificationTypeBadge|UIUserNotificationTypeSound;
            if (settings.types & types) {
                hasPermission = @"true";
            }
        } else {
            hasPermission = @"true";
        }
        NSString *toDispatch = [NSString stringWithFormat:@"(%@)(%@);", callback, hasPermission];
        [serviceWorker.context evaluateScript:toDispatch];
}

- (void) cancelForerunnerLocalNotification:(UILocalNotification*)notification
{
    NSString* id = notification.options.id;
    UILocalNotification* forerunner;
    forerunner = [[UIApplication sharedApplication] localNotificationWithId:id];
    if (!forerunner) {
        return;
    }
    [[UIApplication sharedApplication] cancelLocalNotification:forerunner];
}

- (void) updateLocalNotification:(UILocalNotification*)notification
                     withOptions:(NSDictionary*)newOptions
{
    NSMutableDictionary* options = [notification.userInfo mutableCopy];
    [options addEntriesFromDictionary:newOptions];
    [options setObject:[NSDate date] forKey:@"updatedAt"];
    notification = [[UILocalNotification alloc]
                    initWithOptions:options];
    [self cancelForerunnerLocalNotification:notification];
    [[UIApplication sharedApplication] scheduleLocalNotification:notification];
}

- (void) executeCallback:(JSValue *)callback
{
    if ([callback.toString isEqualToString:@"undefined"]) {
        return;
    }
    [self.serviceWorker performSelectorOnMainThread:@selector(evaluateScript:) withObject:[NSString stringWithFormat:@"(%@)();", callback] waitUntilDone:NO];
}

- (void) fireEvent:(NSString*)event notification:(UILocalNotification*)notification
{
    NSString* params = [NSString stringWithFormat:
                        @"\"%@\"", [[UIApplication sharedApplication] applicationState] == UIApplicationStateActive ? @"foreground" : @"background"];
    if (notification) {
        NSString* args = [notification encodeToJSON];
        params = [NSString stringWithFormat:
                  @"%@,'%@'",
                  args, [[UIApplication sharedApplication] applicationState] == UIApplicationStateActive ? @"foreground" : @"background"];
    }
    NSString *toDispatch = [NSString stringWithFormat:@"CDVNotification_fireEvent('%@',%@);", event, params];
    [serviceWorker.context evaluateScript:toDispatch];
}
@end