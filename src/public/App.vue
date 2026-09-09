<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { logger } from './components/logger';

const count = ref(0)

document.addEventListener("DOMContentLoaded", () => {
let log = new logger(document.getElementById("log"));

function handleGlobalKey(event) {
  if (event.ctrlKey && event.key == 'l') {
    event.preventDefault();
    log.toggleVisibility();
    console.log('Global shortcut triggered!');
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKey);
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKey);
})
})
</script>

<template>
  <button @click="count++">Count is: {{ count }}</button><br>
  <input type="text" id="messageInput" placeholder="Type a message..." /><br>
  <button id="sendButton">Send</button>
  <ul id="log"></ul>
</template>

<link rel="stylesheet" href="./assets/main.css">