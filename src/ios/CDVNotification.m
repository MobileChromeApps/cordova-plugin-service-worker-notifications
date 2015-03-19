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
@synthesize notificationList;
@synthesize localNotificationManager;

- (void)setup:(CDVInvokedUrlCommand*)command
{
    self.serviceWorker = [(CDVViewController*)self.viewController getCommandInstance:@"ServiceWorker"];
    self.localNotificationManager = [(CDVViewController*)self.viewController getCommandInstance:@"LocalNotification"];

    // Prepare service worker context functions
    [self hasPermission];
    [self schedule];
    [self update];
    [self clear];
    [self clearAll];
    [self registerPermission];
    [self cancel];
    [self cancelAll];
    [self serviceWorkerRegisterTag];

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

- (void)cordovaRegisterNotificationTag:(CDVInvokedUrlCommand*)command
{
    NSDictionary *tag = [command argumentAtIndex:0];
    BOOL sOrU = [self registerNotification:tag withEventCallback:command.callbackId];
    CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:sOrU];
    [result setKeepCallback:[NSNumber numberWithBool:YES]];
    [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

- (void)cordovaUnregisterNotificationTag:(CDVInvokedUrlCommand*)command
{
    NSString *tag = [command argumentAtIndex:0];
    [self unregisterNotification:tag];
    CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

- (void)serviceWorkerRegisterTag
{
    __weak CDVNotification* weakSelf = self;
    serviceWorker.context[@"CDVNotification_registerTag"]= ^(JSValue *toRegister, JSValue *scheduleCallback, JSValue *updateCallback, JSValue *eventCallback) {
        BOOL success = [weakSelf registerNotification:[toRegister toDictionary] withEventCallback:eventCallback];
        if (success) {
            [scheduleCallback callWithArguments:nil];
        } else {
            [updateCallback callWithArguments:nil];
        }
    };
}

- (void)unregisterNotification:(NSString*)tag
{
    if ([self.notificationList objectForKey:tag]) {
        [self.notificationList removeObjectForKey:tag];
        NSLog(@"Removed %@", tag);
    }
}

- (BOOL)registerNotification:(NSDictionary*)notification withEventCallback:(NSObject*)eventCallback
{
    NSString *tag = [NSString stringWithFormat:@"%@", [[notification objectForKey:@"data"] objectForKey:@"id"]];
    NSMutableDictionary *mNotification = [NSMutableDictionary dictionaryWithDictionary:notification];
    [mNotification setObject:eventCallback forKey:@"eventCallback"];
    if (self.notificationList == nil) {
        self.notificationList = [NSMutableDictionary dictionaryWithObject:mNotification forKey: tag];
        return YES;
    }
    if ([self.notificationList objectForKey:tag]) {
        [self.notificationList setObject:mNotification forKey:tag];
        NSLog(@"Updating existing notification");
        return NO;
    } else {
        NSLog(@"Adding notification %@", tag);
        [self.notificationList setObject:mNotification forKey:tag];
        return YES;
    }
}

- (void)cordovaCallEventHandler:(CDVInvokedUrlCommand*)command
{
    NSString *tag = [command argumentAtIndex:0];
    NSString *eventType = [command argumentAtIndex:1];
    NSMutableDictionary *notification = [NSMutableDictionary dictionaryWithDictionary:[self.notificationList objectForKey:tag]];
    NSArray *arguments = [NSArray arrayWithObject:eventType];
    NSObject *eventCallback = [notification objectForKey:@"eventCallback"];
    if ([eventCallback isKindOfClass:[JSValue class]]) {
        [(JSValue*)eventCallback callWithArguments:arguments];
        CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
    } else {
        CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:eventType];
        [self.commandDelegate sendPluginResult:result callbackId:(NSString*)eventCallback];
    }
    if ([eventType isEqualToString:@"click"]) {
        [notification removeObjectForKey:@"eventCallback"];
        NSError *error;
        NSData *json = [NSJSONSerialization dataWithJSONObject:notification options:0 error:&error];
        NSString *dispatchCode = [NSString stringWithFormat:@"FireNotificationClickEvent(JSON.parse('%@'));", [[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding]];
        [serviceWorker.context performSelectorOnMainThread:@selector(evaluateScript:) withObject:dispatchCode waitUntilDone:NO];
    }
}

@end