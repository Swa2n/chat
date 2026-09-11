import { Socket } from './WebSocket';

export type socketDataType = "setUsername" | "sendMessage"
export interface socketMessageData {
    type: socketDataType,
    data: MessageData //you can use '|' to continue this
}

export interface MessageData {
    author: string, //lowk i might need to change this later to connect to user profile
    message: string
}

export interface AppStartData {
    socket: Socket,
}

export interface LogData {
    message: string,
    args: any[]
}