import { Socket } from './WebSocket';
import { user } from './user';

export type socketDataType = "setUser" | "sendMessage"
export interface socketMessageData {
    type: socketDataType,
    data: messageData | changeUserData
}

export interface changeUserData {
    name: string
}

export interface loginRequestData {
    username: string,
    password: string
}

export interface loginData {
    user: user
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