import express, { Request, Response } from 'express';
import path from 'path';
import http from 'http';
import { socketMessageData } from "./public/components/interface";
import { server as WebSocketServer, connection, request as WSRequest, client } from 'websocket';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

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

        const Message: socketMessageData = {
            type: "sendMessage",
            data: {
                author: clientMes.data.author,
                message: clientMes.data.message
            }
        };

        wsServer.broadcast(JSON.stringify(Message));
    });
    
    connection.on('close', function() {
        console.log('Peer disconnected.');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});