import { spawn } from "child_process";
import {log} from "../logging";

export async function runCmd(cmd: string, args: string[]): Promise<string> {
    log.info(`About to exec: ${cmd} ${args.join(" ")}`);
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args);
        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (data) => {
            stdout += data.toString();
        });
        proc.stderr.on("data", (data) => {
            stderr += data.toString();
        });
        proc.on("close", (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`Command ${cmd} ${args.join(" ")} exited with code ${code}, stderr: ${stderr}`));
            }
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            proc.kill();
            reject(new Error(`Command ${cmd} ${args.join(" ")} timed out`));
        }, 10000);
    });
}