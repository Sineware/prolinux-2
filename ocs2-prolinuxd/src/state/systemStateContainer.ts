import fs from 'node:fs';
import path from 'node:path';
import * as TOML from '@ltd/j-toml';
import { Server } from 'ws';
import { proxy, subscribe, snapshot } from 'valtio/vanilla'

import { log } from '../logging';
import { OCS2Connection } from '../modules/ocs2/cloudapi';

log.info("Initializing system state container...");
export const state = {
    config: proxy({
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
            remote_api: true
        }
    }),
    tracked: proxy({}),
    cloud: OCS2Connection,
    localSocket: Server,
}

subscribe(state.config, () => {
    log.info("[State] Config updated, saving to disk...");
    fs.writeFileSync(process.env.CONFIG_FILE ?? path.join(__dirname, "prolinux.toml"), TOML.stringify(state.config, {
        newline: "\n"
    }));
});