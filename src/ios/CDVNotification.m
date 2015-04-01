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

NSString * NOTIFICATION_LIST_STORAGE_KEY;

@implementation CDVNotification

@synthesize serviceWorker;
@synthesize notificationList;
@synthesize localNotificationManager;
@synthesize context;

- (void)setup:(CDVInvokedUrlCommand*)command
{
    self.serviceWorker = [self.commandDelegate getCommandInstance:@"ServiceWorker"];
    self.localNotificationManager = [(CDVViewController*)self.viewController getCommandInstance:@"LocalNotification"];
    self.context = [self.webView valueForKeyPath:@"documentView.webView.mainFrame.javaScriptContext"];
    [self restoreList];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(applicationWillTerminate:) name:UIApplicationWillTerminateNotification object:[UIApplication sharedApplication]];

    // Prepare JS context functions
    [self getNotifications];
    [self hasPermission];
    [self schedule];
    [self update];
    [self clear];
    [self clearAll];
    [self registerPermission];
    [self cancel];
    [self cancelAll];
    [self registerTag];
    [self fireClickEvent];

    CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

- (void)restoreList
{
    NOTIFICATION_LIST_STORAGE_KEY = [NSString stringWithFormat:@"CDVNotification_notificationList_%@", [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleIdentifier"]];
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    notificationList = [[defaults objectForKey:NOTIFICATION_LIST_STORAGE_KEY] mutableCopy];
    if (notificationList == nil)
    {
        NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
        notificationList = [NSMutableDictionary dictionary];
        [defaults setObject:[notificationList mutableCopy] forKey:NOTIFICATION_LIST_STORAGE_KEY];
    }
}

- (void)applicationWillTerminate:(NSNotification *)notification {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    // Remove all non persistent notifications
    for (NSString *key in [notificationList allKeys]) {
        NSMutableDictionary *notification = [notificationList objectForKey: key];
        NSNumber *persist = [notification objectForKey:@"_persist"];
        if (!persist.boolValue) {
            [notificationList removeObjectForKey:key];
            // Remove nonpersistent notifications from tray
            CDVInvokedUrlCommand *command = [[CDVInvokedUrlCommand alloc] init];
            [command setValue:@[[[notification objectForKey:@"_id"] stringValue]] forKey:@"arguments"];
            [command setValue:@"null" forKey:@"callbackId"];
            [self.localNotificationManager cancel:command];
        }
        [notification removeObjectsForKeys:@[@"onclick", @"onerror"]];
    }
    [defaults setObject:[notificationList mutableCopy] forKey:NOTIFICATION_LIST_STORAGE_KEY];
    [defaults synchronize];
}

- (void)getNotifications
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"CDVNotification_getNotifications"]= ^(JSValue* tag, JSValue *callback) {
        if ([tag.toString isEqualToString:@""]) {
            [callback callWithArguments:[NSArray arrayWithObject:[weakSelf.notificationList allValues]]];
        } else {
            NSDictionary *dict;
            for (dict in [weakSelf.notificationList allValues]) {
                if ([[dict objectForKey:@"tag"] isEqualToString:tag.toString]) {
                    [callback callWithArguments:@[@[dict]]];
                    return;
                }
            }
            [callback callWithArguments:@[]];
        }
    };
}

- (void)hasPermission
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"cordova"][@"plugins"][@"notification"][@"local"][@"hasPermission"]= ^(JSValue *callback) {
        [weakSelf checkPermission:callback];
    };
}

- (void)schedule
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"CDVNotification_schedule"]= ^(JSValue *options, JSValue *callback) {
        CDVInvokedUrlCommand *command = [[CDVInvokedUrlCommand alloc] init];
        [command setValue:options.toArray forKey:@"arguments"];
        [command setValue:@"null" forKey:@"callbackId"];
        [weakSelf.localNotificationManager schedule:command];
        [weakSelf executeCallback:callback];
    };
}

- (void)update
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"CDVNotification_update"]= ^(JSValue *options, JSValue *callback) {
        CDVInvokedUrlCommand *command = [[CDVInvokedUrlCommand alloc] init];
        [command setValue:options.toArray forKey:@"arguments"];
        [command setValue:@"null" forKey:@"callbackId"];
        [weakSelf.localNotificationManager update:command];
        [weakSelf executeCallback:callback];
    };
}

- (void)clear
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"CDVNotification_clear"]= ^(JSValue *ids, JSValue *callback) {
        CDVInvokedUrlCommand *command = [[CDVInvokedUrlCommand alloc] init];
        [command setValue:ids.toArray forKey:@"arguments"];
        [command setValue:@"null" forKey:@"callbackId"];
        [weakSelf.localNotificationManager clear:command];
        [weakSelf executeCallback:callback];
    };
}

- (void)clearAll
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"cordova"][@"plugins"][@"notification"][@"local"][@"clearAll"]= ^(JSValue *callback) {
        CDVInvokedUrlCommand *command = [[CDVInvokedUrlCommand alloc] init];
        [command setValue:@"null" forKey:@"callbackId"];
        [weakSelf.localNotificationManager clearAll:command];
        [weakSelf executeCallback:callback];
    };
}

- (void)cancel
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"CDVNotification_cancel"]= ^(JSValue *ids, JSValue *callback) {
        CDVInvokedUrlCommand *command = [[CDVInvokedUrlCommand alloc] init];
        [command setValue:ids.toArray forKey:@"arguments"];
        [command setValue:@"null" forKey:@"callbackId"];
        [weakSelf.localNotificationManager cancel:command];
        [weakSelf executeCallback:callback];
    };
}

