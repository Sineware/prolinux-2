import * as dotenv from 'dotenv';
dotenv.config();
import fs from "fs";
import exec from "../src/helpers/exec";
import { OUTPUT_DIR } from '../src/helpers/consts';
import * as jose from 'jose'

console.log("-- ProLinux Update Deployer --");

async function main() {

    // compute SHA512 hash of the squashfs
    console.log("Computing SHA512 hash...");
    const hash = exec(`sha512sum ${OUTPUT_DIR}/*.squish`, false).toString().split(" ")[0];
    console.log("Hash: " + hash);

    const secret = new TextEncoder().encode(
        '',
      )
      const alg = 'HS256'
      
      const jwt = await new jose.SignJWT({ 'urn:example:claim': true })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setSubject(hash)
        .setExpirationTime('14d')
        .sign(secret)
      
      console.log(jwt)
}
main()