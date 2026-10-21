import { createRedisClient } from "../redis/redisClient.js";

export const CHANNELS = {
  SOCKET_BROADCAST: "socially:socket:broadcast",
  SOCKET_USER: "socially:socket:user",
  DOMAIN_EVENTS: "socially:domain:events",
};

let publisherClient = null;
const getPublisher = () => {
  if (!publisherClient) {
    publisherClient = createRedisClient();
  }
  return publisherClient;
};

/**
 * Broadcast an event to all connected WebSocket clients via Real-Time Service
 */
export const publishSocketBroadcast = async (event, data) => {
  try {
    const pub = getPublisher();
    const payload = JSON.stringify({ event, data });
    await pub.publish(CHANNELS.SOCKET_BROADCAST, payload);
  } catch (error) {
    console.error(`Failed to publish socket broadcast for ${event}:`, error.message);
  }
};

/**
 * Send a targeted event to a specific user via Real-Time Service
 */
export const publishSocketToUser = async (userId, event, data) => {
  try {
    const pub = getPublisher();
    const payload = JSON.stringify({ userId: userId.toString(), event, data });
    await pub.publish(CHANNELS.SOCKET_USER, payload);
  } catch (error) {
    console.error(`Failed to publish socket event to user ${userId} for ${event}:`, error.message);
  }
};

/**
 * Publish an internal domain event (e.g. user.followed, post.liked)
 */
export const publishDomainEvent = async (eventType, payload) => {
  try {
    const pub = getPublisher();
    const message = JSON.stringify({ type: eventType, data: payload, timestamp: new Date() });
    await pub.publish(CHANNELS.DOMAIN_EVENTS, message);
  } catch (error) {
    console.error(`Failed to publish domain event ${eventType}:`, error.message);
  }
};

/**
 * Subscribe to a Redis channel
 */
export const subscribeToChannel = (channel, onMessage) => {
  const sub = createRedisClient();
  sub.subscribe(channel, (err) => {
    if (err) {
      console.error(`Failed to subscribe to channel ${channel}:`, err.message);
    }
  });

  sub.on("message", (ch, message) => {
    if (ch === channel) {
      try {
        const parsed = JSON.parse(message);
        onMessage(parsed);
      } catch (err) {
        console.error(`Error parsing message on channel ${channel}:`, err);
      }
    }
  });

  return sub;
};
