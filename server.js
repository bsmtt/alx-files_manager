import express from 'express';

const appRoutes = require('./routes/index');
const app = express();
const port = process.env.PORT || 5000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/', appRoutes)
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
  
export default app;