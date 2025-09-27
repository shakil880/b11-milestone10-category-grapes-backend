# Task Marketplace Backend API

A complete RESTful API backend for the Task Marketplace application built with Express.js and MongoDB.

## 🚀 Features

- **Task Management**: Create, read, update, delete tasks
- **Bidding System**: Place and manage bids on tasks
- **User-specific Data**: Get tasks and bids by user email
- **Search & Filter**: Search tasks with various criteria
- **Statistics**: Get platform statistics
- **Data Validation**: Comprehensive input validation
- **Error Handling**: Robust error handling and logging
- **Sample Data**: Automatic sample data seeding

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Atlas)
- **ODM**: MongoDB Native Driver
- **CORS**: Cross-Origin Resource Sharing enabled
- **Environment**: dotenv for environment variables

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```env
   DB_USER=your-mongodb-username
   DB_PASS=your-mongodb-password
   DB_CLUSTER=your-cluster-url.mongodb.net
   PORT=5000
   ```

4. **Start the server**
   ```bash
   # Development (with auto-restart)
   npm run dev
   
   # Production
   npm start
   ```

## 🌐 API Endpoints

### Tasks
- `GET /tasks` - Get all tasks
- `GET /tasks/featured` - Get featured tasks (latest 6)
- `GET /tasks/:id` - Get task by ID
- `GET /my-tasks/:email` - Get tasks by user email
- `POST /tasks` - Create new task
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task

### Bids
- `GET /bids/:taskId` - Get all bids for a task
- `GET /my-bids/:email` - Get bids by user email
- `POST /bids` - Create new bid
- `PATCH /bids/:id/status` - Update bid status (accept/reject)

### Utility
- `GET /stats` - Get platform statistics
- `GET /search/tasks` - Search tasks with filters
- `POST /seed-data` - Seed sample data (development only)

## 📊 Database Schema

### Tasks Collection
```json
{
  "_id": "ObjectId",
  "title": "string",
  "category": "string",
  "description": "string",
  "budget": "number",
  "deadline": "string (ISO date)",
  "userEmail": "string",
  "userName": "string",
  "createdAt": "Date",
  "updatedAt": "Date",
  "status": "string (open/closed)",
  "bidCount": "number"
}
```

### Bids Collection
```json
{
  "_id": "ObjectId",
  "taskId": "string",
  "bidderEmail": "string",
  "bidderName": "string",
  "amount": "number",
  "message": "string",
  "status": "string (pending/accepted/rejected)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## 🔧 Development

### Adding Sample Data
```bash
curl -X POST http://localhost:5000/seed-data
```

### Testing Endpoints
```bash
# Get all tasks
curl http://localhost:5000/tasks

# Create a task
curl -X POST http://localhost:5000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "category": "Web Development",
    "description": "Test description",
    "budget": 500,
    "deadline": "2025-12-31",
    "userEmail": "test@example.com",
    "userName": "Test User"
  }'
```

## 🚦 Server Status

When the server starts successfully, you'll see:
```
🚀 Task Marketplace server is running on port 5000
📊 API Documentation available at http://localhost:5000
Connected to MongoDB!
```

## 🔍 Error Handling

The API includes comprehensive error handling:
- **400**: Bad Request (validation errors)
- **404**: Not Found (resource not found)
- **500**: Internal Server Error (server/database errors)

## 🌍 CORS Configuration

CORS is configured to allow requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:5174` (Alternative Vite port)
- `http://localhost:5175` (Alternative Vite port)

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_USER` | MongoDB username | `myuser` |
| `DB_PASS` | MongoDB password | `mypassword123` |
| `DB_CLUSTER` | MongoDB cluster URL | `cluster0.abc123.mongodb.net` |
| `PORT` | Server port | `5000` |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.