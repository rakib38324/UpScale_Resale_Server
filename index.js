const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);


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
        const bookingCollections = client.db('UpScale_ReSale').collection('Booking_Products');
        const paymentCollections = client.db('UpScale_ReSale').collection('Payment');


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
            // console.log(user?.role)
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
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            
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

        app.get('/myproducts/:email',verifyJWT, async (req, res) => {
            const SellerEmail = req.decoded.email;
            // console.log(SellerEmail)
            const query = { SellerEmail  }
            const result = await productsCollections.find(query).toArray();
            res.send(result);
        })

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

        app.post('/create-payment-intent', async(req,res)=>{
            const booking =req.body;
            const price = booking.ProductPrice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.post('/payment', async (req,res)=>{
            const payment = req.body;
            const result = await paymentCollections.insertOne(payment);
            const id = payment.bookingId
            const filter = {_id: ObjectId(id)}
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                    productMian_ID: payment.productMian_ID
                }
            }
            const updateResult = await bookingCollections.updateOne(filter, updatedDoc)
            res.send(result)
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


        app.put('/product/status/:id', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollections.findOne(query);

            if (user?.profileType !== 'Seller') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }


            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    status: 'Available'
                }
            }
            const result = await productsCollections.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        

        app.delete('/product/status/:id',verifyJWT, async(req,res)=>{

            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollections.findOne(query);

            if (user?.profileType !== 'Seller') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }


            const id= req.params.id;
            const filter = {_id: ObjectId(id)};
            const result = await productsCollections.deleteOne(filter);
            res.send(result);
        })


        app.get('/products/:id', async (req, res) => {
            const id= req.params.id;
            // console.log(id)
            const filter = {brand_id: id};
            const result = await productsCollections.find(filter).toArray();
            // console.log(result)
            res.send(result);
        })


        app.put('/product/booking/:id', verifyJWT, async (req, res) => {
            


            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    Booking: 'Booked'
                }
            }
            const result = await productsCollections.updateOne(filter, updatedDoc, options);
            res.send(result);
        })


        app.post('/booking/product', async (req, res) => {
            const product = req.body;
            const result = await bookingCollections.insertOne(product);
            res.send(result);
        });

        app.get('/myorder/:email',verifyJWT, async (req, res) => {
            const buyeremail = req.decoded.email;
            // console.log(SellerEmail)
            const query = { buyeremail }
            const result = await bookingCollections.find(query).toArray();
            res.send(result);
        })



       


        app.get('/payment/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await bookingCollections.findOne(filter);
            // console.log(result)
            res.send(result);
        })


        

        app.put('/payment/completed/:id', async (req, res) => {
            
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    status: 'Sold'
                }
            }
            const result = await productsCollections.updateOne(filter, updatedDoc, options);
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