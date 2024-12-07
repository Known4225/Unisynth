
mode = "Custom";
const fallingSpeed = 4;

/* drawing piano */
var pianoSound = []; // piano sounds array
var pianoSoundPlaying = [];
var volumeDecay = 0.9;
var volumeCoefficient = 0.1;
var whiteWidth = 10;
var blackWidth = 5;
var pianoX = whiteWidth * 26;
var keys = []; // key presses

function keyToX(key) { // translate key to an x position
    let ret = -pianoX;
    let keyIdentity = key % 12;
    let octave = Math.floor(key / 12);
    if (keyIdentity == 1 || keyIdentity == 4 || keyIdentity == 6 || keyIdentity == 9 || keyIdentity == 11) {
        // black key
        return ret + octave * whiteWidth * 7;
    } else {
        // white key
        return ret + octave * whiteWidth * 7 + indexToWhiteKey(keyIdentity) * whiteWidth;
    }
}

class MidiNote {
    // a databse entry
    constructor(unixTimestamp, key, velocity, duration) {
        this.timestamp = new DateTime(unixTimestamp);
        this.key = key;
        this.velocity = velocity;
        this.duration = duration;
    }
};

class fallingNote {
    // a falling note
    constructor(key, duration, velocity) {
        this.xpos = keyToX(key);
        this.ypos = 180;
        this.midiValue = key;
        this.duration = duration;
        this.velocity = velocity;
    }
    tickNote() {
        this.ypos -= fallingSpeed;
        drawRectangle(this.xpos - 5, this.ypos, this.xpos + 5, this.ypos + this.duration / 10);
    }
};

/* mouse interface */
var scrollWheel = 0;

/* database related */
var database = []; // list of every keystroke in the database
var databaseTransfer = []; // for live updating
var bins = []; // data is sorted into bins by day, the first bin is january 1st 2024
var binsTransfer = []; // for live updating bins

/* drawing commit graph */
var roboto;
var currentDate;
var highlight = -1;
var highlightBin = 0;
var highlightDay = 0;
var bluePerKey = 5;

/* drawing day graph */
class DayGraph {
    // dayGraph state
    constructor(axis, time) {
        this.bounds = [-pianoX, 40, -pianoX + 444, 160];
        this.leftTime = 0;
        this.rightTime = 0;
        this.oldHighlight = -1;
        this.dayGraphMouse = 0;
        this.dayGraphFocal = 0;
        this.dayGraphAnchor = 0;
        this.selectLeft = -1;
        this.selectRight = -1;
        this.axisSamples = axis; // number of samples between back and front times (for x axis labels)
        this.timeSamples = time; // number of samples between back and front times (for x axis subBins)
    }
    coordToUnix(x) {
        let range = this.rightTime - this.leftTime;
        let xRange = (this.bounds[2] - 15) - (this.bounds[0] + 30);
        let scale = range / xRange; // unixes per pixel
        return this.leftTime + (x - this.bounds[0]) * scale - 30 * scale;
    }
    unixToCoord(uniX) {
        let range = this.rightTime - this.leftTime;
        let xRange = (this.bounds[2] - 15) - (this.bounds[0] + 30);
        let scale = xRange / range; // pixels per unix
        return this.bounds[0] + 30 + (uniX - this.leftTime) * scale;
    }
    coordToUnixChange(x) {
        let range = this.rightTime - this.leftTime;
        let xRange = (this.bounds[2] - 15) - (this.bounds[0] + 30);
        let scale = range / xRange; // unixes per pixel
        return x * scale;
    }
};

var dg = new DayGraph(25, 128);

class NoteDrop {
    // state for falling notes
    constructor() {
        this.alpha = 120;
        this.timeIn = 0;
        this.playing = 0;
        this.queue = [];
        this.nextQueue = 0;
        this.noteSpawns = [];
    }
    generateNotes(bin, leftTime, rightTime) {
        this.queue = []; // "priority" queue
        for (let i = 0; i < bins[bin].length; i++) {
            let noteTime = database[bins[bin][i]].timestamp.timestamp;
            if (noteTime >= leftTime && noteTime <= rightTime) {
                this.queue.push(bins[bin][i]);
                let j = this.queue.length - 2;
                while (j >= 0 && noteTime < database[this.queue[j]].timestamp.timestamp) {
                    let temp = this.queue[j];
                    this.queue[j] = this.queue[j + 1];
                    this.queue[j + 1] = temp;
                    j--;
                }
            }
        }
        // console.log(this.queue);
        for (let i = 0; i < this.queue.length; i++) {
            // console.log(database[this.queue[i]].timestamp.timestamp);
        }
    }
};

var notes = new NoteDrop();

