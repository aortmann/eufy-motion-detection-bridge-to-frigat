import { EufySecurity } from 'eufy-security-client';
import got from "got";

const eufyClient = EufySecurity.initialize({
    username: process.env.EUFY_USERNAME,
    password: process.env.EUFY_PASSWORD,
    country: process.env.EUFY_COUNTRY,
    language: process.env.EUFY_LANGUAGE,
    eventDurationSeconds: 60
});

let intervalId;
let connectedClient;
let ready = false;

eufyClient.then(async (client) => {
    connectedClient = client;
    client.connect().then(() => {
        ready = true;
        console.log('Connected to Eufy Security.');

        client.getPushService().on('message', (message) => {
            const deviceName = message.name;
            const motionDetected = message.content?.indexOf('detected') > -1;
            const mappedDeviceName = deviceName == 'Frente'? 'front' : deviceName == 'Cocina'? 'kitchen' : false;

            if(motionDetected && mappedDeviceName) {
                console.log(`Motion detected on ${deviceName}. Sending to frigate instance.`)
                got.post(`http://${process.env.FRIGATE_API_URL}/api/events/${mappedDeviceName}/motion/create`, {
                    json: {
                        duration: 60,
                        include_recording: true
                    }
                });
            }
        });
    })
});

intervalId = setInterval(() => {
    if (ready && !connectedClient.isConnected()) {
        console.log('Eufy client is not connected. Terminating application...');
        clearInterval(intervalId);
        process.exit(1);
    }
}, 5000);