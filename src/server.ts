import { handleMessage, handleLogin } from "./server/userHandlers";
import express, { Request, Response } from "express";
import path from "path";
import http from "http";
import { infomationUpdateData, socketMessageData, user } from "./public/components/interface";
import { headerCookie, userData } from "./server/serverInterface";
import { server as WebSocketServer, connection, request as WSRequest } from "websocket";
import jwt from "jsonwebtoken";

const jwtKey: string = crypto.randomUUID();

const app = express();
const PORT: number = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const allUserData: Record<string, userData> = {}
const OnlineUsers: user[] = []

const server = http.createServer(app);

const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

app.post('/api/auth/login', (req: Request, res: Response) => handleLogin(allUserData, true, req, res, jwtKey))
app.post('/api/auth/signup', (req: Request, res: Response) => handleLogin(allUserData, false, req, res, jwtKey))

app.post('/api/auth/refresh', (req: Request, res: Response) => {
    const cookieHeader = req.headers.cookie;
    
    if (!cookieHeader) return res.status(400).json({ type: "error", data: "gng where your cookies???" } as socketMessageData);

    // get the data from the cookie
    const cookieHead = cookieHeader.split(';').map(c => c.trim());
    const cookie = cookieHead.find(c => c.startsWith('cookie='));
    if (!cookie) return res.status(400).json({ type: "error", data: "gng where your cookies???" } as socketMessageData);

    const cookieObject = JSON.parse(cookie.split('=')[1]) as headerCookie;

    const userId = cookieObject.user.userId;
    const oldToken = req.body.token;

    const userData = allUserData[userId];
    if (!userData)
        return res.status(404).json({ error: "User data not found" });

    const tokenMap = allUserData[userId].validTokenConnection;

    const tokenConnection = tokenMap.get(oldToken);

    //check if the connection is the same from the other connection
    if (tokenConnection && allUserData[userId].validRefreshTokens.get(cookieObject.refreshToken) == tokenConnection) {
        const newJwt = jwt.sign(JSON.parse(JSON.stringify(allUserData[userId].user)), jwtKey, {expiresIn: 900});
        //change the key of the connection
        tokenMap.set(newJwt, tokenConnection);
        tokenMap.delete(oldToken);
        
        return res.status(200).json({
            socketToken: newJwt
        });
    } else
        return res.status(400).json({ type: "error", data: "Active connection not found for old token" } as socketMessageData);
})

function originIsAllowed(): boolean { return true; }

wsServer.on('request', (request: WSRequest) => {
    try {
    if (!originIsAllowed()) {
        request.reject();
        console.log('Connection from origin ' + request.origin + ' rejected.');
        return;
    }
    
    const query = request.resource.split('?')[1].split('&');
    const userId = query[0].split('=')[1];
    const token = query[1].split('=')[1];

    if (typeof(token) != "string" || typeof(userId) != "string") {
        request.reject();
        return;
    }
    const allUsers = Object.values(allUserData);

    const FoundIndex = allUsers.find(user => user.user.userId == userId);
    if (!FoundIndex || FoundIndex.validSignInToken != token) {
        request.reject(400, 'Invalid sign in data');
        return;
    }
    let cookie: string = "null";
    request.httpRequest.headers.cookie?.split(';').forEach((headCookie) => {
        if (headCookie.trimStart().startsWith("cookie=")) cookie = headCookie.trim()
    });
    let refreshToken = "";
    if (cookie != "null") refreshToken = (JSON.parse(cookie.split('=')[1].split(';')[0]) as headerCookie).refreshToken;
    else return request.reject(400, 'Invalid cookies');
    if (!refreshToken) return request.reject(400, 'Invalid cookies'); 

    const connection: connection = request.accept('echo-protocol', request.origin);
    const userData = allUserData[userId];
    userData.validTokenConnection.set(token, connection)
    userData.validRefreshTokens.set(refreshToken, connection)

    OnlineUsers.push(userData.user);
    wsServer.broadcast(JSON.stringify({ type: "infomationUpdate", data: { onlineUsers: OnlineUsers } as infomationUpdateData} as socketMessageData));
    
    connection.on('message', function(message) {
        if (message.type != "utf8") return;
        const clientMes = JSON.parse(message.utf8Data) as socketMessageData;

        const tokenMap = userData.validTokenConnection;
        let currentActiveToken = "";
        for (const [token, conn] of tokenMap.entries()) {
            if (conn == connection) {
                currentActiveToken = token;
                break;
            }
        }

        try { jwt.verify(currentActiveToken, jwtKey) } 
        catch (err) {
            if (err instanceof jwt.TokenExpiredError) connection.send(JSON.stringify({type: "error", data: "expired-token"} as socketMessageData));
            else connection.send(JSON.stringify({type: "error", data: "invalid-token"} as socketMessageData));
            return;
        }

        const Message = handleMessage(clientMes);

        if (Message && clientMes.receiver == "all")
            wsServer.broadcast(Message);
        else if (clientMes.receiver == "abs")
            wsServer.connections.forEach(conn => { if (conn != connection) conn.send(JSON.stringify(clientMes)); });
        else if (Array.isArray(clientMes.receiver))
            clientMes.receiver.forEach((id) => 
                allUserData[id].validTokenConnection.forEach((conn) => conn.send(JSON.stringify(clientMes)))
            )
        else console.log("Invalid receiver type: " + clientMes.receiver); 
    });
    
    connection.on('close', function() {
        const connections = Object.values(userData.validTokenConnection);
        let found = connections.find(fconnection => fconnection == connection);
        found = undefined;
        const index = OnlineUsers.findIndex(userr => userr.userId == userData.user.userId);
        OnlineUsers.splice(index, 1);
        wsServer.broadcast(JSON.stringify({ type: "infomationUpdate", data: { onlineUsers: OnlineUsers } as infomationUpdateData} as socketMessageData));
    });
    } catch (ex) { console.log(ex); }
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});