// Includes relevant modules used by the QML
import QtQuick 2.15
import QtQuick.Controls 2.15 as Controls
import QtQuick.Layouts 1.15
import org.kde.kirigami 2.20 as Kirigami

// Provides basic features needed for all kirigami applications
Kirigami.ApplicationWindow {
    // Unique identifier to reference this object
    id: root

    // Window title
    // i18nc() makes a string translatable
    // and provides additional context for the translators
    title: "ProLinux Tool"

    // Set the first page that will be loaded when the app opens
    // This can also be set to an id of a Kirigami.Page
    pageStack.initialPage: Kirigami.Page {
        actions.main: Kirigami.Action {
            text: "Refresh"
            icon.name: "view-refresh"
        }
        //Card 
        Kirigami.Card {
            id: card
            anchors.centerIn: parent
            Controls.Label {
                // Center label horizontally and vertically within parent object
                anchors.centerIn: parent
                text: "Hello World!"
            }
        }
        
        
    }
}
