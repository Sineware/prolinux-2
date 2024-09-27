import * as dotenv from 'dotenv';
dotenv.config();
import fs from "fs";
import exec from "../../src/helpers/exec";
import { OUTPUT_DIR, arch } from '../../src/helpers/consts';
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
        buildnum: prolinuxInfoArr[0].trim(),
        uuid: prolinuxInfoArr[1].trim(),
        product: prolinuxInfoArr[2].trim(),
        variant: prolinuxInfoArr[3].trim(),
        channel: prolinuxInfoArr[4].trim(),
        filename: prolinuxInfoArr[6].trim(),
        arch: prolinuxInfoArr[7].trim(),
    };
    console.log(prolinuxInfo);

    // compute SHA512 hash of the squashfs
    console.log("Computing SHA512 hash...");
    const hash = exec(`sha512sum ${OUTPUT_DIR}/*.squish`, false).toString().split(" ")[0];
    console.log("Hash: " + hash);

    /*const alg = "RS256";
    const buff = Buffer.from(process.env.PRIVATE_KEY ?? "", 'utf-8');
    const secret = await jose.importPKCS8(buff.toString(), alg)
    
    const jwt = await new jose.SignJWT({
        hash,
    })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('14d')
        .sign(secret);
    
    console.log(jwt);*/
    let jwt = "none";

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
    
    console.log("Compressing images...");
    exec(`sudo pigz --rsyncable ${OUTPUT_DIR}/*.img || true`);
    console.log("Compressing complete! Uploading...")
    
    exec(`pushd .
        cd ${OUTPUT_DIR}
        #zsyncmake -C ${prolinuxInfo.filename}
    popd`)
    exec(`sudo rsync -aHAXxv --progress ${OUTPUT_DIR}/ root@cdn.sineware.ca:/mnt/volume_tor1_01/www/repo/${prolinuxInfo.product}/${prolinuxInfo.variant}/${prolinuxInfo.channel}/${prolinuxInfo.arch}`);

    // insert the new update into the database
    console.log("Inserting the new update into the database...");
    await client.query("INSERT INTO updates (uuid, product, variant, channel, buildnum, buildstring, isreleased, url, jwt, arch) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)", 
        [
            prolinuxInfo.uuid,
            prolinuxInfo.product,
            prolinuxInfo.variant,
            prolinuxInfo.channel,
            prolinuxInfo.buildnum,
            "Plasma Mobile Nightly",
            true,
            `/${prolinuxInfo.product}/${prolinuxInfo.variant}/${prolinuxInfo.channel}/${prolinuxInfo.filename}`,
            jwt,
            prolinuxInfo.arch,
            ]
        );
    client.end();
}
main();