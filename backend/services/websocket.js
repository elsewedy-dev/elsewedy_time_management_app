import { WebSocketServer } from 'ws';
import { logger } from '../utils/logger.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * WebSocket Service
 * Handles real-time communication for attendance updates
 */
class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    try {
      this.wss = new WebSocketServer({
        server,
        path: '/ws',
        verifyClient: this.verifyClient.bind(this),
      });

      this.wss.on('connection', this.handleConnection.bind(this));
      this.isInitialized = true;
      
      logger.info('WebSocket server initialized');
      
    } catch (error) {
      logger.error('Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  /**
   * Verify client connection
   */
  async verifyClient(info) {
    try {
      const token = this.extractTokenFromUrl(info.req.url);
      
      if (!token) {
        logger.warn('WebSocket connection rejected: No token provided');
        return false;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);
      
      if (!user || !user.isActive) {
        logger.warn('WebSocket connection rejected: Invalid user');
        return false;
      }

      // Attach user info to request
      info.req.user = user.toSafeObject();
      return true;
      
    } catch (error) {
      logger.warn('WebSocket connection rejected:', error.message);
      return false;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    const user = req.user;
    const clientId = `${user.id}_${Date.now()}`;
    
    // Store client connection
    this.clients.set(clientId, {
      ws,
      user,
      connectedAt: new Date(),
      subscriptions: new Set(),
    });

    // Set up message handlers
    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', () => this.handleDisconnection(clientId));
    ws.on('error', (error) => this.handleError(clientId, error));

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection',
      message: 'Connected to attendance system',
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    // Subscribe to user's relevant channels
    this.subscribeToChannels(clientId, user);

    logger.info(`WebSocket client connected: ${user.username} (${clientId})`);
  }

  /**
   * Handle WebSocket messages
   */
  handleMessage(clientId, data) {
    try {
      const message = JSON.parse(data.toString());
      const client = this.clients.get(clientId);
      
      if (!client) {
        logger.warn(`Message from unknown client: ${clientId}`);
        return;
      }

      switch (message.type) {
        case 'subscribe':
          this.handleSubscription(clientId, message.channel);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscription(clientId, message.channel);
          break;
          
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
          break;
          
        default:
          logger.warn(`Unknown message type from ${clientId}: ${message.type}`);
      }
      
    } catch (error) {
      logger.error(`Error handling message from ${clientId}:`, error);
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    
    if (client) {
      logger.info(`WebSocket client disconnected: ${client.user.username} (${clientId})`);
      this.clients.delete(clientId);
    }
  }

  /**
   * Handle client errors
   */
  handleError(clientId, error) {
    logger.error(`WebSocket client error for ${clientId}:`, error);
    this.clients.delete(clientId);
  }

  /**
   * Handle channel subscription
   */
  handleSubscription(clientId, channel) {
    const client = this.clients.get(clientId);
    
    if (!client) return;

    // Check if user has permission to subscribe to this channel
    if (!this.hasChannelPermission(client.user, channel)) {
      this.sendToClient(clientId, {
        type: 'error',
        message: `No permission to subscribe to channel: ${channel}`,
      });
      return;
    }

    client.subscriptions.add(channel);
    
    this.sendToClient(clientId, {
      type: 'subscribed',
      channel,
      message: `Subscribed to ${channel}`,
    });

    logger.debug(`Client ${clientId} subscribed to channel: ${channel}`);
  }

  /**
   * Handle channel unsubscription
   */
  handleUnsubscription(clientId, channel) {
    const client = this.clients.get(clientId);
    
    if (!client) return;

    client.subscriptions.delete(channel);
    
    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channel,
      message: `Unsubscribed from ${channel}`,
    });

    logger.debug(`Client ${clientId} unsubscribed from channel: ${channel}`);
  }

  /**
   * Subscribe to relevant channels based on user role
   */
  subscribeToChannels(clientId, user) {
    const channels = [];

    // Admin gets all channels
    if (user.role === 'admin') {
      channels.push('attendance:all', 'devices:all', 'employees:all', 'reports:all');
    }
    // HR Manager gets attendance and employee channels
    else if (user.role === 'hr_manager') {
      channels.push('attendance:all', 'employees:all');
    }
    // Finance gets attendance and reports
    else if (user.role === 'finance') {
      channels.push('attendance:all', 'reports:all');
    }
    // Employees get their own attendance
    else if (user.role === 'employee') {
      channels.push(`attendance:employee:${user.id}`);
    }

    // Subscribe to all relevant channels
    channels.forEach(channel => {
      this.handleSubscription(clientId, channel);
    });
  }

  /**
   * Check if user has permission for channel
   */
  hasChannelPermission(user, channel) {
    const [type, scope] = channel.split(':');
    
    switch (type) {
      case 'attendance':
        if (scope === 'all') {
          return ['admin', 'hr_manager', 'finance'].includes(user.role);
        }
        if (scope === 'employee') {
          return user.role === 'employee' && channel.endsWith(user.id);
        }
        return false;
        
      case 'devices':
        return ['admin', 'hr_manager'].includes(user.role);
        
      case 'employees':
        return ['admin', 'hr_manager'].includes(user.role);
        
      case 'reports':
        return ['admin', 'hr_manager', 'finance'].includes(user.role);
        
      default:
        return false;
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    
    if (!client || client.ws.readyState !== 1) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`Error sending message to client ${clientId}:`, error);
      this.clients.delete(clientId);
      return false;
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message, filter = null) {
    let sentCount = 0;
    
    for (const [clientId, client] of this.clients) {
      if (filter && !filter(client)) {
        continue;
      }
      
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }
    
    logger.debug(`Broadcasted message to ${sentCount} clients`);
    return sentCount;
  }

  /**
   * Broadcast to specific channel
   */
  broadcastToChannel(channel, message) {
    let sentCount = 0;
    
    for (const [clientId, client] of this.clients) {
      if (client.subscriptions.has(channel)) {
        if (this.sendToClient(clientId, message)) {
          sentCount++;
        }
      }
    }
    
    logger.debug(`Broadcasted to channel ${channel}: ${sentCount} clients`);
    return sentCount;
  }

  /**
   * Broadcast attendance update
   */
  broadcastAttendanceUpdate(attendance) {
    const message = {
      type: 'attendance_update',
      data: attendance,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all attendance channels
    this.broadcastToChannel('attendance:all', message);
    
    // Broadcast to specific employee channel
    this.broadcastToChannel(`attendance:employee:${attendance.employeeId}`, message);
  }

  /**
   * Broadcast device status update
   */
  broadcastDeviceUpdate(device) {
    const message = {
      type: 'device_update',
      data: device,
      timestamp: new Date().toISOString(),
    };

    this.broadcastToChannel('devices:all', message);
  }

  /**
   * Extract token from URL
   */
  extractTokenFromUrl(url) {
    const urlObj = new URL(url, 'http://localhost');
    return urlObj.searchParams.get('token');
  }

  /**
   * Get connected clients info
   */
  getClientsInfo() {
    const clients = [];
    
    for (const [clientId, client] of this.clients) {
      clients.push({
        clientId,
        user: {
          id: client.user.id,
          username: client.user.username,
          role: client.user.role,
        },
        connectedAt: client.connectedAt,
        subscriptions: Array.from(client.subscriptions),
        isConnected: client.ws.readyState === 1,
      });
    }
    
    return clients;
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      connectedClients: Array.from(this.clients.values()).filter(
        client => client.ws.readyState === 1
      ).length,
      isInitialized: this.isInitialized,
    };
  }
}

// Export singleton instance
export const wsService = new WebSocketService();

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(server) {
  wsService.initialize(server);
}

export default wsService;
