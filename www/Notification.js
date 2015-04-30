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

var exec = require('cordova/exec');

var CDVNotification_updatePermission = function() {
    cordova.plugins.notification.local.hasPermission(function (granted) {
	Notification.permission = granted;
    });
};

var CDVNotification_hashTag = function(tag) {
    var hashCode = tag[0] << 7;
    for (var i = 0; i < tag.length; i++) {
	// Javascript truncates this to 32 bits
	hashCode = ((1000003 * hashCode) ^ tag.charCodeAt(i));
    }
    return String(hashCode);
};

var CDVNotification_idCounter = Date.now();
function CDVNotification_createConstProperty(object, name, value) {
    Object.defineProperty(object, name, {
	enumerable: true,
	get: function() { return value; }
    });
}

function Notification(title, options) {
    if (arguments.length === 0) {
	throw new TypeError('Failed to construct \'Notification\': 1 argument required, but only 0 present');
    }
    title = '' + title;
    options = options || {};
    this.onclick  = null;
    this.onerror  = null;
    CDVNotification_createConstProperty(this, 'title', title);
    CDVNotification_createConstProperty(this, 'dir', options.dir || 'auto');
    CDVNotification_createConstProperty(this, 'lang', options.lang || '');
    CDVNotification_createConstProperty(this, 'body', options.body || '');
    CDVNotification_createConstProperty(this, 'tag', options.tag || '');
    CDVNotification_createConstProperty(this, 'icon', options.icon || '');
    CDVNotification_createConstProperty(this, 'sound', options.sound || '');
    CDVNotification_createConstProperty(this, 'renotify', options.renotify || false);
    CDVNotification_createConstProperty(this, 'silent', options.silent || false);
    CDVNotification_createConstProperty(this, 'noscreen', options.noscreen || false);
    CDVNotification_createConstProperty(this, 'sticky', options.sticky || false);
    CDVNotification_createConstProperty(this, 'data', options.data || {});
    this._id = this.tag || CDVNotification_idCounter++;
    this._persist = false;
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
	    icon: (this.addEventListener !== undefined ? this.icon : ''), //Checks whether or not this is on android
	    ongoing: this.sticky
    };
    var that = this;
    var clickCallback = function() {
	try {
	    return that.onclick;
	} catch (e) {}
    };
    var schedule = function() {
	cordova.plugins.notification.local.schedule(that._regData);
    };
    var update = function() {
	cordova.plugins.notification.local.update(that._regData);
    };
    CDVNotification_registerTag(that, schedule, update, clickCallback);
    CDVNotification_updatePermission();
}

Notification.permission = false;

Notification.requestPermission = function() {
    cordova.plugins.notification.local.registerPermission(function(granted) {
	console.log('permission has been granted: ' + granted);
	Notification.permission = granted;
    });
};

try
{
    Notification.prototype = Object.create(EventTaret.prototype);
    Notification.prototype.constructor = Notification;
}
catch(e) 
{
    // iOS webview does not support EventTarget, android does
}

Notification.prototype.close = function() {
    cordova.plugins.notification.local.cancel(this._id);
};

document.addEventListener('deviceready', function () {
    CDVNotification_updatePermission();
    cordova.plugins.notification.local.on('cancel', function(registration) {
	exec(null, null, 'Notification', 'cordovaUnregisterNotificationTag', [registration.id]);
    });
    cordova.plugins.notification.local.on('click', function(registration) {
	CDVNotification_handleClickEvent(registration.id);
    });
});

navigator.serviceWorker.ready.then(function(swreg) {
    exec(null, null, 'Notification', 'setup', []);
});

module.exports = Notification;
