#Cordova Local Notification Plugin Wrapper (with Service Worker Support)
This is a wrapper around [cordova-plugin-local-notifications](https://github.com/katzer/cordova-plugin-local-notifications) that conforms to the standard web notification API. This plugin also enables the use of local notifications from within a service worker script.

##Plugin Status
#####Basic Notification API
- iOS
- Android

#####Service Worker Functionality
- iOS

##Sample Usage
####Page Context
Creating a new notification is as simple as 
```javascript
var myNotification = new Notification("Hello World");
```
It is also possible to specify options with your notification.
```javascript
var options = {
                body   = "My Notification Body",  // Secondary notification text
                tag    = "uniqueTag",             // An identifier for retrieving and modifying a notification
                icon   = iconURI,                 // Only available on android
                sound  = soundURI,                // URI of a sound file to be played
                sticky = true                     // Prevents a user from removing a notification
              };
var optionalNotification = new Notification("Hello World", options);
```
To update an existing notification, create a new notification with the same tag. It will automatically be updated with the new notification's properties.
Closing a notification is also very simple. 
```javascript
myNotification.close();
```
####Service Worker Context
To create a notification from within your service worker script, use 
```javascript
showNotification(myTitle, options);
```
Every notification you create in the service worker context persists until it is clicked or closed. These notifications will remain active even if your app is closed. You can get a list of existing notifications by using
```javascript
getNotifications(filter).then(function(notifications) {
    //Do something with your notifications
    ...
});
```

##Caveats
 - Service worker capabilities are not currently available on Android
 - The following notification options are not yet implemented: `dir`, `lang`, `renotify`, `silent`, and `noscreen`
