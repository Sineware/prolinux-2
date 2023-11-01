// Includes relevant modules used by the QML
import QtQuick
import QtQuick.Controls as Controls
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.kirigamiaddons.formcard 1.0 as FormCard
import org.kde.kirigamiaddons.components 1.0 as Components

// Provides basic features needed for all kirigami applications
Kirigami.ApplicationWindow {
    // Unique identifier to reference this object
    id: root

    // Window title
    // i18nc() makes a string translatable
    // and provides additional context for the translators
    title: "ProLinux Tool"

    function handleStatus(msg) {
        configOpts.description = `Status: ${msg.payload.data.status}
Cloud Connected: ${msg.payload.data.ocsConnnected}
Cloud Ready: ${msg.payload.data.ocsReady}
Selected Root: ${msg.payload.data.selectedRoot}
Locked Root: ${msg.payload.data.lockedRoot}
Disable Kexec: ${msg.payload.data.disableKexec}
Hostname: ${msg.payload.data.hostname}`
        version.description = msg.payload.data.buildInfo.product + " " + msg.payload.data.buildInfo.variant + " " + msg.payload.data.buildInfo.channel
        buildStr.description = msg.payload.data.buildInfo.buildnum + "-" + msg.payload.data.buildInfo.uuid + " (" + msg.payload.data.buildInfo.builddate + ")"  

        // config 
        configRootLock.checked = msg.payload.data.lockedRoot
        configDisableKexec.checked = msg.payload.data.disableKexec ?? false

        configHostname.description = msg.payload.data.hostname
        hostnamePromptDialogTextField.text = msg.payload.data.hostname

        showPassiveNotification("Refreshed")
    }

    function handleWSMessage(msg) {
        console.log(JSON.stringify(msg));
        /* {"action":"result","payload":{"forAction":"status","status":true,"data":{"status":"ok","ocsConnnected":false,"ocsReady":false,"modules":["pl2"],"selectedRoot":"a","lockedRoot":true,"hostname":""},"config":{"prolinuxd":{"modules":["pl2"]},"ocs2":{"gateway_url":"wss://update.sineware.ca/gateway","client_type":"prolinux,plasma-mobile-nightly","access_token":""},"pl2":{"selected_root":"a","locked_root":true,"hostname":""}}},"id":1}*/
        switch(msg.action) {
            case "result":
                if(msg.payload.status != true) {
                    console.log("Error: " + msg.payload.data)
                    showPassiveNotification("Error: " + msg.payload.data);
                    return;
                }
                switch(msg.payload.forAction) {
                    case "status":
                        handleStatus(msg);
                        break;
                    case "set-locked-root":
                        showPassiveNotification("Root Lock Set")
                        break;
                    case "set-disable-kexec":
                        showPassiveNotification("Disable Kexec Set");
                        break;
                    case "set-hostname":
                        showPassiveNotification("Hostname Set");
                        break;
                    default:
                        console.log("Unknown result action: " + msg.payload.forAction);
                        showPassiveNotification("Unknown result action: " + msg.payload.forAction);
                }
                break;
            default:
                console.log("Unknown action: " + msg.action);
                showPassiveNotification("Unknown action: " + msg.action);
        }
    }

    Component.onCompleted: {
         wsapp.ws_send({ "action": "status", "payload": {}, "id": 1})
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
    pageStack.initialPage: Kirigami.ScrollablePage {
        actions: [Kirigami.Action {
            text: "Refresh"
            icon.name: "view-refresh"
            onTriggered: {
                console.log("Refresh")
                wsapp.ws_send({ "action": "status", "payload": {}, "id": 1})
                
            }
        }]
        topPadding: Kirigami.Units.gridUnit
        leftPadding: 0
        rightPadding: 0
        bottomPadding: Kirigami.Units.gridUnit
        
        Kirigami.PromptDialog {
            id: hostnamePromptDialog
            title: "System Hostname"

            standardButtons: Kirigami.Dialog.NoButton
            customFooterActions: [
                Kirigami.Action {
                    text: "Set Hostname"
                    icon.name: "dialog-ok"
                    onTriggered: {
                        console.log("Set Hostname: " + hostnamePromptDialogTextField.text)
                        wsapp.ws_send({ 
                            action: "set-hostname",
                            payload: { 
                                hostname: hostnamePromptDialogTextField.text
                            }, 
                            id: 1
                        })
                        hostnamePromptDialog.close();
                    }
                },
                Kirigami.Action {
                    text: "Cancel"
                    icon.name: "dialog-cancel"
                    onTriggered: {
                        hostnamePromptDialog.close();
                    }
                }
            ]

            Controls.TextField {
                id: hostnamePromptDialogTextField
                placeholderText: "Hostname"
            }
        }

        ColumnLayout {
            FormCard.FormHeader {
                title: "ProLinux System Overview"
            }
            FormCard.FormCard {
                FormCard.FormTextDelegate {
                    id: configOpts
                    text: "System Configuration"
                    description: ""
                }

                FormCard.FormDelegateSeparator {}

                FormCard.FormTextDelegate {
                    id: version
                    text: "Version"
                    description: ""
                }

                FormCard.FormDelegateSeparator {}

                FormCard.FormTextDelegate {
                    id: buildStr
                    text: "Build String"
                    description: ""
                }
            }

            FormCard.FormHeader {
                title: "System Configuration"
            }
            FormCard.FormCard {
                FormCard.FormSwitchDelegate {
                    id: configRootLock
                    text: "Root Lock"
                    description: "Enables the read-only root lock overlay."
                    onCheckedChanged: {
                        console.log("Root Lock: " + configRootLock.checked)
                        wsapp.ws_send({ 
                            action: "set-locked-root",
                            payload: { 
                                lockedRoot: configRootLock.checked
                            }, 
                            id: 1
                        })
                    }
                }
                FormCard.FormDelegateSeparator {}

                FormCard.FormSwitchDelegate {
                    id: configDisableKexec
                    text: "Disable Kexec"
                    description: "When enabled, Kexec-based boot mechanism is bypassed.\nFor advanced uses only, this will break your system!"
                    onCheckedChanged: {
                        console.log("Disable Kexec: " + configDisableKexec.checked)
                        wsapp.ws_send({ 
                            action: "set-disable-kexec",
                            payload: { 
                                disableKexec: configDisableKexec.checked
                            }, 
                            id: 1
                        })
                    }
                }
                FormCard.FormDelegateSeparator {}

                FormCard.FormButtonDelegate {
                        id: configHostname
                        text: "Hostname"
                        description: ""
                        onClicked: hostnamePromptDialog.open()
                }
            }
            
        }
        
    }
}