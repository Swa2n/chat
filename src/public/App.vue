<script setup lang="ts">
import "./assets/main.css";
import { logger } from './components/logger';
import { Socket } from "./components/WebSocket";
import { AppStartData } from "./components/interface";
import { ref, type Ref, onMounted, onUnmounted, inject } from 'vue';

const sendMessageToServer = inject<(data: string) => void>('sendMessageToServer');

const emit = defineEmits(['messageSent'])

const count = ref(0);
const logElement = ref<HTMLDListElement | null>(null);
const messageInput = ref<HTMLInputElement | null>(null);

let socket: Socket;

let logg: logger;

function globalHotKey(event: KeyboardEvent) {
  if (event.ctrlKey && event.key === '/') {
    event.preventDefault();
    logg.toggleVisibility();
  }
}

function SendMessage() {
  if (sendMessageToServer && messageInput.value) sendMessageToServer(messageInput.value?.value);
}

onMounted(() => {
  console.log(logElement)
  if (logElement.value) logg = new logger(logElement.value);

  window.addEventListener('AppStart', (event) => {
    const customEvent = event as CustomEvent;
    const detail = customEvent.detail as AppStartData;
    socket = detail.socket;
    socket.logger = logg;
  })
  window.addEventListener('keydown', globalHotKey);

  if (messageInput.value) messageInput.value.placeholder = "Type a message...";
});

onUnmounted(() => {
  window.removeEventListener('keydown', globalHotKey);
})
</script>

<template>
  <button @click="count++">Count is: {{ count }}</button><br>
  <input type="text" ref="messageInput" id="messageInput" placeholder="Send a name..." /><br>
  <button @click="SendMessage" id="sendButton">Send</button>
  <dl ref="chat" id="chat" class="container mt-5 row overflow-auto"></dl>
  <dl ref="logElement" id="log"></dl>
</template>