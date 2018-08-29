/**
 * Application entry point
 */

// Load application styles
import 'styles/index.scss';
import _ from 'lodash';
import * as opentype from 'opentype.js';

// ================================
// CONFIG
// ================================

const cellCount = 25,
    cellWidth = 100,
    cellHeight = 100,
    cellMarginTop = 1,
    cellMarginBottom = 8,
    cellMarginLeftRight = 1,
    glyphMargin = 5,
    pixelRatio = window.devicePixelRatio || 1;

let pageSelected, font, fontScale, fontSize, fontBaseline, glyphScale, glyphSize, glyphBaseline;

// ================================
// HELPERS
// ================================

HTMLElement.prototype.setAttributes = function (attrs) {
    for (var idx in attrs) {
        //@todo: add has own property check
        if ((idx === 'styles' || idx === 'style') && typeof attrs[idx] === 'object') {
            for (var prop in attrs[idx]){this.style[prop] = attrs[idx][prop];}
        } else if (idx === 'html') {
            this.innerHTML = attrs[idx];
        } else {
            this.setAttribute(idx, attrs[idx]);
        }
    }
};

// ================================
// PAGE LAYOUT
// ================================

let layout = function() {
    let container = document.createElement('div');
    // let file = document.createElement('input');
    let info = document.createElement('span');
    let message = document.createElement('div');

    // container.appendChild(file);
    container.appendChild(info);
    container.appendChild(message);

    let searchContainer = document.createElement('div');
    let search = document.createElement('input');
    let searchResultsContainer = document.createElement('div');
    let searchResults = document.createElement('div');

    searchContainer.appendChild(search);
    searchResultsContainer.appendChild(searchResults);
    container.appendChild(searchContainer);
    container.appendChild(searchResultsContainer);

    let paginationContainer = document.createElement('div');
    let pagination = document.createElement('span');
    let glyphListEnd = document.createElement('div');

    container.appendChild(pagination);
    paginationContainer.appendChild(glyphListEnd);
    container.appendChild(paginationContainer);

    let glyphContainer = document.createElement('div');
    let glyphDisplay = document.createElement('div');
    let glyphBg = document.createElement('canvas');
    let glyph = document.createElement('canvas');
    let glyphData = document.createElement('div');

    glyphDisplay.appendChild(glyphBg);
    glyphDisplay.appendChild(glyph);
    glyphContainer.appendChild(glyphDisplay);
    glyphContainer.appendChild(glyphData);
    container.appendChild(glyphContainer);

    container.setAttributes({'class' : 'container'});
    // file.setAttributes({'id' : 'file', 'type' : 'file'});
    info.setAttributes({'class' : 'info', 'id' : 'font-name'});
    message.setAttributes({'id' : 'message'});
    searchContainer.setAttributes({'id' : 'search-container'});
    search.setAttributes({'id' : 'search'});
    searchResults.setAttributes({'id' : 'search-results'});
    searchResultsContainer.setAttributes({'id' : 'search-results-container'});
    paginationContainer.setAttributes({'id' : 'pagination-container'});
    pagination.setAttributes({'id' : 'pagination'});
    glyphListEnd.setAttributes({'id' : 'glyph-list-end'});
    glyphContainer.setAttributes({'id' : 'glyph-container'});
    glyphDisplay.setAttributes({'id' : 'glyph-display'});
    glyphBg.setAttributes({'id' : 'glyph-bg', 'width' : 500, 'height' : 500});
    glyph.setAttributes({'id' : 'glyph', 'width': 500, 'height' : 500});
    glyphData.setAttributes({'id' : 'glyph-data'});

    return container;
};

document.body.appendChild(layout());
document.getElementById('search').addEventListener('keyup', search, false);

// ================================
// SEARCH HANDLER
// ================================

