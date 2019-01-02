var fs = require('fs');
var googleImageProcessor = require("./googleImageProcessor");
var baiduImageProcessor = require("./baiduImageProcessor");
var contents = fs.readFileSync('feedfile.txt', 'utf8');

var START_INDEX = 0;
var wordList = [];
var lines = contents.split("\n");
for (var i = START_INDEX; i < lines.length; i++) {
    wordList.push(lines[i]);
}
var index = START_INDEX;

grepImage();

function grepImage() {
    if (wordList.length == 0) {
        console.log("Success");
        return;
    }

    var temp = wordList.shift()
    if (temp.indexOf(",") != -1) {
        var temp = temp.split(",");
        var word = temp[0];
        var name = (temp[1] === "") ? temp[0] : temp[1];
    } else {
        word = temp;
        name = temp;
    }
    //   googleImageProcessor.grepImage(index++, word, name, grepImage);
    baiduImageProcessor.grepImage(index++, word, name, grepImage);
}