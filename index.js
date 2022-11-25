const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());

// console.log(process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qlqg855.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function verifyJWT(req, res, next) {
    // console.log('inside token',req.headers.authorization)

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized Access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {

            return (res.status(403).send({ message: 'Forbidden access.........' }))
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {

        const usersCollections = client.db('UpScale_ReSale').collection('Users');
        const brandCollections = client.db('UpScale_ReSale').collection('Brand_Name');
        const productsCollections = client.db('UpScale_ReSale').collection('Products');


        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollections.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '5h' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollections.findOne(query);
            console.log(user?.role)
            res.send({ isAdmin: user?.role === 'admin' });

        })

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollections.findOne(query);
            // console.log(user.role)
            res.send({ isSeller: user?.profileType === 'Seller' });

        })

        app.get('/users/UserHook/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollections.findOne(query);
            // console.log(user.role)
            res.send({ isUser: user?.profileType === 'User' });

        })

        app.get('/finduser', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollections.findOne(query);
            if (user) {
                return res.send({ accessToken: true });
            }
            return res.send({ accessToken: false });
        })


        app.get('/users', async (req, res) => {
            const query = {}
            const result = await usersCollections.find(query).toArray();
            res.send(result);
        })

        app.get('/allbuyer', async (req, res) => {
            const query = {
                profileType : 'User'
            }
            const result = await usersCollections.find(query).toArray();
            res.send(result);
        })

        app.get('/allseller', async (req, res) => {
            const query = {
                profileType : 'Seller'
            }
            const result = await usersCollections.find(query).toArray();
            res.send(result);
        })

        app.get('/brand', async (req, res) => {
            const query = {}
            const result = await brandCollections.find(query).toArray();
            res.send(result);
        })

        app.get('/brand/:email', async (req, res) => {
            const email = req.params.email;
            console.log(email)
            const query = { email }
            const brand = await usersCollections.findOne(query);
            // console.log(user.role)
            res.send(brand);

        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollections.insertOne(user);
            res.send(result);
        });
        
        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await productsCollections.insertOne(product);
            res.send(result);
        });

        app.put('/users/admin/:id', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollections.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }

            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    role: 'admin',
                }
            }
            const result = await usersCollections.updateOne(filter, updatedDoc, options);
            res.send(result);
        })
        app.put('/users/verify/:id', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollections.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }


            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    verify: 'verified'
                }
            }
            const result = await usersCollections.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        app.delete('/users/:id', verifyJWT, async (req, res) => {

            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollections.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }

            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollections.deleteOne(filter);
            res.send(result);
        })

    }
    finally {

    }
}
run().catch(console.log);


app.get('/', async (req, res) => {
    res.send('UpScale ReSale Server is Running...');
})

app.listen(port, () => console.log(`UpScale ReSale Serve Running on ${port}`))