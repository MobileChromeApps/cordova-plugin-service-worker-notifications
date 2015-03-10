NotificationPermission = {
    default: 0,
    denied: 1,
    granted: 2
};

NotificationDirection = {
    auto: 0,
    ltr: 1,
    rtl: 2
};

Object.freeze(NotificationPermission);
Object.freeze(NotificationDirection);

module.exports = {
    NotificationPermission: NotificationPermission,
    NotificationDirection: NotificationDirection
};
