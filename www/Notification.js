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

try {
    var exec = require('cordova/exec');
} catch (e) {

}

var CDVNotification_updatePermission = function() {
    cordova.plugins.notification.local.hasPermission(function (granted) {
	Notification.permission = granted;
    });
};

var CDVNotification_encodeTag = function(tag) {
    id = "";
    for (var i = 0; i < tag.length; i++) {
	id = id + tag.charCodeAt(i);
	id = id + "0";
    }
    return id;
};

var CDVNotification_decodeTag = function(encodedTag) {
    var arr = encodedTag.split("0");
    var tag = "";
    for (var i = 0; i < arr.length-1; i++) {
	tag = tag + String.fromCharCode(Number(arr[i]));
    }
    return tag;
};

function Notification(title, options) {
    if (typeof title === 'undefined') {
	throw new TypeError("Failed to construct 'Notification': 1 argument required, but only 0 present");
    }
    if (typeof options === 'undefined') {
	options = {};
    }
    this.title 	  = title;
    this.onclick  = null;
    this.onshow   = null;
    this.onerror  = null;
    this.onclose  = null;
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
    this.id       = this.tag || Date.now();
    if (this.id === this.tag) {
	this.id = CDVNotification_encodeTag(this.tag);
    }
    this.regData = {
	    id: this.id,
	    title: this.title,
	    text: this.body,
	    //every: 0,
	    //at: new Date(),
	    //badge: 0,
	    sound: this.sound,
	    data: this.data,
	    icon: (this.addEventListener !== undefined ? this.icon : ""),
	    ongoing: this.sticky
    };
    var that = this;
    var eventCallback = function(eventType) {
	if (eventType === "click") {
	    try {
		return that.onclick;
	    } catch (e) {}
	}
	if (eventType === "close") {
	    try {
		return that.onclose;
	    } catch (e) {}
	}
	if (eventType === "show") {
	    try {
		return that.onshow;
	    } catch (e) {}
	}
	if (eventType === "error") {
	    try {
		return that.onerror;
	    } catch (e) {}
	}
    };
    var schedule = function() {
	cordova.plugins.notification.local.schedule(that.regData);
    };
    var update = function() {
	cordova.plugins.notification.local.update(that.regData, function() {
	    that.onclick = click;
	    that.onclose = close;
	});
    };
    var click, close;
    CDVNotification_getEventHandler(that.id, "click", function(fn) { click = fn; });
    CDVNotification_getEventHandler(that.id, "close", function(fn) { close = fn; });
    CDVNotification_registerTag(that, schedule, update, eventCallback);
    CDVNotification_updatePermission();
}

Notification.permission = false;


Notification.requestPermission = function() {
    cordova.plugins.notification.local.registerPermission(function(granted) {
	console.log("permission has been granted: " + granted);
	Notification.permission = granted;
    });
};

var ctor = function() {};
try
{
    ctor.prototype = EventTarget.prototype;
    Notification.prototype = new ctor();
    Notification.prototype.constructor = Notification;
}
catch(e) 
{
    console.log("This webview does not support EventTarget");
}

Notification.prototype.close = function() {
    that = this;
    cordova.plugins.notification.local.cancel(this.id);
};

document.addEventListener('deviceready', function () {
    CDVNotification_updatePermission();
    cordova.plugins.notification.local.on("cancel", function(registration) {
	if (typeof exec !== 'undefined') {
	    var callback = function(fn) {
		if (fn) {
		    fn.call();
		}
	    };
	    CDVNotification_getEventHandler(registration.id, "close", callback);
	    exec(null, null, "Notification", "cordovaUnregisterNotificationTag", [registration.id]);
	}
    });
    cordova.plugins.notification.local.on("click", function(registration) {
	if (typeof exec !== 'undefined') {
	    var callback = function(fn) {
		if (fn) {
		    fn.call();
		}
		CDVNotification_fireSWClickEvent(registration.id);
	    };
	    CDVNotification_getEventHandler(registration.id, "click", callback);
	}
    });
    cordova.plugins.notification.local.on("trigger", function(registration) {
	//TODO: Implement onShow
    });
});

try {
    navigator.serviceWorker.ready.then(function(swreg) {
	exec(null, null, "Notification", "setup", []);
    });
} catch(e) {
    // This is in the service worker context
}

module.exports = Notification;
