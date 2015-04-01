Object.defineProperty(this, 'onnotificationclick', {
    configurable: false,
    enumerable: true,
    get: eventGetter('notificationclick'),
    set: eventSetter('notificationclick')
});

function NotificationClickEvent() {
    ExtendableEvent.call(this, 'notificationclick');
}

NotificationClickEvent.prototype = Object.create(ExtendableEvent.prototype);
NotificationClickEvent.constructor = NotificationClickEvent;

FireNotificationClickEvent = function(data) {
    var ev = new NotificationClickEvent();
    ev.notification = CDVNotification_mapNativeToJS(data); 
    dispatchEvent(ev);
};
