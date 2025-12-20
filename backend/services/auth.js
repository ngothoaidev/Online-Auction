import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
dotenv.config()

const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '5m';
const service = {
    hashPassword: async function(password){
        return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    },
    validatePassword: async function(password, encryptedPassword){
        return bcrypt.compare(password, encryptedPassword);
    },
    generateToken: async function(payload){
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });
    },
    validateToken: async function(token){
        return jwt.verify(token, JWT_SECRET);
    }
}

export default service;