import { handleMessage, handleLogin } from "./server/userHandlers";
import express, { Request, Response } from "express";
import path from "path";
import http from "http";
import { infomationUpdateData, p2pData, user } from "./public/components/interface";
import { headerCookie, userData } from "./server/serverInterface";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";

const jwtKey: string = crypto.randomUUID();

const app = express();
const PORT: number = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const allUserData: Record<string, userData> = {}
const OnlineUsers: user[] = []

const server = http.createServer(app);
const io = new SocketIOServer(server);

app.post('/api/auth/login', (req: Request, res: Response) => handleLogin(allUserData, true, req, res, jwtKey))
app.post('/api/auth/signup', (req: Request, res: Response) => handleLogin(allUserData, false, req, res, jwtKey))

app.post('/api/auth/refresh', (req: Request, res: Response) => {
    const cookieHeader = req.headers.cookie;
        
    if (!cookieHeader) return res.status(400).json({ type: "error", data: "gng where your cookies???" });

    const cookieHead = cookieHeader.split(';').map(c => c.trim());
    const cookie = cookieHead.find(c => c.startsWith('cookie='));
    if (!cookie) return res.status(400).json({ type: "error", data: "gng where your cookies???" });

    const cookieObject = JSON.parse(cookie.split('=')[1]) as headerCookie;

    const userId = cookieObject.user.userId;
    const oldToken = req.body.token;

    const userData = allUserData[userId];
    if (!userData)
        return res.status(404).json({ error: "User data not found" });

    const tokenMap = allUserData[userId].validTokenConnection;
    const tokenConnection = tokenMap.get(oldToken);

    if (tokenConnection && allUserData[userId].validRefreshTokens.get(cookieObject.refreshToken) == tokenConnection) {
        const newJwt = jwt.sign(JSON.parse(JSON.stringify(allUserData[userId].user)), jwtKey, {expiresIn: 900});
        tokenMap.set(newJwt, tokenConnection);
        tokenMap.delete(oldToken);
        
        return res.status(200).json({
            socketToken: newJwt
        });
    } else {
        return res.status(400).json({ type: "error", data: "Active connection not found for old token" });
    }
})

function sendToUsers(userIds: string[], location: string, message: string): boolean {
    for(const [_, userId] of userIds.entries()) {
        const user = allUserData[userId];
        if (user) {
            user.validTokenConnection.forEach((conn) => conn.emit(location, message));
            return true;
        }
    }
    console.log(userIds);
    return false;
}

io.on('connection', (socket: Socket) => {
    try {
        const query = socket.handshake.query;
        const userId = query.userId as string;
        const token = query.token as string;

        if (!token || !userId) {
            socket.disconnect(true);
            return;
        }

        const allUsers = Object.values(allUserData);
        const FoundIndex = allUsers.find(user => user.user.userId == userId);
        if (!FoundIndex || FoundIndex.validSignInToken != token) {
            socket.disconnect(true);
            return;
        }

        const cookieHeader = socket.handshake.headers.cookie;
        let cookie: string = "null";
        if (cookieHeader)
            cookieHeader.split(';').forEach((headCookie: any) => { if (headCookie.trimStart().startsWith("cookie=")) cookie = headCookie.trim(); });

        let refreshToken = "";
        if (cookie != "null") refreshToken = (JSON.parse(cookie.split('=')[1].split(';')[0]) as headerCookie).refreshToken;
        else {
            socket.disconnect(true);
            return;
        }
        if (!refreshToken) {
            socket.disconnect(true);
            return;
        }

        const userData = allUserData[userId];

        userData.validTokenConnection.set(token, socket as any);
        userData.validRefreshTokens.set(refreshToken, socket as any);

        OnlineUsers.push(userData.user);
        io.emit('update/infomation', JSON.stringify({ onlineUsers: OnlineUsers } as infomationUpdateData ));

        socket.use(([location, message], next) => {
            const tokenMap = userData.validTokenConnection;
            let currentActiveToken = "";
            for (const [token, conn] of tokenMap.entries()) 
                if (conn == socket) {
                    currentActiveToken = token;
                    break;
                }
            ;

            try { jwt.verify(currentActiveToken, jwtKey); } catch (err) {
                if (err instanceof jwt.TokenExpiredError) return socket.emit('error/expired-data');
                else return console.log(`somethings up: ${err}`);
            }

            const passOns = [ //put all locations that move from one client to another(like with calls)
                'call/offer',
                'call/answer',
                'call/candidate',
                'call/hang-up',
                'call/request'
            ];
            if (passOns.includes(location)) {
                const data: p2pData = JSON.parse(message); 
                sendToUsers(data.recevierIds, location, JSON.stringify({senderUserId: userId, data: data.data} as p2pData));
                return;
            }
            next();
        })

        socket.on('message/send-message', (message: string) =>
            io.emit('message/receive-message', handleMessage(JSON.parse(message), userData.user))
        );

        socket.on('disconnect', () => {
            const index = OnlineUsers.findIndex(userr => userr.userId == userData.user.userId);
            if (index !== -1) OnlineUsers.splice(index, 1);
            io.emit('update/infomation', JSON.stringify( { onlineUsers: OnlineUsers } as infomationUpdateData));
        });

    } catch (ex) { 
        console.log(ex); 
    }
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});