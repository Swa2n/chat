import { connection } from "websocket"
import { user } from "../public/components/interface"
export interface userData {
    user: user,
    password: string,
    validSignInToken: string,
    validTokenConnection: Map<string, connection>,
    validRefreshTokens: Map<string, connection>
}

export interface headerCookie {
    refreshToken: string,
    user: user
}