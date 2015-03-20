Object.defineProperty(this, 'onnotificationclick', {
    configurable: false,
    enumerable: true,
    get: eventGetter('notificationclick'),
    set: eventSetter('notificationclick')
});

NotificationClickEvent = function() {};

NotificationClickEvent.prototype = new ExtendableEvent('notificationclick');

FireNotificationClickEvent = function(data) {
    var ev = new NotificationClickEvent();
    ev.notification = data;
    ev.notification.close = function() {
	cordova.plugins.notification.local.cancel(this.id);
    };
    dispatchEvent(ev);
    if (ev.promises instanceof Array) {

    } else {

    }
};
