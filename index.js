const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;


const allowedOrigins = [
  process.env.FRONTEND_URL_1,
  process.env.FRONTEND_URL_2,
  process.env.FRONTEND_URL_3,
  process.env.FRONTEND_PROD_URL
].filter(Boolean); 


app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    

    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ message: 'Request timeout' });
  });
  next();
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },

  connectTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 30000,  // 30 seconds
  maxPoolSize: 10,
  retryWrites: true,
  retryReads: true
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const database = client.db('taskMarketplace');
    const tasksCollection = database.collection('tasks');
    const bidsCollection = database.collection('bids');

    // Health check and root routes
    app.get('/', (req, res) => {
      res.json({ 
        message: 'TaskMarket API is running successfully!',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        endpoints: {
          tasks: '/tasks',
          featuredTasks: '/tasks/featured',
          bids: '/bids',
          stats: '/stats'
        }
      });
    });


    app.get('/favicon.ico', (req, res) => {
      res.status(204).send();
    });
    
    app.get('/favicon.png', (req, res) => {
      res.status(204).send();
    });


    app.get('/health', async (req, res) => {
      try {
        await database.admin().ping();
        res.json({
          status: 'healthy',
          database: 'connected',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          database: 'disconnected',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get all tasks
    app.get('/tasks', async (req, res) => {
      try {
        const tasks = await tasksCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();
        res.send(tasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).send({ message: 'Error fetching tasks', error: error.message });
      }
    });

    // Get featured tasks 
    app.get('/tasks/featured', async (req, res) => {
      try {
        const tasks = await tasksCollection
          .find()
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();
        res.send(tasks);
      } catch (error) {
        console.error('Error fetching featured tasks:', error);
        res.status(500).send({ message: 'Error fetching featured tasks', error: error.message });
      }
    });

    // Get single task by ID
    app.get('/tasks/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid task ID format' });
        }
        
        const query = { _id: new ObjectId(id) };
        const task = await tasksCollection.findOne(query);
        
        if (!task) {
          return res.status(404).send({ message: 'Task not found' });
        }
        
        res.send(task);
      } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).send({ message: 'Error fetching task', error: error.message });
      }
    });

    // Get tasks by user email (My Posted Tasks)
    app.get('/my-tasks/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { userEmail: email };
        const tasks = await tasksCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();
        res.send(tasks);
      } catch (error) {
        console.error('Error fetching user tasks:', error);
        res.status(500).send({ message: 'Error fetching user tasks', error: error.message });
      }
    });

    // Create new task
    app.post('/tasks', async (req, res) => {
      try {
        const task = req.body;
        
        // Validation
        if (!task.title || !task.category || !task.description || !task.deadline || !task.budget) {
          return res.status(400).send({ message: 'All fields are required' });
        }
        
        // Add metadata
        task.createdAt = new Date();
        task.updatedAt = new Date();
        task.status = 'open';
        task.bidCount = 0;
        
        const result = await tasksCollection.insertOne(task);
        res.status(201).send({ message: 'Task created successfully', taskId: result.insertedId });
      } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).send({ message: 'Error creating task', error: error.message });
      }
    });

    // Update task
    app.put('/tasks/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid task ID format' });
        }
        
        const filter = { _id: new ObjectId(id) };
        const updatedTask = req.body;
        
        // Validation
        if (!updatedTask.title || !updatedTask.category || !updatedTask.description || 
            !updatedTask.deadline || !updatedTask.budget) {
          return res.status(400).send({ message: 'All fields are required' });
        }
        
        const updateDoc = {
          $set: {
            title: updatedTask.title,
            category: updatedTask.category,
            description: updatedTask.description,
            deadline: updatedTask.deadline,
            budget: parseFloat(updatedTask.budget),
            updatedAt: new Date()
          }
        };
        
        const result = await tasksCollection.updateOne(filter, updateDoc);
        
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Task not found' });
        }
        
        res.send({ message: 'Task updated successfully', modifiedCount: result.modifiedCount });
      } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).send({ message: 'Error updating task', error: error.message });
      }
    });

    // Delete task
    app.delete('/tasks/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid task ID format' });
        }
        
        const query = { _id: new ObjectId(id) };
        
        // Also delete related bids
        await bidsCollection.deleteMany({ taskId: id });
        
        const result = await tasksCollection.deleteOne(query);
        
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: 'Task not found' });
        }
        
        res.send({ message: 'Task and related bids deleted successfully' });
      } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).send({ message: 'Error deleting task', error: error.message });
      }
    });

    // ============== BID ENDPOINTS ==============

    // Get all bids for a specific task
    app.get('/bids/:taskId', async (req, res) => {
      try {
        const taskId = req.params.taskId;
        const query = { taskId: taskId };
        const bids = await bidsCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();
        res.send(bids);
      } catch (error) {
        console.error('Error fetching bids:', error);
        res.status(500).send({ message: 'Error fetching bids', error: error.message });
      }
    });

    // Get bids by bidder email
    app.get('/my-bids/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { bidderEmail: email };
        const bids = await bidsCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();
        res.send(bids);
      } catch (error) {
        console.error('Error fetching user bids:', error);
        res.status(500).send({ message: 'Error fetching user bids', error: error.message });
      }
    });

    // Create new bid
    app.post('/bids', async (req, res) => {
      try {
        const bid = req.body;
        
        // Validation
        if (!bid.taskId || !bid.bidderEmail || !bid.amount) {
          return res.status(400).send({ message: 'Task ID, bidder email, and amount are required' });
        }
        
        // Check if user already bid on this task
        const existingBid = await bidsCollection.findOne({
          taskId: bid.taskId,
          bidderEmail: bid.bidderEmail
        });
        
        if (existingBid) {
          return res.status(400).send({ message: 'You have already placed a bid on this task' });
        }
        
        // Add metadata
        bid.createdAt = new Date();
        bid.status = 'pending';
        bid.amount = parseFloat(bid.amount);
        
        const result = await bidsCollection.insertOne(bid);
        
        // Update task bid count
        await tasksCollection.updateOne(
          { _id: new ObjectId(bid.taskId) },
          { $inc: { bidCount: 1 } }
        );
        
        res.status(201).send({ message: 'Bid placed successfully', bidId: result.insertedId });
      } catch (error) {
        console.error('Error creating bid:', error);
        res.status(500).send({ message: 'Error creating bid', error: error.message });
      }
    });

    // Update bid status (accept/reject)
    app.patch('/bids/:id/status', async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;
        
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid bid ID format' });
        }
        
        if (!['accepted', 'rejected'].includes(status)) {
          return res.status(400).send({ message: 'Status must be either accepted or rejected' });
        }
        
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: status,
            updatedAt: new Date()
          }
        };
        
        const result = await bidsCollection.updateOne(filter, updateDoc);
        
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Bid not found' });
        }
        
        res.send({ message: `Bid ${status} successfully` });
      } catch (error) {
        console.error('Error updating bid status:', error);
        res.status(500).send({ message: 'Error updating bid status', error: error.message });
      }
    });

    // ============== UTILITY ENDPOINTS ==============

    // Get task statistics
    app.get('/stats', async (req, res) => {
      try {
        const totalTasks = await tasksCollection.countDocuments();
        const openTasks = await tasksCollection.countDocuments({ status: 'open' });
        const totalBids = await bidsCollection.countDocuments();
        
        const categoryStats = await tasksCollection.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray();
        
        res.send({
          totalTasks,
          openTasks,
          totalBids,
          categoryStats
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).send({ message: 'Error fetching statistics', error: error.message });
      }
    });

    // Search tasks
    app.get('/search/tasks', async (req, res) => {
      try {
        const { q, category, minBudget, maxBudget } = req.query;
        let query = {};
        
        if (q) {
          query.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } }
          ];
        }
        
        if (category && category !== 'all') {
          query.category = category;
        }
        
        if (minBudget || maxBudget) {
          query.budget = {};
          if (minBudget) query.budget.$gte = parseFloat(minBudget);
          if (maxBudget) query.budget.$lte = parseFloat(maxBudget);
        }
        
        const tasks = await tasksCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();
          
        res.send(tasks);
      } catch (error) {
        console.error('Error searching tasks:', error);
        res.status(500).send({ message: 'Error searching tasks', error: error.message });
      }
    });

    // Root endpoint
    app.get('/', (req, res) => {
      res.send(`
        <h1>Task Marketplace API</h1>
        <p>Backend server is running successfully!</p>
        <h3>Available Endpoints:</h3>
        <ul>
          <li>GET /tasks - Get all tasks</li>
          <li>GET /tasks/featured - Get featured tasks</li>
          <li>GET /tasks/:id - Get task by ID</li>
          <li>GET /my-tasks/:email - Get tasks by user email</li>
          <li>POST /tasks - Create new task</li>
          <li>PUT /tasks/:id - Update task</li>
          <li>DELETE /tasks/:id - Delete task</li>
          <li>GET /bids/:taskId - Get bids for task</li>
          <li>GET /my-bids/:email - Get bids by user</li>
          <li>POST /bids - Create new bid</li>
          <li>PATCH /bids/:id/status - Update bid status</li>
          <li>GET /stats - Get platform statistics</li>
          <li>GET /search/tasks - Search tasks</li>
        </ul>
      `);
    });

    // ============== SAMPLE DATA SEEDING ==============
    
    // Seed sample data (only if collections are empty)
    app.post('/seed-data', async (req, res) => {
      try {
        const taskCount = await tasksCollection.countDocuments();
        
        if (taskCount === 0) {
          const sampleTasks = [
            {
              title: 'Build a Modern React Website',
              category: 'Web Development',
              description: 'Need a modern, responsive React website with clean UI/UX design. Should include user authentication, dashboard, and mobile responsiveness.',
              budget: 800,
              deadline: '2025-11-15',
              userEmail: 'john.doe@example.com',
              userName: 'John Doe',
              createdAt: new Date(),
              updatedAt: new Date(),
              status: 'open',
              bidCount: 0
            },
            {
              title: 'Logo Design for Tech Startup',
              category: 'Design',
              description: 'Create a professional, modern logo for a technology startup. Should be scalable and work well in both light and dark themes.',
              budget: 300,
              deadline: '2025-10-25',
              userEmail: 'jane.smith@example.com',
              userName: 'Jane Smith',
              createdAt: new Date(),
              updatedAt: new Date(),
              status: 'open',
              bidCount: 0
            },
            {
              title: 'SEO Content Writing',
              category: 'Writing',
              description: 'Write 10 SEO-optimized blog posts for a digital marketing website. Each post should be 1000-1500 words with proper keyword research.',
              budget: 500,
              deadline: '2025-11-30',
              userEmail: 'mike.johnson@example.com',
              userName: 'Mike Johnson',
              createdAt: new Date(),
              updatedAt: new Date(),
              status: 'open',
              bidCount: 0
            },
            {
              title: 'Mobile App UI/UX Design',
              category: 'Design',
              description: 'Design a complete UI/UX for a mobile fitness app. Should include wireframes, mockups, and a design system.',
              budget: 1200,
              deadline: '2025-12-20',
              userEmail: 'sarah.wilson@example.com',
              userName: 'Sarah Wilson',
              createdAt: new Date(),
              updatedAt: new Date(),
              status: 'open',
              bidCount: 0
            },
            {
              title: 'WordPress E-commerce Setup',
              category: 'Web Development',
              description: 'Set up a complete WordPress e-commerce store with WooCommerce, payment gateway integration, and custom theme.',
              budget: 600,
              deadline: '2025-11-10',
              userEmail: 'alex.brown@example.com',
              userName: 'Alex Brown',
              createdAt: new Date(),
              updatedAt: new Date(),
              status: 'open',
              bidCount: 0
            },
            {
              title: 'Social Media Marketing Campaign',
              category: 'Marketing',
              description: 'Create and manage a 3-month social media marketing campaign for a local restaurant. Includes content creation and ad management.',
              budget: 900,
              deadline: '2025-12-15',
              userEmail: 'lisa.davis@example.com',
              userName: 'Lisa Davis',
              createdAt: new Date(),
              updatedAt: new Date(),
              status: 'open',
              bidCount: 0
            }
          ];
          
          await tasksCollection.insertMany(sampleTasks);
          res.send({ message: 'Sample data seeded successfully', tasksAdded: sampleTasks.length });
        } else {
          res.send({ message: 'Database already contains data', taskCount });
        }
      } catch (error) {
        console.error('Error seeding data:', error);
        res.status(500).send({ message: 'Error seeding data', error: error.message });
      }
    });

    // Global error handler
    app.use((err, req, res, next) => {
      console.error('Unhandled error:', err);
      res.status(500).send({ message: 'Internal server error', error: err.message });
    });

    // Global error handling middleware
    app.use((error, req, res, next) => {
      console.error('Global error handler:', error);
      res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });

    // 404 handler for unknown routes
    app.use('*', (req, res) => {
      res.status(404).json({ 
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
      });
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    // Don't exit the process, just log the error and continue
    // This prevents the server from crashing
    console.log('Server will continue running without database connection');
  }
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  try {
    await client.close();
    console.log('MongoDB connection closed.');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Shutting down gracefully...');
  try {
    await client.close();
    console.log('MongoDB connection closed.');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

run().catch(console.dir);

// app.listen(port, () => {
//   console.log(`Task Marketplace server is running on port ${port}`);
//   console.log(`API Documentation available at http://localhost:${port}`);
// });


module.exports = app;