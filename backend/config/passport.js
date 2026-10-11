import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import userService from '../services/user.js';
import authService from '../services/auth.js';

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
        scope: ['profile', 'email'],
    state: true // CSRF protection for the OAuth round trip (uses express-session)
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;
            const username = profile.displayName.replace(/\s+/g, '_').toLowerCase();
            
            // Check if user exists
            let user = await userService.getByEmail(email);
            
            if (!user) {
                // Create new user with Google info
                user = await userService.create({
                    username: `${username}_${Date.now()}`,
                    email: email,
                    fullName: profile.displayName,
                    avatarUrl: profile.photos?.[0]?.value || null,
                    encryptedPassword: await authService.hashPassword(Math.random().toString(36)),
                    googleId: profile.id,
                    isVerified: true,
                    createdAt: new Date(),
                });
            } else if (!user.googleId) {
                // Link Google account to existing user
                await userService.update(user.id, { googleId: profile.id });
            }
            
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
}

// Facebook Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/auth/facebook/callback',
        profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
        state: true
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value || `${profile.id}@facebook.placeholder`;
            const username = profile.displayName?.replace(/\s+/g, '_').toLowerCase() || `fb_user`;
            
            // Try to find user by facebookId first, then by email
            let user = await userService.getByFacebookId(profile.id);
            
            if (!user && profile.emails?.[0]?.value) {
                user = await userService.getByEmail(profile.emails[0].value);
            }
            
            if (!user) {
                // Create new user with Facebook info
                user = await userService.create({
                    username: `${username}_${Date.now()}`,
                    email: email,
                    fullName: profile.displayName || 'Facebook User',
                    avatarUrl: profile.photos?.[0]?.value || null,
                    encryptedPassword: await authService.hashPassword(Math.random().toString(36)),
                    facebookId: profile.id,
                    isVerified: true,
                    createdAt: new Date(),
                });
            } else if (!user.facebookId) {
                // Link Facebook account to existing user
                await userService.update(user.id, { facebookId: profile.id });
            }
            
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
}

export default passport;
