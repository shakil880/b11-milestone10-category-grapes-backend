const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const database = client.db('taskMarketplace');
    const tasksCollection = database.collection('tasks');
    const bidsCollection = database.collection('bids');

    app.get('/tasks', async (req, res) => {
      try {
        const tasks = await tasksCollection.find().toArray();
        res.send(tasks);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching tasks', error });
      }
    });

    app.get('/tasks/featured', async (req, res) => {
      try {
        const tasks = await tasksCollection
          .find()
          .sort({ deadline: 1 })
          .limit(6)
          .toArray();
        res.send(tasks);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching featured tasks', error });
      }
    });

    app.get('/tasks/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const task = await tasksCollection.findOne(query);
        res.send(task);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching task', error });
      }
    });

    app.get('/my-tasks/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { userEmail: email };
        const tasks = await tasksCollection.find(query).toArray();
        res.send(tasks);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching user tasks', error });
      }
    });

    app.post('/tasks', async (req, res) => {
      try {
        const task = req.body;
        task.createdAt = new Date();
        const result = await tasksCollection.insertOne(task);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error creating task', error });
      }
    });

    app.put('/tasks/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updatedTask = req.body;
        const task = {
          $set: {
            title: updatedTask.title,
            category: updatedTask.category,
            description: updatedTask.description,
            deadline: updatedTask.deadline,
            budget: updatedTask.budget
          }
        };
        const result = await tasksCollection.updateOne(filter, task, options);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error updating task', error });
      }
    });

    app.delete('/tasks/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await tasksCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error deleting task', error });
      }
    });

    app.get('/bids/:taskId', async (req, res) => {
      try {
        const taskId = req.params.taskId;
        const query = { taskId: taskId };
        const bids = await bidsCollection.find(query).toArray();
        res.send(bids);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching bids', error });
      }
    });

    app.post('/bids', async (req, res) => {
      try {
        const bid = req.body;
        bid.createdAt = new Date();
        const result = await bidsCollection.insertOne(bid);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error creating bid', error });
      }
    });

    app.get('/', (req, res) => {
      res.send('Task Marketplace Server is running');
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Task Marketplace server is running on port ${port}`);
});