export type Nullable<T> = T | null;
export type socketDataType = "sendMessage" | "error" | "offer" | "answer" | "candidate" | "infomationUpdate"

export interface infomationUpdateData {
    onlineUsers: Nullable<user[]>
}

export interface socketMesData {
    data: any,
    senderUserId: string,
    recevierIds: string[]
}

export interface rtcData {
    sdp: RTCSessionDescriptionInit, 
    can: RTCIceCandidate
}

export interface refreshTokenData {
    userId: string,
    oldToken: string
}

export interface websocketStartData {
    user: user,
    jwtToken: string,
    oldMessages: [messageData]
}

export interface lastPacketData {
    location: string,
    message: object | string
} 

export interface clientMessageData {
    message: string
}

export interface messageData {
    author: user,
    message: string,
    messageId: string,
}

export interface loginRequestData {
    username: string,
    password: string
}

export interface profileParts {
    picture: Nullable<Uint8Array>
}

export interface profilePartsRequest {
    userId: string,
    picture: boolean
}

export class user {
    public readonly userId: string;
    public readonly name: string;

    constructor(userId: string = "-1", name: string = "guest") {
        this.userId = userId;
        this.name = name;
    }
    
    get loggedIn(): boolean {
        if (this.userId == "-1") return false;
        return true;
    }
}