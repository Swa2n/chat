import { handleMessage, handleLogin, handleSignup } from "./server/userHandlers";
import express, { Request, Response } from 'express';
import path from 'path';
import http from 'http';
import { socketMessageData } from "./public/components/interface";
import { headerCookie, userData } from "./server/serverInterface";
import { server as WebSocketServer, connection, request as WSRequest } from 'websocket';
import jwt from "jsonwebtoken";

const jwtKey: string = crypto.randomUUID();

const app = express();
const PORT: number = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const allUserData: Record<string, userData> = {}

const server = http.createServer(app);

const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
    await handleLogin(allUserData, req, res, jwtKey);
})

app.post('/api/auth/signup', async (req: Request, res: Response) => {
    await handleSignup(allUserData, req, res, jwtKey);
})

app.get('/api/auth/refresh', (req: Request, res: Response) => {
    const cookieHeader = req.headers.cookie;
    
    if (!cookieHeader) return res.status(400).json({ type: "error", data: "gng where your cookies???" } as socketMessageData);

    // get the data from the cookie
    const cookieHead = cookieHeader.split(';').map(c => c.trim());
    const cookie = cookieHead.find(c => c.startsWith('cookie='));
    if (!cookie) return res.status(400).json({ type: "error", data: "gng where your cookies???" } as socketMessageData);

    const cookieObject = JSON.parse(cookie.split('=')[1]) as headerCookie;

    const userId = cookieObject.user.userId;
    const oldToken = cookieObject.refreshToken;

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
    const cookie = request.httpRequest.headers.cookie
    let refreshToken = "";
    if (cookie) refreshToken = (JSON.parse(cookie.split('=')[1]) as headerCookie).refreshToken;
    if (!refreshToken) return request.reject(400, 'Invalid cookies'); 

    const connection: connection = request.accept('echo-protocol', request.origin);
    allUserData[userId].validTokenConnection.set(token, connection)
    allUserData[userId].validRefreshTokens.set(refreshToken, connection)
    
    connection.on('message', function(message) {
        if (message.type != "utf8") return;
        const clientMes = JSON.parse(message.utf8Data) as socketMessageData;

        const tokenMap = allUserData[userId].validTokenConnection;
        let currentActiveToken = "";
        for (const [t, conn] of tokenMap.entries()) {
            if (conn == connection) {
                currentActiveToken = t;
                break;
            }
        }

        try { jwt.verify(currentActiveToken, jwtKey) } 
        catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                console.log('Token has expired');
                connection.send(JSON.stringify({type: "error", data: "expired-token"} as socketMessageData));
            }
            else connection.send(JSON.stringify({type: "error", data: "invalid-token"} as socketMessageData));
            return;
        }

        const Message = handleMessage(clientMes);

        if (Message) wsServer.broadcast(Message);
        else console.log("Invalid client message data: " + message);
    });
    
    connection.on('close', function() {
        const connections = Object.values(allUserData[userId].validTokenConnection);
        let found = connections.find(fconnection => fconnection == connection);
        found = undefined;
    });
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});