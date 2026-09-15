import { Socket } from './WebSocket';

export type socketDataType = "initialPayload" | "sendMessage" | "error"
export interface socketMessageData {
    type: socketDataType,
    data: messageData | websocketStartData | string
}

export interface refreshTokenData {
    userId: string,
    oldToken: string
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

export interface loginRequestData {
    username: string,
    password: string
}

export class user {
    public readonly userId: string;
    public readonly name: string;

    constructor(userId: string = "-1", name: string = "guest") {
        this.userId = userId;
        this.name = name;
    }
    
    get loggedIn(): boolean {
        if (this.userId == "-1") return false
        return true
    }
}