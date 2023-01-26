const WebSocket = require('ws');
const errors = require('@tryghost/errors');
const endpoints = require('../api/endpoints');

class WebSocketWrapper {
    /**
     *
     * @param {string} resource
     * @param {string} action
     * @param {(Object|null)} params - Optional params to pass to the endpoint
     * @returns {Promise<Object>}
     */
    async getApiResponse(resource, action, params) {
        let tmp;
        let result;

        // Extend below, as we add more resources or actions to the websocket
        switch (resource) {
        case 'comments':
            switch (action) {
            case 'count':
                tmp = await endpoints.commentsMembers.counts({...params});
                result = {comments: {count: Object.values(tmp)[0] || 0, ...params}};
                break;
            default:
                throw new errors.BadRequestError({message: 'This action is not supported.'});
            }
            break;
        default:
            throw new errors.BadRequestError({message: 'This resource is not supported.'});
        }

        return result;
    }

    init() {
        const port = process.env.WS_PORT || '7071';
        const server = new WebSocket.Server({port: parseInt(port)});
        const clients = new Set();

        /**
         *
         * @param {Object} message - Message to broadcast to all connected clients
         */
        const broadcast = (message) => {
            for (const client of clients) {
                client.send(JSON.stringify(message));
            }
        };

        server.on('connection', (socket) => {
            clients.add(socket);

            socket.on('message', async (message) => {
                try {
                    // Parse message
                    const parsedMessage = JSON.parse(message);
                    const {resource, action, params} = parsedMessage;

                    // Get response to broadcast
                    const response = await this.getApiResponse(resource, action, params);

                    // Broadcast to all connected clients
                    broadcast(response);
                } catch (err) {
                    // Simply log the error for now
                    console.error(err); // eslint-disable-line no-console
                }
            });

            socket.on('close', () => clients.delete(socket));
        });
    }
}

module.exports = new WebSocketWrapper();

