const mqtt=require('mqtt');
const mongoose=require('mongoose');
const express=require('express');
const http=require('http');
const socketio=require('socket.io');
const path=require('path');

const app=express();
const server=http.createServer(app);
const io=socketio(server);
const mongourl = 'mongodb+srv://Gearz:Cga6vAfmAbACn8Ld@waterbnb.otllsi5.mongodb.net/WaterBnb?retryWrites=true&w=majority';


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
  
const UserModel = mongoose.model('users', userSchema); //  User est le nom de la collection

/*
baptista;22301479
benna;22311378
bouchenguour;22306568
boulli;22311680
boussik;22002183
bruneau;22309088
colombani;22315240
daghar;22012941
diplacido;22005506
escobar;22003671
escoubeyrou;22306785
essafi;22004595
essamedwaraziz;22309059
foloka;21906562
girard;22004293
haddou;22312300
jeannin;22002387
municchi;21907979
parkash;22309663
savasta;21903402
vasseur;22012379
*/

const usersToAdd = [
    { nom: 'baptista', idu: '22301479' },
    { nom: 'benna', idu: '22311378' },
    { nom: 'bouchenguour', idu: '22306568' },
    { nom: 'boulli', idu: '22311680' },
    { nom: 'boussik', idu: '22002183' },
    { nom: 'bruneau', idu: '22309088' },
    { nom: 'colombani', idu: '22315240' },
    { nom: 'daghar', idu: '22012941' },
    { nom: 'diplacido', idu: '22005506' },
    { nom: 'escobar', idu: '22003671' },
    { nom: 'escoubeyrou', idu: '22306785' },
    { nom: 'essafi', idu: '22004595' },
    { nom: 'essamedwaraziz', idu: '22309059' },
    { nom: 'foloka', idu: '21906562' },
    { nom: 'girard', idu: '22004293' },
    { nom: 'haddou', idu: '22312300' },
    { nom: 'jeannin', idu: '22002387' },
    { nom: 'municchi', idu: '21907979' },
    { nom: 'parkash', idu: '22309663' },
    { nom: 'savasta', idu: '21903402' },
    { nom: 'vasseur', idu: '22012379' },
  ];
  
//   UserModel.insertMany(usersToAdd)
//     .then(() => {
//       console.log('Utilisateurs ajoutés avec succès');
//     })
//     .catch((err) => {
//       console.error('Erreur lors de l\'ajout des utilisateurs :', err);
//     });
  

// Utilisation de Promise.all pour attendre que toutes les opérations soient terminées
Promise.all(
    usersToAdd.map(async (user) => {
      try {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await UserModel.findOne({ nom: user.nom }).exec();
  
        if (!existingUser) {
          // L'utilisateur n'existe pas, ajoutez-le à la base de données
          const newUser = new UserModel(user);
          await newUser.save();
          //console.log(`Utilisateur ${user.nom} ajouté avec succès`);
        } else {
          //console.log(`Utilisateur ${user.nom} existe déjà. Ignoré.`);
        }
      } catch (error) {
        console.error(`Erreur lors de l'ajout de l'utilisateur ${user.nom} :`, error);
      }
    })
  )
    .then(() => {
      console.log('Opérations d\'ajout terminées avec succès');
    })
    .catch((err) => {
      console.error('Erreur lors des opérations d\'ajout :', err);
    });
  

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

app.listen(3000, () => {
    console.log('listening on *:3000');
});

//récupère les requêtes HTTP GET avec la route "/open" avec le paramètre "idu" et "idswp"
app.get('/open', async (req, res) => {
    if (req.query.idu && req.query.idswp) {
        //check mongoose if the idu is in the database
        let idu = req.query.idu;
        let idswp = req.query.idswp;
        try {
            let user = await UserModel.findOne({idu: idu}).exec();
            if (user) {
                //send mqtt message to open the door
                client.publish('uca/waterbnb', JSON.stringify({idu: idu, idswp: idswp}));
                res.send({idu: idu, idswp: idswp, authorized: true});
            }
            else {
                res.send('User not found');
            }
        }
        catch (e) {
            console.error(e);
            res.send('Error');
        }
    }
    else {
        res.send('Argument missing');
    }
});