const express = require('express');
const app = express();
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const {FieldValue, getFirestore} = require('firebase-admin/firestore')
const mysql = require('mysql');
require('dotenv').config();
app.use(cors());
app.use(express.json());

port = 3080;
app.listen(port, () => {
    console.log(`Server listening on the port::${port}`);
});

//connectar bd relacional Mysql____
const connectionMysql = mysql.createConnection({
    host: process.env.DB_HOST, //Canviar per ip del servidor un cop estigui el node alla?
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});
connectionMysql.connect((err)=>{
    if (err) throw err;
    console.log('Connectat a la BDD!');
});
//______________________________________

var admin = require("firebase-admin");
const {request} = require("express");
const Process = require("process");
var serviceAccount;
var fitxer;
var db;
fs.readFile('./ConnexioBD','utf-8',(error, contingut)=> {
    if (error){
        console.error(error);
        return;
    }else {
        fitxer = contingut;
        serviceAccount = require(fitxer);
        const {getFirestore} = require("firebase-admin/firestore");
        const {firestore} = require("firebase-admin");
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = getFirestore();
        dbConnection();
    }
}) ;



async function dbConnection(){
    const conn = db.collection("book-net").doc("clients");
    const doc = await conn.get();
    if (!doc.exists){
        console.log("El document no existeix!")
    }else{
            app.get('/api/firebase',async (req, res) => {

                const conn = db.collection("book-net").doc("clients");
                const doc = await conn.get();

                const document = doc.data();
                res.json(document);
            })

    }
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'Imatges/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });
app.post('/signup', async (req, res) =>{
    const userResponse = await admin.auth().createUser({
        email: req.body.email,
        password: req.body.password,
        emailVerified: false,
        disabled: false,
    });
    res.json(userResponse);
})
app.post('/datausers',(req, res) => {
    db.collection("book-net").doc("clients").set({
        clients: FieldValue.arrayUnion({
            Adreça: req.body.Adreça,
            Cognoms: req.body.Cognoms,
            Correu: req.body.Correu,
            Nom: req.body.Nom,
            Telèfon: req.body.Telèfon,
            Rol: req.body.Rol})
    },{merge:true})
})

app.post('/datausersdelete',(req, res) => {
    db.collection("book-net").doc("clients").update({
        clients: FieldValue.arrayRemove({
            Adreça: req.body.Adreça,
            Cognoms: req.body.Cognoms,
            Correu: req.body.Correu,
            Nom: req.body.Nom,
            Telèfon: req.body.Telèfon,
            Rol: req.body.Rol})
    })
})

app.post('/contacte', (req, res)=>{
    let data = new Date();
    let dia = data.getDate();
    let mes = data.getMonth() + 1;
    let any = data.getFullYear();
    let hora = data.getHours();
    let minuts = data.getMinutes();
    let segons = data.getSeconds();
    let data_completa = `${dia}${mes}${any}${hora}${minuts}${segons}`;
    let fitxerContacte = fs.createWriteStream(`Contacte/${data_completa}_contacte.txt`);
    fitxerContacte.write(req.body.nom+"\n");
    fitxerContacte.write(req.body.correu+"\n");
    fitxerContacte.end(req.body.missatge);
})

app.get('/imatges/:nom',(req,res)=>{
    const nomImatge = req.params.nom;
    const rutaImatge = `${__dirname}/Imatges/${nomImatge}`;

    fs.access(rutaImatge, fs.constants.F_OK, (err) => {
        if (err) {
            res.status(404).send(`No s'ha trobat la fofo`);
            return;
        }
        const stream = fs.createReadStream(rutaImatge);
        stream.pipe(res);
    });
})

app.post('/log',(req,res)=>{
    let data = new Date();
    let dia = data.getDate();
    let mes = data.getMonth() + 1;
    let any = data.getFullYear();
    let hora = data.getHours();
    let minuts = data.getMinutes();
    let segons = data.getSeconds();
    let data_completa = `${dia}${mes}${any}${hora}${minuts}${segons}`;
    fs.writeFileSync(`log/${req.body.log}.log`, `${data_completa} ${req.body.text}\n`,{flag:'a+'});
})

// Projecte Botiga A5


app.get('/productes', (req, res) => {
    connectionMysql.query('SELECT * FROM projecta_botiga.productes_botiga', (error, results) => {
        if (error) throw error;
        res.send(results);
    });
});

app.post('/log/compraproductes', (req, res) => {
        const query = req.body.query;
        const values = req.body.values;
        connectionMysql.query(query,values, (err, result)=>{
            if (err){
                res.status(500).send(`Error: ${err}`);
            }else{
                res.send(`Registre inserit amb èxit`);
            }
        });
});

app.post('/afegirproducte', upload.single('imatge'), (req, res) => {

    const nom = req.body.nom;
    const descripcio = req.body.descripcio;
    const preu = req.body.preu;
    const categoria = req.body.categoria;

    const file = req.file;
    const filepath = `http://172.16.8.1:${port}/imatges/${file.originalname}`
    fs.readFile(file.path, (err, data) => {
        if (err) {
            res.status(500).send('Error de lectura en el fitxer!');
            return;
        }
        fs.writeFile(`imatges/${file.originalname}`, data, (err) => {
            res.status(200).send('Imatge al server!');
        });
    });
    const sql = 'INSERT INTO projecta_botiga.productes_botiga (id, nom, descripcio, preu, imatge, quantitat, categoria, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    connectionMysql.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM projecta_botiga.productes_botiga', (error, results, fields) => {
        if (error) throw error;

        const nextId = results[0].next_id;

        const values = [nextId, nom, descripcio, preu, filepath, 1, categoria, 0];
        connectionMysql.query(sql, values, (error, results, fields) => {
            if (error) throw error;
            console.log('Producte Afegit!');
        });
    });

});

app.get('/dadescompres', (req, res) => {
    connectionMysql.query('SELECT * FROM projecta_botiga.registres_compra', (error, results) => {
        if (error) throw error;
        res.json(results);
    });
});

