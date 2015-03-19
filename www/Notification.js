try {
    var exec = require('cordova/exec');
} catch (e) {

}

var idRegistry = [];

var getNotificationById = function(id) {
    var toReturn;
    idRegistry.forEach(function(reg) {
	if (reg.id == id) {
	    toReturn = reg.notification;
	    return;
	}
    });
    return toReturn;
};

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
    if (title === undefined) {
	throw new TypeError("Failed to construct 'Notification': 1 argument required, but only 0 present");
    }
    this.title = title;
    this.onclick = null;
    this.onshow = null;
    this.onerror = null;
    this.onclose = null;
    this.dir = "auto";
    this.lang = "";
    this.body = "";
    this.tag = "";
    this.icon = "";
    this.sound = "";
    this.renotify = false;
    this.silent = false;
    this.noscreen = false;
    this.sticky = false;
    this.data = {};
    if (typeof options !== 'undefined') {
	this.dir = options.dir || this.dir;
	this.lang = options.lang || this.lang;
	this.body = options.body || this.body;
	this.tag = options.tag || this.tag;
	this.icon = options.icon || this.icon;
	this.sound = options.sound || this.sound;
	this.renotify = options.renotify || this.renotify;
	this.silent = options.silent || this.silent;
	this.noscreen = options.noscreen || this.noscreen;
	this.sticky = options.sticky || this.sticky;
	this.data = options.data || this.data;
    }
    this.id = this.tag || Date.now();
    if (this.id === this.tag) {
	this.id = CDVNotification_encodeTag(this.tag);
    }
    idRegistry.push({ id : this.id,
		      notification: this
		    });
    var toRegister = { 
	data: {
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
	},
	tag: this.tag,
	dir: this.dir
    };
    var eventCallback = function(eventType) {
	if(eventType === "click") {
	    this.onclick.apply(this);
	}
	if (eventType === "close") {
	    this.onclose.call();
	}
    };
    
    var schedule = function() {
	cordova.plugins.notification.local.schedule(toRegister.data);
    };
    var update = function() {
	cordova.plugins.notification.local.update(toRegister.data);
    };
    try {
	exec(schedule, update, "Notification", "cordovaRegisterNotificationTag", [toRegister, eventCallback]);
    } catch(e) {
	CDVNotification_registerTag(toRegister, schedule, update, eventCallback);
    }
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
    cordova.plugins.notification.local.cancel(this.id, function() {console.log("Canceled");});
};

var CDVNotification_setupListeners = function () {
    CDVNotification_updatePermission();
    cordova.plugins.notification.local.on("cancel", function(registration) {
	notification = getNotificationById(registration.id);
	try{
	    notification.onclose.call();
	} catch(e) {
	}
	try {
	    exec(null, null, "Notification", "cordovaUnregisterNotificationTag", [registration.id]);
	} catch(e) {
	    CDVNotification_unregisterTag(registration.id);
	}
    });
    cordova.plugins.notification.local.on("click", function(registration) {
	notification = getNotificationById(registration.id);
	try {
	    //notification.onclick.call();
	} catch(e) {
	}
	try {
	    exec(null, null, "Notification", "cordovaCallEventHandler", [registration.id]);
	} catch(e) {
	    CDVNotification_callEventHandler(registration.id, "click");
	}
    });
    cordova.plugins.notification.local.on("trigger", function(registration) {
	notification = getNotificationById(registration.id);
	//TODO: Implement onShow
    });
};

document.addEventListener('deviceready', CDVNotification_setupListeners);

try {
    navigator.serviceWorker.ready.then(function(swreg) {
	exec(null, null, "Notification", "setup", []);
    });
} catch(e) {
    // This is in the service worker context
}

module.exports = Notification;
