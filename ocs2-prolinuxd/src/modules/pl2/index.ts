import fs from "node:fs";
import { state } from "../../state/systemStateContainer";
import { runCmd } from "../../helpers/runCmd";
import { log } from "../../logging";
import { getProLinuxInfo } from "../../helpers/getProLinuxInfo";

const config = state.config;

async function setHostname() {
    // Set system hostname
    if(config.pl2.hostname) {
        log.info("Setting system hostname to " + config.pl2.hostname);
        await runCmd("hostnamectl", ["--transient", "set-hostname", config.pl2.hostname]);
        await runCmd("sh", ["-c", `echo ${config.pl2.hostname} > /etc/hostname`]);
    } else {
        log.error("No hostname configured, skipping hostname setup");
    }
}
async function startDeviceSpecificServices() {
    const prolinuxInfo = await getProLinuxInfo();
    log.info("Running on platform '" + prolinuxInfo.deviceinfoCodename + "'");

    const SDM845Devices = [
        "oneplus-enchilada",
        "xiaomi-beryllium",
    ]
    // SDM845 Modem Support
    if(SDM845Devices.includes(prolinuxInfo.deviceinfoCodename)) {
        log.info("Starting SDM845 Support Services...");
        // append "test-quick-suspend-resume" argument to ExecStart for ModemManager /usr/lib/systemd/system/ModemManager.service
        // making sure it doesn't already exist
        await runCmd("/usr/bin/bash", ["-c", String.raw`if ! grep -q "test-quick-suspend-resume" /usr/lib/systemd/system/ModemManager.service; then sed -i 's/ExecStart=\/usr\/bin\/ModemManager/ExecStart=\/usr\/bin\/ModemManager --test-quick-suspend-resume/g' /usr/lib/systemd/system/ModemManager.service; fi`]);

        await runCmd("systemctl", ["start", "qrtr-ns"]);
        await runCmd("systemctl", ["start", "rmtfs"]);
        await runCmd("systemctl", ["start", "msm-modem-uim-selection"]);
        await runCmd("systemctl", ["start", "pd-mapper"]);
        await runCmd("systemctl", ["start", "tqftpserv"]);
        await runCmd("systemctl", ["start", "ModemManager"]);
    }

    if(prolinuxInfo.deviceinfoCodename === "pine64-pinephone" || prolinuxInfo.deviceinfoCodename === "pine64-pinephonepro") {
        log.info("Starting Pinephone(Pro) Support Services...");
        await runCmd("systemctl", ["start", "eg25-manager"]);
        await runCmd("systemctl", ["start", "ModemManager"]);
    }

}
async function startPasswordService() {
    // Start password service
    log.info("Starting password service...");

    // If config.pl2.user_shadow is not "", then replace the user: line in /etc/shadow with it
    if(config.pl2.user_shadow !== "") {
        log.info("Setting user password from config...");
        const shadow = fs.readFileSync("/etc/shadow", "utf-8");
        const newShadow = shadow.split("\n").map((line) => {
            if(line.startsWith("user:")) {
                return config.pl2.user_shadow;
            } else {
                return line;
            }
        }).join("\n");
        await fs.promises.writeFile("/etc/shadow", newShadow);
    }

    // Watches /etc/shadow for password changes, and persists them to the config
    fs.watch("/etc/shadow", async (eventType, filename) => {
        log.info("Shadow file (password) updated: " +  eventType + ", " + filename);
        const shadow = await fs.promises.readFile("/etc/shadow", "utf-8");
        const user_shadow = shadow.split("\n").filter((line) => {
            return line.startsWith("user:");
        })[0];
        config.pl2.user_shadow = user_shadow;
    });
}
async function startNMNetworksService() {
    // we know that saved networks are in /etc/NetworkManager/system-connections
    // this function is similar to the password service, in that it watches for changes to the network configuration
    // but here we instead copy the file to /sineware/data/customization/etc/NetworkManager/system-connections
    log.info("Starting NetworkManager networks sync service...");
    fs.watch("/etc/NetworkManager/system-connections", async (eventType, filename) => {
        log.info("NetworkManager configuration updated: " +  eventType + ", " + filename);
        const network = await fs.promises.readFile("/etc/NetworkManager/system-connections/" + filename, "utf-8");
        await fs.promises.writeFile(`/sineware/data/customization/etc/NetworkManager/system-connections/${filename}`, network);
    });
}

/* Boot-time setup */
export async function loadPL2Module() {
    await setHostname();
    await startDeviceSpecificServices();
    await startPasswordService();
    await startNMNetworksService();
}