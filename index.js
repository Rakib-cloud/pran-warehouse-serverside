const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access!" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err) {
      return res.status(403).send({ message: "access forbidden!" });
    }
    req.decoded = decoded;
    next();
  });

   
}

//---db----

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c8sck.mongodb.net/pran-dealer-inventory?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const itemCollection = client
      .db("warehouse")
      .collection("item");

    //AUTH
    app.post("/getToken", (req, res) => {
      const user = req.body;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ accessToken });
    });

    //SERVICES API
    //get all inventory items
    app.get("/inventory", async (req, res) => {
      const query = {};
      const cursor = itemCollection.find(query);
      const items = await cursor.toArray();
      res.send(items);
    });

    //get a single item from inventory
    app.get("/inventory/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const item = await itemCollection.findOne(query);
      res.send(item);
    });

    // get all items of an user
    app.get("/myItems", verifyJWT, async (req, res) => {
      const tokenEmail = req.decoded?.email;
      const email = req.query.email;

      if (email === tokenEmail) {
        const query = { supplier: email };
        const cursor = itemCollection.find(query);
        const items = await cursor.toArray();
        res.send(items);
      }
      else {
        res.status(403).send({ message: "forbidden access!" });
      }
    });

    //add item to inventory - post
    app.post("/inventory", async (req, res) => {
      const newItem = req.body;
      const result = await itemCollection.insertOne(newItem);
      res.send(result);
    });

    //update quantity of an item
    app.put("/inventory/:id", async (req, res) => {
      const quantity = req.body;
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: quantity,
      };
      const result = await itemCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //Delete item
    app.delete("/inventory/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await itemCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello.....");
});

app.listen(port, () => {
  console.log("listening to port", port);
});
