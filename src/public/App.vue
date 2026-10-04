<script setup lang="ts">
import "./assets/main.css"
import { Socket } from "./components/WebSocket";
import { ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['messageSent'])

const count = ref(0);
const messageInput = ref<HTMLInputElement>();
const usernameInput = ref<HTMLInputElement>();
const passwordInput = ref<HTMLInputElement>();
const p2pid = ref<HTMLInputElement>();

let socket: Socket;

function globalHotKey(event: KeyboardEvent) {
  if (event.ctrlKey && event.key === '/') {
    event.preventDefault();
  }
}

async function handleInput() {
  if (!socket || !messageInput.value|| socket.user.loggedIn) return;
  socket.SendMessage(messageInput.value?.value);

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
		const webcam = document.getElementById("user_cam_clone")?.cloneNode(true) as HTMLVideoElement;
		webcam.id = "webcam";
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    webcam.srcObject = stream;
		document.getElementById("videoContainer")?.append(webcam);
		console.log(webcam);
  } catch (error) {
    console.error(error);
  }
}

globalThis.StartUserCamera = startCamera;

onMounted(() => {
  window.addEventListener('AppStart', (event) => {
    const customEvent = event as CustomEvent;
    const detail = customEvent.detail;
    socket = detail.socket;
  })
  window.addEventListener('keydown', globalHotKey);

  messageInput.value?.addEventListener('keypress', (event) => {
    if (event.key == 'Enter') handleInput();
  });
});

onUnmounted(() => {
  window.removeEventListener('keydown', globalHotKey);
})
</script>

<template>
  <!-- <button @click="count++">Count is: {{ count }}</button><br> -->

  <div id="preloginDiv" ref="preloginDiv" class="mainDiv">
    <input type="text" ref="usernameInput" placeholder="enter your username">
    <input type="text" ref="passwordInput" placeholder="enter your password"><br>
    <input type="button" @click="log_in" ref="login" value="log-in">
    <input type="button" @click="sign_up" ref="signup" value="sign-up">
  </div>
  <div id="postloginDiv" ref="postloginDiv" class="mainDiv" style="visibility: hidden;">
    <div id="chatDiv" class="postlogin mainDiv">
      <dl ref="chat" id="chat" class="chatElements container overflow-auto d-flex flex-column-reverse"></dl>
      <input type="text" ref="messageInput" id="messageInput" class="chatElements" placeholder="Send a message..."/><br>

      <div id="callDiv">
        <div id="callBar">
          <input type="button" value="—">
          <input id="hangUpButton" type="button" value="X">
        </div>
        <div id="videoContainer"></div>
      </div>
    </div>

    <div id="userList">
      <span class="userListGroupText">Online - </span>
      <span id="onlineNumber" class="userListGroupText" style="margin-left: 0px;">0</span>
      <dl id="onlineUserList"></dl>
    </div>
  </div>

  <div style="visibility: hidden;">
    <div id="list_clone" class="userListDiv">
      <span id="name" class="userListDivText" >USERNAME</span>
      <button id="call" class="callButton">CALL</button> <!--Might need to change this to a image for call image-->
    </div>
    <video id="cam_clone" autoplay class="cameraVideo"></video>
		<video id="user_cam_clone" autoplay muted class="cameraVideo"></video>
  </div>
</template>