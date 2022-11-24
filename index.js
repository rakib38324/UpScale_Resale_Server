const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const jwt= require('jsonwebtoken');
require('dotenv').config();

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());

// console.log(process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qlqg855.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try{

        const usersCollections = client.db('UpScale_ReSale').collection('Users');

        app.get('/users', async(req, res)=>{
            const query = {}
            const result = await usersCollections.find(query).toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollections.insertOne(user);
            res.send(result);
        });

        app.put('/users/admin/:id',async(req,res)=>{           
            const id = req.params.id;
            const filter = {_id: ObjectId(id)}
            const options = {upsert: true}
            const updatedDoc = {
                $set: {
                   role: 'admin',
                }
            }
            const result = await usersCollections.updateOne(filter, updatedDoc, options);
            res.send(result);
        })
        app.put('/users/verify/:id',async(req,res)=>{           
            const id = req.params.id;
            const filter = {_id: ObjectId(id)}
            const options = {upsert: true}
            const updatedDoc = {
                $set: {
                   verify: 'verified'
                }
            }
            const result = await usersCollections.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        app.delete('/users/:id', async(req,res)=>{
            const id= req.params.id;
            const filter = {_id: ObjectId(id)};
            const result = await usersCollections.deleteOne(filter);
            res.send(result);
        })

    }
    finally{

    }
}
run().catch(console.log);


app.get('/', async (req, res) => {
    res.send('UpScale ReSale Server is Running...');
})

app.listen(port, () => console.log(`UpScale ReSale Serve Running on ${port}`))