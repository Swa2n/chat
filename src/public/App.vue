<script setup lang="ts">
import { start } from "@popperjs/core";
import "./assets/main.css"
import { Socket } from "./components/WebSocket";
import { appStartData, rtcData, socketMessageData, user } from "./components/interface";
import { ref, onMounted, onUnmounted, inject } from 'vue';

const sendMessageToServer = inject<(data: string) => void>('sendMessageToServer');

const emit = defineEmits(['messageSent'])

const count = ref(0);
const messageInput = ref<HTMLInputElement>();
const usernameInput = ref<HTMLInputElement>();
const passwordInput = ref<HTMLInputElement>();
const webcam = ref<HTMLVideoElement>();
const farawayland = ref<HTMLVideoElement>();
const p2pid = ref<HTMLInputElement>();

let socket: Socket;

function globalHotKey(event: KeyboardEvent) {
  if (event.ctrlKey && event.key === '/') {
    event.preventDefault();
  }
}

async function handleInput() {
  if (!socket || !messageInput.value || !sendMessageToServer || socket.user.loggedIn) return;
  sendMessageToServer(messageInput.value?.value);

  messageInput.value.value = "";
}

async function log_in() {
  if (socket && usernameInput.value && passwordInput.value && !socket.user.loggedIn) 
    await socket.connect(usernameInput.value.value, passwordInput.value.value, true);
}

async function sign_up() {
  if (socket && usernameInput.value && passwordInput.value && !socket.user.loggedIn) 
    await socket.connect(usernameInput.value.value, passwordInput.value.value, false);
}

async function startCamera() {
  try {
    if (!webcam.value) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    webcam.value.srcObject = stream;
  } catch (error) {
    console.error("It was smth in ur bum ass code :3 :", error);
  }
}

async function startP2pConnection() {
  if (!socket.connection || !socket.peerConnections || !p2pid.value) return;

  const userId = p2pid.value.value;
  
  socket.createP2pConnection(userId)
  .then((p2pConn) => { 
    p2pConn.createOffer()
    .then((offer) => p2pConn.setLocalDescription(offer))
    .then(() => socket.connection?.send(JSON.stringify({ type: "offer", receiver: userId, data: { sdp: p2pConn.localDescription, userId: socket.user.userId }})))
  });
}

onMounted(() => {
  window.addEventListener('AppStart', (event) => {
    const customEvent = event as CustomEvent;
    const detail = customEvent.detail as appStartData;
    socket = detail.socket;
  })
  window.addEventListener('keydown', globalHotKey);

  messageInput.value?.addEventListener('keypress', (event) => {
    if (event.key == 'Enter') handleInput();
  });
  startCamera();
});

onUnmounted(() => {
  window.removeEventListener('keydown', globalHotKey);
})
</script>

<template>
  <!-- <button @click="count++">Count is: {{ count }}</button><br> -->
  <!-- <video id="webcam" ref="webcam" autoplay muted></video> -->
  <!-- <video id="farawayland" ref="farawayland" autoplay></video> -->

  <div id="preloginDiv" ref="preloginDiv" class="mainDiv">
    <input type="text" ref="usernameInput" placeholder="enter your username">
    <input type="text" ref="passwordInput" placeholder="enter your password"><br>
    <input type="button" @click="log_in" ref="login" value="log-in">
    <input type="button" @click="sign_up" ref="signup" value="sign-up">
  </div>
  <div id="postloginDiv" ref="postloginDiv" class="mainDiv" style="visibility: hidden;">
    <div id="chatDiv" class="postlogin mainDiv">
      <!-- <button @click="startP2pConnection">Start here gng</button><br> -->
      <!-- <input type="text" id="useridForp2p" ref="p2pid"></input><br> -->
      <dl ref="chat" id="chat" class="chatElements container overflow-auto d-flex flex-column-reverse"></dl>
      <input type="text" ref="messageInput" id="messageInput" class="chatElements" placeholder="Send a message..."/><br>
    </div>

    <div id="userList">
      <span class="userListGroupText">Online - </span>
      <span id="onlineNumber" class="userListGroupText" style="margin-left: 0px;">0</span>
      <dl id="onlineUserList">
        
      </dl>
    </div>
  </div>

  <div style="visibility: hidden;">
    <div id="list_clone" class="userListDiv">
      <span id="name" class="userListDivText" >USERNAME</span>
    </div>
  </div>
</template>