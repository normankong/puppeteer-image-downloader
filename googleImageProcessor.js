const https = require('https');
const fs = require('fs');
const puppeteer = require('puppeteer');

async function grepImage(index, subject, folder, cb) {

    var str1 = index.toString();
    console.log('Process : ' + subject + " to " + folder);
    var DIR = __dirname + '/images/' + str1.padStart(3, "0") + "-" + folder;
    if (!fs.existsSync(DIR)) {
        fs.mkdirSync(DIR);
    }

    (async () => {
        //const browser = await puppeteer.launch();
        const browser = await puppeteer.launch({
            headless: true,
            slowMo: 100
        });
        const page = await browser.newPage();
        await page.goto('https://images.google.co.jp');

        const IMAGE_SELECTOR = "#lst-ib";
        const BUTTON_SELECTOR = "#mKlEF > span > svg";

        navresponse = page.waitForNavigation(['networkidle0', 'load', 'domcontentloaded']);
        await page.click(IMAGE_SELECTOR);
        await page.keyboard.type(subject);
        await page.click(BUTTON_SELECTOR);

        await navresponse;

        for (var i = 0; i < 280; i++) {
            const imageData = await retrieveImageData(page, i);
            if (imageData == null)
            {
                console.log("Unknown");
                continue;
            }
            if (imageData.indexOf("data:image") == 0) {
                downloadFile(imageData, i, DIR);
                continue;
            }
            if (imageData == "BLANK_NODE") {
                //console.log(i + " : " + imageData);
                continue;
            }
            if (imageData.indexOf("https") == 0) {
                console.log(i + " : " + imageData);
                downloadByURL(imageData, i, DIR);
                continue;
            }
            if (imageData == "") {
                console.log(i + " : scrollPage");
                await scrollPage(page);
                continue;
            }

            console.log(i + " : Unknown response : " + imageData);
        }


        // await page.screenshot({
        //     path: 'result.png'
        // });
        await browser.close();
        console.log("Done for " + subject );
       
        if (cb) cb();
    })();
};

async function scrollPage(page) {
    console.log("Scroll page ");
    const bodyHandle = await page.$('body');
    const {
        height
    } = await bodyHandle.boundingBox();
    await bodyHandle.dispose();
    // Scroll one viewport at a time, pausing to let content load
    const viewportHeight = page.viewport().height;
    let viewportIncr = 0;
    if (viewportIncr + viewportHeight < height) {
        await page.evaluate(_viewportHeight => {
            window.scrollBy(0, _viewportHeight);
        }, viewportHeight);
        await wait(2000);
        viewportIncr = viewportIncr + viewportHeight;
    }
}

async function retrieveImageData(page, i) {
    return await page.evaluate(x => {
        var src = "BLANK_NODE";
        var node = document.querySelector("#rg_s").childNodes[x];
        if (node.childNodes.length != 0) {
            src = node.childNodes[0].childNodes[1].src;
        }
        return Promise.resolve(src);
    }, i);
}

function downloadFile(imageData, i, DIR) {
    var base64Data = imageData.replace(/^data:image\/jpeg;base64,/, "");
    var file = DIR + "/images" + i + ".jpg";
    fs.writeFile(file, base64Data, 'base64', function (err) {
        if (err) {
            console.log(err);
        } else
            console.log("Save file as " + file);
    });
}

function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

const downloadByURL = function (url, i, DIR, cb) {
    var dest = DIR + "/images" + i + ".jpg";
    console.log("Save file as " + dest);
    var file = fs.createWriteStream(dest);
    var request = https.get(url, function (response) {
        response.pipe(file);
        file.on('finish', function () {
            file.close(cb); // close() is async, call cb after close completes.
        });
    }).on('error', function (err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) cb(err.message);
    });
};


exports.grepImage = grepImage;