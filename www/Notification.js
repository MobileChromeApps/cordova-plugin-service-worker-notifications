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
    if (options === undefined) {

    } else {
	this.dir = options.dir;
	this.lang = options.lang;
	this.body = options.body;
	this.tag = options.tag;
	this.icon = options.icon;
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
	//icon: this.icon
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

Notification.requestPermission = function() {
    cordova.plugins.notification.local.registerPermission(function(granted) {
	console.log("permission has been granted: " + granted);
    });
    updatePermission();
};

Notification.prototype.close = function() {
    var _this = this;
    idRegistry.forEach(function(reg) {
	if (reg.notification == _this) {
	    cordova.plugins.notification.local.cancel(reg.id, function() {});
	    return;
	}
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

document.addEventListener('deviceready', updatePermission);

module.exports = Notification;
