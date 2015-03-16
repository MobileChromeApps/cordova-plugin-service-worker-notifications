var exec = require('cordova/exec');

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

var getIdByNotification = function(notification) {
    var toReturn;
    idRegistry.forEach(function(reg) {
	if (reg.notification == notification) {
	    toReturn = reg.id;
	    return;
	}
    });
    return toReturn;
};

var updatePermission = function() {
    cordova.plugins.notification.local.hasPermission(function (granted) {
	Notification.permission = granted;
    });
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
    this.sticky = false;
    this.sound = "";
    if (options !== undefined) {
	this.dir = options.dir;
	this.lang = options.lang;
	this.body = options.body;
	this.tag = options.tag;
	this.icon = options.icon;
	this.sticky = options.sticky;
	this.sound = options.sound;
    }
    var id = (new Date()).getTime();
    idRegistry.push({ id : id,
		      notification: this
		    });
    cordova.plugins.notification.local.schedule({
	id: id,
	title: this.title,
	text: this.body,
	//every: 0,
	//at: new Date(),
	//badge: 0,
	sound: this.sound,
	data: { thing:"myData" },
	icon: (this.addEventListener !== undefined ? this.icon : ""),
	ongoing: this.sticky
    });
    updatePermission();
    return this;
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
    console.log("This browser does not support EventTarget");
}

Notification.prototype.close = function() {
    var id = getIdByNotification(this);
    console.log(id);
    cordova.plugins.notification.local.cancel(id, function() {console.log("Canceled");});
};

document.addEventListener('deviceready', function() {
    updatePermission();
    cordova.plugins.notification.local.on("cancel", function(registration) {
	notification = getNotificationById(registration.id);
	try{
	    notification.onclose.call();
	} catch(e) {
	}
    });
    cordova.plugins.notification.local.on("click", function(registration) {
	notification = getNotificationById(registration.id);
	try {
	    notification.onclick.call();
	} catch(e) {
	}
    });
    cordova.plugins.notification.local.on("trigger", function(registration) {
	notification = getNotificationById(registration.id);
	//TODO: Implement onShow
    });
});

module.exports = Notification;