function search(event) {
    let glyphs = window.font.glyphs.glyphs;
    let value = event.target.value;
    let results = document.getElementById('search-results');
    let matched = [];

    if (value.length < 3 ) { return; }

    for (let glyph in glyphs) {
        let currentGlyph = glyphs[glyph];
        let tags = currentGlyph.tags;

        //@todo: add handler for multiple name occurrences
        //@todo: handle the issue when user search for the already presented stuff
        let regex = new RegExp(value+'$', 'g');
        let name = currentGlyph.name;
        let matchName = name.match(regex);
        if (matchName) {
            matched.push(currentGlyph);
        }

        if (typeof tags === 'undefined') { continue; }

        let matchTags = tags.includes(value);
        if (!matchTags) { continue; }
        matched.push(currentGlyph);
    }

    if (matched.length === 0) { return; }

    for (let glyph in matched) {
        let currentMatch = matched[glyph];
        if (currentMatch.index === undefined) {continue;}
        let id = 's'+currentMatch.index;
        if (!currentMatch) { continue; }
        let item = results.querySelector('#'+id);
        // let itemPagination = document.getElementById('pagination-container').querySelector('#'+'g'+currentMatch.index);
        // if (itemPagination) { itemPagination.setAttributes({'class' : 'selected'}); }
        if (item) { continue; }
        let canvas = document.createElement('canvas');
        canvas.setAttributes({'id': id, 'class' : 'item'});
        canvas.width = cellWidth;
        canvas.height = cellHeight;
        canvas.addEventListener('click', cellSelect, false);
        results.appendChild(canvas);
        renderGlyphItem(canvas, currentMatch.index);
    }
}

// ================================
// INIT
// ================================

const fontFileName = './assets/fonts/font.otf';
const tagsFileName = 'http://0.0.0.0:8080/assets/tags/icons.json';
document.getElementById('font-name').innerHTML = fontFileName.split('/')[3];
// var fileButton = document.getElementById('file');
// fileButton.addEventListener('change', onReadFile, false);

opentype.Glyph.prototype.addTags = function(tags, label) {
    this.tags = tags;
    this.label = label;
};

opentype.Font.prototype.tagGlyphs = function(tags) {
    let glyphs = this.glyphs.glyphs;
    for (let glyph in glyphs) {
        let current = glyphs[glyph];
        if (current.unicode === undefined) { continue; }

        for (let tag in tags) {
            // if (!tags) { current.addTags()}
            let currentTag = tags[tag];
            if (parseInt(currentTag.unicode, 16) === current.unicode) {
                current.addTags(currentTag.search.terms, currentTag.label);
            }
        }
    }
    let test = 2;
    // callback.call(this, Object.keys(glyphs).length);
};

/**
 * Method removes non-ideogram glyphs
 * @param callback
 */
opentype.Font.prototype.filterGlyphs = function(callback) {
    let glyphs = this.glyphs.glyphs,
        counter = 0,
        deletedCounter = 0,
        orginalCounter = this.glyphs.length;

    //this removes unwanted glyphs from font, DO NOT remove .notdef, it's needed.
    for (let glyph in glyphs) {
        if (glyphs.hasOwnProperty(glyph)) {
            let current = glyphs[glyph];
            const regex = /(zero|one|two|three|four|five|six|seven|eight|nine|space|hyphen|period|at)|^[a-zA-Z]$/s;
            let match = current.name.match(regex);
            if (match === null) { continue; }
            if (match.length > 0) { delete glyphs[glyph]; deletedCounter++; }
        }
    }

    //this fixes enumeration problems, as js is so fancy that it behaves like assembler lol
    let processed = [];
    for (let glyph in glyphs) {
        if (glyphs.hasOwnProperty(glyph)) {
            let newCurrent = glyphs[glyph];
            newCurrent.index = counter;
            processed.push(newCurrent);
            delete glyphs[glyph];
            counter++;
        }
    }

    //at least we don't have to write into ALU register :D
    if (deletedCounter + counter !== orginalCounter) { return; }

    this.glyphs.glyphs = Object.assign({}, processed);
    this.glyphs.length = counter;

    callback.call(this, counter);
};

