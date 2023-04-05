import child_process from "child_process";
export default (cmd: string, stdio: boolean = true, env: object = {}) => {
    return child_process.execSync(
        "set -e; " + cmd,
        {
            stdio: stdio ? 'inherit' : undefined,
            shell: '/bin/bash',
            env: { ...process.env, ...env }
        }
    );
}