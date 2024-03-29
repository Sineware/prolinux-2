import isReachable from "is-reachable";
import { runCmd } from "../../../helpers/runCmd";
import { log } from "../../../logging";
import { ServerRoleType } from "../../../constants";
import { state } from "../../../state/systemStateContainer";

const SURICATA_CONTAINER_NAME = `PLINTERNAL_${ServerRoleType.SECURE_SWITCH_APPLIANCE}_surciata`;
const SURICATA_IMAGE_NAME = "docker.io/jasonish/suricata:latest@sha256:01e8d513beb284c8738ce0fbd98a8e95d202f1e27a04c15b00c1c61c3a2b8fdc";

const EVEBOX_CONTAINER_NAME = `PLINTERNAL_${ServerRoleType.SECURE_SWITCH_APPLIANCE}_evebox`;
const EVEBOX_IMAGE_NAME = "docker.io/jasonish/evebox:latest@sha256:c133c313867c431877efd8a76d78d9083d9fbcea6e8e862cb203ffded71802bb";

export const makeDirs = async () => {
    await runCmd("mkdir", ["-pv", "/sineware/data/server/secure_switch"]);
    await runCmd("mkdir", ["-pv", "/sineware/data/server/secure_switch/logs"]);
    await runCmd("mkdir", ["-pv", "/sineware/data/server/secure_switch/rules"]);
    await runCmd("mkdir", ["-pv", "/sineware/data/server/secure_switch/etc"]);
    await runCmd("mkdir", ["-pv", "/sineware/data/server/secure_switch/evebox"]);
}

function generateMACAddress(): string {
    const hexDigits = "0123456789ABCDEF";
    let macAddress = "52:54:00"; // Using the QEMU VM OUI space
    for (let i = 0; i < 6; i++) {
      if (i % 2 === 0) macAddress += ":";
      macAddress += hexDigits.charAt(Math.floor(Math.random() * 16));
    }
    return macAddress;
}
  
// this function creates the podman container SURIATA_CONTAINER_NAME
export async function setupSecureSwitchRole(): Promise<boolean> {
    log.info("[Server] [SecureSwitch] Setting up Suricata container...");
    await makeDirs();
    let suricataExists = false;
    try {
        await runCmd("podman", ["inspect", SURICATA_CONTAINER_NAME]);
        log.info("[Server] [SecureSwitch] Suricata container already exists!");
        suricataExists = true;
    } catch(e: any) {
        log.info("[Server] [SecureSwitch] Suricata container does not exist, creating...");
        // create but don't start the container
        /* docker run --rm -it --net=host \
        --cap-add=net_admin --cap-add=net_raw --cap-add=sys_nice \
        jasonish/suricata:latest -i <interface>*/
        await runCmd("podman", 
            [
                "create", "--name", SURICATA_CONTAINER_NAME, 
                "--net=host", "--cap-add=net_admin", "--cap-add=net_raw", "--cap-add=sys_nice", 
                "-v", "/sineware/data/server/secure_switch/logs:/var/log/suricata",
                "-v", "/sineware/data/server/secure_switch/rules:/var/lib/suricata",
                "-v", "/sineware/data/server/secure_switch/etc:/etc/suricata",
                SURICATA_IMAGE_NAME, "-q", "0" // runs on nfqueue 0, set in setup-bridge.sh
            ], true, 3600000
        );
        
        // generate a linux MAC Address for the bridge using the following format: 00:00:00:00:00:00
        if(state.extraConfig.server_roles.secure_switch.config.bridge_mac === "") {
            const bridgeMac = generateMACAddress();
            log.info("[Server] [SecureSwitch] Generated MAC Address for bridge: " + bridgeMac);
            state.extraConfig.server_roles.secure_switch.config.bridge_mac = bridgeMac;
        } else {
            log.info("[Server] [SecureSwitch] Using existing MAC Address for bridge: " + state.extraConfig.server_roles.secure_switch.config.bridge_mac);
        }
    }

    // create evebox container
    try {
        await runCmd("podman", ["inspect", EVEBOX_CONTAINER_NAME]);
        log.info("[Server] [SecureSwitch] Evebox container already exists!");
    } catch(e: any) {
        log.info("[Server] [SecureSwitch] Evebox container does not exist, creating...");
        await runCmd("podman",
            [
                "create", "--name", EVEBOX_CONTAINER_NAME,
                "-v", "/sineware/data/server/secure_switch/evebox:/var/lib/evebox",
                "-v", "/sineware/data/server/secure_switch/logs:/var/log/suricata",
                // listen on localhost only
                "-p", "127.0.0.1:5636:5636",
                EVEBOX_IMAGE_NAME, "evebox", "server", "--datastore", "sqlite", "-D", "/var/lib/evebox",
                "--input", "/var/log/suricata/eve.json", "--port", "5636", "--host", "0.0.0.0", "--no-auth"
            ], true, 3600000
        );
    }

    return true;
}
export async function deleteSecureSwitchRole() {
    log.info("[Server] [SecureSwitch] Deleting Suricata container...");
    try {
        await runCmd("podman", ["stop", SURICATA_CONTAINER_NAME]);
        await runCmd("podman", ["rm", SURICATA_CONTAINER_NAME]);
    } catch(e: any) {
        log.error("[Server] [SecureSwitch] Failed to delete Suricata container: " + e.message);
    }
}