/**
 * Method to add a glypn into curretnly loaded font
 * @param pathData
 * @param glyphData
 * @param callback
 */
opentype.Font.prototype.appendGlyph = function(pathData, glyphData, callback) {
    const regex = {
        'positive': /(?=[MLCQZ])/,
        'negative': /(?<=[MLCQZ])/,
        'coordinates': / |(?=-)/
    };
    let splitData = pathData.split(regex.positive);

    function splitCommand(command) {
        const result = command.split(regex.negative);
        return {type: result[0], coordinates: result[1]};
    }

    function splitCoordinates(coordinates) {
        if (typeof coordinates === 'undefined') { return; }
        let result = coordinates.split(regex.coordinates);

        for (let element in result) {
            if (result.hasOwnProperty(element)) {
                result[element] = parseFloat(result[element]);
            }
        }

        if (result.length === 6) {
            return {x1: result[0], y1: result[1], x2: result[2], y2: result[3], x: result[4], y: result[5]}
        } else if (result.length === 4) {
            return {x1: result[0], y1: result[1], x: result[2], y: result[3]}
        } else if (result.length === 2) {
            return {x: result[0], y: result[1]}
        }
    }

    let path = new opentype.Path();

    for (let element in splitData) {
        if (splitData.hasOwnProperty(element)) {
            const command = splitCommand(splitData[element]),
                coordinates = splitCoordinates(command.coordinates);

            if (command.type === 'M') {
                path.moveTo(coordinates.x, coordinates.y);
            } else if (command.type === 'L') {
                path.lineTo(coordinates.x, coordinates.y);
            } else if (command.type === 'C') {
                path.bezierCurveTo(coordinates.x1, coordinates.y1, coordinates.x2, coordinates.y2, coordinates.x, coordinates.y);
            } else if (command.type === 'Q') {
                path.quadraticCurveTo(coordinates.x1, coordinates.y1, coordinates.x, coordinates.y);
            } else if (command.type === 'Z') {
                path.closePath();
            }
        }
    }

    //i don't belive this. yay js, so modern, so declarative.
    let { [Object.keys(this.glyphs.glyphs).pop()]: lastGlyph } = this.glyphs.glyphs,
        // newGlyph = this.glyphs.glyphs[lastGlyph.index+1];
        newGlyph = new opentype.Glyph({
            advanceWidth: 512,
            name: glyphData.name,
            unitsPerEm: 512,
            leftSideBearing: 0,
            label: 'siusiak',
            // unicode: lastGlyph.unicode + 1,
            path: path,
            index: lastGlyph.index + 1
        });

    newGlyph.addUnicode(lastGlyph.unicode + 1);

    this.glyphs.glyphs[lastGlyph.index+1] = newGlyph;
    this.nGlyphs = this.numGlyphs = this.numberOfHMetrics = this.glyphs.length + 1;

    console.log(this.glyphs.glyphs[lastGlyph.index+1]);

    // callback.call(this, newGlyph);
};

/**
 * Method loads the font from a file at given location
 */