class DateTime {
    // convert between unix timestamp and human dates
    constructor(unixTimestamp) {
        this.timestamp = unixTimestamp;
        /* there was a leap year every four years until 2100 
        1970 had 365 days, 1971 had 365, 1972 had 366 days
        */
        let myTimezone = -6;
        if (unixTimestamp % 31557600 > 5983200 && unixTimestamp % 31557600 < 26373600) { // umm, idk
            /* it attempts to see if I am between the days march 10th and november 3rd, which is most of the year, and that means we are in daylight savings */
            myTimezone = -5;
        }
        unixTimestamp += myTimezone * 3600; // adjust for UTC-5, sometimes my timezone is UTC-6. I don't know how to fix this. I hate daylight savings
        let monthChart = [31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // 1-indexed, december is looped at 0 and 12
        let daysEpoch = unixTimestamp / 86400;
        let lastYearDays = 0;
        let yearDays = 0;
        let yearCounter = 0;
        while (yearDays < daysEpoch) {
            lastYearDays = yearDays;
            yearDays += 365;
            if (yearCounter % 4 == 2) {
                yearDays++;
            }
            yearCounter++;
        }
        yearCounter--;
        let daysIntoYear = daysEpoch - lastYearDays;
        if (yearCounter % 4 == 2) {
            monthChart[2] = 29; // if this year is a leap year
        }
        
        this.weekday = (Math.floor(daysEpoch) + 4) % 7; // january 1st 1970 was a thursday (weekday is 0 - 6, sunday - saturday)
        let lastMonthDays = 0;
        let monthDays = 0;
        let monthCounter = 1;
        while (monthDays < daysIntoYear) {
            lastMonthDays = monthDays;
            monthDays += monthChart[(monthCounter % 12)];
            monthCounter++;
        }
        monthCounter--;
        this.day = Math.floor(daysIntoYear - lastMonthDays + 1); // 1 - 31 for day of the month
        this.month = monthCounter; // month is 1 - 12, January - December
        this.year = yearCounter + 1970;

        let hoursIntoDay = (daysIntoYear - lastMonthDays + 1 - this.day) * 24;
        this.hour = Math.floor(hoursIntoDay);
        this.minute = Math.floor((hoursIntoDay - this.hour) * 60);
        this.second = Math.floor(((hoursIntoDay - this.hour) * 60 - this.minute) * 60);
        this.millisecond = Math.floor((((hoursIntoDay - this.hour) * 60 - this.minute) * 60 - this.second) * 1000);

        this.absoluteDay = Math.floor(daysEpoch - (10957 + 8766)); // days since January 1st, 2024

        
        // console.log(this.day + "."  + this.month + "." + this.year + " " + this.hour + ":" + this.minute + ":"  + this.second + ":" + this.millisecond);
    }
};

/* coding is very hard */
currentDate = new DateTime(Date.now() / 1000);
let myTimezone = -6;
if (currentDate.timestamp % 31557600 > 5983200 && currentDate.timestamp % 31557600 < 26373600) { // umm, idk
    /* it attempts to see if I am between the days march 10th and november 3rd, which is most of the year, and that means we are in daylight savings */
    myTimezone = -5;
}
var utcOffset = myTimezone * 3600;

function queryDaysInMonth(month, year) {
    let monthChart = [31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // 1-indexed, december is looped at 0 and 12
    if (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)) {
        monthChart[2] = 29; // if this year is a leap year
    }
    return monthChart[month];
}

function convertMonthToString(month) {
    let weeklist = ["December", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; // 1 indexed again
    return weeklist[month];
}

/* playing a song */
var song = []; // song data (list of MidiNotes)
var songDex = 0; // where we are in a song
var noteSpeed = 10; // how many coordinates per tick the notes move downward
var fps = 60; // probably

function preload() {
    frameRate(60); // 60 fps
    // soundFormats('mp3');
    // roboto = loadFont('Fonts/Roboto-Light.ttf');
    for (let i = 0; i < 88; i++) {
        // pianoSound[i] = loadSound("Notes/Piano_" + (i + 21) + ".mp3");
        pianoSoundPlaying[i] = 0;
    }
    for (let i = 0; i < 256; i++) {
        keys[i] = 0;
    }
    for (let i = 0; i < ((Date.now() / 1000) - 1704088800) / 86400 + 10; i++) { // I added 5 extra bins in case you don't refresh the webpage for 5 days.
        bins[i] = []; // each bin is a list of indexes of data in the database list that belongs in that bin
        binsTransfer[i] = [];
    }
}

function setup() {
    // textFont(roboto);
    // textFont('Roboto-Light');
    createCanvas(windowWidth, windowHeight);
}

function draw() {
    let mx = translateFromX(mouseX);
    let my = translateFromY(mouseY);
    background(30);
    // fill(255);
    // drawRectangle(-40, 20, 40, 50, 0);
    // console.log(mx, my);
    if (mode == "Piano") {
        interactPiano(-80, mx, my);
        keyboardPiano();
        pianoUpdateVolume();
        drawPiano(-80);
    } else if (mode == "Timeline") {
        drawNotes();
        drawTimeline(mx, my);
        if (highlight != -1) {
            drawDayGraph(mx, my);
        }
        interactPiano(-80, mx, my);
        keyboardPiano();
        pianoUpdateVolume();
        drawPiano(-80);
        scrollWheel = 0;
        // mode = "Piano";
    } else if (mode == "Custom") {
        interactPiano(30, mx, my);
        keyboardPiano();
        pianoUpdateVolume();
        drawPiano(30);
    }
}

function drawNotes() {
    if (notes.playing && notes.queue.length > 0) {
        notes.timeIn += 1 / fps;
        let entry = database[notes.queue[notes.nextQueue]]
        if (notes.timeIn > entry.timestamp.timestamp) {
            notes.noteSpawns.push(new fallingNote(entry.key, entry.duration, entry.velocity));
            notes.nextQueue++;
            if (notes.nextQueue >= notes.queue.length) {
                notes.playing = 0;
            }
            console.log("added note");
        }
        fill(0, 150, 0, notes.alpha);
        for (let i = 0; i < notes.noteSpawns.length; i++) {
            notes.noteSpawns[i].tickNote();
        }
    }
}

function drawDayGraph(mx, my) { // graph of notes in a day
    let leftEdge = dg.bounds[0] + 30;
    let rightEdge = dg.bounds[2] - 15;
    if (highlight != dg.oldHighlight) {
        dg.leftTime = highlightDay.timestamp;
        dg.rightTime = highlightDay.timestamp + 86400;
        // console.log(leftTime, rightTime);
        dg.oldHighlight = highlight;
    }
    strokeWeight(0);
    fill(80);
    drawRectangle(dg.bounds[0], dg.bounds[1], dg.bounds[2], dg.bounds[3], 3);
    if (mx > dg.bounds[0] && mx < dg.bounds[2] && my > dg.bounds[1] && my < dg.bounds[3]) {
        let constScale = (dg.rightTime - dg.leftTime) / 10;
        let center = (leftEdge + rightEdge) / 2;
        if (scrollWheel < 0) {
            dg.leftTime += constScale;
            dg.rightTime -= constScale;
        } else if (scrollWheel > 0) {
            dg.rightTime += constScale;
            dg.leftTime -= constScale;
        }
        if (scrollWheel != 0) {
            let constMove = (dg.rightTime - dg.leftTime) / 10 * (mx - center) / 100;
            dg.leftTime += constMove;
            dg.rightTime += constMove;
        }
        if (dg.dayGraphMouse == 0 && mouseIsPressed) {
            if (keys[16]) {
                dg.dayGraphMouse = 2;
                dg.selectLeft = dg.coordToUnix(mx);
                dg.selectRight = dg.selectLeft;
            } else {
                dg.dayGraphMouse = 1;
                // tick 1
                dg.dayGraphFocal = mx;
                dg.dayGraphAnchor = dg.leftTime;
            }
        }
        if (dg.dayGraphMouse == 1) {
            // hold
            dg.leftTime = dg.dayGraphAnchor + dg.coordToUnixChange(dg.dayGraphFocal - mx);
            dg.rightTime = dg.leftTime + constScale * 10;
        } else if (dg.dayGraphMouse == 2) {
            dg.selectRight = dg.coordToUnix(mx);
        }
    }
    if (!mouseIsPressed) {
        if (dg.dayGraphMouse == 1 && abs(mx - dg.dayGraphFocal) < 0.1) {
            dg.selectLeft = -1;
            dg.selectRight = -1;
        }
        if (dg.dayGraphMouse == 2) {
            if (dg.selectLeft > dg.selectRight) {
                // orient left and right
                let temp = dg.selectLeft;
                dg.selectLeft = dg.selectRight;
                dg.selectRight = temp;
            }
            // fit to notes
            let closestLeft = -1;
            let closestRight = -1;
            for (let i = 0; i < bins[highlightBin].length; i++) {
                let noteTime = database[bins[highlightBin][i]].timestamp.timestamp;
                if (noteTime >= dg.selectLeft) {
                    if (closestLeft == -1 || noteTime < closestLeft) {
                        closestLeft = noteTime;
                    }
                    
                }
                if (noteTime <= dg.selectRight) {
                    if (closestRight < noteTime) {
                        closestRight = noteTime;
                    }
                }
            }
            if (closestLeft != -1 && closestRight != -1) {
                dg.selectLeft = closestLeft;
                dg.selectRight = closestRight;
            }
        }
        dg.dayGraphMouse = 0;
    }
    // draw select box
    
    if (dg.selectLeft > 0 && dg.selectRight > 0) {
        fill(120, 120, 120, 120);
        let leftX = dg.unixToCoord(dg.selectLeft);
        let rightX = dg.unixToCoord(dg.selectRight);
        // fit to closest subBin? (not closest, left is floor, right is ceiling)
        let binScale = (rightEdge - leftEdge) / (dg.timeSamples - 1);
        leftX = floor(leftX / binScale) * binScale - 2;
        rightX = ceil(rightX / binScale) * binScale + 2;

        if (leftX < dg.bounds[0]) {
            leftX = dg.bounds[0];
        }
        if (rightX > dg.bounds[2]) {
            rightX = dg.bounds[2];
        }
        if (rightX > dg.bounds[0] && leftX < dg.bounds[2]) {
            drawRectangle(leftX, dg.bounds[1] + 5, rightX, dg.bounds[3] - 5);
        }

        // draw play button
        fill(255);
        drawRectangle(dg.bounds[2] + 10, dg.bounds[3], dg.bounds[2] + 40, dg.bounds[3] - 10, 3);
        fill(0);
        drawText("Play", dg.bounds[2] + 25, dg.bounds[3] - 7, 7, CENTER, 1);

        if (mx >= dg.bounds[2] + 10 && mx <= dg.bounds[2] + 40 && my <= dg.bounds[3] && my >= dg.bounds[3] - 10) {
            if (notes.playing == 0) {
                notes.playing = 1;
                notes.timeIn = dg.selectLeft;
                notes.alpha = 120;
                notes.generateNotes(highlightBin, dg.selectLeft, dg.selectRight);
                notes.nextQueue = 0;
            }
        } else {
            if (notes.playing == 1) {
                notes.playing = 0;
            }
        }


        // draw save to midi button
    }



    let times = [];
    // let back = DateTime(leftTime);
    // let front = DateTime(rightTime);
    let subBins = new Array(dg.timeSamples).fill(0);
    let maxBin = 1;
    // console.log(highlightBin);
    if (highlightBin >= 0) {
        for (let i = 0; i < bins[highlightBin].length; i++) {
            let index = Math.floor(((database[bins[highlightBin][i]].timestamp.timestamp - dg.leftTime) / (dg.rightTime - dg.leftTime)) * dg.timeSamples);
            // console.log(index);
            subBins[index]++;
        }
        // console.log(subBins);
        for (let i = 0; i < dg.timeSamples; i++) {
            if (subBins[i] > maxBin) {
                maxBin = subBins[i];
            }
        }
    }
    // labels
    fill(220);
    for (let i = 0; i < dg.axisSamples; i++) {
        times[i] = new DateTime(dg.leftTime + ((dg.rightTime - dg.leftTime) / (dg.axisSamples - 1)) * i);
        let xpos = leftEdge + ((rightEdge - leftEdge) / (dg.axisSamples - 1)) * i;
        let ypos = dg.bounds[1] + 5;
        let minuteString = str(times[i].minute);
        if (minuteString.length == 1) {
            minuteString = "0" + minuteString;
        }
        drawText(str(times[i].hour) + ":" + minuteString, xpos, ypos, 5, CENTER);
    }
    // subBins
    for (let i = 0; i < dg.timeSamples; i++) {
        times[i] = new DateTime(dg.leftTime + ((dg.rightTime - dg.leftTime) / (dg.timeSamples - 1)) * i);
        let barWidth = (rightEdge - leftEdge) / dg.timeSamples
        let xpos = leftEdge + ((rightEdge - leftEdge) / (dg.timeSamples - 1)) * i;
        let ypos = dg.bounds[1] + 5;
        if (highlightBin >= 0) {
            fill(0, 0, bins[highlightBin].length * bluePerKey);
        } else {
            fill(0, 0, 0);
        }
        drawRectangle(xpos - barWidth / 2, ypos + 10, xpos + barWidth / 2, ypos + 11 + 70 * subBins[i] / maxBin);
    }
    strokeWeight(1);
}

function drawTimeline(mx, my) { // git commit graph
    let maxHover = 364 + currentDate.weekday;
    let absoluteDayOne = currentDate.absoluteDay - maxHover;
    let boxSize = 8;
    let xpos = 52 * boxSize * -0.5 + boxSize * 0.5;
    xpos = -pianoX + 5;
    let ypos = -60;
    strokeWeight(0);
    fill(50);
    drawRectangle(xpos - 5, ypos, xpos + boxSize * 52 + 5 + 18, ypos + 70, 3);
    let bounds = [xpos - 5, ypos, xpos + boxSize * 52 + 5 + 18, ypos + 70];
    fill(200);
    let contributions = str(database.length);
    drawText(contributions + " contributions in the last year", xpos - 3, ypos + 75, 9);
    drawText("Mon", xpos + 11, ypos + 42, 6, RIGHT);
    drawText("Wed", xpos + 11, ypos + 26.5, 6, RIGHT);
    drawText("Fri", xpos + 11, ypos + 11, 6, RIGHT);
    strokeWeight(1);
    fill(0);
    let hover = -1;
    xpos += 18;
    for (let i = 0; i < 52; i++) {
        let ywork = ypos + 53;
        for (let j = 0; j < 7; j++) {
            if (mx > xpos - boxSize * 0.5 && mx < xpos + boxSize * 0.5 && my > ywork - boxSize * 0.5 && my < ywork + boxSize * 0.5) {
                hover = i * 7 + j;
            }
            let absoluteIndex = absoluteDayOne + i * 7 + j;
            if (absoluteIndex < 0) {
                fill(0);
            } else {
                fill(0, 0, bins[absoluteIndex].length * bluePerKey);
            }
            if (i * 7 + j == highlight) {
                stroke(220);
            } else {
                stroke(0);
            }
            drawRectangle(xpos - boxSize * 0.4, ywork - boxSize * 0.4, xpos + boxSize * 0.4, ywork + boxSize * 0.4, 1);
            ywork -= boxSize;
        }
        xpos += boxSize;
    }
    let ywork = ypos + 53;
    for (let j = 0; j < currentDate.weekday + 1; j++) {
        if (mx > xpos - boxSize * 0.5 && mx < xpos + boxSize * 0.5 && my > ywork - boxSize * 0.5 && my < ywork + boxSize * 0.5) {
            hover = 52 * 7 + j;
        }
        let absoluteIndex = absoluteDayOne + 52 * 7 + j;
        if (absoluteIndex < 0) {
            fill(0);
        } else {
            fill(0, 0, bins[absoluteIndex].length * bluePerKey);
        }
        if (52 * 7 + j == highlight) {
            stroke(220);
        } else {
            stroke(0);
        }
        drawRectangle(xpos - boxSize * 0.4, ywork - boxSize * 0.4, xpos + boxSize * 0.4, ywork + boxSize * 0.4, 1);
        ywork -= boxSize;
    }
    stroke(0);
    ywork = ypos + 53;
    xpos = -pianoX + 5 + 18;
    let hoverTimestamp = 0;
    let hoverBin = 0;
    if (hover != -1) {
        strokeWeight(0);
        fill(80);
        let boxWidth = 80;
        let boxX = xpos + Math.floor(hover / 7) * boxSize - boxWidth / 2;
        let boxY = ywork - boxSize * (hover % 7) + 3;
        drawRectangle(boxX, boxY + 1, boxX + boxWidth, boxY + 11, 1);
        fill(220);
        let fillMonth = currentDate.month;
        let dayDifference = maxHover - hover;
        let displayDay = currentDate.day;
        let displayYear = currentDate.year;
        let absoluteDay = currentDate.absoluteDay - dayDifference;
        hoverTimestamp = absoluteDay * 86400 + 19723 * 86400 - utcOffset;
        hoverBin = Math.floor(hoverTimestamp / 86400 - (10957 + 8766));
        if (dayDifference >= currentDate.day) {
            dayDifference -= currentDate.day;
            fillMonth--;
            if (fillMonth == 0) {
                fillMonth = 12;
                displayYear--;
            }
            while (dayDifference >= queryDaysInMonth(fillMonth, displayYear)) {
                dayDifference -= queryDaysInMonth(fillMonth, displayYear);
                fillMonth--;
                if (fillMonth == 0) {
                    fillMonth = 12;
                    displayYear--;
                }
            }
            displayDay = queryDaysInMonth(fillMonth, displayYear) - dayDifference;
        } else {
            displayDay = currentDate.day - dayDifference;
        }
        let displayContributions = "No";
        // console.log(bins.length, absoluteDay);
        if (absoluteDay >= 0 && bins[absoluteDay].length > 0) {
            displayContributions = bins[absoluteDay].length;
        }
        if (displayContributions == 1) {
            displayContributions = str(displayContributions) + " contribution";
        } else {
            displayContributions = str(displayContributions) + " contributions";
        }
        drawText(displayContributions + " on " + convertMonthToString(fillMonth) + " " + str(displayDay), boxX + boxWidth / 2, boxY + 4.5, 5, CENTER);
        // let test = new DateTime(1704088860);
        // console.log(test.absoluteDay);
    }
    if (mouseIsPressed && mx > bounds[0] && mx < bounds[2] && my > bounds[1] && my < bounds[3]) {
        highlight = hover;
        highlightBin = hoverBin;
        // console.log(hoverTimestamp + 3600);
        highlightDay = new DateTime(hoverTimestamp + 0);
    }
    strokeWeight(1);
}

function fileToSong(filename) {
    // returns an array of MidiNotes based on a midi file

}

function databaseToSong(startstamp, endstamp) {

}

function drawPiano(yinit) {
    rad = 1.2;
    let xpos = -pianoX;
    let ybot = yinit - 60;
    let ytop = yinit;
    for (let i = 0; i < 52; i++) {
        if (pianoSoundPlaying[whiteKeyToIndex(i)] == 1) {
            fill(120);
        } else {
            fill(255);
        }
        drawRectangle(xpos, ybot, xpos + whiteWidth, ytop, rad);
        xpos += whiteWidth;
    }
    fill(0);
    xpos = -pianoX + whiteWidth - blackWidth / 2;
    ybot = yinit - 40;
    ytop = yinit;
    if (pianoSoundPlaying[blackKeyToIndex(0)] == 1) {
        fill(120);
    } else {
        fill(0);
    }
    drawRectangle(xpos, ybot, xpos + blackWidth, ytop, rad);
    xpos += whiteWidth * 2;
    for (let j = 0; j < 7; j++) {
        for (let i = 0; i < 2; i++) {
            if (pianoSoundPlaying[blackKeyToIndex(j * 5 + i + 1)] == 1) {
                fill(120);
            } else {
                fill(0);
            }
            drawRectangle(xpos, ybot, xpos + blackWidth, ytop, rad);
            xpos += whiteWidth;
        }
        xpos += whiteWidth;
        for (let i = 0; i < 3; i++) {
            if (pianoSoundPlaying[blackKeyToIndex(j * 5 + i + 3)] == 1) {
                fill(120);
            } else {
                fill(0);
            }
            drawRectangle(xpos, ybot, xpos + blackWidth, ytop, rad);
            xpos += whiteWidth;
        }
        xpos += whiteWidth;
    }
}

function keyPressed() {
    // console.log(BACKSPACE);
    keys[keyCode] = 1;
}

function keyReleased() {
    keys[keyCode] = 0;
}

function keyboardPiano() {
    // top row
    if (keys[81]) { // q
        triggerKey(39);
    }
    if (keys[50]) { // 2
        triggerKey(40);
    }
    if (keys[87]) { // w
        triggerKey(41);
    }
    if (keys[51]) { // 2
        triggerKey(42);
    }
    if (keys[69]) { // e
        triggerKey(43);
    }
    if (keys[82]) { // r
        triggerKey(44);
    }
    if (keys[53]) { // 5
        triggerKey(45);
    }
    if (keys[84]) { // t
        triggerKey(46);
    }
    if (keys[54]) { // 6
        triggerKey(47);
    }
    if (keys[89]) { // y
        triggerKey(48);
    }
    if (keys[55]) { // 7
        triggerKey(49);
    }
    if (keys[85]) { // u
        triggerKey(50);
    }
    if (keys[73]) { // ı/i
        triggerKey(51);
    }
    if (keys[57]) { // 9
        triggerKey(52);
    }
    if (keys[79]) { // o
        triggerKey(53);
    }
    if (keys[48]) { // 0
        triggerKey(54);
    }
    if (keys[80]) { // p
        triggerKey(55);
    }
    if (keys[219]) { // ğ
        triggerKey(56);
    }
    if (keys[189] || keys[187]) { // - or ]
        triggerKey(57);
    }
    if (keys[221]) { // ü
        triggerKey(58);
    }
    if (keys[8]) { // backspace
        triggerKey(59);
    }
    if (keys[188]) { // ,
        triggerKey(60);
    }

    // bottom row
    if (keys[90]) { // z
        triggerKey(27);
    }
    if (keys[83]) { // s
        triggerKey(28);
    }
    if (keys[88]) { // x
        triggerKey(29);
    }
    if (keys[68]) { // d
        triggerKey(30);
    }
    if (keys[67]) { // c
        triggerKey(31);
    }
    if (keys[86]) { // v
        triggerKey(32);
    }
    if (keys[71]) { // g
        triggerKey(33);
    }
    if (keys[66]) { // b
        triggerKey(34);
    }
    if (keys[72]) { // h
        triggerKey(35);
    }
    if (keys[78]) { // n
        triggerKey(36);
    }
    if (keys[74]) { // j
        triggerKey(37);
    }
    if (keys[77]) { // m
        triggerKey(38);
    }
    if (keys[191]) { // ö
        triggerKey(39);
    }
    if (keys[76]) { // l
        triggerKey(40);
    }
    if (keys[220]) { // ç
        triggerKey(41);
    }
    if (keys[186]) { // ş
        triggerKey(42);
    }
    if (keys[190]) { // .
        triggerKey(43);
    }
}

function interactPiano(yinit, mx, my) {
    let noteHeld = -1;
    if (mouseIsPressed) {
        let ybot = yinit - 40;
        let ytop = yinit;
        let xpos = -pianoX + whiteWidth - blackWidth / 2;
        if (mx > xpos && mx < xpos + blackWidth && my > ybot && my < ytop) {
            let blackKey = 0;
            let bindex = blackKeyToIndex(blackKey);
            triggerKey(bindex);
            noteHeld = bindex;
        }
        xpos += whiteWidth * 2;
        for (let j = 0; j < 7; j++) {
            for (let i = 0; i < 2; i++) {
                if (mx > xpos && mx < xpos + blackWidth && my > ybot && my < ytop) {
                    let blackKey = j * 5 + i + 1;
                    let bindex = blackKeyToIndex(blackKey);
                    triggerKey(bindex);
                    noteHeld = bindex;
                }
                xpos += whiteWidth;
            }
            xpos += whiteWidth;
            for (let i = 0; i < 3; i++) {
                if (mx > xpos && mx < xpos + blackWidth && my > ybot && my < ytop) {
                    let blackKey = j * 5 + i + 3;
                    let bindex = blackKeyToIndex(blackKey);
                    triggerKey(bindex);
                    noteHeld = bindex;
                }
                xpos += whiteWidth;
            }
            xpos += whiteWidth;
        }
        if (noteHeld == -1) {
            if (mx > -pianoX && mx < pianoX && my > yinit - 60 && my < yinit) {
                let whiteKey = Math.floor((mx + pianoX) / whiteWidth);
                let index = whiteKeyToIndex(whiteKey);
                triggerKey(index);
                noteHeld = index;
            }
        }
    }
}

function playSound(frequency) {
    fetch("https://api.particle.io/v1/devices/0a10aced202194944a06511c/cF_playNote", {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer b34ddbb00a3dcf9571eb63c9ce2eb6f1f5fba05b'
        },
        body: new URLSearchParams({
            'args': frequency
        })
    });
}

function triggerKey(key) {
    if (pianoSoundPlaying[key] == 1) {
        pianoSoundPlaying[key] = 2;
    } else if (pianoSoundPlaying[key] < 1) {
        // pianoSound[key].stop();
        // pianoSound[key].setVolume(volumeCoefficient);
        // pianoSound[key].play();
        // console.log(key);
        /* send to particle photon */
        freqTable = [880.00, 932.33, 987.77, 523.25, 554.37, 587.33, 622.25, 659.26, 698.46, 739.99, 783.99, 830.61];
        frequency = freqTable[key % 12] * (2 ** Math.floor((key - 3) / 12 - 3));
        // console.log(Math.floor((key - 3) / 12 - 3));
        // console.log(frequency);
        playSound(frequency);
        pianoSoundPlaying[key] = 2;
    }
}

function pianoUpdateVolume() {
    for (let i = 0; i < 88; i++) {
        if (pianoSoundPlaying[i] > 0) {
            if (pianoSoundPlaying[i] == 2) {
                pianoSoundPlaying[i] = 1;
            } else {
                // pianoSound[i].setVolume(pianoSoundPlaying[i] * volumeCoefficient);
                pianoSoundPlaying[i] *= volumeDecay;
                if (pianoSoundPlaying[i] < 0.1) {
                    // pianoSound[i].stop();
                    playSound('nop');
                    pianoSoundPlaying[i] = 0;
                }
            }
        }
    }
}

var whiteKeyIndex = [0, 2, 3, 5, 7, 8, 10];
var blackKeyIndex = [1, 4, 6, 9, 11];
var indexWhiteKey = [0, Number.NaN, 1, 2, Number.NaN, 3, Number.NaN, 4, 5, Number.NaN, 6, Number.NaN];
var indexBlackKey = [];

function whiteKeyToIndex(whiteKey) {
    /*
    key 0 -> 0
    key 1 -> 2
    key 2 -> 3
    key 3 -> 5
    key 4 -> 7
    key 5 -> 8
    key 6 -> 10
    end of cycle


    key 8 -> 14
    key 9 -> 15
    */
    let octave = Math.floor(whiteKey / 7);
    mod = whiteKey % 7;
    return octave * 12 + whiteKeyIndex[mod];
}

function indexToWhiteKey(index) {
    /*
    index 0 -> 0
    index 1 -> Nan
    index 2 -> 1
    index 3 -> 2
    index 4 -> Nan
    index 5 -> 3
    index 6 -> Nan
    index 7 -> 4
    index 8 -> 5
    index 9 -> Nan
    index 10 -> 6
    index 11 -> Nan
    end of cycle
    */
    let octave = Math.floor(index / 12);
    mod = index % 12;
    return octave + indexWhiteKey[mod];
}

function blackKeyToIndex(blackKey) {
    /*
    key 0 -> 1
    key 1 -> 4
    key 2 -> 6
    key 3 -> 9
    key 4 -> 11
    end of cycle
    */
    let octave = Math.floor(blackKey / 5);
    mod = blackKey % 5;
    return octave * 12 + blackKeyIndex[mod];
}

function drawRectangle(x1, y1, x2, y2, radius=0) {
    // coordinates from -360 to 360 and -180 to 180
    // typical website is 1920 by 960, which is an aspect ratio of 2
    cornerX1 = translateX(x1);
    cornerY1 = translateY(y1);
    xWidth = (x2 - x1) * (windowWidth / 720);
    yHeight = (y2 - y1) * (-windowHeight / 360);
    radius *= (windowWidth / 720);
    if (xWidth < 0) {
        cornerX1 += xWidth;
        xWidth *= -1;
    }
    if (yHeight < 0) {
        cornerY1 += yHeight;
        yHeight *= -1;
    }
    rect(cornerX1, cornerY1, xWidth, yHeight, radius);
}

function drawText(textS, x, y, size, align=LEFT, weight=0) {
    size *= (windowHeight / 360)
    textSize(size);
    textAlign(align);
    // strokeWeight(size / 10);
    strokeWeight(weight);
    x = translateX(x);
    y = translateY(y);
    text(textS, x, y);
    // strokeWeight(1);
}

function translateX(x) {
    x += 360;
    x *= (windowWidth / 720);
    return x;
}

function translateY(y) {
    return windowHeight - (y + 180) * (windowHeight / 360);
}

function translateFromX(x) {
    x /= (windowWidth / 720);
    x -= 360;
    return x;
}

function translateFromY(y) {
    y /= (windowHeight / 360);
    y = 180 - y;
    return y;
}

function mouseWheel(event) {
    scrollWheel = event.delta;
}

function subnodeDFS(node, gathering) {
    if (node == null || node.key == null) {
        return;
    }
    switch(node.key) {
        case "T": // Timestamp
        let timestampValue = node.value.value_;
        gathering[0] = timestampValue;
        break;

        case "K": // Key
        let keyValue = node.value.value_;
        gathering[1] = keyValue;
        break;

        case "D": // Duration
        let durationValue = node.value.value_;
        gathering[2] = durationValue;
        break;

        case "V": // Velocity
        let velocityValue = node.value.value_;
        gathering[3] = velocityValue;
        break;
    }
    if (gathering[0] != -1 && gathering[1] != -1 && gathering[2] != -1 && gathering[3] != -1) {
        /* adjust the start timestamp to the timestamp - duration */
        let entryTimestamp = (gathering[0] - gathering[3]) / 1000;
        databaseTransfer.push(new MidiNote(entryTimestamp, gathering[1], gathering[2], gathering[3]));
        let adjustedTimestamp = entryTimestamp + utcOffset;
        // console.log(adjustedTimestamp);
        let bin = Math.floor(adjustedTimestamp / 86400 - (10957 + 8766)); // days since January 1st, 2024
        // console.log("bin " + bin);
        if (bin < 0 || bin >= binsTransfer.length) {
            console.log("error: incorrect timestamp for entry T: " + gathering[0] + " K: " + gathering[1] + " D: " + gathering[2] + " V: " + gathering[3]);
        } else {
            binsTransfer[bin].push(databaseTransfer.length - 1);
        }
        return;
    }
    subnodeDFS(node.left, gathering);
    subnodeDFS(node.right, gathering);
}

function databaseDFS(node) {
    if (node == null || node.key == null) {
        return;
    }
    let idValue = node.key; // we don't really need this    

    let subnode = node.value.children_.root_;
    let gathering = [-1, -1, -1, -1];
    subnodeDFS(subnode, gathering);

    databaseDFS(node.left);
    databaseDFS(node.right);
}

function streamData() { // collect data from database and load it into database
    databaseTransfer = [];
    for (let i = 0; i < binsTransfer.length; i++) {
        binsTransfer[i] = [];
    }
    firebase.get(firebase.ref(firebase.database))
    .then((snapshot) => {
        // console.log(snapshot);
        /*
        snapshot._node.children_.root_ - instance
        node.value.children_.root_ - subnode??
        */
        if (snapshot._node.children_.root_ != null && snapshot._node.children_.root_.value != null) {
            var dbNode = snapshot._node.children_.root_.value.children_.root_; // okay so it's a tree structure
            // console.log(dbNode);
            // add data
            databaseDFS(dbNode); // do depth first search idk
            database = databaseTransfer; // this copies (but the other doesn't?)
            bins = binsTransfer.slice(); // this copies (need slice). Pointers are literally more intuitive
            databaseTransfer = [];
            for (let i = 0; i < binsTransfer.length; i++) {
                binsTransfer[i] = [];
            }
            // console.log(database);
            // console.log(databaseTransfer);
            // alert("successfully got data!");
        }
    })
    .catch((error) => {
        alert(error);
    }) 
}