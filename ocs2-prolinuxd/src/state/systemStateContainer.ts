import fs from 'node:fs';
import path from 'node:path';
import * as TOML from '@ltd/j-toml';
import { Server } from 'ws';
import { proxy, subscribe, snapshot } from 'valtio/vanilla'

import { log } from '../logging';
import { OCS2Connection } from '../modules/ocs2/cloudapi';
import { ServerRoleType, ServerRole, ServerRoleSecureSwitchConfig, ServerRoleWebserverConfig } from '../constants';

log.info("Initializing system state container...");
export const state = {
    config: proxy({ // base OS config (mapped to prolinux.toml, also used/grepped in init)
        prolinuxd: {
            modules: [
                "plasma-mobile-nightly", 
                "ocs2",
                "pl2"
            ]
        },
        ocs2: {
            gateway_url: "wss://update.sineware.ca/gateway",
            client_type: "prolinux,plasma-mobile-nightly",
            access_token: ""
        },
        pl2: {
            selected_root: "a",
            locked_root: true,
            hostname: "",
            disable_kexec: false,
            remote_api: true,
            user_shadow: "",
        },
    }),
    extraConfig: proxy({ // higher level system configuration (mapped to extra-config.json)
        server_roles: {
            webserver: {
                name: ServerRoleType.WEBSERVER as const,
                description: "Webserver Role",
                enabled: false,
                config: {
                    port: 80,
                    root: "/var/www/html",
                    index: "index.html",
                    ssl: false,
                    ssl_cert: "",
                    ssl_key: ""
                } as ServerRoleWebserverConfig
            } as ServerRole<ServerRoleWebserverConfig>,
            secure_switch: {
                name: ServerRoleType.SECURE_SWITCH_APPLIANCE as const,
                description: "SecureSwitch Role",
                enabled: false,
                config: {
                    interfaces: [] as string[],
                    bridge_mac: "",
                    dhcp: true,
                    ip: "",
                    netmask: "",
                    gateway: "",
                    dns: "",
                } as ServerRoleSecureSwitchConfig,
            } as ServerRole<ServerRoleSecureSwitchConfig>,
        }
    }),
    tracked: proxy({}),
    untracked: {
        passwordServiceWatcher: null as fs.FSWatcher | null,
        NMNetworksServiceWatcher: null as fs.FSWatcher | null,
    },
    cloud: null as OCS2Connection | null,
    localSocket: null as Server | null,
}
export const untouchedState = JSON.parse(JSON.stringify(state));
export type ProLinuxConfig = typeof state.config;
export type ProLinuxState = typeof state;

// ensure that all properties are present and no extra from untouchedState in state, deeply
export function verifyStateIntegrity(): { valid: boolean, missing: string[], extra: string[], msg: string } {
    const missing: string[] = [];
    const extra: string[] = [];
    const verify = (obj: any, untouched: any, path: string = "") => {
        for (const key in untouched) {
            if (!(key in obj)) {
                missing.push(`${path}.${key}`);
            } else if (typeof untouched[key] === "object") {
                verify(obj[key], untouched[key], `${path}.${key}`);
            }
        }
        for (const key in obj) {
            if (!(key in untouched)) {
                extra.push(`${path}.${key}`);
            } else if (typeof untouched[key] === "object") {
                verify(obj[key], untouched[key], `${path}.${key}`);
            }
        }
    }
    verify(state, untouchedState);
    const valid = missing.length === 0 && extra.length === 0;
    return {
        valid,
        missing,
        extra,
        msg: valid ? "State is valid" : `State is invalid, missing: ${missing.join(", ")}, extra: ${extra.join(", ")}`
    }
}

subscribe(state.config, () => {
    log.info("[State] Config updated, saving to disk...");
    fs.writeFileSync(process.env.CONFIG_FILE ?? path.join(__dirname, "prolinux.toml"), TOML.stringify(state.config as any, {
        newline: "\n"
    }));
});
subscribe(state.extraConfig, () => {
    log.info("[State] Extra Config updated, saving to disk...");
    // Get the directory of the full file path set in CONFIG_FILE
    const configDir = path.dirname(process.env.CONFIG_FILE ?? path.join(__dirname, "extra-config.json"));
    fs.writeFileSync(path.join(configDir, "extra-config.json"), JSON.stringify(state.extraConfig as any, null, 4));
});