opentype.load(fontFileName, function(err, font) {
    let amount, glyph, ctx, x, y, fontSize, tags;
    if (err) {
        showErrorMessage(err.toString());
        return;
    }
    readXmlDocument(tagsFileName, function(responseText) {
        let tags = JSON.parse(responseText);
        font.filterGlyphs(function(callback) {
            this.nGlyphs = this.numGlyphs = this.numberOfHMetrics = callback;
            this.glyphs.length = callback;
        });
        const path = 'M502 390L280 168L280-15L344-15C355.333328247070313-15 364.833328247070313-18.833328247070313 372.500000000000000-26.500000000000000C380.166671752929688-34.166671752929688 384-43.666671752929688 384-55C384-57 383.166671752929688-58.833328247070313 381.500000000000000-60.500000000000000C379.833328247070313-62.166671752929688 378-63 376-63L136-63C134-63 132.166671752929688-62.166671752929688 130.500000000000000-60.500000000000000C128.833328247070313-58.833328247070313 128-57 128-55C128-43.666671752929688 131.833328247070313-34.166671752929688 139.500000000000000-26.500000000000000C147.166671752929688-18.833328247070313 156.666671752929688-15 168-15L232-15L232 168L10 390C3.333328247070313 397.333328247070313 0 405.500000000000000 0 414.500000000000000C0 423.500000000000000 3.166671752929688 431.333328247070313 9.500000000000000 438C15.833328247070313 444.666671752929688 24 448 34 448L478 448C488 448 496.166671752929688 444.666671752929688 502.500000000000000 438C508.833328247070313 431.333328247070313 512 423.500000000000000 512 414.500000000000000C512 405.500000000000000 508.666671752929688 397.333328247070313 502 390ZM256 212L444 400L68 400Z';
        font.appendGlyph(path, {name: 'wurst'});

        // font.tagGlyphs(tags);

        let path1 = font.glyphs.glyphs[1].path,
            path2 = font.glyphs.glyphs[910].path,
            comparision = JSON.stringify(font.glyphs.glyphs[1].path) === JSON.stringify(font.glyphs.glyphs[910].path);
            // test = font.toTables();

        // font.download();
        onFontLoaded(font);
    });

});

enableHighDPICanvas('glyph-bg');
enableHighDPICanvas('glyph');
prepareGlyphList();

/**
 * Method reads the font file
 * @param url
 * @param callback
 */
function readXmlDocument(url, callback) {
    let xmlhttp;
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    } else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
            if (typeof callback === 'function' )
                callback(xmlhttp.responseText);
        }
    };

    xmlhttp.open('GET', url, true);
    xmlhttp.setRequestHeader('Access-Control-Allow-Origin', '0.0.0.0');
    xmlhttp.setRequestHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    xmlhttp.setRequestHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, X-Auth-Token');
    xmlhttp.send();
}

// ================================
// DRAWING, HANDLING AND STUFF...
// ================================

/**
 * Sets retina canvas support
 * @param canvas
 */
function enableHighDPICanvas(canvas) {
    if (typeof canvas === 'string') {
        canvas = document.getElementById(canvas);
    }
    let pixelRatio = window.devicePixelRatio || 1;
    if (pixelRatio === 1) return;
    let oldWidth = canvas.width;
    let oldHeight = canvas.height;
    canvas.width = oldWidth * pixelRatio;
    canvas.height = oldHeight * pixelRatio;
    canvas.style.width = oldWidth + 'px';
    canvas.style.height = oldHeight + 'px';
    canvas.getContext('2d').scale(pixelRatio, pixelRatio);
}

function showErrorMessage(message) {
    var el = document.getElementById('message');
    if (!message || message.trim().length === 0) {
        el.style.display = 'none';
    } else {
        el.style.display = 'block';
    }
    el.innerHTML = message;
}


function pathCommandToString(cmd) {
    let str = '<strong>' + cmd.type + '</strong> ' +
        ((cmd.x !== undefined) ? 'x='+cmd.x+' y='+cmd.y+' ' : '') +
        ((cmd.x1 !== undefined) ? 'x1='+cmd.x1+' y1='+cmd.y1+' ' : '') +
        ((cmd.x2 !== undefined) ? 'x2='+cmd.x2+' y2='+cmd.y2 : '');
    return str;
}


function contourToString(contour) {
    return '<pre class="contour">' + contour.map(function(point) {
        return '<span class="' + (point.onCurve ? 'on' : 'off') + 'curve">x=' + point.x + ' y=' + point.y + '</span>';
    }).join('\n') + '</pre>';
}


function formatUnicode(unicode) {
    unicode = unicode.toString(16);
    if (unicode.length > 4) {
        return ("000000" + unicode.toUpperCase()).substr(-6)
    } else {
        return ("0000" + unicode.toUpperCase()).substr(-4)
    }
}


