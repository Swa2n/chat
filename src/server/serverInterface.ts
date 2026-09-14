import { connection } from "websocket"
import { user } from "../public/components/user"
export interface userData {
    validSignInToken: string,
    validTokenConnection: Map<string, connection>,
    user: user
}