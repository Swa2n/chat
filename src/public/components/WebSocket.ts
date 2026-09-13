import { changeUserData as setUserData, messageData, socketMessageData, loginRequestData } from "./interface"
import { user } from "./user";

type Nullable<T> = T | null;

export class Socket {
    public connection: Nullable<WebSocket> = null;
    private _user: user;

    constructor() {
        this._user = new user();
    }

    public async connect(name: string, password: string, logingin: boolean) {
        if (this.connection) return;

        name = name.trim();
        if (!name) return;

        if (!this._user.isGuest) {
            console.log("Username has already been set: ", [name])
            return;
        }

        const message: loginRequestData = {
            username: name,
            password: password
        }

        let accountRequest;
        if (logingin)
            accountRequest = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(message)
            });
        else
            accountRequest = await fetch("/api/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(message)
            });

        const login = await accountRequest.json()
        console.log(login)
        
        this._user = login.user

        const isSecure = window.location.protocol == "https:";
        const protocol = isSecure ? "wss:" : "ws:";
        const socketUrl = `${protocol}//${window.location.host}`;
        this.connection = new WebSocket(socketUrl, 'echo-protocol'); 

        this.connection.onopen = (): void => { console.log('Connected to the WebSocket server'); };

        this.connection.onmessage = (event: MessageEvent): void => {
            const messageData = JSON.parse(event.data) as socketMessageData;
            if (messageData.type == "sendMessage"){
                const mesData = messageData.data as messageData;

                const chat = document.getElementById('chat') as HTMLDListElement;
                console.log(event);

                const author = document.createElement('li');
                author.classList.add("list-inline-item");
                author.textContent = mesData.author.name + ": ";
                chat.appendChild(author);

                const message = document.createElement('li');
                message.classList.add("list-inline-item");
                message.textContent = mesData.message;
                chat.appendChild(message);

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

    public setUserName(name: string): void {
        if (!this.connection) return;
        name = name.trim();
        if (name && this.connection.readyState == WebSocket.OPEN) {
            this.connection.send(name);
        }
    }

    public SendMessage(text: string): void {
        if (!this.connection) return;
        text = text.trim();
        if (text && this.connection.readyState == WebSocket.OPEN) {
            const data: socketMessageData = { type: "sendMessage", data: { author: this._user, message: text }};
            this.connection.send(JSON.stringify(data));
            console.log('Sent: ' + text);
        } else {
            console.log('WebSocket is not connected.');
        }
    }
}