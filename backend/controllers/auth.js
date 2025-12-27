import userService from "../services/user.js";
import authService from "../services/auth.js";
const controller = {
    listUser: function(req, res, next){
        userService.findAll().then((users) => {
            res.json(users);
        }).catch(next);
    },

    getUser: async function(req, res, next){
        const {username, password} = req.body;
        console.log(username);
        const found = await userService.getByUsername(username);
        // console.log(found);
        if (!found){
            return res.status(409).json({
                message: "Account is not exist"
            })
        }
        console.log(password);
        const result = await authService.validatePassword(password, found.encryptedPassword);
        if(!result){
            return res.status(404).json({
                message: 'Wrong Password',
            });
        }
        const token = await authService.generateToken({
            userId: found.userId,
            username: found.username,
            email: found.email,
        }) 
        res.status(201).json({
            token,
            
        })
    },

    createUser: async function(req, res){
        console.log(req.body);

        const {username, email, password} = req.body

        const found = await userService.getByEmail(email);
        if (found){
            return res.status(409).json({
                message: "Email is exist"
            })
        }

        const result = await userService.create({
            username,
            email,
            encryptedPassword: await authService.hashPassword(password),
            fullName: null,
            role: "buyer",
            avatarUrl: null,
            birthday: null,
            bio: null,
            createdAt: null,
            ratingCount: null,
            positiveRatingCount: null,
            
        });

        res.status(201).json({
            userId: result.userId,
            username: result.username,
            email: result.email,
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
        UserService.getById(id).then((user) =>{
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
    getCurrentUser: async function(req, res){
        const authorization = req.header('Authorization');
        // Authorization: Bearer ey...
        const token = authorization.replace('Bearer ', '').trim();
        // Validate Token
        try {
            const result = await authService.validateToken(token);
            res.status(200).json(result);
        } catch (error) {
            return res.status(401).json({
                message: 'Invalid Token',
            });
        }
    }
}

export default controller;