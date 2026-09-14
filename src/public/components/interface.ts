import { Socket } from './WebSocket';
import { user } from './user';

export type socketDataType = "initialPayload" | "sendMessage" | "error"
export interface socketMessageData {
    type: socketDataType,
    data: messageData | websocketStartData | string
}

export interface refreshTokenData {
    userId: string,
    oldToken: string
}

export interface loginRequestData {
    username: string,
    password: string
}

export interface websocketStartData {
    user: user,
    jwtToken: string
}

export interface messageData {
    author: user,
    message: string
}

export interface appStartData {
    socket: Socket,
}

export interface logData {
    message: string,
    args: any[]
}