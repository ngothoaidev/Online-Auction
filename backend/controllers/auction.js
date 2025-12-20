import auctionService from "../services/auction.js";
const controller = {
    listAuction: function(req, res, next){
        auctionService.findAll().then((auctions) => {
            res.json(auctions);
        }).catch(next);
    },

    getAuction: function(req, res, next){
        const id = Number(req.params.id);
        auctionService.getById(id).then((auction) => {
            if(auction){
                res.json(auction);
            }
            else{
                res.status(404).json({
                    message: 'Auction not Found',
                });
            }
        })
    },

    createAuction: function(req, res){
        console.log(req.body);
        auctionService.create(req.body).then((auction) => {
            if(auction){
                res.status(201).json(auction);
            }
            else{
                res.status(404).json({
                    message: 'Auction can not created',
                });
            }
        });
    },

    updateAuction: function(req, res){
        const id = Number(req.params.id);
        const {body} = req;
        auctionService.getById(id).then((auction) => {
            if(!auction){
                res.status(404).json({
                    message: 'Auction Not Found'
                });
            }
            else{
                auctionService.update(id, body).then((result) => {
                    if(result){
                        res.json(result);
                    }
                    else{
                        res.status(404).json({
                            message: 'Auction Not Found'
                        });
                    }
                });
            }
        })    
        
    },

    deleteAuction: function(req, res){
        const id = Number(req.params.id);
        auctionService.getById(id).then((auction) =>{
            if(!auction){
                res.status(404).json({
                    message: 'Auction Not Found'
                });
            }
            else{
                auctionService.delete(id).then((result) =>{
                    if(result){
                        res.json({});
                    }
                    else{
                        res.status(404).json({
                            message: 'Auction Not Found'
                        });
                    }
                });
            }
        });
    }
}

export default controller;