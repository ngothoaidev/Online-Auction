import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
dotenv.config()

// Required secrets: fail at startup instead of falling back to a guessable default.
function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required environment variable ${name}`);
    return v;
}

const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);
const JWT_SECRET = requireEnv('JWT_SECRET');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

/** Keyed hash for OTPs/grants so a DB leak does not reveal live codes. */
export const hmac = (value: string): string => crypto.createHmac('sha256', JWT_SECRET).update(value).digest('hex');

/** What a signed session token carries. `av` = auth version at signing time. */
export type TokenPayload = { userId: number; username: string; email: string; av: number };

const service = {
    hashPassword: async function(password: string){
        return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    },
    validatePassword: async function(password: string, encryptedPassword: string){
        return bcrypt.compare(password, encryptedPassword);
    },
    // payload must contain userId; `av` (auth version) lets a password reset/change revoke older tokens.
    generateToken: async function(payload: TokenPayload){
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
        });
    },
    generateUserToken: async function(user: { id: number; username: string; email: string; authVersion: number | null }){
        return this.generateToken({ userId: user.id, username: user.username, email: user.email, av: user.authVersion ?? 0 });
    },
    validateToken: async function(token: string){
        return jwt.verify(token, JWT_SECRET) as TokenPayload & jwt.JwtPayload;
    }
}

export default service;
