import * as fs from "node:fs"
import { cloud } from ".";
export const logBuffer: string[] = [];
export function logger(msg: string, type: string, from: string = "prolinuxd") {
    if (logBuffer.length > 1024) {
        logBuffer.shift();
    }
    logBuffer.push(`[${type}] ${msg}`);

    if (cloud?.ready) {
        cloud.ws?.send(JSON.stringify({
            action: "device-log",
            payload: {
                uuid: cloud.uuid!,
                type,
                from,
                msg
            }
        }));
    } else {
        // todo plasma-mobile-nightly only
        fs.appendFileSync("/dev/tty1", `[prolinuxd] [${type}] ${msg}\n`);
    }
    console.log(`[prolinuxd] [${type}] ${msg}`);
}
export const log = {
    info: (msg: string) => logger(msg, "info"),
    error: (msg: string) => logger(msg, "error"),
    debug: (msg: string) => logger(msg, "debug"),
    getLogs: () => logBuffer
}