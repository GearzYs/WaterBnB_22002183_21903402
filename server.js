const mqtt=require('mqtt');
const mongoose=require('mongoose');
const express=require('express');
const http=require('http');
const fs=require('fs');

const app=express();
const mongourl = 'mongodb+srv://Gearz:Cga6vAfmAbACn8Ld@waterbnb.otllsi5.mongodb.net/WaterBnb?retryWrites=true&w=majority';

const usersTopic = "uca/waterbnb";
const poolTopic = "uca/iot/piscine";
// Connecter database name: waterbnb
mongoose.connect(mongourl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connecté à MongoDB');
    console.log('MongoDB Database Name: ', mongoose.connection.name);
  })
  .catch((err) => {
    console.error('Erreur de connexion à MongoDB :', err);
  });

// connect to WaterBnb database


// Test Schema
const userSchema = new mongoose.Schema({
   nom: String, 
   idu: String, //voir si cest pas un int 
});

const poolSchema = new mongoose.Schema({
    idswp: String,
    idu: String,
    temp: Number,
    lat: Number,
    lon: Number,
    isOccuped: Boolean,
    numberOfRent: Number
});
  
const UserModel = mongoose.model('users', userSchema);
const PoolModel = mongoose.model('pools', poolSchema);

//check if user exist in the database
async function checkIfUserExist(idu){
    try {
        let user = await UserModel.findOne({idu: idu}).exec();
        console.log(user);
        if (user) {
            return true;
        }
        else {
            return false;
        }
    }
    catch (e) {
        console.error(e);
        return false;
    }
}

//check if pool exist in the database
async function checkIfPoolExist(idswp){
    try {
        let pool = await PoolModel.findOne({idswp: idswp}).exec();
        if (pool) {
            return pool;
        }
        else {
            return false;
        }
    }
    catch (e) {
        console.error(e);
        return false;
    }
}

// read file and put every line in an array
var users = fs.readFileSync('usersM1_2023.csv', 'utf8').split('\n');
for (var i = 0; i < users.length; i++) {
    if (users[i].length > 0) {
        users[i] = users[i].split(';');
    }
    else {
        users.splice(i, 1);
    }
}

async function addUsersToDatabase(users) {
    try {
      // Utilisation de Promise.all pour attendre que toutes les opérations soient terminées
      await Promise.all(users.map(async (user) => {
        // Vérification si l'utilisateur existe déjà
        const userExist = await UserModel.exists({ idu: user[1] });
        if (userExist) {
          //console.log(`Utilisateur ${user[0]} existe déjà`);
        }
        else {
            const newUser = new UserModel({
                nom: user[0],
                idu: user[1],
            });
            await newUser.save();
            //console.log(`Utilisateur ${user[0]} ajouté avec succès`);
        }
      }));
      console.log('Opérations d\'ajout terminées avec succès');
    } catch (error) {
      console.error('Erreur lors des opérations d\'ajout :', error);
    }
  }
  
  addUsersToDatabase(users);


const client=mqtt.connect('mqtt://test.mosquitto.org');

/*const client=mqtt.connect('mqtt://84.235.237.236',{
    username:'espofuca',
    password:'vn3syxrrGQk91YKL44JOZGno'
});*/

client.on('connect', function () {
    console.log('Connected to MQTT users broker');
    client.subscribe(usersTopic, function (err) {
        if (err) {
            console.error('Failed to subscribe to MQTT topic');
        }
    });
});

client.on('connect', function () {
    console.log('Connected to MQTT pool broker');
    client.subscribe(poolTopic, function (err) {
        if (err) {
            console.error('Failed to subscribe to MQTT topic');
        }
    });
});

const updatePool = async (data) => {
    try {
        let pool = await checkIfPoolExist(data.idswp);
        if (pool) {
            pool.temp = data.status.temperature
            pool.lat = data.location.gps.lat;
            pool.lon = data.location.gps.lon;
            pool.isOccuped = data.piscine.occuped;
            await pool.save();
        }
        else {
            const newPool = new PoolModel({
                idswp: data.info.ident,
                idu: null,
                temp: data.status.temperature,
                lat: data.location.gps.lat,
                lon: data.location.gps.lon,
                isOccuped: data.piscine.occuped,
                numberOfRent: 0
            });
            await newPool.save();
        }
    }
    catch (e) {
        console.error(e);
    }
}

client.on('message', function (topic, message) {
    //console.log('Received message:', topic, message.toString());
    try {
        if (topic === poolTopic) {
            let data = JSON.parse(message.toString());
            updatePool(data);
        }
    }
    catch (e) {
        console.error(e);
    }
});

//récupère les requêtes HTTP GET avec la route "/open" avec le paramètre "idu" et "idswp"
app.get('/open', async (req, res) => {
    if (req.query.idu && req.query.idswp) {
        //check mongoose if the idu is in the database
        let idu = req.query.idu;
        let idswp = req.query.idswp;
        let userExist = await checkIfUserExist(idu);
        if (userExist) {
            client.publish('uca/waterbnb', JSON.stringify({idu: idu, idswp: idswp}));
            res.send({idu: idu, idswp: idswp, granted: "YES"});
            //mqtt publish
            client.publish('uca/waterbnb', JSON.stringify({idu: idu, idswp: idswp, granted: "YES"}));
            if (await checkIfPoolExist(idswp)) {
                let pool = await PoolModel.findOne({idswp: idswp}).exec();
                pool.idu = idu;
                pool.numberOfRent += 1;
                await pool.save();
            }
        }
        else {
            res.send({idu: idu, idswp: idswp, granted: "NO"});
            //mqtt publish
            client.publish('uca/waterbnb', JSON.stringify({idu: idu, idswp: idswp, granted: "NO"}));
        }
    }
    else {
        res.send('Argument missing');
    }
});