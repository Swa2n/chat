import { websocketStartData, messageData } from "../public/components/interface";
import { socketMessageData, loginRequestData } from "../public/components/interface";
import { Request } from 'express';
import { user } from "../public/components/user";
import { userData } from "./serverInterface";
import jwt from "jsonwebtoken";
import { connection } from "websocket";
type Nullable<T> = T | null;

export function findUser(userData: Record<string, userData>, username: string): user | undefined {
    const allUsers = Object.values(userData);
    const FoundIndex = allUsers.find(user => user.user.name == username);
    return FoundIndex?.user;
}

export function handleLogin(userData: Record<string, userData>, req: Request, jwtKey: string): websocketStartData | socketMessageData {
    const body = req.body as loginRequestData;
    const foundUser = findUser(userData, body.username);

    let Response;
    if (!foundUser)
        Response = { type: "error", data: "user does not exist" } as socketMessageData
    else if (body.password != foundUser.password)
        Response = { type: "error", data: "incorrect password" } as socketMessageData
    else {
        const userId: string = foundUser.userId;
        const token = jwt.sign(userData[userId].user, jwtKey, {expiresIn: 900})
        userData[userId].validSignInToken = token;
        Response = { jwtToken: token, user: foundUser } as websocketStartData
    }
    return Response;
}

export function handelSignup(allUserData: Record<string, userData>, req: Request, jwtKey: string): websocketStartData | socketMessageData {
    const body = req.body as loginRequestData;
    const foundUser = findUser(allUserData, body.username);

    let Response;
    if (!req.body.username.trim())
        Response = { type: "error", data: "invalid username" } as socketMessageData;
    else if (foundUser)
        Response = { type: "error", data: "user already exists" } as socketMessageData;
    else {
        const userId: string = crypto.randomUUID();
        allUserData[userId] = { 
            user: new user(userId, req.body.username, req.body.password),
            validSignInToken: "", 
            validTokenConnection: new Map<string, connection>()
        } as userData;
        const token = jwt.sign(JSON.parse(JSON.stringify(allUserData[userId].user)), jwtKey, {expiresIn: 1})
        allUserData[userId].validSignInToken = token;
        Response = { jwtToken: token, user: allUserData[userId].user } as websocketStartData;
    }
    return Response;
}

export function handleMessage(userData: Record<string, userData>, clientMes: socketMessageData): Nullable<string> {
    if (clientMes.type == "sendMessage") {
        clientMes.data = clientMes.data as messageData;
        const Message: socketMessageData = {
            type: "sendMessage",
            data: {
                author: clientMes.data.author,
                message: clientMes.data.message
            }
        };

        return JSON.stringify(Message);
    }
    return null;
}