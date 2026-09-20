import { messageData, socketMessageData, loginRequestData, websocketStartData, refreshTokenData } from "./interface"
import { user } from "./interface";

type Nullable<T> = T | null;

export class Socket {
    public connection: Nullable<WebSocket> = null;
    private _user: user;
    private lastSentPacket: object = {};

    constructor() {
        this._user = new user();
    }

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

        const login = await accountRequest.json() as websocketStartData
        console.log(login)

        this._user = login.user

        localStorage.setItem("socketToken", login.jwtToken);

        const isSecure = window.location.protocol == "https:";
        const protocol = isSecure ? "wss:" : "ws:";
        const socketUrl = `${protocol}//${window.location.host}?userId=${login.user.userId}&token=${login.jwtToken}`;
        this.connection = new WebSocket(socketUrl, ['echo-protocol']); 
        this.connection.onopen = (): void => { console.log('Connected to the WebSocket server'); };

        this.connection.onmessage = async (event: MessageEvent): Promise<void> => {
            const messageData = JSON.parse(event.data) as socketMessageData;
            if (messageData.type == "error" && messageData.data == "expired-token") {
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
            } else if (messageData.type == "sendMessage"){
                const mesData = messageData.data as messageData;

                const chat = document.getElementById('chat') as HTMLDListElement;
                console.log(event);
                
                const div = document.createElement('div');

                const author = document.createElement('li');
                author.classList.add("list-inline-item");
                author.textContent = mesData.author.name + ": ";
                div.appendChild(author);

                const message = document.createElement('li');
                message.classList.add("list-inline-item");
                message.textContent = mesData.message;
                div.appendChild(message);

                chat.appendChild(div);
                chat.appendChild(document.createElement("br"));
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
            const data: socketMessageData = { type: "sendMessage", data: { author: this._user, message: text }};
            this.connection.send(JSON.stringify(data));
            this.lastSentPacket = data;
            console.log('Sent: ' + text);
        } else {
            console.log('WebSocket is not connected.');
        }
    }
}