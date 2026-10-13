import { Socket } from "./WebSocket";
import { socketMesData, rtcData, Nullable } from "./interface";

export class Call {
    private peerConnections: Map<string, RTCPeerConnection>;
    private readonly socket: Socket = globalThis.Socket;
    private stream: Nullable<MediaStream> = null;
    private _alone: boolean = true;
    private _callSize: number; //only other clients
    private _userIds: string[] = [];
    private peerConnChangeCallbacks: Function[] = [];

    constructor(callSize: number) {
        document.getElementById("hangUpButton")?.addEventListener('click', async () => this.endCall());
        this.socket.connection?.on('call/answer', this.answer);
        this.socket.connection?.on('call/candidate', this.candidate);
        this.socket.connection?.on('call/hang-up', this.onHangUp);
        if (callSize != 0) this._callSize = callSize;
        else this._callSize = 1000; //idk abt this(might need to make it more reliable)

        const Call = this;
        this.peerConnections = new Proxy(new Map<string, RTCPeerConnection>, {
            get(target, prop, receiver) {
                if (prop == "set") {
                    return function(key: string, value: RTCPeerConnection) {
                        const result = target.set(key, value)
                        Call.peerConnChangeCallbacks.forEach((callBack: Function) => callBack());
                        return result;
                    };
                } else if (prop == "delete") return function(key: string) { return target.delete(key); }

                const value = Reflect.get(target, prop, receiver);
                if (typeof value == "function") {
                    return value.bind(target);
                }
                return value;
            }
        });
    }

    get userIds(): string[] { return this._userIds; }
    get callSize(): number { return this._callSize; }
    get alone(): boolean { return this._alone; }

    set addCallBack(callBack: Function) { this.peerConnChangeCallbacks.push(callBack); } 
 
    public offer = (message: string) => {
        const event: socketMesData = JSON.parse(message)
        const offData: rtcData = event.data;
        const offerDesc = new RTCSessionDescription({type: offData.sdp.type, sdp: offData.sdp.sdp} as RTCSessionDescriptionInit);

        this.createP2pConnection(event.senderUserId)
        .then((p2pConn) => {
            if (!p2pConn) return;
            p2pConn.setRemoteDescription(offerDesc);
            p2pConn.createAnswer()
            .then((answer) => p2pConn.setLocalDescription(answer))
            .then(() => this.socket.SendPacket('call/answer', { sdp: p2pConn.localDescription }, [event.senderUserId]));
        });
    }

    public answer = (message: string) => {
        const event: socketMesData = JSON.parse(message)
        const ansData: rtcData = event.data
        const answerDesc = new RTCSessionDescription(ansData.sdp);
        const p2pAnswerConnection = this.peerConnections.get(event.senderUserId);
        p2pAnswerConnection?.setRemoteDescription(answerDesc).catch(window.reportError);
    };

    public candidate = (message: string) => {
        const event: socketMesData = JSON.parse(message)
        const canData: rtcData = event.data;
        if (!canData.can) return
        const candidate = new RTCIceCandidate({ candidate: canData.can.candidate, sdpMid: canData.can.sdpMid, sdpMLineIndex: canData.can.sdpMLineIndex});
        this.peerConnections.get(event.senderUserId)?.addIceCandidate(candidate);
    }

    public onHangUp = (message: string) => {
        const event: socketMesData = JSON.parse(message);
        this.userIds.forEach((userId, index) => { if (userId == event.senderUserId) this.userIds.splice(index, 1); });
        this.peerConnections.delete(event.senderUserId);
        document.getElementById("videoContainer")?.childNodes.forEach((element) => {
            if ((element as Element).id.split('-')[1] == event.senderUserId) {
                element.remove();
                return;
            }
        });
    }

    public async startCall(userId: string) {
        if (this.userIds.length >= this.callSize) return console.warn("Max People in Call", this);
        const p2pConn = await this.createP2pConnection(userId);
        if (!p2pConn) return;
        p2pConn.createOffer()
        .then((offer) => p2pConn.setLocalDescription(offer))
        .then(() => this.socket.SendPacket('call/offer', {sdp: p2pConn.localDescription}, [userId]));
        return p2pConn;
    }

    public async endCall() {
        ((document.getElementById("webcam") as HTMLVideoElement).srcObject as MediaStream).getTracks().forEach((track) => { track.stop() })
        this.socket.SendPacket('call/hang-up', this.userIds);
        this.peerConnections.forEach((conn) => conn.close());
        this.peerConnections = new Map<string, RTCPeerConnection>;

        const callDiv = document.getElementById("callDiv") as HTMLDivElement;
        callDiv.style.visibility = "hidden";
        callDiv.innerHTML = "";
        globalThis.Call = null;
    }

    private async createP2pConnection(userId: string): Promise<RTCPeerConnection | void> {
        if (this.userIds.length >= this.callSize) return console.warn("Max People in Call", this);
        const settings: RTCConfiguration = {iceServers: [{ urls: 'stun:stun.l.google.com:19302'}]}
        const p2pConnection = new RTCPeerConnection(settings);
        return new Promise((resolve) => { const intveral = setInterval(() => {
            const webcam = document.getElementById("webcam") as HTMLVideoElement;
            if (webcam) { clearInterval(intveral);
                this.stream = webcam?.srcObject as MediaStream;

                const otherCam = document.getElementById("cam_clone")?.cloneNode(true) as HTMLVideoElement;
                otherCam.id = `call-${userId}`
                this.stream.getTracks().forEach((track) => { if (this.stream) p2pConnection.addTrack(track, this.stream) });
                p2pConnection.onicecandidate = ((event: any) =>  this.socket.SendPacket('call/candidate', { can: event.candidate }, [userId]));
                p2pConnection.ontrack = ((event) => otherCam.srcObject = event.streams[0]);
                p2pConnection.onconnectionstatechange = (() => {
                    if (["disconnected", "failed", "closed"].includes(p2pConnection.iceConnectionState)) {
                        p2pConnection.close();
                        otherCam.remove();
                        this.peerConnections.delete(userId);
                    }
                });
                (document.getElementById("callDiv") as HTMLDivElement).style.visibility = "visible";
                document.getElementById("videoContainer")?.append(otherCam);
                this.userIds.push(userId);
                this.addCallBack = () => {
                    if (this.userIds.length <= 0) this._alone = true;
                    else this._alone = false; //Prob need to add stuff here later
                }
                this.peerConnections.set(userId, p2pConnection)
                resolve(p2pConnection);
            }
        }, 250);})
    }
}