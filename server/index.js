const express = require('express');
const WebSocket = require('ws');
const uuid = require("uuid");
const path = require("path");
const msgpack = require("msgpack-lite");
const app = express();
const wss = new WebSocket.Server({ noServer: true });
app.use(express.static("client"));
app.get("/", (_, res) => res.sendFile("client/index.html"));
console.log("running")