import { messageData, loginRequestData, Nullable, infomationUpdateData, lastPacketData, p2pData } from "./interface"
import { user } from "./interface";
import { io, Socket as SocketIo } from "socket.io-client";
import { Call } from "./rtcConnection";

function addMessage(mes: messageData): void {
    const chat = document.getElementById('chat') as HTMLDListElement;

    const message = document.createElement('li');
    message.classList.add("list-inline-item", "chatText");
    message.textContent = `${mes.author.name}:  ${mes.message}`;
    chat.prepend(message);
}

export class Socket {
    public connection: Nullable<SocketIo> = null;
    private _user: user = new user();
    private lastSentPacket: Nullable<lastPacketData> = null;

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
        globalThis.User = this._user;
        login.oldMessages.forEach(addMessage);
        localStorage.setItem("socketToken", login.jwtToken);

        const isSecure = window.location.protocol == "https:";
        const protocol = isSecure ? "wss:" : "ws:";
        const socketUrl = `${protocol}//${window.location.host}?userId=${login.user.userId}&token=${login.jwtToken}`;
        this.connection = io(socketUrl);
        this.connection.on('connect', () => { console.log('Connected to the WebSocket server'); });

        this.connection.on('message/receive-message', (event: string) => addMessage(JSON.parse(event) as messageData))

        this.connection.on('update/infomation', (event: string) => {
            const infoData = JSON.parse(event) as infomationUpdateData;
            if (infoData.onlineUsers) {
                (document.getElementById("onlineUserList") as HTMLElement).innerHTML = "";
                (document.getElementById("onlineNumber") as HTMLSpanElement).textContent = infoData.onlineUsers.length.toString();
                infoData.onlineUsers.forEach((user) => {
                    const clone = document.getElementById("list_clone")?.cloneNode(true) as HTMLDivElement;
                    Array.from(clone.children).forEach((element) => {
                        if (element.id == "name") element.textContent = user.name;
                        else if (element.id == "call")
                            if (user.userId != this._user.userId) element.addEventListener('click', () => this.startCall([user.userId]));
                            else element.remove();
                    });
                    clone.id = `list:${user.userId}`;
                    document.getElementById("onlineUserList")?.append(clone)
                });
            }
        })

        this.connection.on('error', (event: string) => console.log(JSON.parse(event)));

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
            if (this.lastSentPacket)
            this.connection?.emit(this.lastSentPacket.location, JSON.stringify(this.lastSentPacket.message));
        })

        this.connection.on('call/request', async (message: string) => {
            const event = JSON.parse(message);
            // Add code here to ask client accept
            globalThis.Call = new Call();
            await globalThis.StartUserCamera();
            globalThis.Call.startCall(event.senderUserId);
        })

        this.connection?.on('call/offer', async (message) => {
            await globalThis.StartUserCamera();
			globalThis.Call.offer(message)
		});

        this.connection.on('connect_error', (err: Error) => console.error(err));

        (document.getElementById("preloginDiv") as HTMLElement).style.visibility = "hidden";
        (document.getElementById("postloginDiv") as HTMLElement).style.visibility = "visible";
    }

    get user(): user { return structuredClone(this._user); }

    public SendPacket(location: string, receivers: string[] = [], message: object = {}) {
        this.connection?.emit(location, JSON.stringify({data: message, recevierIds: receivers}));
        this.lastSentPacket = {location: location, message: message} as lastPacketData;
    }

    public SendMessage(text: string): void {
        if (!this.connection) return;
        text = text.trim();
        if (text && this.connection.connected) this.SendPacket('message/send-message', [], { message: text });
    }

    public async startCall(userIds: string[]) {
        userIds.forEach((userId) => this.SendPacket('call/request', [userId]));
        globalThis.Call = new Call();
    }
}