function displayGlyphData(glyphIndex) {
    const container = document.getElementById('glyph-data');
    if (glyphIndex < 0) {
        container.innerHTML = '';
        return;
    }

    let glyph = window.font.glyphs.get(glyphIndex),
        html = '<dl>';
    html += '<dt>name</dt><dd>'+glyph.name+'</dd>';

    console.log(glyph);

    if (glyph.unicodes.length > 0) {
        html += '<dt>unicode</dt><dd>'+ glyph.unicodes.map(formatUnicode).join(', ') +'</dd>';
    }

    html += '<dt>index</dt><dd>'+glyph.index+'</dd>';

    if (glyph.xMin !== 0 || glyph.xMax !== 0 || glyph.yMin !== 0 || glyph.yMax !== 0) {
        html += '<dt>xMin</dt><dd>'+glyph.xMin+'</dd>' +
            '<dt>xMax</dt><dd>'+glyph.xMax+'</dd>' +
            '<dt>yMin</dt><dd>'+glyph.yMin+'</dd>' +
            '<dt>yMax</dt><dd>'+glyph.yMax+'</dd>';
    }

    html += '<dt>advanceWidth</dt><dd>'+glyph.advanceWidth+'</dd>';

    if(glyph.leftSideBearing !== undefined) {
        html += '<dt>leftSideBearing</dt><dd>'+glyph.leftSideBearing+'</dd>';
    }

    if (typeof glyph.tags !== 'undefined' && glyph.tags.length > 0) {
        html += '<dt>tags</dt><dd>'+ glyph.tags.map(val => val).join(', ')+'</dd>';
    }

    html += '</dl>';

    if (glyph.numberOfContours > 0) {
        var contours = glyph.getContours();
        html += 'contours:<div id="glyph-contours">' + contours.map(contourToString).join('\n') + '</div>';
    } else if (glyph.isComposite) {
        html += '<br>This composite glyph is a combination of :<ul><li>' +
            glyph.components.map(function(component) {
                if (component.matchedPoints === undefined) {
                    return 'glyph '+component.glyphIndex+' at dx='+component.dx+', dy='+component.dy;
                } else {
                    return 'glyph '+component.glyphIndex+' at matchedPoints=['+component.matchedPoints+']';
                }
            }).join('</li><li>') + '</li></ul>';
    } else if (glyph.path) {
        html += 'path:<br><pre>  ' + glyph.path.commands.map(pathCommandToString).join('\n  ') + '\n</pre>';
    }

    container.innerHTML = html;
}



function renderGlyphItem(canvas, glyphIndex) {
    var cellMarkSize = 4;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cellWidth, cellHeight);
    if (glyphIndex >= window.font.numGlyphs) return;

    ctx.fillStyle = '#606060';
    ctx.font = '9px sans-serif';
    ctx.fillText(glyphIndex, 1, cellHeight-1);
    var glyph = window.font.glyphs.get(glyphIndex),
        name = window.font.glyphs.get(name),
        glyphWidth = glyph.advanceWidth * fontScale,
        xmin = (cellWidth - glyphWidth)/2,
        xmax = (cellWidth + glyphWidth)/2,
        x0 = xmin;

    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(xmin-cellMarkSize+1, fontBaseline, cellMarkSize, 1);
    ctx.fillRect(xmin, fontBaseline, 1, cellMarkSize);
    ctx.fillRect(xmax, fontBaseline, cellMarkSize, 1);
    ctx.fillRect(xmax, fontBaseline, 1, cellMarkSize);

    ctx.fillStyle = '#000000';
    glyph.draw(ctx, x0, fontBaseline, fontSize);
}


function displayGlyphPage(pageNum) {
    pageSelected = pageNum;
    document.getElementById('p'+pageNum).className = 'page-selected';
    var firstGlyph = pageNum * cellCount;
    for(var i = 0; i < cellCount; i++) {
        renderGlyphItem(document.getElementById('g'+i), firstGlyph+i);
    }
}

const arrowLength = 10,
    arrowAperture = 4;

