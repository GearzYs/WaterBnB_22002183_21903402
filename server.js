const mqtt=require('mqtt');
const mongoose=require('mongoose');
const express=require('express');
const http=require('http');
const socketio=require('socket.io');
const path=require('path');

const app=express();
const server=http.createServer(app);
const io=socketio(server);
const mongourl='mongodb+srv://Gearz:Cga6vAfmAbACn8Ld@waterbnb.otllsi5.mongodb.net/?retryWrites=true&w=majority';

//connect mqtt with password
const client=mqtt.connect('mqtt://84.235.237.236',{
    username:'espofuca',
    password:'vn3syxrrGQk91YKL44JOZGno'
});

client.on('connect', function () {
    console.log('Connected to MQTT broker');
    client.subscribe('uca/waterbnb', function (err) {
        if (err) {
            console.error('Failed to subscribe to MQTT topic');
        }
    });
});

client.on('connect', function () {
    console.log('Connected to MQTT pool broker');
    client.subscribe('uca/iot/piscine', function (err) {
        if (err) {
            console.error('Failed to subscribe to MQTT topic');
        }
    });
});

client.on('message', function (topic, message) {
    console.log('Received message:', topic, message.toString());
    try {
        let data = JSON.parse(message.toString());
        console.log(data);
    }
    catch (e) {
        console.error('Invalid JSON received');
    }
});

//récupère les requêtes HTTP GET avec la route "/open" avec le paramètre "idu" et "idswp"
app.get('/open', (req, res) => {
    console.log(req.query.idu);
    console.log(req.query.idswp);
    res.send('OK');
});