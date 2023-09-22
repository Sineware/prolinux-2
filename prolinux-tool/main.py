import sys
import signal

signal.signal(signal.SIGINT, signal.SIG_DFL)

from PySide2.QtWidgets import QApplication
from PySide2.QtCore import QUrl
from PySide2.QtQml import QQmlApplicationEngine

                                                     
if __name__ == "__main__":
    app = QApplication(sys.argv)
    engine = QQmlApplicationEngine()
    engine.load(QUrl.fromLocalFile("main.qml"))
    sys.exit(app.exec_())
