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

showNotification = function(title, options) {
    return new Promise(function(resolve, reject) {
	try {
	    new Notification(title, options);
	    resolve();
	} catch(e) {
	    console.log(e);
	    reject();
	}
    });
};

getNotifications = function(filter) {
    return new Promise(function(resolve, reject) {
	tag = "";
	filter = filter || {};
	tag = filter.tag || tag;
	console.log("Tag: " + tag);
	var callback = function(notifications) {
	    notifications.forEach(function(notification) {
		notification.onclick = notification.eventCallback("click");
		notification.onclose = notification.eventCallback("close");
		notification.onshow  = notification.eventCallback("show");
		notification.onerror = notification.eventCallback("error");
		notification.close = function() {
		    cordova.plugins.notification.local.cancel(this.id);
		};
		delete notification.eventCallback;
	    });
	    resolve(notifications);
	};
	CDVNotification_getNotifications(tag, callback);
    });
};

if (typeof cordova === 'undefined') {
    cordova = {};
    cordova.plugins = {};
    cordova.plugins.notification = {};
    cordova.plugins.notification.local = {};
}

cordova.plugins.notification.local.schedule = function(options, callback, scope) {
    var notifications = Array.isArray(options) ? options : [options];
    for (var i = 0; i < notifications.length; i++) {
	var properties = notifications[i];

	CDVNotification_mergeWithDefaults(properties);
	CDVNotification_convertProperties(properties);
    }
    CDVNotification_schedule(notifications, callback);
};

cordova.plugins.notification.local.update = function(options, callback, scope) {
    var notifications = Array.isArray(options) ? options : [options];
    for (var i = 0; i < notifications.length; i++) {
	var properties = notifications[i];
	CDVNotification_convertProperties(properties);
    }
    CDVNotification_update(notifications, callback);
};

cordova.plugins.notification.local.clear = function(ids, callback, scope) {
    ids = Array.isArray(ids) ? ids : [ids];
    ids = CDVNotification_convertIds(ids);
    CDVNotification_clear(ids, callback);
};

cordova.plugins.notification.local.cancel = function(ids, callback, scope) {
    ids = Array.isArray(ids) ? ids : [ids];
    ids = CDVNotification_convertIds(ids);
    CDVNotification_cancel(ids, callback);
};

CDVNotification_defaults = {
    text:  '',
    title: '',
    sound: 'res://platform_default',
    badge: 0,
    id:    "0",
    data: undefined,
    every: undefined,
    at: undefined
};

CDVNotification_getValueFor = function(options) {
    var keys = Array.apply(null, arguments).slice(1);
    for (var i = 0; i < keys.length; i++) {
	var key = keys[i];
	if (options.hasOwnProperty(key)) {
	    return options[key];
	}
    }
};

CDVNotification_mergeWithDefaults = function(options) {
    var defaults = CDVNotification_defaults;
    options.at   = CDVNotification_getValueFor(options, 'at', 'firstAt', 'date');
    options.text = CDVNotification_getValueFor(options, 'text', 'message');
    options.data = CDVNotification_getValueFor(options, 'data', 'json');
    if (options.at === undefined || options.at === null) {
        options.at = new Date();
    }
    for (var key in defaults) {
        if (options[key] === null || options[key] === undefined) {
            if (options.hasOwnProperty(key) && ['data','sound'].indexOf(key) > -1) {
                options[key] = undefined;
            } else {
                options[key] = defaults[key];
            }
        }
    }
    for (key in options) {
        if (!defaults.hasOwnProperty(key)) {
            delete options[key];
        }
    }
    return options;
};

CDVNotification_convertProperties = function(options) {
    if (options.id) {
        if (isNaN(options.id)) {
            options.id = CDVNotification_defaults;
        } else {
            options.id = options.id.toString();
        }
    }
    if (options.title) {
        options.title = options.title.toString();
    }
    if (options.text) {
        options.text  = options.text.toString();
    }
    if (options.badge) {
        if (isNaN(options.badge)) {
            options.badge = CDVNotification_defaults.badge;
        } else {
            options.badge = Number(options.badge);
        }
    }
    if (typeof options.at == 'object') {
        options.at = Math.round(options.at.getTime()/1000);
    }
    if (typeof options.data == 'object') {
        options.data = JSON.stringify(options.data);
    }
    return options;
};

CDVNotification_convertIds = function(ids) {
    var convertedIds = [];
    for (var i = 0; i < ids.length; i++) {
	convertedIds.push(ids[i].toString());
    }
    return convertedIds;
};
