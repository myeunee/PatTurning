const express = require('express');
const cors = require('cors'); 
const app = express();
const port = 3000;
const fs = require('fs');
const path = require('path')

app.use(cors());
app.use(express.json());

app.post('/api/submit', (req, res) => {
    const text = req.body.text;
    console.log('Received text:', text);
    // JSON 데이터 준비
    const jsonData = { 
        message: 'Text received successfully!',  // 응답 메시지
        text: text  // 클라이언트로부터 받은 텍스트 데이터
    };

    // 파일 경로 설정
    const filePath = path.join(__dirname, 'received_data.json');

    // 파일에 JSON 데이터 저장
    fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return res.status(500).json({ error: 'Failed to write file' });
        }
        console.log('File has been saved:', filePath);
        res.json({ message: 'Text received and file saved successfully!' });
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});