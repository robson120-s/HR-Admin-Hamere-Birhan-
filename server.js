const express = require('express')
const app = express();

const PORT = 5555;

app.get('/', (req, res) => {
    res.send("Backend started");
})

app.listen(PORT, ()=>{
    console.log('Server is running on port ')
})