"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
exports.pool = promise_1.default.createPool({
    host: 'db', // Matches docker-compose service name
    user: 'admin',
    password: 'password',
    database: 'geo_weather',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
