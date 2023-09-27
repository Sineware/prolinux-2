import sys
import signal
import json
import socket
import websocket

from PySide2.QtCore import QUrl, QRunnable, QThreadPool, QObject, Signal, Slot
from PySide2.QtWidgets import QApplication, QSystemTrayIcon, QMenu, QAction, QStyle
from PySide2.QtQml import QQmlApplicationEngine

## Convert the websocket to a QObject thread 
class WebsocketSignals(QObject):
    def __init__(self):
        super(WebsocketSignals, self).__init__()
        self.wsapp = None
    ws_msg = Signal(dict)
    def set_wsapp(self, wsapp):
        self.wsapp = wsapp
    @Slot(str)
    def ws_send(self, message):
        print("Sending Message:")
        self.wsapp.ws_send(message)

class WebsocketWorker(QRunnable):
    def __init__(self, signals):
        super(WebsocketWorker, self).__init__()

        # UNIX Socket
        prolinuxd_connection  = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        prolinuxd_connection.connect("/tmp/prolinuxd.sock")

        # {"action":"result","payload":{"forAction":"status","status":true,"data":{"status":"ok","ocsConnnected":false,"ocsReady":false,"modules":["pl2"],"selectedRoot":"a","lockedRoot":true,"hostname":""},"config":{"prolinuxd":{"modules":["pl2"]},"ocs2":{"gateway_url":"wss://update.sineware.ca/gateway","client_type":"prolinux,plasma-mobile-nightly","access_token":""},"pl2":{"selected_root":"a","locked_root":true,"hostname":""}}},"id":1}
        def on_message(wsapp, message):
                print("WSMessage:")
                print(message)
                msg = json.loads(message)
                self.signals.ws_msg.emit(msg)
                    
                
                # if msg["action"] == "status":
                #     payload = msg["payload"]
                #     self.signals.status.emit(payload)
        def on_open(wsapp):
            print("Websocket Connection Opened")
            #wsapp.send('{ "action": "status", "payload": {}, "id": 1}')

        self.wsapp = websocket.WebSocketApp("ws://localhost/", socket=prolinuxd_connection, on_message=on_message, on_open=on_open)
        self.signals = signals
    @Slot()
    def run(self):
        print("Websocket Thread Started")
        self.wsapp.run_forever() 
        #print("run end")
        #self.signals.status.emit("Hello World")
    def ws_send(self, message):
        self.wsapp.send(message)
    


signal.signal(signal.SIGINT, signal.SIG_DFL)               
if __name__ == "__main__":
    app = QApplication(sys.argv)

    # Tray Menu
    menu = QMenu()
    quitAction = QAction("Quit")
    quitAction.triggered.connect(app.quit)
    menu.addAction(quitAction)

    # Tray
    tray = QSystemTrayIcon()
    tray.setIcon(app.style().standardIcon(QStyle.SP_TitleBarNormalButton))
    tray.setContextMenu(menu)
    tray.activated.connect(lambda reason: engine.rootObjects()[0].show() if reason == QSystemTrayIcon.Trigger else None)
    tray.setToolTip("ProLinux Tool")
    tray.setVisible(True)

    # set the app icon
    app.setWindowIcon(app.style().standardIcon(QStyle.SP_TitleBarNormalButton))


    # Websocket Thread
    wsapp_signals = WebsocketSignals()
    wsapp_thread = QThreadPool()
    print("Multithreading with maximum %d threads" % wsapp_thread.maxThreadCount())
    wsapp = WebsocketWorker(signals=wsapp_signals)
    wsapp_signals.set_wsapp(wsapp)
    wsapp_thread.start(wsapp)

    engine = QQmlApplicationEngine()
    engine.load(QUrl.fromLocalFile("main.qml"))

    root = engine.rootObjects()[0]
    wsapp_signals.ws_msg.connect(root.handleWSMessage)
    context = engine.rootContext()
    context.setContextProperty("wsapp", wsapp_signals)

    sys.exit(app.exec_())
