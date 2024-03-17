export const PROLINUXD_DIR = '/opt/prolinuxd/';
export enum LocalActions {
    // Device actions
    ERROR = "error",
    LOG = "log",
    DEVICE_STREAM_TERMINAL = "device-stream-terminal",
    SET_TOKEN = "set-token",
    SET_SELECTED_ROOT = "set-selected-root",
    SET_LOCKED_ROOT = "set-locked-root",
    SET_HOSTNAME = "set-hostname",
    STATUS = "status",
    GET_LOGS = "get-logs",
    GET_UPDATE_INFO = "get-update-info",
    START_UPDATE = "start-update",
    UPDATE_PROGRESS = "update-progress",
    RESULT = "result",
    SET_DISABLE_KEXEC = "set-disable-kexec",
    DESCRIBE_API = "describe-api",
    SET_REMOTE_API = "set-remote-api",
    SET_RESET_PERSISTROOT_FLAG = "set-reset-persistroot-flag",
    RUNTIME_VERIFY_STATE_INTEGRITY = "runtime-verify-state-integrity",
    // Server actions
    SERVER_STATUS = "server-status",
    SERVER_ROLE_ENABLE = "server-role-enable",
    SERVER_ROLE_DISABLE = "server-role-disable",
}
export interface LocalWSMessage {
    action: LocalActions,
    payload: any,
    id?: string | null
}
export interface ProLinuxInfo {
    buildnum: string,
    uuid: string,
    product: string,
    variant: string,
    channel: string,
    builddate: string,
    filename: string,
    arch: string,
    deviceinfoCodename: string
}

export interface RemoteUpdate {
    isreleased: string,
    product: string,
    variant: string,
    channel: string,
    arch: string,
    buildnum: number,
    uuid: string,
    id: number,
    buildstring: string,
    url: string,
    jwt: string
}

/* ProLinux Server Roles */
export enum ServerRoleType {
    WEBSERVER = "webserver",
    SECURE_SWITCH_APPLIANCE = "secure-switch-appliance"
}
export interface ServerRole<T> {
    name: ServerRoleType,
    description: string,
    enabled: boolean
    config: T
}
export type ServerRoleWebserverConfig = {
    port: number,
    root: string,
    index: string,
    ssl: boolean,
    ssl_cert: string,
    ssl_key: string
};
export type ServerRoleSecureSwitchConfig = {
    interfaces: string[],
    bridge_mac: string,
    dhcp: boolean,
    ip: string,
    netmask: string,
    gateway: string,
    dns: string,
};

