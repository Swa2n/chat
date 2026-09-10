<script setup lang="ts">
import "./components/interface"
import { ref, type Ref, onMounted, onUnmounted, inject } from 'vue';
import { logger } from './components/logger';
import './assets/main.css';
import { AppStartData } from "./components/interface";

const sendToTs = inject<(data: string) => void>('sendToTs');

const emit = defineEmits(['messageSent'])

const count = ref(0);
const logElement = ref(document.createElement("dl"));

let ws;

let logg: logger;

function globalHotKey (event: KeyboardEvent) {
  if (event.ctrlKey && event.key === '/') {
    event.preventDefault();
    logg.toggleVisibility();
  }
}

onMounted(() => {
  logg = new logger(logElement.value);
  window.addEventListener('AppStart', (event) => {
    const ahh = event as CustomEvent;
    const ahhh = ahh.detail as AppStartData;
    console.log(ahhh)
    ws = event;
    // ws.logger = logg;
  })
  window.addEventListener('keydown', globalHotKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', globalHotKey);
})
</script>

<template>
  <button @click="count++">Count is: {{ count }}</button><br>
  <input type="text" id="messageInput" placeholder="Type a message..." /><br>
  <button @click="" id="sendButton">Send</button>
  <dl ref="logElement" id="log"></dl>
</template>