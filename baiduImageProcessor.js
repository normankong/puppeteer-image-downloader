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
        await page.goto('https://image.baidu.com/');

        const IMAGE_SELECTOR = "#kw";
        const BUTTON_SELECTOR = "#homeSearchForm > span.s_search";

        navresponse = page.waitForNavigation(['networkidle0', 'load', 'domcontentloaded']);
        await page.click(IMAGE_SELECTOR);
        await page.keyboard.type(subject);
        await page.click(BUTTON_SELECTOR);

        await navresponse;

        for (var j = 1; j < 6; j++) {
            for (var i = 0; i < 20; i++) {
                const imageData = await retrieveImageData(page, i, j);
                if (imageData == null) {
                    console.log("Unknown");
                    continue;
                }
                if (imageData.indexOf("data:image") == 0) {
                    downloadFile(imageData, j * 100 + i, DIR);
                    continue;
                }
                if (imageData == "BLANK_NODE") {
                    //console.log(i + " : " + imageData);
                    continue;
                }
                if (imageData.indexOf("https") == 0) {
                    console.log(i + " : " + imageData);
                    downloadByURL(imageData, j * 100 + i, DIR);
                    continue;
                }
                if (imageData == "") {
                    console.log(i + " : scrollPage");
                    await scrollPage(page);
                    continue;
                }
                console.log(i + " : Unknown response : " + imageData);
            }

            // Scroll Page
            await scrollPage(page);

            // Scroll Page
            await scrollPage(page);
        }

        // await page.screenshot({
        //     path: 'result.png'
        // });
        await browser.close();
        console.log("Done for " + subject);

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

async function retrieveImageData(page, i, j) {
    var obj = {};
    obj.x = i;
    obj.y = j;
    var object = JSON.stringify(obj);
    return await page.evaluate(json => {
        console.log(json);
        var object = JSON.parse(json);
        var x = object.x;
        var y = object.y;
        var src = "BLANK_NODE";
        var node = document.querySelector("#imgid > div:nth-child(" + y + ") > ul").childNodes[x];
        // console.log(x, y)
        // console.log(node.childNodes[0]);
        // console.log(node.childNodes[0].childNodes[0]);
        // console.log(node.childNodes[0].childNodes[0].childNodes[0]);
        // console.log(node.childNodes[0].childNodes[0].childNodes[0].childNodes[0]);

        if (node.childNodes.length != 0) {
            src = node.childNodes[0].childNodes[0].childNodes[0].src;
        }
        return Promise.resolve(src);
    }, object);
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