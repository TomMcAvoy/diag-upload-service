import express from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import path from 'path';

const app = express();
const port = 8000;

const diagDir = path.join(__dirname, '../diags');
app.use(fileUpload());
app.use(express.static(diagDir))


app.get('/', (_req, res) => {
    res.json({message: 'Diag Service', status: 'Online'})
});

app.listen(port, () => {
    console.log(`App is listening on port ${port}!`)
});
