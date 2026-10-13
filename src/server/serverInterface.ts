import { user } from "../public/components/interface"
import { Socket } from "socket.io"

export interface userData {
    user: user,
    style: {
        picture: Uint8Array
    },
    password: string,
    validSignInToken: string,
    validRefreshTokens: Map<string, Socket>,
    validTokenConnection: Map<string, Socket>
}

export interface headerCookie {
    refreshToken: string,
    user: user
}