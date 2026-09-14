import { user } from "./public/components/user"
import { handleMessage, handleLogin, handelSignup } from "./server/userHandlers";
import express, { Request, Response } from 'express';
import path from 'path';
import http from 'http';
import { refreshTokenData, socketMessageData } from "./public/components/interface";
import { userData } from "./server/serverInterface";
import { server as WebSocketServer, connection, request as WSRequest, client } from 'websocket';
import jwt from "jsonwebtoken";
import url from 'url'

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
    res.status(200).json(await handleLogin(allUserData, req, jwtKey));
})

app.post('/api/auth/signup', async (req: Request, res: Response) => {
    res.status(200).json(await handelSignup(allUserData, req, jwtKey))
})

app.post('/api/auth/refresh', (req: Request, res: Response) => {
    // const refreshToken = req.cookies.refresh_token;
    const body = req.body as refreshTokenData;
    if (!allUserData[body.userId]) {
        return res.status(404).json({ error: "User data not found" });
    }
    const newJwt = jwt.sign(JSON.parse(JSON.stringify(allUserData[body.userId].user)), jwtKey, {expiresIn: 10})
    const tokenMap = allUserData[body.userId].validTokenConnection;
    const connection = tokenMap.get(body.oldToken);

    if (connection) {
        tokenMap.set(newJwt, connection);
        tokenMap.delete(body.oldToken);
        
        return res.status(200).json({
            socketToken: newJwt
        });
    } else
        return res.status(400).json({ error: "Active connection not found for old token" });
})

function originIsAllowed(): boolean { return true; }

wsServer.on('request', (request: WSRequest) => {
    if (!originIsAllowed()) {
        request.reject();
        console.log('Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    const queryObject = url.parse(request.resource, true).query;
    const userId = queryObject.userId;
    let token = queryObject.token;
    if (typeof(token) != "string" || typeof(userId) != "string") {
        request.reject();
        return;
    }
    const allUsers = Object.values(allUserData);

    const FoundIndex = allUsers.find(user => user.user.userId == userId);
    if (!FoundIndex || FoundIndex.validSignInToken != token) {
        request.reject();
        return;
    }

    const connection: connection = request.accept('echo-protocol', request.origin);
    allUserData[userId].validTokenConnection.set(token, connection)

    console.log('Connection accepted.');
    
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
                connection.send(JSON.stringify({type: "error", data: "expired-token"} as socketMessageData))
            }
            else connection.send(JSON.stringify({type: "error", data: "invalid-token"} as socketMessageData))
            return;
        }

        const Message = handleMessage(allUserData, clientMes)

        if (Message) wsServer.broadcast(Message);
        else console.log("Invalid client message data: " + message)
    });
    
    connection.on('close', function() {
        const connections = Object.values(allUserData[userId].validTokenConnection)
        let found = connections.find(fconnection => fconnection == connection)
        found = undefined;

        console.log('Peer disconnected.');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});