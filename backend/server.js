require('dotenv').config();
const app = require('./src/app');

const http = require('http');
const socketManager = require('./src/utils/socketManager');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = socketManager.init(server);

io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
});

server.listen(PORT, () => {
    console.log(`[Server] Listening on http://localhost:${PORT}`);
});
