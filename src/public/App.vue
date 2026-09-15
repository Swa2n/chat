<script setup lang="ts">
import "./assets/main.css";
import { Socket } from "./components/WebSocket";
import { appStartData } from "./components/interface";
import { ref, onMounted, onUnmounted, inject } from 'vue';

const sendMessageToServer = inject<(data: string) => void>('sendMessageToServer');

const emit = defineEmits(['messageSent'])

const count = ref(0);
const messageInput = ref<HTMLInputElement>();
const usernameInput = ref<HTMLInputElement>();
const passwordInput = ref<HTMLInputElement>();

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
});

onUnmounted(() => {
  window.removeEventListener('keydown', globalHotKey);
})
</script>

<template>
  <!-- <button @click="count++">Count is: {{ count }}</button><br> -->
  <div id="preloginDiv" ref="preloginDiv" class="mainDiv">
    <input type="text" ref="usernameInput" class="prelogin" placeholder="enter your username">
    <input type="text" ref="passwordInput" class="prelogin" placeholder="enter your password"><br>
    <input type="button" @click="log_in" ref="login" class="prelogin" value="log-in">
    <input type="button" @click="sign_up" ref="signup" class="prelogin" value="sign-up">
  </div>
  <div id="postloginDiv" ref="postloginDiv" class="mainDiv" style="visibility: hidden;">
    <input type="text" ref="messageInput" id="messageInput" class="postlogin" placeholder="Send a message..."/><br>
    <dl ref="chat" id="chat" class="container mt-5 overflow-auto"></dl>
  </div>
</template>