import { user } from "./public/components/user"
import express, { Request, Response } from 'express';
import path from 'path';
import http from 'http';
import { changeUserData, loginData, loginRequestData, messageData, socketMessageData } from "./public/components/interface";
import { server as WebSocketServer, connection, request as WSRequest, client } from 'websocket';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const userData: Record<string, user> = {}

const server = http.createServer(app);

const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

function findUser(username: string): user | undefined {
    const allUsers = Object.values(userData);
    const foundUser = allUsers.find(user => user.name == username);
    return foundUser;
}

app.post('/api/login', (req: Request, res: Response) => {
    req.body = req.body as loginRequestData;
    
    const foundUser = findUser(req.body.username);

    if (!foundUser) {
        console.log("user does not exist");
        res.status(200).json(); //you might need to do smth here tbh
        return;
    } 

    const Response: loginData = {
        user: foundUser
    }
    res.status(200).json(Response);
})

app.post('/api/signup', (req: Request, res: Response) => {
    req.body = req.body as loginRequestData;
    if (!req.body.username.trim()) {
        res.status(200).json(); //you might need to do smth here tbh
        return;
    }
    
    const foundUser = findUser(req.body.username);

    if (foundUser) {
        console.log("user already exists");
        res.status(200).json(); //you might need to do smth here tbh
        return;
    } 

    const userId: string = crypto.randomUUID();
    userData[userId] = new user(userId, req.body.username, req.body.password)

    const Response: loginData = {
        user: userData[userId]
    }
    res.status(200).json(Response);
})

function originIsAllowed(): boolean { return true; }

wsServer.on('request', function(request: WSRequest) {
    if (!originIsAllowed()) {
        request.reject();
        console.log('Connection from origin ' + request.origin + ' rejected.');
        return;
    }
    
    const connection: connection = request.accept('echo-protocol', request.origin);
    console.log('Connection accepted.');
    
    connection.on('message', function(message) {
        if (message.type != "utf8") return;
        const clientMes = JSON.parse(message.utf8Data) as socketMessageData;
        
        if (clientMes.type == "sendMessage") {
            clientMes.data = clientMes.data as messageData;
            const Message: socketMessageData = {
                type: "sendMessage",
                data: {
                    author: clientMes.data.author,
                    message: clientMes.data.message
                }
            };

            wsServer.broadcast(JSON.stringify(Message));
        } else if (clientMes.type == "setUser") {
            clientMes.data = clientMes.data as changeUserData;
            
            const uuid: string = crypto.randomUUID();
            userData[uuid] = new user(uuid, clientMes.data.name);
        }
    });
    
    connection.on('close', function() {
        console.log('Peer disconnected.');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});