import { connection } from "websocket"
import { user } from "../public/components/interface"
import { Socket } from "socket.io"
export interface userData {
    user: user,
    password: string,
    validSignInToken: string,
    validTokenConnection: Map<string, Socket>,
    validRefreshTokens: Map<string, Socket>
}

export interface headerCookie {
    refreshToken: string,
    user: user
}