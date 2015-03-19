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
    
    dispatchEvent(ev);
    if (ev.promises instanceof Array) {

    } else {

    }
};
