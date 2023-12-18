# Sineware Cloud Router

Route local services through Sineware's open source cloud infrastructure.

## Architecture
TCP data is streamed over a TLS-encrypted WebSockets connection. This means traffic can pass through any firewall, as long as 
TLS/SSL on port 443 is allowed (which is most networks, since Cloud Router traffic appears to be web traffic).

## Port Forwarding
The Sineware Cloud Router Client (SCRClient) allows you to pass services hosted on a part through to the public internet 
through Sineware Cloud.

For example, if you have a local Minecraft server running on port 25565, SCRClient will allow access to that server from router.sineware.ca:12345 (without exposing ports directly or punching holes in your firewall).