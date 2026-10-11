import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
dotenv.config()

// Required secrets: fail at startup instead of falling back to a guessable default.
function requireEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required environment variable ${name}`);
    return v;
}

const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);
const JWT_SECRET = requireEnv('JWT_SECRET');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

/** Keyed hash for OTPs/grants so a DB leak does not reveal live codes. */
export const hmac = (value) => crypto.createHmac('sha256', JWT_SECRET).update(value).digest('hex');

const service = {
    hashPassword: async function(password){
        return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    },
    validatePassword: async function(password, encryptedPassword){
        return bcrypt.compare(password, encryptedPassword);
    },
    // payload must contain userId; `av` (auth version) lets a password reset/change revoke older tokens.
    generateToken: async function(payload){
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });
    },
    generateUserToken: async function(user){
        return this.generateToken({ userId: user.id, username: user.username, email: user.email, av: user.authVersion ?? 0 });
    },
    validateToken: async function(token){
        return jwt.verify(token, JWT_SECRET);
    }
}

export default service;