function drawArrow(ctx, x1, y1, x2, y2) {
    const dx = x2 - x1,
        dy = y2 - y1,
        segmentLength = Math.sqrt(dx*dx + dy*dy),
        unitx = dx / segmentLength,
        unity = dy / segmentLength,
        basex = x2 - arrowLength * unitx,
        basey = y2 - arrowLength * unity,
        normalx = arrowAperture * unity,
        normaly = -arrowAperture * unitx;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(basex + normalx, basey + normaly);
    ctx.lineTo(basex - normalx, basey - normaly);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();
}


/**
 * This function is Path.prototype.draw with an arrow
 * at the end of each contour.
 */
function drawPathWithArrows(ctx, path) {
    let i, cmd, x1, y1, x2, y2;
    let arrows = [];
    ctx.beginPath();
    for (i = 0; i < path.commands.length; i += 1) {
        cmd = path.commands[i];
        if (cmd.type === 'M') {
            if(x1 !== undefined) {
                arrows.push([ctx, x1, y1, x2, y2]);
            }
            ctx.moveTo(cmd.x, cmd.y);
        } else if (cmd.type === 'L') {
            ctx.lineTo(cmd.x, cmd.y);
            x1 = x2;
            y1 = y2;
        } else if (cmd.type === 'C') {
            ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
            x1 = cmd.x2;
            y1 = cmd.y2;
        } else if (cmd.type === 'Q') {
            ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
            x1 = cmd.x1;
            y1 = cmd.y1;
        } else if (cmd.type === 'Z') {
            arrows.push([ctx, x1, y1, x2, y2]);
            ctx.closePath();
        }
        x2 = cmd.x;
        y2 = cmd.y;
    }
    if (path.fill) {
        ctx.fillStyle = path.fill;
        ctx.fill();
    }
    if (path.stroke) {
        ctx.strokeStyle = path.stroke;
        ctx.lineWidth = path.strokeWidth;
        ctx.stroke();
    }
    ctx.fillStyle = '#000000';
    arrows.forEach(function(arrow) {
        drawArrow.apply(null, arrow);
    });
}


function displayGlyph(glyphIndex) {
    var canvas = document.getElementById('glyph'),
        ctx = canvas.getContext('2d'),
        width = canvas.width / pixelRatio,
        height = canvas.height / pixelRatio;
    ctx.clearRect(0, 0, width, height);
    if(glyphIndex < 0) return;
    var glyph = window.font.glyphs.get(glyphIndex),
        glyphWidth = glyph.advanceWidth * glyphScale,
        xmin = (width - glyphWidth)/2,
        xmax = (width + glyphWidth)/2,
        x0 = xmin,
        markSize = 10;

    ctx.fillStyle = '#606060';
    ctx.fillRect(xmin-markSize+1, glyphBaseline, markSize, 1);
    ctx.fillRect(xmin, glyphBaseline, 1, markSize);
    ctx.fillRect(xmax, glyphBaseline, markSize, 1);
    ctx.fillRect(xmax, glyphBaseline, 1, markSize);
    ctx.textAlign = 'center';
    ctx.fillText('0', xmin, glyphBaseline+markSize+10);
    ctx.fillText(glyph.advanceWidth, xmax, glyphBaseline+markSize+10);

    ctx.fillStyle = '#000000';
    var path = glyph.getPath(x0, glyphBaseline, glyphSize);
    path.fill = '#808080';
    path.stroke = '#000000';
    path.strokeWidth = 1.5;
    drawPathWithArrows(ctx, path);
    glyph.drawPoints(ctx, x0, glyphBaseline, glyphSize);
}


function pageSelect(event) {
    document.getElementsByClassName('page-selected')[0].className = '';
    displayGlyphPage(+event.target.id.substr(1));
}


