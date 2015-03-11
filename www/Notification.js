var exec = require('cordova/exec');
//require('de.appplant.cordova.plugin.local-notification');

var idRegistry = [];

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
    if (options === undefined) {

    } else {
	this.dir = options.dir;
	this.lang = options.lang;
	this.body = options.body;
	this.tag = options.tag;
	this.icon = options.icon;
	this.sticky = options.sticky;
    }
    var uuid = (new Date()).getTime();
    idRegistry.push({ id : uuid,
		      notification: this
		    });
    console.log(uuid);
    cordova.plugins.notification.local.schedule({
	id: uuid,
	title: this.title,
	text: this.body,
	//every: 0,
	//at: new Date(),
	//badge: 0,
	//sound: this.sound,
	data: { thing:"myData" },
	//icon: this.icon,
	ongoing: this.sticky
    });
    return this;
}

Notification.permission = false;

//Since hasPermission is asynchronous it cannot simply be turned into a getter for permission
//As a result we use it to update the class variable when device is ready and when the user requests permission
//Todo: Find a better solution
var updatePermission = function() {
    cordova.plugins.notification.local.hasPermission(function (granted) {
	Notification.permission = granted;
    });
};

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

Notification.requestPermission = function() {
    cordova.plugins.notification.local.registerPermission(function(granted) {
	console.log("permission has been granted: " + granted);
    });
    updatePermission();
};

Notification.prototype.close = function() {
    var id = getIdByNotification(this);
    cordova.plugins.notification.local.cancel(id, function() {});
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

document.addEventListener('deviceready', function() {
    updatePermission();
    cordova.plugins.notification.local.on("cancel", function(registration) {
	notification = getNotificationById(registration.id);
	notification.onclose.call();
    });
    cordova.plugins.notification.local.on("click", function(registration) {
	notification = getNotificationById(registration.id);
	notification.onclick.call();
    });
    cordova.plugins.notification.local.on("trigger", function(registration) {
	notification = getNotificationById(registration.id);
	//notification.onshow.call();
    });
});

module.exports = Notification;
