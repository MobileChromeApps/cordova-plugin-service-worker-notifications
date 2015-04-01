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
	function schedule() {
	    cordova.plugins.notification.local.schedule(notification._regData);
	}
	function update() {
	    cordova.plugins.notification.local.schedule(notification._regData);
	}
	try {
	    var notification = new _Notification(title, options);
	    CDVNotification_registerTag(notification, schedule, update);
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
	function callback(notifications) {
	    resolve(notifications.map(CDVNotification_mapNativeToJS));
	}
	CDVNotification_getNotifications(tag, callback);
    });
};

function CDVNotification_mapNativeToJS(notification){
    return  new _Notification(notification.title,
	{
	    dir: notification.dir,
	    lang: notification.lang,
	    body: notification.body,
	    tag: notification.tag,
	    icon: notification.icon,
	    sound: notification.sound,
	    renotify: notification.renotify,
	    silent: notification.silent,
	    noscreen: notification.noscreen,
	    sticky: notification.sticky,
	    data: notification.data
	});
}

var CDVNotification_idCounter = Date.now() * 2;
function CDVNotification_hashTag(tag) {
    var hashCode = tag[0] << 7;
    for (var i = 0; i < tag.length; i++) {
	// Javascript truncates this to 32 bits
	hashCode = ((1000003 * hashCode) ^ tag.charCodeAt(i));
    }
    return String(hashCode);
}
function CDVNotification_updatePermission() {
    cordova.plugins.notification.local.hasPermission(function (granted) {
	Notification.permission = granted;
    });
}

function Notification() {
    if (this.constructor === Notification) {
	throw new TypeError("Can't instantiate Notification in this context, instead use showNotification(title, options)");
    }
}

Notification.permission = false;
Notification.requestPermission = function () {
    cordova.plugins.notification.local.registerPermission(function(granted) {
	console.log("Have notification permission: " + granted);
	Notification.permission = granted;
    });
};

function _Notification(title, options) {
    if (arguments.length === 0) {
	throw new TypeError("Failed to construct 'Notification': 1 argument required, but only 0 present");
    }
    title = '' + title;
    options = options || {};
    this.title 	  = title;
    this.onclick  = null;
    this.onerror  = null;
    this.dir      = options.dir || "auto";
    this.lang     = options.lang || "";
    this.body     = options.body || "";
    this.tag      = options.tag || "";
    this.icon     = options.icon || "";
    this.sound    = options.sound || "";
    this.renotify = options.renotify || false;
    this.silent   = options.silent || false;
    this.noscreen = options.noscreen || false;
    this.sticky   = options.sticky || false;
    this.data     = options.data || {};
    this._id      = this.tag || CDVNotification_idCounter++;
    this._persist = true;
    if (this._id === this.tag) {
	this._id = CDVNotification_hashTag(this.tag);
    }
    this._regData = {
	    id: this._id,
	    title: this.title,
	    text: this.body,
	    //every: 0,
	    //at: Date.now(),
	    //badge: 0,
	    sound: this.sound,
	    data: this.data,
	    icon: (this.addEventListener !== undefined ? this.icon : ""),
	    ongoing: this.sticky
    };
    CDVNotification_updatePermission();
}

_Notification.prototype = Object.create(Notification.prototype);
_Notification.constructor = _Notification;
_Notification.prototype.close = function() {
    cordova.plugins.notification.local.cancel(this._id);
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
