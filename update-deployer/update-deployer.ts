import * as dotenv from 'dotenv';
dotenv.config();
import fs from "fs";
import exec from "../src/helpers/exec";
import { OUTPUT_DIR } from '../src/helpers/consts';
import * as jose from 'jose'
import { Client } from 'pg'

console.log("-- ProLinux Update Deployer --");
let PROLINUX_VARIANT = process.env.PROLINUX_VARIANT;
let PROLINUX_CHANNEL = process.env.PROLINUX_CHANNEL;


async function main() {
    console.log("Connecting to the database...");
    const client = new Client();
    await client.connect();
    console.log("Connected to the database!");
    const res = await client.query('SELECT NOW()');
    console.log(res.rows[0]);
    
    console.log("Loading build information...");
    const prolinuxInfoArr = fs.readFileSync(`${OUTPUT_DIR}/prolinux-info.txt`, "utf-8").split(",");
    console.log(prolinuxInfoArr);
    const prolinuxInfo = {
        buildnum: prolinuxInfoArr[0],
        uuid: prolinuxInfoArr[1],
        product: prolinuxInfoArr[2],
        variant: prolinuxInfoArr[3],
        channel: prolinuxInfoArr[4],
        filename: prolinuxInfoArr[6],
        arch: prolinuxInfoArr[7],
    };
    console.log(prolinuxInfo);

    // compute SHA512 hash of the squashfs
    console.log("Computing SHA512 hash...");
    const hash = exec(`sha512sum ${OUTPUT_DIR}/*.squish`, false).toString().split(" ")[0];
    console.log("Hash: " + hash);

    const secret = new TextEncoder().encode(
        '',
    );
    const alg = 'HS256';
    
    const jwt = await new jose.SignJWT({
        hash,
    })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('14d')
        .sign(secret);
    
    console.log(jwt);

    /*
      Table info:
      create table public.updates
        (
            id          serial
                constraint updates_pk
                    primary key,
            uuid        uuid,
            product     text,
            variant     text,
            channel     text,
            buildnum    integer not null,
            buildstring text,
            isreleased  boolean not null,
            url         text,
            jwt         text
        );
    */
    // insert the new update into the database
    console.log("Inserting the new update into the database...");
    /*await client.query("INSERT INTO updates (uuid, product, variant, channel, buildnum, buildstring, isreleased, url, jwt, arch) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)", 
        [
            prolinuxInfo.uuid,
            prolinuxInfo.product,
            prolinuxInfo.variant,
            prolinuxInfo.channel,
            prolinuxInfo.buildnum,
            "",
            true,
            `/${prolinuxInfo.product}/${prolinuxInfo.variant}/${prolinuxInfo.channel}/${prolinuxInfo.filename}`,
            jwt,
            "x64"
            ]
        );*/
    client.end();
    
    exec(`rsync -aHAXxv --delete --progress ${OUTPUT_DIR}/${prolinuxInfo.filename} espimac:/var/www/sineware/repo/${prolinuxInfo.product}/${prolinuxInfo.variant}/${prolinuxInfo.channel}/`);
}
main();