export async function startSecureSwitchRole() {
    // setup directories
    await makeDirs();

    // the bridge setup script is in /opt/prolinux-server/setup-bridge.sh
    log.info("[Server] [SecureSwitch] Starting SecureSwitch Appliance Server Role...");
    await runCmd("/opt/prolinux-server/setup-bridge.sh", [state.extraConfig.server_roles.secure_switch.config.bridge_mac], true, 3600000);

    // the suricata container exists under the podman name PLINTERNAL_${ServerRoleType.SECURE_SWITCH_APPLIANCE}_surciata
    // check if it exists and start it
    let suricataExists = false;
    try {
        await runCmd("podman", ["inspect", SURICATA_CONTAINER_NAME]);
        suricataExists = true;
    } catch(e: any) {
        log.error("[Server] [SecureSwitch] Suricata container does not exist! Failed to start SecureSwitch Appliance Server Role: " + e.message);
        return;
    }
    if(suricataExists) {
        log.info("[Server] [SecureSwitch] Starting Suricata container...");
        // we need to check if the container image is the version specified in SURICATA_IMAGE_NAME. If it's not, wait for the network to come up using isReachable, then pull the new image and start the container
        const suricataVersion = await runCmd("podman", ["inspect", "--format", "{{.ImageName}}", SURICATA_CONTAINER_NAME], true);
        if(suricataVersion.trim() !== SURICATA_IMAGE_NAME) {
            // check if the network is up or timeout after 1 minute
            log.info("[Server] [SecureSwitch] Post-update, pulling new Suricata image...");
            log.info("Waiting for network to come up...")
            let networkUp = false;
            for(let i = 0; i < 6; i++) {
                networkUp = await isReachable("update.sineware.ca");
                if(networkUp) {
                    log.info("Network is up!");
                    break;
                }
                log.info("Network is down, retrying in 10 seconds...");
                await new Promise((resolve) => setTimeout(resolve, 10000));
            }
            await runCmd("podman", ["pull", SURICATA_IMAGE_NAME], true, 3600000);
            // delete the old container and run setupSuricataContainer again
            await runCmd("podman", ["rm", SURICATA_CONTAINER_NAME], true);
            if(await setupSecureSwitchRole()) {
                await runCmd("podman", ["start", SURICATA_CONTAINER_NAME], true);
                await runCmd("podman", ["start", EVEBOX_CONTAINER_NAME], true);
            }
            await runCmd("podman", ["exec", SURICATA_CONTAINER_NAME, "suricata-update", "-f"], true, 3600000);
        } else {
            await runCmd("podman", ["rm", SURICATA_CONTAINER_NAME], true);
            if(await setupSecureSwitchRole()) {
                await runCmd("podman", ["start", SURICATA_CONTAINER_NAME], true);
                await runCmd("podman", ["start", EVEBOX_CONTAINER_NAME], true);
            }
        }

        // logrotate
        await runCmd("podman", ["exec", SURICATA_CONTAINER_NAME, "logrotate", "/etc/logrotate.d/suricata"], true, 3600000);
        setInterval(async () => {
            await runCmd("podman", ["exec", SURICATA_CONTAINER_NAME, "logrotate", "/etc/logrotate.d/suricata"], true, 3600000);
        }, 86400000);

        // suricata-update
        setInterval(async () => {
            await runCmd("podman", ["exec", SURICATA_CONTAINER_NAME, "suricata-update", "-f"], true, 3600000);
        }, 7200000);
    }
}
export async function stopSecureSwichRole() {

}