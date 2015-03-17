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

@implementation CDVNotification

@synthesize serviceWorker;
@synthesize localNotification;

- (void) setup:(CDVInvokedUrlCommand*)command
{
    self.serviceWorker = [(CDVViewController*)self.viewController getCommandInstance:@"ServiceWorker"];
    self.localNotification = [(CDVViewController*)self.viewController getCommandInstance:@"LocalNotification"];
    
    // A messy way to create a stub object for porting the existing plugin to the service worker context
    //[serviceWorker.context evaluateScript:@"var cordova = {}; cordova.plugins = {}; cordova.plugins.notification = {}; cordova.plugins.notification.local = {};"];

    [self hasPermission];
    [self schedule];
    [self update];
    [self clear];
    [self clearAll];
    [self registerPermission];
    [self cancel];
    [self on];
    
    //update permissions
    NSString *toDispatch = @"function(bool) { Notification.permission = bool; }";
    [self checkPermission:(JSValue*)toDispatch];

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
        [command setValue:callback.toString forKey:@"callbackId"];
        [command setValue:options.toArray forKey:@"arguments"];
        [weakSelf.localNotification performSelectorOnMainThread:@selector(schedule:) withObject:command waitUntilDone:NO];
    };
}

- (void)update
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"CDVNotification_update"]= ^(JSValue *options, JSValue *callback) {
        CDVInvokedUrlCommand *command = [[CDVInvokedUrlCommand alloc] init];
        [command setValue:callback.toString forKey:@"callbackId"];
        [command setValue:options.toArray forKey:@"arguments"];
        [weakSelf.localNotification performSelectorOnMainThread:@selector(update:) withObject:command waitUntilDone:NO];
    };
}

- (void)clear
{
    
}

- (void)clearAll
{
    __weak CDVNotification *weakSelf = self;
    serviceWorker.context[@"cordova"][@"plugins"][@"notification"][@"local"][@"clearAll"]= ^(JSValue *callback) {
        CDVInvokedUrlCommand *command = [[CDVInvokedUrlCommand alloc] init];
        [command setValue:callback.toString forKey:@"callbackId"];
        [weakSelf.localNotification performSelectorOnMainThread:@selector(clearAll:) withObject:command waitUntilDone:NO];
    };
}

- (void)cancel
{
    serviceWorker.context[@"cordova"][@"plugins"][@"notification"][@"local"][@"cancel"]= ^(JSValue *callback) {
        
    };
}

- (void)on
{
    serviceWorker.context[@"cordova"][@"plugins"][@"notification"][@"local"][@"on"]= ^(JSValue *callback) {

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
@end