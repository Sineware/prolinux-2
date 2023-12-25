import { WebSocket } from "ws";
import TOML from "@ltd/j-toml";
import path from "node:path";
import fs from "node:fs";
import axios from "axios";

import { log, logger } from "../logging";
import { LocalActions, LocalWSMessage } from "../constants";
import { OCS2Connection } from "../modules/ocs2/cloudapi";
import { getProLinuxInfo } from "../helpers/getProLinuxInfo";

export const wsConnectionHandler = (socket: WebSocket, config: any, cloud: OCS2Connection, localSocketBroadcast: (msg: LocalWSMessage)=>void) => {
    log.info("Client connected to ProLinuxD!");
    const reply = (msg: LocalWSMessage) => {
         socket.send(JSON.stringify(msg));
    }
    socket.on("message", async (data) => {
        try {
            let msg = JSON.parse(data.toString());
            const replyResult = (forAction: LocalActions, status: boolean, data: any) => { 
                reply({
                    action: LocalActions.RESULT,
                    payload: {
                        forAction: forAction,
                        status: status,
                        data: data
                    },
                    id: msg.id ?? null
                });
            }
            log.info("[Local] Received message: " + JSON.stringify(msg));
            switch(msg.action) {
                case LocalActions.LOG: {
                    logger(msg.payload.msg, msg.payload.type, msg.payload.from);
                } break;
                case LocalActions.DEVICE_STREAM_TERMINAL: {
                    cloud?.callWS("device-stream-terminal", {
                        deviceUUID: cloud.uuid,
                        fromDevice: true,
                        text: msg.payload.data
                    }, false);
                } break;
                case LocalActions.SET_TOKEN:  {
                    config.ocs2.access_token = msg.payload.token;
                    replyResult(LocalActions.SET_TOKEN, true, {});
                } break;
                case LocalActions.SET_SELECTED_ROOT: {
                    config.pl2.selected_root = msg.payload.selectedRoot;
                    replyResult(LocalActions.SET_SELECTED_ROOT, true, {});
                } break;
                case LocalActions.SET_LOCKED_ROOT: {
                    config.pl2.locked_root = msg.payload.lockedRoot;
                    replyResult(LocalActions.SET_LOCKED_ROOT, true, {});
                } break;
                case LocalActions.SET_HOSTNAME: {
                    config.pl2.hostname = msg.payload.hostname;
                    replyResult(LocalActions.SET_HOSTNAME, true, {});
                } break;
                case LocalActions.SET_DISABLE_KEXEC: {
                    config.pl2.disable_kexec = msg.payload.disableKexec;
                    replyResult(LocalActions.SET_DISABLE_KEXEC, true, {});
                } break;
                case LocalActions.SET_REMOTE_API: {
                    config.pl2.remote_api = msg.payload.remoteAPI;
                    replyResult(LocalActions.SET_REMOTE_API, true, {});
                } break;
                case LocalActions.STATUS: {
                    log.info("Sending status...")
                    socket.send(JSON.stringify({
                        action: LocalActions.RESULT,
                        payload: {
                            forAction: LocalActions.STATUS,
                            status: true,
                            data: {
                                status: "ok",
                                ocsConnnected: cloud?.connected ?? false,
                                ocsReady: cloud?.ready ?? false,
                                modules: config.prolinuxd.modules,
                                selectedRoot: config.pl2.selected_root,
                                lockedRoot: config.pl2.locked_root,
                                hostname: config.pl2.hostname,
                                disableKexec: config.pl2.disable_kexec,
                                buildInfo: await getProLinuxInfo(),
                                emptyPersistRoot: fs.readdirSync("/sineware/persistroot").length == 0,
                                config: config
                            },
                        },
                        id: msg.id ?? null
                    }));
                } break;
                case LocalActions.GET_LOGS: {
                    socket.send(JSON.stringify({
                        action: LocalActions.RESULT,
                        payload: {
                            forAction: LocalActions.GET_LOGS,
                            status: true,
                            data: {
                                logs: log.getLogs()
                            }
                        },
                        id: msg.id ?? null
                    }));
                } break;
                case LocalActions.GET_UPDATE_INFO: {
                    const info = await getProLinuxInfo();
                    let res = await axios.get(`https://update.sineware.ca/updates/${info.product}/${info.variant}/${info.channel}`);
                    socket.send(JSON.stringify({
                        action: LocalActions.RESULT,
                        payload: {
                            forAction: LocalActions.GET_UPDATE_INFO,
                            status: true,
                            data: {
                                update: res.data,
                                updateAvailable: (res.data.buildnum > info.buildnum)
                            }
                        },
                        id: msg.id ?? null
                    }));
                } break;
                case LocalActions.START_UPDATE: {
                    try {
                        // Check if /sineware/persistroot is empty. If it's not, fail.
                        if(fs.readdirSync("/sineware/persistroot").length > 0) {
                            replyResult(LocalActions.START_UPDATE, false, {
                                msg: "You have persistent changes in your rootfs! Please disable the root-lock and reset-writable."
                            });
                            return;
                        }
                        const info = await getProLinuxInfo();
                        let updateInfo = await axios.get(`https://update.sineware.ca/updates/${info.product}/${info.variant}/${info.channel}`);
                        const newRoot = (config.pl2.selected_root === "a") ? "b" : "a";
                        // Download the update from http://cdn.sineware.ca/repo/${info.product}/${info.variant}/${info.channel}/${res.data.arch}/${info.filename}.squish to /sineware/prolinux_${newRoot}.squish
                        // and send update-progress events
                        const {data, headers} = await axios({
                            method: 'get',
                            url: `http://cdn.sineware.ca/repo/${info.product}/${info.variant}/${info.channel}/${info.arch}/${info.filename}`,
                            responseType: 'stream'
                        });
                        const totalLength = headers['content-length'];
                        const writer = fs.createWriteStream(`/sineware/prolinux_${newRoot}.squish`);
                        
                        let progress = 0;
                        data.on('data', (chunk: any) => {
                            localSocketBroadcast({
                                action: LocalActions.UPDATE_PROGRESS,
                                payload: {
                                    progress: progress += chunk.length,
                                    total: totalLength,
                                    newRoot: newRoot,
                                    buildnum: updateInfo.data.buildnum,
                                }
                            });

                            if(progress == totalLength) {
                                config.pl2.selected_root = newRoot;
                            }
                        });
                        data.pipe(writer);
                        replyResult(LocalActions.START_UPDATE, true, {});
                    } catch(e: any) {
                        replyResult(LocalActions.START_UPDATE, false, {
                            msg: e.message
                        });
                    }
                } break;
                case LocalActions.DESCRIBE_API: {
                    replyResult(LocalActions.DESCRIBE_API, true, {
                        actions: LocalActions
                    });
                } break;
                case LocalActions.SET_RESET_PERSISTROOT_FLAG: {
                    fs.writeFileSync("/sineware/data/.reset_persistroot", "1");
                    replyResult(LocalActions.SET_RESET_PERSISTROOT_FLAG, true, {});
                } break;
            }
        } catch(e: any) {
            console.log(e);
            reply({
                action: LocalActions.ERROR,
                payload: {
                    msg: e.message
                }
            });
        }
    });
    socket.on("close", () => {
        log.info("Client disconnected from ProLinuxD!");
    });
};