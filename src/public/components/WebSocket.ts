import { messageData, socketMessageData, loginRequestData, websocketStartData, rtcData, Nullable, infomationUpdateData, clientMessageData } from "./interface"
import { user } from "./interface";
import { io, Socket as SocketIo } from "socket.io-client";

function addMessage(mes: messageData): void {
    const chat = document.getElementById('chat') as HTMLDListElement;

    const message = document.createElement('li');
    message.classList.add("list-inline-item", "chatText");
    message.textContent = `${mes.author.name}:  ${mes.message}`;
    chat.prepend(message);
}

export class Socket {
    public connection: Nullable<SocketIo> = null;
    public peerConnections: Map<string, RTCPeerConnection> = new Map<string, RTCPeerConnection>;
    private _user: user = new user();
    private lastSentPacket: object = {};

    public async connect(name: string, password: string, logingin: boolean) {
        if (this.connection) return;

        name = name.trim();
        if (!name) return;

        const message: loginRequestData = {
            username: name,
            password: password
        }

        let accountRequest;
        const url: string = (logingin) ? "/api/auth/login" : "/api/auth/signup";
        accountRequest = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(message)
        });

        const login = await accountRequest.json();
        if (login.type && login.type == "error") { 
            console.log(login.data); 
            return; 
        }

        this._user = login.user;
        login.oldMessages.forEach(addMessage);
        localStorage.setItem("socketToken", login.jwtToken);

        const isSecure = window.location.protocol == "https:";
        const protocol = isSecure ? "wss:" : "ws:";
        const socketUrl = `${protocol}//${window.location.host}?userId=${login.user.userId}&token=${login.jwtToken}`;
        this.connection = io(socketUrl); 
        this.connection.on('connect', () => { console.log('Connected to the WebSocket server'); });

        this.connection.on('message/receive-message', (event) => addMessage(JSON.parse(event) as messageData))

        this.connection.on('update/infomation', (event) => {
            const infoData = JSON.parse(event) as infomationUpdateData;
            if (infoData.onlineUsers) {
                (document.getElementById("onlineUserList") as HTMLElement).replaceChildren();
                (document.getElementById("onlineNumber") as HTMLSpanElement).textContent = infoData.onlineUsers.length.toString();
                infoData.onlineUsers.forEach((user) => {
                    const clone = document.getElementById("list_clone")?.cloneNode(true) as HTMLDivElement;
                    Array.from(clone.children).forEach((element) => {
                        if (element.id == "name") element.textContent = user.name;
                    });
                    clone.id = `list:${user.userId}`;
                    document.getElementById("onlineUserList")?.append(clone)
                });
            }
        })

        this.connection.on('error', (event) => console.log(event));

        this.connection.on('error/expired-data', async () => {
            const token = localStorage.getItem("socketToken");
            const tokenRequest = await fetch("/api/auth/refresh", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({token: token})
            })
            const response = await tokenRequest.json()
            if (response.socketToken) {
                localStorage.setItem("socketToken", response.socketToken);
                console.log("New token got!");
            }
            this.connection?.send(JSON.stringify(this.lastSentPacket));
        })

        this.connection.on('call/offer', (event: rtcData) => {
            const offerDesc = new RTCSessionDescription({type: event.sdp.type, sdp: event.sdp.sdp} as RTCSessionDescriptionInit);

            this.createP2pConnection(event.userId)
            .then((p2pConn) => {
                p2pConn.setRemoteDescription(offerDesc);
                p2pConn.createAnswer()
                .then((answer) => p2pConn.setLocalDescription(answer))
                .then(() => this.connection?.send(JSON.stringify({ type: "answer", receiver: [event.userId], data: { sdp: p2pConn.localDescription, userId: this._user.userId }})));
            }); 
        })

        this.connection.on('call/answer', (event: rtcData) => {
            const answerDesc = new RTCSessionDescription(event.sdp);
            const p2pAnswerConnection = this.peerConnections.get(event.userId);
            p2pAnswerConnection?.setRemoteDescription(answerDesc).catch(window.reportError);
        })

        this.connection.on('call/candidate', (event: rtcData) => {
            const candidate = new RTCIceCandidate(event.can);
            this.peerConnections.get(event.userId)?.addIceCandidate(candidate).catch(window.reportError);
        })

        this.connection.on('connect_error', (err: Error) => console.error(err));

        (document.getElementById("preloginDiv") as HTMLElement).style.visibility = "hidden";
        (document.getElementById("postloginDiv") as HTMLElement).style.visibility = "visible";
    }

    get user(): user { return this._user; }

    public SendMessage(text: string): void {
        if (!this.connection) return;
        text = text.trim();
        if (text && this.connection.connected) {
            const data: clientMessageData = { message: text };
            this.connection.emit('message/send-message', JSON.stringify(data));
            this.lastSentPacket = data;
        } else console.log('WebSocket is not connected.');
    }

    public async createP2pConnection(userId: string): Promise<RTCPeerConnection> {
        const settings: RTCConfiguration = {iceServers: [{ urls: 'stun:stun.l.google.com:19302'}]}
        const p2pConnection = new RTCPeerConnection(settings);
        const webcam = document.getElementById("webcam") as HTMLVideoElement;
        const stream = webcam?.srcObject as MediaStream;
        stream.getTracks().forEach((track) => { p2pConnection.addTrack(track, stream) });
        p2pConnection.onicecandidate = ((event) => {
            this.connection?.send(JSON.stringify({ type: "candidate", receiver: [userId], data: { can: event.candidate, userId: this._user.userId } }))
        });
        p2pConnection.ontrack = ((event) => {
            (document.getElementById("farawayland") as HTMLVideoElement).srcObject = event.streams[0];
        })
        p2pConnection.removeTrack = (() => {
            const stream = (document.getElementById("farawayland") as HTMLVideoElement).srcObject as MediaStream;
            const trackList = stream.getTracks();

            if (trackList.length != 0) return;
            p2pConnection.close();
            this.peerConnections.delete(userId);
        })
        this.peerConnections.set(userId, p2pConnection);
        return p2pConnection;
    }
}