- (void)cancelAll
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"cordova"][@"plugins"][@"notification"][@"local"][@"cancelAll"]= ^(JSValue *callback) {
        CDVInvokedUrlCommand *command = [[CDVInvokedUrlCommand alloc] init];
        [command setValue:@"null" forKey:@"callbackId"];
        [weakSelf.localNotificationManager cancelAll:command];
        [weakSelf executeCallback:callback];
    };
}

- (void)registerPermission
{
    serviceWorker.context[@"cordova"][@"plugins"][@"notification"][@"local"][@"registerPermission"]= ^(JSValue *callback) {
        if ([[UIApplication sharedApplication] respondsToSelector:@selector(registerUserNotificationSettings:)])
        {
            UIUserNotificationType types;
            UIUserNotificationSettings *settings;
            types = UIUserNotificationTypeAlert|UIUserNotificationTypeBadge|UIUserNotificationTypeSound;
            settings = [UIUserNotificationSettings settingsForTypes:types categories:nil];
            [[UIApplication sharedApplication] registerUserNotificationSettings:settings];
        }
        [self checkPermission:callback];

    };
}

- (void)checkPermission:(JSValue*)callback
{
    BOOL hathPermission = NO;
    if ([[UIApplication sharedApplication] respondsToSelector:@selector(registerUserNotificationSettings:)])
    {
        UIUserNotificationType types;
        UIUserNotificationSettings *settings;
        settings = [[UIApplication sharedApplication] currentUserNotificationSettings];
        types = UIUserNotificationTypeAlert|UIUserNotificationTypeBadge|UIUserNotificationTypeSound;
        if (settings.types & types) {
            hathPermission = YES;
        }
    } else {
        hathPermission = YES;
    }
    [callback callWithArguments:[NSArray arrayWithObject:[NSNumber numberWithBool:hathPermission]]];
}

- (void)executeCallback:(JSValue *)callback
{
    if ([callback.toString isEqualToString:@"undefined"]) {
        return;
    }
    [callback callWithArguments:nil];
}

- (void)cordovaUnregisterNotificationTag:(CDVInvokedUrlCommand*)command
{
    NSString *tag = [command argumentAtIndex:0];
    [self unregisterNotification:tag];
    CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

- (void)registerTag
{
    __weak CDVNotification* weakSelf = self;
    serviceWorker.context[@"CDVNotification_registerTag"]= ^(JSValue *notification, JSValue *scheduleCallback, JSValue *updateCallback) {
        BOOL success = [weakSelf registerNotification:[notification toDictionary] withCallback:nil];
        if (success) {
            [scheduleCallback callWithArguments:nil];
        } else {
            [updateCallback callWithArguments:nil];
        }
    };
    self.context[@"CDVNotification_registerTag"]= ^(JSValue *notification, JSValue *scheduleCallback, JSValue *updateCallback, JSValue *clickCallback) {
        BOOL success = [weakSelf registerNotification:[notification toDictionary] withCallback:clickCallback];
        if (success) {
            [scheduleCallback callWithArguments:nil];
        } else {
            [updateCallback callWithArguments:nil];
        }
    };
}

- (void)unregisterNotification:(NSString*)id
{
    if ([self.notificationList objectForKey:id]) {
        [self.notificationList removeObjectForKey:id];
        NSLog(@"Removed %@", id);
    }
}

- (BOOL)registerNotification:(NSDictionary*)notification withCallback:callback
{
    NSString *tag = [NSString stringWithFormat:@"%@", [notification objectForKey:@"_id"]];
    NSMutableDictionary *mNotification = [NSMutableDictionary dictionaryWithDictionary:notification];
    if (callback != nil) {
        [mNotification setObject:callback forKey:@"clickCallback"];
    }
    if (self.notificationList == nil) {
        self.notificationList = [NSMutableDictionary dictionaryWithObject:mNotification forKey: tag];
        return YES;
    }
    if ([self.notificationList objectForKey:tag]) {
        [self.notificationList setObject:mNotification forKey:tag];
        NSLog(@"Updating existing notification; %@", tag);
        return NO;
    } else {
        NSLog(@"Adding notification %@", tag);
        [self.notificationList setObject:mNotification forKey:tag];
        return YES;
    }
}

- (void)fireClickEvent
{
    __weak CDVNotification* weakSelf = self;
    self.context[@"CDVNotification_handleClickEvent"]= ^(JSValue *id, JSValue *callback) {
        NSDictionary *notification = [NSDictionary dictionaryWithDictionary:[weakSelf.notificationList objectForKey:id.toString]];
        NSNumber *persist = [notification objectForKey:@"_persist"];
        if (persist.boolValue) {
            NSError *error;
            NSData *json = [NSJSONSerialization dataWithJSONObject:notification options:0 error:&error];
            NSString *dispatchCode = [NSString stringWithFormat:@"FireNotificationClickEvent(JSON.parse('%@'));", [[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding]];
            [weakSelf.serviceWorker.context performSelectorOnMainThread:@selector(evaluateScript:) withObject:dispatchCode waitUntilDone:NO];
        } else {
            JSValue *clickCallback = [notification objectForKey:@"clickCallback"];
            [[clickCallback callWithArguments:nil] callWithArguments:nil];
        }
    };
}
@end
