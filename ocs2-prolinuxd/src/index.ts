import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { WebSocket, Server } from "ws";
import isReachable from "is-reachable";
import * as TOML from '@ltd/j-toml';
import deepExtend from "deep-extend";

import { log } from "./logging";
import { OCS2Connection } from "./modules/ocs2/cloudapi";
import { loadPL2Module } from "./modules/pl2";
import { LocalWSMessage } from "./constants";
import { wsConnectionHandler } from "./ws/wsConnectionHandler";

import { state } from "./state/systemStateContainer";

log.info("Starting Sineware ProLinuxD... 🚀"); 

export let cloud: OCS2Connection;
export let localSocket: Server;
export const localSocketBroadcast = (msg: LocalWSMessage) => {
    localSocket.clients.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
        }
    });
}

async function main() {
    // Read configuration file
    try {
        const tomlConfig = TOML.parse(fs.readFileSync(process.env.CONFIG_FILE ?? path.join(__dirname, "prolinux.toml"), "utf-8")) as typeof state.config;
        state.config = deepExtend(state.config, tomlConfig);
        log.info("Configuration file loaded!");
        log.info(JSON.stringify(state.config, null, 4));
    } catch(e) {
        console.log(e);
        console.log("Resetting to default configuration file...");
        let tomlConfig = TOML.stringify(state.config, {
            newline: "\n"
        });
        // todo check for a prolinux-default.toml
        fs.writeFileSync(process.env.CONFIG_FILE ?? path.join(__dirname, "prolinux.toml"), Buffer.from(tomlConfig), "utf-8");
    }

    try{
        fs.unlinkSync("/tmp/prolinuxd.sock");
    } catch (err) {}

    // Local websocket server (/tmp/prolinuxd.sock)
    const server = http.createServer()
    const wss = new WebSocket.Server({ server });
    localSocket = wss;

    wss.on("connection", (socket) => {
        wsConnectionHandler(socket, state.config, cloud, localSocketBroadcast);
    });
    wss.on("error", (err) => {
        log.error("WS Server error: " + err.message);
        console.log(err)
    });
    
    server.listen("/tmp/prolinuxd.sock");
    server.on("listening", async () => {
        fs.chmodSync("/tmp/prolinuxd.sock", 666);
        log.info("ProLinuxD is listening on /tmp/prolinuxd.sock!");
    
        if(state.config.prolinuxd.modules.includes("ocs2") && state.config.ocs2?.access_token !== "") {
            log.info("Connecting to Sineware Cloud...");
            let attempts = 0;
            let attemptCloudConnection = () => {
                isReachable("update.sineware.ca").then((reachable) => {
                    if(reachable) {
                        cloud = new OCS2Connection();
                    } else {
                        if(attempts >= 100) {
                            log.error("Could not connect to Sineware Cloud Services, giving up.");
                        } else {
                            log.info("Could not connect to Sineware Cloud Services, retrying in 5 seconds...");
                            setTimeout(attemptCloudConnection, 5000);
                        }
                        attempts++;
                    }
                });
            }
            attemptCloudConnection();
        }
        if(state.config.prolinuxd.modules.includes("pl2")) {
            log.info("Starting ProLinux 2 Module...");
            await loadPL2Module();
        }
        if(state.config.pl2.remote_api) {
            // create a new wss server on port 25567 using wsConnectionHandler
            const remoteServer = http.createServer();
            const remoteWss = new WebSocket.Server({ server: remoteServer });
            remoteWss.on("connection", (socket) => {
                // todo check for auth
                wsConnectionHandler(socket, state.config, cloud, localSocketBroadcast);
            });
            remoteWss.on("error", (err) => {
                log.error("Remote WS Server error: " + err.message);
                console.log(err)
            });
            remoteServer.listen(25567);
            remoteServer.on("listening", async () => {
                log.info("Remote API is listening on port 25567!");
            });
        }
    });    
}
try {
    main();
} catch (err) {
    log.error("Fatal error: " + err);
    console.log(err);
}