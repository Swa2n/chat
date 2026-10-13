import { messageData, loginRequestData, Nullable, infomationUpdateData, lastPacketData, socketMesData, profileParts } from "./interface"
import { user } from "./interface";
import { io, Socket as SocketIo } from "socket.io-client";
import { Call } from "./rtcConnection";
import { addMessage } from "./messageHandler";

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
			if (globalThis.Call) return console.warn("User already in call"); //prob just give user option to decline or accept
            globalThis.Call = new Call(1);
            await globalThis.StartUserCamera();
            await globalThis.Call.startCall(event.senderUserId);

			let interval: NodeJS.Timeout;
			globalThis.Call.addCallBack(() => { clearInterval(interval);
				interval = setInterval(() => {
					if (!globalThis.Call) { if (interval) clearInterval(interval);
						return;
					}
					if (globalThis.Call.alone) { clearInterval(interval);
						globalThis.Call.endCall();
						// Add smth here to tell the user that they have been alone for too long
						return;
					}
				}, (5 * 60000)); //time(in minutes) * (minute -> ms)
			})
        })

        this.connection?.on('call/offer', async (message) => {
			if (!globalThis.Call) return console.warn(`User ${(JSON.parse(message) as socketMesData).senderUserId} has offered out of order.`);
            await globalThis.StartUserCamera();
			await globalThis.Call.offer(message);
		});

        this.connection.on('connect_error', (err: Error) => console.error(err));

        (document.getElementById("preloginDiv") as HTMLElement).style.visibility = "hidden";
        (document.getElementById("postloginDiv") as HTMLElement).style.visibility = "visible";
    }

    get user(): user { return structuredClone(this._user); }

    public SendPacket(location: string, message: object = {}, receivers: string[] = []) {
        this.connection?.emit(location, JSON.stringify({data: message, recevierIds: receivers}));
        this.lastSentPacket = {location: location, message: message} as lastPacketData;
    }

    public SendMessage(text: string): void {
        if (!this.connection) return;
        text = text.trim();
        if (text && this.connection.connected) this.SendPacket('message/send-message', { message: text }, []);
    }

    public async startCall(userIds: string[]) {
		if (globalThis.Call) return console.warn("User already in call");
        userIds.forEach((userId) => this.SendPacket('call/request', {}, [userId]));
        globalThis.Call = new Call(1);
    }

    public async changeProfile() {
        const image = document.getElementById("fasd") as HTMLInputElement;
        const file = new File([(image.files as FileList)[0]], "profile.webp")
        
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob(async (blob) => {
                URL.revokeObjectURL(img.src);this._user.userId
                if (!blob) return new Error('Conversion failed');
                
                const webpName = "profile.webp";
                const webpFile = new File([blob], webpName, { type: 'image/webp' });
                
                this.SendPacket('profile/change', {picture: new Uint8Array(await webpFile.arrayBuffer())} as profileParts);
            }, 'image/webp');
        };
    }
    public async getProfile(userId: string): Promise<string> {
        const raw: Object = JSON.parse(await this.connection?.emitWithAck('profile/get', JSON.stringify({userId: userId})));
        const uint = Uint8Array.from(Object.values(raw));
        const url = URL.createObjectURL(new Blob([uint], { type: 'image/webp'}));
        return url;
    }
}