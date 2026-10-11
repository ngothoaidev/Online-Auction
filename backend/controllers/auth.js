import userService from "../services/user.js";
import authService from "../services/auth.js";
import sellerRequestService from "../services/sellerRequest.js";
import { sendWelcomeEmail, sendEmailVerification, sendPasswordResetOTP, sendChangePasswordOTP } from "../utils/email.js";
import crypto from 'crypto';
import passport from "passport";

const controller = {
    listUser: function(req, res, next){
        userService.findAll().then((users) => {
            res.json(users);
        }).catch(next);
    },

    getUser: async function(req, res, next){
        const {identifier, password} = req.body; // identifier can be username or email
        console.log('Login attempt with:', identifier);
        
        // Try to find user by username or email
        let found = await userService.getByUsername(identifier);
        console.log('User found by username:', found);
        if (!found) {
            found = await userService.getByEmail(identifier);
        }
        if (!found){
            return res.status(401).json({
                message: "Account does not exist"
            })
        }
        // Check if user is banned
        console.log('User status:', found.status);
        if (found.status === 'banned') {
            return res.status(403).json({
                message: "Your account has been banned. Please contact support for assistance."
            });
        }
        
        console.log('Validating password');
        const result = await authService.validatePassword(password, found.encryptedPassword);
        if(!result){
            return res.status(401).json({
                message: 'Wrong password',
            });
        }

        // Check seller status - if seller role has expired, revert to buyer
        if (found.role === 'seller') {
            const statusCheck = await sellerRequestService.checkAndUpdateSellerStatus(found.id);
            if (statusCheck.status === 'expired' && statusCheck.reverted) {
                found.role = 'buyer';
                console.log(`User ${found.id} seller status expired, reverted to buyer`);
            }
        }
        // Check buyer status - if seller role is approved
        if (found.role === 'buyer') {
            const activationResult = await sellerRequestService.checkAndUpdateSellerStatus(found.id);
            if (activationResult.status === 'active') {
                await userService.update(found.id, { role: 'seller' });
                found.role = 'seller';
            }
        }

        console.log('Generating token for user:', found.id);
        const token = await authService.generateToken({
            userId: found.id,
            username: found.username,
            email: found.email,
        }) 
        console.log('User authenticated successfully:', found);
        res.status(200).json({
            token,
            user: {
                imgUrl: found.avatarUrl,
                userId: found.id,
                username: found.username,
                email: found.email,
                fullName: found.fullName,
                role: found.role,
                status: found.status,
                isVerified: found.isVerified,
            }
        })
    },

    createUser: async function(req, res){
        console.log(req.body);

        const { username, email, password} = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({
                message: "Username, email, and password are required"
            });
        }


        const found = await userService.getByEmail(email);
        const foundUsername = await userService.getByUsername(username);
        console.log(found);
        if (found){
            return res.status(409).json({
                message: "Email already exists"
            })
        }
        console.log(foundUsername);
        if (foundUsername){
            return res.status(409).json({
                message: "Username already exists"
            })
        }

        // Generate verification code (must be exactly 6 digits for the CHECK constraint)
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const result = await userService.create({
            username: username,
            email: email,
            encryptedPassword: await authService.hashPassword(password),
            otp: verificationCode,
            createdAt: new Date(),
        });

        try {
            // Send verification email
            console.log(`Attempting to send verification email to: ${email}`);
            await sendWelcomeEmail(email, username, verificationCode);
            console.log(`Verification email sent to ${email}`);
        } catch (error) {
            console.error('Failed to send verification email:', error);
            // Don't fail the registration if email fails
        }

        res.status(201).json({
            userId: result.id,
            username: result.username,
            email: result.email,
            message: "Registration successful. Please check your email to verify your account."
        });
    },

    validateEmail: async function(req, res){
        const { email, code } = req.body;
        console.log('Validating email for:', email);
        const found = await userService.getByEmail(email);
        if (!found){
            return res.status(404).json({
                message: "Account does not exist"
            })
        }
        if(found.otp !== code){
            return res.status(400).json({
                message: "Invalid verification code"
            })
        }
        if(found.isVerified === true){
            return res.status(400).json({
                message: "Account is already verified"
            })
        }
        // Update role from 'unauthorized' to 'buyer' and clear OTP after successful validation
        await userService.update(found.id, { 
            otp: null,
            isVerified: true,
            role: 'buyer'
        });
        res.status(200).json({
            message: "Email verified successfully. Your account is now active!"
        });
    },

    resendVerification: async function(req, res){
        const { email } = req.body;
        console.log('Resending verification code for:', email);
        
        const found = await userService.getByEmail(email);
        if (!found){
            return res.status(404).json({
                message: "Account does not exist"
            })
        }
        
        if(found.isVerified === true){
            return res.status(400).json({
                message: "Account is already verified"
            })
        }
        
        // Generate new verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Update OTP in database
        await userService.update(found.id, { 
            otp: verificationCode
        });
        
        try {
            // Send verification email
            await sendWelcomeEmail(email, found.username, verificationCode);
            console.log(`Verification email resent to ${email}`);
        } catch (error) {
            console.error('Failed to send verification email:', error);
            return res.status(500).json({
                message: "Failed to send verification email"
            });
        }
        
        res.status(200).json({
            message: "Verification code sent successfully!"
        });
    },

    updateUser: function(req, res){
        const id = Number(req.params.id);
        const {body} = req;
        userService.getById(id).then((user) => {
            if(!user){
                res.status(404).json({
                    message: 'Account Not Found'
                });
            }
            else{
                userService.update(id, body).then((result) => {
                    if(result){
                        res.json(result);
                    }
                    else{
                        res.status(404).json({
                            message: 'Account Not Found'
                        });
                    }
                });
            }
        })    
        
    },

    deleteUser: function(req, res){
        const id = Number(req.params.id);
        userService.getById(id).then((user) =>{
            if(!user){
                res.status(404).json({
                    message: 'Account Not Found'
                });
            }
            else{
                userService.delete(id).then((result) =>{
                    if(result){
                        res.json({});
                    }
                    else{
                        res.status(404).json({
                            message: 'Account Not Found'
                        });
                    }
                });
            }
        });
    },
    
    verifyUser: async function(req, res){
        const user = req.user;
        
        res.status(200).json({
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        });
    },

    // Forgot password - send OTP to email
    forgotPassword: async function(req, res) {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        try {
            const found = await userService.getByEmail(email);
            if (!found) {
                return res.status(404).json({
                    message: "No account found with this email address"
                });
            }

            // Generate 6-digit OTP
            const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Store OTP in user record (using the existing otp field)
            await userService.update(found.id, { 
                otp: resetOtp
            });

            // Send OTP via email
            try {
                await sendPasswordResetOTP(email, found.username || 'User', resetOtp);
                console.log(`Password reset OTP sent to ${email}`);
            } catch (emailError) {
                console.error('Failed to send password reset email:', emailError);
                return res.status(500).json({
                    message: "Failed to send verification email. Please try again."
                });
            }

            res.status(200).json({
                message: "OTP has been sent to your email"
            });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({
                message: "An error occurred. Please try again."
            });
        }
    },

    // Verify reset OTP
    verifyResetOtp: async function(req, res) {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required"
            });
        }

        try {
            const found = await userService.getByEmail(email);
            if (!found) {
                return res.status(404).json({
                    message: "Account not found"
                });
            }

            if (found.otp !== otp) {
                return res.status(400).json({
                    message: "Invalid verification code"
                });
            }

            // OTP is valid, return success (don't clear OTP yet, need it for password reset)
            res.status(200).json({
                message: "OTP verified successfully"
            });
        } catch (error) {
            console.error('Verify reset OTP error:', error);
            res.status(500).json({
                message: "An error occurred. Please try again."
            });
        }
    },

    // Reset password with OTP verification
    resetPassword: async function(req, res) {
        const { email, newPassword } = req.body;
        
        if (!email || !newPassword) {
            return res.status(400).json({
                message: "Email and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long"
            });
        }

        try {
            const found = await userService.getByEmail(email);
            if (!found) {
                return res.status(404).json({
                    message: "Account not found"
                });
            }

            // Hash the new password
            const hashedPassword = await authService.hashPassword(newPassword);

            // Update password and clear OTP
            await userService.update(found.id, { 
                encryptedPassword: hashedPassword,
                otp: null
            });

            res.status(200).json({
                message: "Password reset successful!"
            });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                message: "An error occurred. Please try again."
            });
        }
    },
    authenticateGoogle: function(req, res, next){
        passport.authenticate('google', {
            scope: ['profile', 'email'],
            session: false // Disable session support
        })(req, res, next);
    },
    callbackGoogle: function(req, res, next){
        passport.authenticate('google', { 
                session: false,
                failureRedirect: '/login?error=google_failed' 
            }, async (err, user, info) => {
            if (err || !user) {
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=google_failed`);
            }
            try {
                console.log('Google OAuth user:', user);
                
                // Check if user is banned
                if (user.status === 'banned') {
                    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=account_banned`);
                }

                if(!user.role || user.role === 'unauthorized'){
                    user.role = 'buyer';
                    await userService.update(user.id, { role: 'buyer' });
                }


                if(user.role === 'seller'){
                    // Check and activate seller status if effective date has passed
                    const activationResult = await sellerRequestService.checkAndUpdateSellerStatus(user.id);
                    if (!activationResult.activated) {
                        user.role = 'buyer';
                        console.log(`User ${user.id} has been deactivated as seller`);
                    }
                }

                // Generate JWT token for the authenticated user
                const token = await authService.generateToken({
                    userId: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                });
                
                // Redirect to frontend with token
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
            } catch (error) {
                console.error('Google callback error:', error);
                res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`);
            }
        })(req, res, next);
    },
    authenticateFacebook: function(req, res, next){
        passport.authenticate('facebook', {
            scope: ['email'] 
        })(req, res, next);
    },
    callbackFacebook: function(req, res, next){
        passport.authenticate('facebook', { failureRedirect: '/login?error=facebook_failed' }, async (err, user, info) => {
            if (err || !user) {
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=facebook_failed`);
            }
            try {
                // Check if user is banned
                if (user.status === 'banned') {
                    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=account_banned`);
                }

                if(!user.role || user.role === 'unauthorized'){
                    user.role = 'buyer';
                    await userService.update(user.id, { role: 'buyer' });
                }
                // Generate JWT token for the authenticated user
                const token = await authService.generateToken({
                    userId: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                });
                
                // Redirect to frontend with token
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
            } catch (error) {
                console.error('Facebook callback error:', error);
                res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`);
            }
        })(req, res, next);
    },

    // Request OTP for password change
    requestChangePasswordOTP: async function(req, res, next){
        try {
            const userId = req.user.id; // From requireAuth middleware
            console.log('Requesting change password OTP for user ID:', userId);
            const user = await userService.getById(userId);
            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            // Store OTP in database
            await userService.update(userId, { 
                otp: otp
            });

            // Send OTP email
            try {
                await sendChangePasswordOTP(user.email, user.username, otp);
                console.log(`Change password OTP sent to ${user.email}`);
            } catch (error) {
                console.error('Failed to send OTP email:', error);
                return res.status(500).json({
                    message: "Failed to send verification code"
                });
            }

            return res.status(200).json({
                message: "Verification code sent to your email"
            });
        } catch (error) {
            next(error);
        }
    },

    // Verify OTP and change password
    verifyOTPAndChangePassword: async function(req, res, next){
        try {
            const userId = req.user.id; // From requireAuth middleware
            const { otp, newPassword } = req.body;

            if (!otp || !newPassword) {
                return res.status(400).json({
                    message: "OTP and new password are required"
                });
            }req.user.userId; // From requireAuth middleware

            // Validate password length
            if (newPassword.length < 6) {
                return res.status(400).json({
                    message: "Password must be at least 6 characters long"
                });
            }

            // Check OTP
            const storedData = await userService.getById(userId);
            if (!storedData || !storedData.otp) {
                return res.status(400).json({
                    message: "Invalid verification code"
                });
            }


            // Verify OTP
            if (storedData.otp !== otp) {
                return res.status(400).json({
                    message: "Invalid verification code"
                });
            }

            // Get user
            const user = await userService.getById(userId);
            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            // Hash new password
            const hashedPassword = await authService.hashPassword(newPassword);

            // Update password
            await userService.update(userId, { 
                encryptedPassword: hashedPassword,
                otp: null // Clear OTP after successful password change
            });


            return res.status(200).json({
                message: "Password changed successfully"
            });
        } catch (error) {
            next(error);
        }
    }
}

export default controller;