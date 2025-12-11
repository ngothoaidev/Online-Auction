import React from "react";

{/*
    appplyFilters = {
        category: [ 'category1', 'category2' ],
        minPrice: number,
        maxPrice: number,
        status: [ 'active', 'sold', 'pending']
        sorting: 'price-asc' | 'price-desc' | 'newest' | 'oldest'
    }
*/}

export default function ApplyFilter({products, applyFilters}) {
    for (const filter of applyFilters) {
        if ()