function initGlyphDisplay() {
    const glyphBgCanvas = document.getElementById('glyph-bg'),
        w = glyphBgCanvas.width / pixelRatio,
        h = glyphBgCanvas.height / pixelRatio,
        // glyphW = w - glyphMargin*2,
        glyphH = h - glyphMargin*2,
        head = window.font.tables.head,
        maxHeight = head.yMax - head.yMin,
        ctx = glyphBgCanvas.getContext('2d');

    // glyphScale = Math.min(glyphW/(head.xMax - head.xMin), glyphH/maxHeight);
    glyphScale = Math.min(w/maxHeight, h/maxHeight)/1.666;
    glyphSize = glyphScale * window.font.unitsPerEm;
    glyphBaseline = glyphMargin + glyphH * head.yMax / maxHeight;

    function hline(text, yunits) {
        var ypx = glyphBaseline - yunits * glyphScale;
        ctx.fillText(text, 2, ypx+3);
        ctx.fillRect(80, ypx, w, 1);
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#a0a0a0';
    hline('Baseline', 0);
    // hline('yMax', window.font.tables.head.yMax);
    // hline('yMin', window.font.tables.head.yMin);
    hline('Ascender', window.font.tables.hhea.ascender);
    hline('Descender', window.font.tables.hhea.descender);
    // hline('Typo Ascender', window.font.tables.os2.sTypoAscender);
    // hline('Typo Descender', window.font.tables.os2.sTypoDescender);
}


function onFontLoaded(font) {
    window.font = font;

    var w = cellWidth - cellMarginLeftRight * 2,
        h = cellHeight - cellMarginTop - cellMarginBottom,
        head = font.tables.head,
        maxHeight = head.yMax - head.yMin;

    // fontScale = Math.min(w/(head.xMax - head.xMin), h/maxHeight);
    fontScale = Math.min(w/maxHeight, h/maxHeight)/1.666;
    fontSize = fontScale * font.unitsPerEm;
    fontBaseline = cellMarginTop + h * head.yMax / maxHeight;

    var pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    var fragment = document.createDocumentFragment();
    var numPages = Math.ceil(font.numGlyphs / cellCount);

    for(var i = 0; i < numPages; i++) {
        var link = document.createElement('span');
        var lastIndex = Math.min(font.numGlyphs-1, (i+1)*cellCount-1);
        link.textContent = i*cellCount + '-' + lastIndex;
        link.id = 'p' + i;
        link.addEventListener('click', pageSelect, false);
        fragment.appendChild(link);
        // A white space allows to break very long lines into multiple lines.
        // This is needed for fonts with thousands of glyphs.
        fragment.appendChild(document.createTextNode(' '));
    }
    pagination.appendChild(fragment);

    initGlyphDisplay();
    displayGlyphPage(0);
    displayGlyph(-1);
    displayGlyphData(-1);
}


function onReadFile(e) {
    document.getElementById('font-name').innerHTML = '';
    var file = e.target.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            font = opentype.parse(e.target.result);
            showErrorMessage('');
            onFontLoaded(font);
        } catch (err) {
            showErrorMessage(err.toString());
            if (err.stack) console.log(err.stack);
            throw(err);
        }
    };
    reader.onerror = function(err) {
        showErrorMessage(err.toString());
    };

    reader.readAsArrayBuffer(file);
}


function cellSelect(event) {
    if (!window.font) return;
    var firstGlyphIndex = pageSelected*cellCount,
        cellIndex = +event.target.id.substr(1),
        glyphIndex = firstGlyphIndex + cellIndex;
    if (glyphIndex < window.font.numGlyphs) {
        displayGlyph(glyphIndex);
        displayGlyphData(glyphIndex);
    }
}

function prepareGlyphList() {
    var marker = document.getElementById('glyph-list-end'),
        parent = marker.parentElement;
    for(var i = 0; i < cellCount; i++) {
        var canvas = document.createElement('canvas');
        canvas.width = cellWidth;
        canvas.height = cellHeight;
        canvas.className = 'item';
        canvas.id = 'g'+i;
        canvas.addEventListener('click', cellSelect, false);
        enableHighDPICanvas(canvas);
        parent.insertBefore(canvas, marker);
    }
}
