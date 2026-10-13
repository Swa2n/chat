import { user, loginRequestData, websocketStartData, messageData, Nullable, profileParts, socketMesData } from "../public/components/interface";
import { Socket } from "socket.io";
import { Request, Response } from "express";
import { userData, headerCookie } from "./serverInterface";
import jwt from "jsonwebtoken";

export function findUser(username: string): userData | undefined {
    const allUserData = globalThis.allUserData;
    const allUsers = Object.values(allUserData);
    const FoundIndex = allUsers.find(user => user.user.name == username);
    return FoundIndex;
}

export function handleLogin(loginingIn: boolean, req: Request, res: Response, jwtKey: string) {
    const sentMessages = globalThis.sentMessages;
    const allUserData = globalThis.allUserData;

    const body = req.body as loginRequestData;
    const foundUser = findUser(body.username);

    let Response;
    if (loginingIn) //Log in
        if (!foundUser) Response = { type: "error", data: "user does not exist" }
        else if (body.password != foundUser.password) Response = { type: "error", data: "incorrect password" }
        else {
            const userData = allUserData[foundUser.user.userId];
            const refreshToken = crypto.randomUUID();
            const token = jwt.sign(JSON.parse(JSON.stringify(userData)).user, jwtKey, {expiresIn: 900});
            userData.validSignInToken = token;

            const cookiePayload: headerCookie = {
                refreshToken: refreshToken,
                user: userData.user
            };
            res.setHeader('Set-Cookie', `cookie=${JSON.stringify(cookiePayload)}; Path=/; HttpOnly; Secure; SameSite=Strict`);
            
            Response = { jwtToken: token, user: foundUser.user } as websocketStartData;
        }
    else
        if (!req.body.username.trim()) Response = { type: "error", data: "invalid username" };
        else if (foundUser) Response = { type: "error", data: "user already exists" };
        else {
            let userId: string = (Math.floor(Math.random() * (99999999 - 10000000)) + 10000000).toString();
            while (allUserData[userId]) userId = (Math.floor(Math.random() * (99999999 - 10000000)) + 10000000).toString();
            allUserData[userId] = {
                user: new user(userId, req.body.username),
                password: req.body.password,
                style: {},
                validSignInToken: "",
                validRefreshTokens: new Map<string, Socket>(),
                validTokenConnection: new Map<string, Socket>()
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
        };
    if ('jwtToken' in Response) Response.oldMessages = sentMessages;
    res.status(200).json(Response);
}

export function handleMessage(clientMes: messageData, user: user): Nullable<string> {
    const sentMessages = globalThis.sentMessages;
    const Message = {
        author: user,
        message: clientMes.message,
        messageId: "-1"
    };
    while (sentMessages.find(mes => mes.messageId == Message.messageId))
        Message.messageId = (Math.floor(Math.random() * (1e16 - 1 - 1e15)) + 1e15).toString();
    sentMessages.push(Message);

    return JSON.stringify(Message);
}

export function changeProfile(mes: string, userId: string) { try {
    const allUserData = globalThis.allUserData;
    const style = (JSON.parse(mes) as socketMesData).data as profileParts;
    if (style.picture) allUserData[userId].style.picture = style.picture;
    } catch {}
}