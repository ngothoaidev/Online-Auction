import db from "../db/index.js"
import {auctions} from "../db/schema/auctions.js"

import { eq } from "drizzle-orm";


const service = {
    findAll: async function(){
        return db.select().from(auctions);
    },
    getById: async function(id){
        return db.select().from(auctions).where(eq(auctions.auction_id, id));
    },
    create: async function(auction){
        if(auction.created_at) {
            auction.created_at = new Date(auction.created_at);
        }
        if(auction.end_time) {
            auction.end_time = new Date(auction.end_time);
        }
        return db.insert(auctions).values(auction).returning();
    },
    update: async function(id, auc){
        if(auc.created_at) {
            auc.created_at = new Date(auc.created_at);
        }
        if(auc.end_time) {
            auc.end_time = new Date(auc.end_time);
        }
        return db.update(auctions).set(auc).where(eq(auctions.auction_id, id));
    },
    delete: async function(id){
        return db.delete(auctions).where(eq(auctions.auction_id, id));

    }
}

export default service;