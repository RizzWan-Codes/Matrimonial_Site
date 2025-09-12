// index.js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const bodyParser = require('body-parser');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const PORT = 3000;
const app = express();
app.use(bodyParser.json({ limit: '10mb' })); // allow big PDFs

// WhatsApp setup
async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info'); // folder will store auth files

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log('Scan this QR code with WhatsApp Web');
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting?', shouldReconnect);
            if (shouldReconnect) startSock();
        }
        if (connection === 'open') {
            console.log('WhatsApp connection established!');
        }
    });

    // Express POST endpoint for Apps Script
    app.post('/send-pdf', async (req, res) => {
        try {
            const { filename, pdfBase64, caption } = req.body;
            const buffer = Buffer.from(pdfBase64, 'base64');

            // Replace with your WhatsApp number in international format
            const number = '919922995901@s.whatsapp.net';

            await sock.sendMessage(number, {
                document: buffer,
                fileName: filename,
                caption: caption
            });

            console.log(`PDF sent to ${number}`);
            res.send({ status: 'sent' });
        } catch (err) {
            console.error(err);
            res.status(500).send({ error: err.message });
        }
    });

    app.listen(PORT, () => {
        console.log(`Express server listening on port ${PORT}`);
    });
}

startSock();
