import { Socket } from "./WebSocket";
import { p2pData, rtcData, Nullable } from "./interface";

export class Call { 
    private peerConnections: Map<string, RTCPeerConnection> = new Map<string, RTCPeerConnection>;
    private socket: Socket = globalThis.Socket;
    private stream: Nullable<MediaStream> = null;
    public userIds: string[] = [];

    constructor() {
        document.getElementById("hangUpButton")?.addEventListener('click', async () => {
            this.socket.SendPacket('call/hang-up', this.userIds);
            this.peerConnections.forEach((conn) => conn.close());
            this.peerConnections = new Map<string, RTCPeerConnection>;

            ((document.getElementById("webcam") as HTMLVideoElement).srcObject as MediaStream).getTracks().forEach((track) => { track.stop() })
            const callDiv = document.getElementById("callDiv") as HTMLDivElement;
            callDiv.style.visibility = "hidden";
            callDiv.innerHTML = "";
            globalThis.Call = null;
        });
        this.socket.connection?.on('call/answer', this.answer);
        this.socket.connection?.on('call/candidate', this.candidate);
        this.socket.connection?.on('call/hang-up', this.onHangUp);
    }

    public offer = (message: string) => {
        const event: p2pData = JSON.parse(message)
        const offData: rtcData = event.data;
        const offerDesc = new RTCSessionDescription({type: offData.sdp.type, sdp: offData.sdp.sdp} as RTCSessionDescriptionInit);

        this.createP2pConnection(event.senderUserId)
        .then((p2pConn) => {
            p2pConn.setRemoteDescription(offerDesc);
            p2pConn.createAnswer()
            .then((answer) => p2pConn.setLocalDescription(answer))
            .then(() => this.socket.SendPacket('call/answer', [event.senderUserId], { sdp: p2pConn.localDescription }));
        });
    }

    public answer = (message: string) => {
        const event: p2pData = JSON.parse(message)
        const ansData: rtcData = event.data
        const answerDesc = new RTCSessionDescription(ansData.sdp);
        const p2pAnswerConnection = this.peerConnections.get(event.senderUserId);
        p2pAnswerConnection?.setRemoteDescription(answerDesc).catch(window.reportError);
    };

    public candidate = (message: string) => {
        const event: p2pData = JSON.parse(message)
        const canData: rtcData = event.data;
        if (!canData.can) return
        const candidate = new RTCIceCandidate({ candidate: canData.can.candidate, sdpMid: canData.can.sdpMid, sdpMLineIndex: canData.can.sdpMLineIndex});
        this.peerConnections.get(event.senderUserId)?.addIceCandidate(candidate);
    }

    public onHangUp = (message: string) => {
        const event: p2pData = JSON.parse(message);
        document.getElementById("videoContainer")?.childNodes.forEach((element) => {
            if ((element as Element).id.split('-')[1] == event.senderUserId) {
                element.remove();
                return;
            }
        });
    }

    public async startCall(userId: string) {
        const p2pConn = await this.createP2pConnection(userId);
        p2pConn.createOffer()
        .then((offer) => p2pConn.setLocalDescription(offer))
        .then(() => this.socket.SendPacket('call/offer', [userId], {sdp: p2pConn.localDescription}))
        .then(() => this.peerConnections.set(userId, p2pConn));
        this.userIds.push(userId);
        return p2pConn;
    }

    private async createP2pConnection(userId: string): Promise<RTCPeerConnection> {
        const settings: RTCConfiguration = {iceServers: [{ urls: 'stun:stun.l.google.com:19302'}]}
        const p2pConnection = new RTCPeerConnection(settings);
        let webcam;
        return new Promise((resolve) => { const intveral = setInterval(() => {
            webcam = document.getElementById("webcam") as HTMLVideoElement;
            console.log(webcam)
            if (webcam) {
                clearInterval(intveral);
                this.stream = webcam?.srcObject as MediaStream;

                const otherCam = document.getElementById("cam_clone")?.cloneNode(true) as HTMLVideoElement;
                otherCam.id = `call-${userId}`
                this.stream.getTracks().forEach((track) => { if (this.stream) p2pConnection.addTrack(track, this.stream) });
                p2pConnection.onicecandidate = ((event: any) =>  this.socket.SendPacket('call/candidate', [userId], { can: event.candidate }));
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
                resolve(p2pConnection) 
            }
        }, 250);})
    } 
}