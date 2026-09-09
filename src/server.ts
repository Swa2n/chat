import express, { Request, Response } from 'express';
import path from 'path';
import http from 'http';
import { server as WebSocketServer, connection, request as WSRequest } from 'websocket';

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
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary' && message.binaryData) {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    
    connection.on('close', function() {
        console.log('Peer disconnected.');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});