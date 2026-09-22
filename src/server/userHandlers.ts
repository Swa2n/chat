import { user, socketMessageData, loginRequestData, websocketStartData, messageData, Nullable } from "../public/components/interface";
import { connection } from "websocket";
import { Request, Response } from "express";
import { userData, headerCookie } from "./serverInterface";
import jwt from "jsonwebtoken";

const messages: messageData[] = []

export function findUser(userData: Record<string, userData>, username: string): userData | undefined {
    const allUsers = Object.values(userData);
    const FoundIndex = allUsers.find(user => user.user.name == username);
    return FoundIndex;
}

export function handleLogin(allUserData: Record<string, userData>, loginingIn: boolean, req: Request, res: Response, jwtKey: string) {
    const body = req.body as loginRequestData;
    const foundUser = findUser(allUserData, body.username);

    let Response;
    if (loginingIn) //Log in
        if (!foundUser) Response = { type: "error", data: "user does not exist" } as socketMessageData
        else if (body.password != foundUser.password) Response = { type: "error", data: "incorrect password" } as socketMessageData
        else {
            const userData = allUserData[foundUser.user.userId];
            const refreshToken = crypto.randomUUID();
            const token = jwt.sign(JSON.parse(JSON.stringify(userData)).user, jwtKey, {expiresIn: 900})
            userData.validSignInToken = token;

            const cookiePayload: headerCookie = {
                refreshToken: refreshToken,
                user: userData.user
            };
            res.setHeader('Set-Cookie', `cookie=${JSON.stringify(cookiePayload)}; Path=/; HttpOnly; Secure; SameSite=Strict`);
            
            Response = { jwtToken: token, user: foundUser.user } as websocketStartData
        }
    else //sign up
        if (!req.body.username.trim()) Response = { type: "error", data: "invalid username" } as socketMessageData;
        else if (foundUser) Response = { type: "error", data: "user already exists" } as socketMessageData;
        else {
            const userId: string = crypto.randomUUID();
            allUserData[userId] = {
                user: new user(userId, req.body.username),
                password: req.body.password,
                validSignInToken: "",
                validRefreshTokens: new Map<string, connection>(),
                validTokenConnection: new Map<string, connection>()
            } as userData;
            const userData = allUserData[userId];

            const token = jwt.sign(JSON.parse(JSON.stringify(userData.user)), jwtKey, {expiresIn: 900})
            const refreshToken = crypto.randomUUID();
            userData.validSignInToken = token;

            const cookiePayload: headerCookie = {
                refreshToken: refreshToken,
                user: userData.user
            };

            res.setHeader('Set-Cookie', `cookie=${JSON.stringify(cookiePayload)}; Path=/; HttpOnly; Secure; SameSite=Strict`);
            Response = { jwtToken: token, user: allUserData[userId].user } as websocketStartData;
        }
    if ('jwtToken' in Response) Response.oldMessages = messages;
    res.status(200).json(Response);
}

export function handleMessage(clientMes: socketMessageData): Nullable<string> {
    if (clientMes.type == "sendMessage") {
        const mesData = clientMes.data as messageData;
        const Message = {
            type: "sendMessage",
            data: {
                author: mesData.author,
                message: mesData.message
            }
        };
        messages.push(mesData)

        return JSON.stringify(Message);
    }
    return null;
}