import { messageData, socketMessageData, loginRequestData, websocketStartData, rtcData, Nullable, infomationUpdateData } from "./interface"
import { user } from "./interface";

function addMessage(mes: messageData): void {
    const chat = document.getElementById('chat') as HTMLDListElement;

    const message = document.createElement('li');
    message.classList.add("list-inline-item", "chatText");
    message.textContent = `${mes.author.name}:  ${mes.message}`;
    chat.prepend(message, document.createElement("br"));
}

export class Socket {
    public connection: Nullable<WebSocket> = null;
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
        this.connection = new WebSocket(socketUrl, ['echo-protocol']); 
        this.connection.onopen = (): void => { console.log('Connected to the WebSocket server'); };

        this.connection.onmessage = async (event: MessageEvent): Promise<void> => {
            const messageData = JSON.parse(event.data) as socketMessageData;
            switch (messageData.type) {
                case "error":
                    switch (messageData.data) {
                        case "expired-token":
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
                    }
                    break
                case "sendMessage":
                    console.log(event);
                    addMessage(messageData.data as messageData);
                    break;
                case "offer":
                    const RtcDataOffer = messageData.data as rtcData;
                    console.log(RtcDataOffer)
                    const offerDesc = new RTCSessionDescription({type: RtcDataOffer.sdp.type, sdp: RtcDataOffer.sdp.sdp} as RTCSessionDescriptionInit);

                    this.createP2pConnection(RtcDataOffer.userId)
                    .then((p2pConn) => {
                        p2pConn.setRemoteDescription(offerDesc);
                        p2pConn.createAnswer()
                        .then((answer) => p2pConn.setLocalDescription(answer))
                        .then(() => this.connection?.send(JSON.stringify({ type: "answer", receiver: [RtcDataOffer.userId], data: { sdp: p2pConn.localDescription, userId: this._user.userId }})));
                    });
                    break;
                case "answer":
                    const RtcDataAnswer = messageData.data as rtcData;
                    const answerDesc = new RTCSessionDescription(RtcDataAnswer.sdp);
                    const p2pAnswerConnection = this.peerConnections.get(RtcDataAnswer.userId);
                    p2pAnswerConnection?.setRemoteDescription(answerDesc).catch(window.reportError);
                    break;
                case "candidate":
                    const RtcDataCandidate = messageData.data as rtcData;
                    const candidate = new RTCIceCandidate(RtcDataCandidate.can);
                    this.peerConnections.get(RtcDataCandidate.userId)?.addIceCandidate(candidate).catch(window.reportError);
                    break;
                case "infomationUpdate":
                    const infoData = messageData.data as infomationUpdateData;
                    if (infoData.onlineUsers) {
                        (document.getElementById("onlineUserList") as HTMLElement).replaceChildren();
                        (document.getElementById("onlineNumber") as HTMLSpanElement).textContent = infoData.onlineUsers.length.toString();
                        infoData.onlineUsers.forEach((user) => {
                            const clone = document.getElementById("list_clone")?.cloneNode(true) as HTMLDivElement;
                            Array.from(clone.children).forEach((element) => {
                                if (element.id == "name") element.textContent = user.name;
                            });
                            console.log("AHBH");
                            clone.id = `list:${user.userId}`;
                            document.getElementById("onlineUserList")?.append(clone)
                        });
                    }
                    break;
                }
        };

        this.connection.onerror = (error: Event): void => {
            console.error(error);
        };

        const pre = document.getElementById("preloginDiv");
        if (pre) pre.style.visibility = "hidden";
        const pos = document.getElementById("postloginDiv");
        if (pos) pos.style.visibility = "visible";
    }

    get user(): user {
        return this._user;
    }

    public SendMessage(text: string): void {
        if (!this.connection) return;
        text = text.trim();
        if (text && this.connection.readyState == WebSocket.OPEN) {
            const data: socketMessageData = { type: "sendMessage", receiver: "all", data: { author: this._user, message: text }};
            this.connection.send(JSON.stringify(data));
            this.lastSentPacket = data;
            console.log(`Sent: ${text}`);
        } else console.log('WebSocket is not connected.');
    }

    public async createP2pConnection(userId: string): Promise<RTCPeerConnection> {
        const settings: RTCConfiguration = {iceServers: [{ urls: 'stun:stun.l.google.com:19302'}]}
        const p2pConnection = new RTCPeerConnection(settings);
        const webcam = document.getElementById("webcam") as HTMLVideoElement;
        const stream = webcam?.srcObject as MediaStream;
        stream.getTracks().forEach((track) => { p2pConnection.addTrack(track, stream) });
        p2pConnection.onicecandidate = ((event) => {
            if (event.candidate) 
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