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
    CDVNotification_finalizeSchedule(notifications, callback);
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
            options.id = this.getDefaults().id;
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
            options.badge = this.getDefaults().badge;
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
