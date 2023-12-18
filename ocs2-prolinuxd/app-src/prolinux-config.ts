import { spawn } from 'child_process';
import { WebSocket } from 'ws';

function textBoxDialog(title: string, text: string): Promise<{data: string, exitCode: number | null}> {
    return new Promise((resolve, reject) => {
        const child = spawn('kdialog', ['--title', title, '--inputbox', text]);
        let data = '';
        child.stdout.on('data', (chunk) => {
            data += chunk;
        });
        child.on('close', (code) => {
            resolve({data, exitCode: code});
        });
    });
}
function alertDialog(title: string, text: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn('kdialog', ['--title', title, '--msgbox', text]);
        child.on('close', () => {
            resolve();
        });
    });
}
function startProgressDialog(title: string, text: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn('kdialog', ['--title', title, '--progressbar', text, "100"]);
        // return qdbus object path
        child.stdout.on('data', (chunk) => {
            resolve(chunk.toString().trim());
        });
    });
}
function updateProgressDialog(path: string, value: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn('qdbus', [...path.split(" "), 'Set', '', 'value', value.toString()]);
        child.on('close', () => {
            resolve();
        });
    });
}
function closeProgressDialog(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn('qdbus', [...path.split(" "), 'close']);
        child.on('close', () => {
            resolve();
        });
    });
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function main() {
    const path = await startProgressDialog('ProLinuxD', 'ProLinux Config Tool is working...');
    await sleep(1000);

    process.on('uncaughtException', async function (err) {
        await closeProgressDialog(path);
        await alertDialog('ProLinuxD', 'Failed to connect to ProLinuxD: ' + err.message);
        console.error(err);
        process.exit(1);
    });
    let ws = new WebSocket("ws+unix:///tmp/prolinuxd.sock");;

    //updateProgressDialog(path, 50);
    //await sleep(1000);
    
    ws.on('open', async () => {
        console.log('connected');
        let token = await textBoxDialog('ProLinuxD Device Access Token', 'Enter the organization device access token:');
        console.log(token)
        if(token.data.trim() === "") {
            await alertDialog('ProLinuxD', 'No token entered');
            await sleep(1000);
            await closeProgressDialog(path);
            process.exit(1);
        }
        ws.send(JSON.stringify({
            action: "set-token",
            payload: {
                token: token.data.trim()
            }
        }));
        console.log('sent token');
        await alertDialog('ProLinuxD', 'Set token! Please restart your device.');
        await sleep(1000);
        await closeProgressDialog(path);
        process.exit(1);
    });

    ws.on("error", async (err) => {
        await closeProgressDialog(path);
        await alertDialog('ProLinuxD', 'Failed to connect to ProLinuxD');
        process.exit(1);
    });
}
main();