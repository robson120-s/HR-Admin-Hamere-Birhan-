const express = require('express')
const app = require('./app')
const PORT = process.env.PORT || 5555;

app.get('/', (req, res) => {
    res.send("Backend started");
})

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
})