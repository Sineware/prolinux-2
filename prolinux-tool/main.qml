// Includes relevant modules used by the QML
import QtQuick
import QtQuick.Controls as Controls
import QtQuick.Layouts
import org.kde.kirigami as Kirigami

// Provides basic features needed for all kirigami applications
Kirigami.ApplicationWindow {
    // Unique identifier to reference this object
    id: root

    // Window title
    // i18nc() makes a string translatable
    // and provides additional context for the translators
    title: "ProLinux Tool"

    function handleWSMessage(msg) {
        console.log(JSON.stringify(msg))
        /* {"action":"result","payload":{"forAction":"status","status":true,"data":{"status":"ok","ocsConnnected":false,"ocsReady":false,"modules":["pl2"],"selectedRoot":"a","lockedRoot":true,"hostname":""},"config":{"prolinuxd":{"modules":["pl2"]},"ocs2":{"gateway_url":"wss://update.sineware.ca/gateway","client_type":"prolinux,plasma-mobile-nightly","access_token":""},"pl2":{"selected_root":"a","locked_root":true,"hostname":""}}},"id":1}*/
        
        configOpts.text = "System Configuration: " + `
        Status: ${msg.payload.data.status}
        Cloud Connected: ${msg.payload.data.ocsConnnected}
        Cloud Ready: ${msg.payload.data.ocsReady}
        Selected Root: ${msg.payload.data.selectedRoot}
        Locked Root: ${msg.payload.data.lockedRoot}
        Hostname: ${msg.payload.data.hostname}
        `
        version.text = "Version: " + msg.payload.data.buildInfo.product + " " + msg.payload.data.buildInfo.variant + " " + msg.payload.data.buildInfo.channel
        buildStr.text = "Build String: " + msg.payload.data.buildInfo.buildnum + "-" + msg.payload.data.buildInfo.uuid + " (" + msg.payload.data.buildInfo.builddate + ")"   
    }
    Timer {
        id: timer
        function setTimeout(cb, delayTime) {
            timer.interval = delayTime;
            timer.repeat = false;
            timer.triggered.connect(cb);
            timer.triggered.connect(function release () {
                timer.triggered.disconnect(cb);
                timer.triggered.disconnect(release);
            });
            timer.start();
        }
    }

    Component.onCompleted: {
         wsapp.ws_send('{ "action": "status", "payload": {}, "id": 1}')
    }

    globalDrawer: Kirigami.GlobalDrawer {
        isMenu: true
        actions: [
            Kirigami.Action {
                text: "Quit"
                icon.name: "gtk-quit"
                shortcut: StandardKey.Quit
                onTriggered: Qt.quit()
            } 
        ]
    }

    // Set the first page that will be loaded when the app opens
    // This can also be set to an id of a KirigamiPage
    pageStack.initialPage: Kirigami.Page {
        actions: [Kirigami.Action {
            text: "Refresh"
            icon.name: "view-refresh"
            onTriggered: {
                console.log("Refresh")
                wsapp.ws_send('{ "action": "status", "payload": {}, "id": 1}')
                
            }
        }]
        ColumnLayout {
            RowLayout {
                id: grid
                Text { text: "ProLinux System Overview"; font.bold: true; }
            }
            RowLayout {
                Text { id: configOpts; text: "System Configuration: xx"; font.bold: true; }
            }
            RowLayout {
                Text { id: version; text: "Version: xx"; font.bold: true; }
                Text { id: buildStr; text: "Build String: xx"; font.bold: true; }
            }
        }
    }
}