var WebTorrent = require('webtorrent')
var path = require('path')
var util = require('util')
const fs = require('fs').promises;
var axios = require('axios')
var client = new WebTorrent();
var queue = require('queue')
var q = queue()
var results = []
var express = require('express')
const bodyParser = require('body-parser');
const cliProgress = require('cli-progress');
var { Bee } = require("@ethersphere/bee-js");
const port = 3000
const app = express();

bee = new Bee("https://gateway.ethswarm.org");

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/magnet', async (req, res) => {
    const magnet = req.body.magnet
    downloadMagnet(magnet, async function (dirName) {
        console.log(dirName)
        const swarmHash = await addBee(dirName)
        const removeDir = await removeMagnet(dirName)
        res.send('https://gateway.ethswarm.org/bzz/' + swarmHash + '/index.html')
    })

});

app.listen(process.env.PORT || port, () => console.log(`Started server at http://localhost:` + port));


function downloadMagnet(magnetURI, callback) {
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(1, 0);
    const contentArray = [];
    client.add(magnetURI, { path: './swop' }, function (torrent) {
        torrent.on('metadata', function (torrent) {
            console.log('torrent metadata', torrent)
            console.log('adding: ', torrent.name)
        })
        torrent.on('ready', function (torrent) {
            console.log('torrent ready', torrent)
        })
        torrent.on('download', function (bytes) {
            bar1.update(torrent.progress, { filename: torrent.name });
        })
        torrent.on('done', async function () {
            console.log(torrent.name, " done")
            var htmlHeading = '<h3>Magnet2Swarm</h3><h1>' + torrent.name + '</h1>'
            torrent.files.forEach(file => {
                var nameArr = file.path.split('/')
                nameArr.shift()
                var tidy = nameArr.join('/')
                contentArray.push(`<a href="` + tidy + `">` + tidy + `</a></br>`)
            })
            fs.writeFile("./swop/" + torrent.name + "/index.html", htmlHeading + contentArray.join('\n'), function (err) {
                if (err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            });
            callback(torrent.name)
        })
    })

}

async function addBee(dirname) {
    try {
        const dirHash = await bee.uploadFilesFromDirectory("./swop/" + dirname, true);
        console.log(dirHash)
        return dirHash
    } catch (error) {
        console.log(error)
    }
}

async function readFile(filePath) {
    try {
        const data = await fs.readFile(filePath);
        console.log(data.toString());
    } catch (error) {
        console.error(`Got an error trying to read the file: ${error.message}`);
    }
}

async function removeMagnet(dirName) {
    try {
        fs.rmdir('./swop/' + dirName, { recursive: true })
        return true
    } catch (error) {
        return error
    }
}