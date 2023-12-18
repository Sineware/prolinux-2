import { WebSocket } from 'ws';
import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { registerPL2Commands } from './pl2/updater/updatercli';
import { LocalActions } from '../src/constants';

function isRoot() {
    if(process.getuid)
        return process.getuid() == 0;
    return false;
}
const isPL2 = async () => {
    try {
        await fs.access("/opt/build-info/prolinux-info.txt");
        return true;
    } catch(e) {
        return false;
    }
}

async function spawnChild(command: string): Promise<{data: string, exitCode: number}> {
    const child = spawn('/bin/sh', ["-c", command]);

    let data = "";
    for await (const chunk of child.stdout) {
        console.log('stdout chunk: '+chunk);
        data += chunk;
    }
    for await (const chunk of child.stderr) {
        console.error('stderr chunk: '+chunk);
        data += chunk;
    }
    const exitCode: number = await new Promise( (resolve, reject) => {
        child.on('close', resolve);
    });
    return {data, exitCode};
}

function connectWS(): Promise<WebSocket> {
    let ws = new WebSocket("ws+unix:///tmp/prolinuxd.sock");
    return new Promise((resolve, reject) => {
        ws.on("open", () => {
            resolve(ws);
        });
        ws.on("error", (err) => {
            reject(err);
        });
    });
}
export function callWS(action: LocalActions, payload: any, promise: boolean = true): Promise<any> {
    return new Promise (async (resolve, reject) => {
        const ws = await connectWS();
        let id = uuidv4();
        let msg = { action, payload, id };
        console.log("[Call] Sending message: " + JSON.stringify(msg));
        if(promise) {
          const listener = (e: any) => {
              //console.log("[Call] Received message: " + e.data);
              let msg = JSON.parse(e.data);
              if (msg.id === id) {
                  if(msg.payload.status) {
                      resolve(msg.payload.data);
                  } else {
                      reject(new Error(msg.payload.data.msg));
                  }
                  ws.removeEventListener("message", listener);
                  ws.close();
              }
          }
          ws.addEventListener("message", listener);
        }
        ws.send(JSON.stringify(msg));
        setTimeout(() => {
            if(promise) {
                ws.close();
                reject(new Error("Timed out waiting for response from ProLinuxD"));
            }
        }, 5000);
        if(!promise){
            ws.close();
            resolve({});
        };
    });
}
// streams data with the specified action
export async function streamWS(action: LocalActions, callback: (data: any, ws: WebSocket) => void) {
    const ws = await connectWS();
    ws.on("message", (e) => {
        let msg = JSON.parse(e.toString());
        if(msg.action === action) {
            callback(msg.payload, ws);
        }
    });
    return () => {
        ws.close();
    }
}

const program = new Command();

async function main() {
    program
        .name('plctl')
        .description('ProLinuxD CLI Utility')
        .version('0.0.1');

    /* ----------- */
    program.command('status')
        .description('get the status of ProLinuxD')
        .action(async (str, options) => {
            let res = await callWS(LocalActions.STATUS, {})
            console.log("-------------------------------------------------");
            console.log("Status: " + res.status);
            console.log("Cloud Connected: " + res.ocsConnnected);
            console.log("Cloud Ready (Authenticated): " + res.ocsReady);
            if((await isPL2())) console.log("Selected Root: " + res.selectedRoot);
            if((await isPL2())) console.log("Locked Root: " + res.lockedRoot);
            if((await isPL2())) console.log("Hostname: " + res.hostname);
            if((await isPL2())) console.log("KExec Disabled: " + res.disableKexec);
            if((await isPL2())) console.log("Build Info: " + res.buildInfo.product + " " + res.buildInfo.variant + " " + res.buildInfo.channel + " " + res.buildInfo.arch + " - " + res.buildInfo.buildnum + "," + res.buildInfo.uuid + " (" + res.buildInfo.builddate + ")");
            process.exit(0);
        });

    /* ----------- */
    program.command('set-device-token')
        .description('set the Sineware Cloud device token')
        .argument('<token>', 'device token')
        .action((str, options) => {
            callWS(LocalActions.SET_TOKEN, { token: str }, false);
            console.log("Device token set to " + str);
        });

    /* ----------- */
    program.command('logs')
        .description('view logs collected by prolinuxd on this device')
        .action(async (str, options) => {
            let res = await callWS(LocalActions.GET_LOGS, {});
            console.log("-------------------------------------------------");
            console.log(res.logs.join("\n"));
            process.exit(0);
        });
    if(await isPL2()) {
        await registerPL2Commands(program);
    }
    
    process.on('uncaughtException', (err) => {
        console.error(err);
        process.exit(1);
    });
    program.parse();
}
main();