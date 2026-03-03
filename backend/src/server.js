require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`==========================================`);
    console.log(`🚀 GeniDoc Babies Backend is RUNNING`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`==========================================`);
});
