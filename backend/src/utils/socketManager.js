let ioInstance;

module.exports = {
    init: (server) => {
        const { Server } = require('socket.io');
        ioInstance = new Server(server, {
            cors: {
                origin: "*", // allow frontend access
                methods: ["GET", "POST"]
            }
        });
        return ioInstance;
    },
    getIO: () => {
        if (!ioInstance) {
            console.warn('[SocketManager] Socket.io not initialized yet.');
            // Mock object to prevent crashes if called too early
            return { emit: () => {} }; 
        }
        return ioInstance;
    }
};
