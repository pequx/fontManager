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

const cellCount = 100,
    cellWidth = 44,
    cellHeight = 40,
    cellMarginTop = 1,
    cellMarginBottom = 8,
    cellMarginLeftRight = 1,
    glyphMargin = 5,
    pixelRatio = window.devicePixelRatio || 1;

let pageSelected, font, fontScale, fontSize, fontBaseline, glyphScale, glyphSize, glyphBaseline;

// ================================
// PAGE LAYOUT
// ================================

Object.prototype.setAttributes = function (attrs) {
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

function layout() {
    let container = document.createElement('div');
    // let file = document.createElement('input');
    let info = document.createElement('span');
    let message = document.createElement('div');

    // container.appendChild(file);
    container.appendChild(info);
    container.appendChild(message);

    let paginationContainer = document.createElement('div');
    let pagination = document.createElement('span');
    let glyphListEnd = document.createElement('div');

    paginationContainer.appendChild(pagination);
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
    paginationContainer.setAttributes({'id' : 'pagination-container'});
    pagination.setAttributes({'id' : 'pagination'});
    glyphListEnd.setAttributes({'id' : 'glyph-list-end'});
    glyphContainer.setAttributes({'id' : 'glyph-container'});
    glyphDisplay.setAttributes({'id' : 'glyph-display'});
    glyphBg.setAttributes({'id' : 'glyph-bg', 'width' : 500, 'height' : 500});
    glyph.setAttributes({'id' : 'glyph', 'width': 500, 'height' : 500});
    glyphData.setAttributes({'id' : 'glyph-data'});

    return container;
}

document.body.appendChild(layout());

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
            let currentTag = tags[tag];
            if (parseInt(currentTag.unicode, 16) === current.unicode) {
                current.addTags(currentTag.search.terms, currentTag.label);
            }
        }
    }
    // callback.call(this, Object.keys(glyphs).length);
};

Object.prototype.renameProperty = function (oldName, newName) {
    // Do nothing if the names are the same
    if (oldName == newName) {
        return this;
    }
    // Check for the old property name to avoid a ReferenceError in strict mode.
    if (this.hasOwnProperty(oldName)) {
        this[newName] = this[oldName];
        this[newName].index = newName;
        delete this[oldName];
    }
    return this;
};


opentype.Font.prototype.filterGlyphs = function(callback) {
    let glyphs = this.glyphs.glyphs,
        counter = 0;
    for (let glyph in glyphs) {
        let current = glyphs[glyph];
        const regex = /(zero|one|two|three|four|five|six|seven|eight|nine|space|hyphen|period|at|.notdef)|^[a-zA-Z]$/s;
        let match = current.name.match(regex);
        if (match === null) { continue; }
        let indexes = [];
        if (match.length > 0) { delete glyphs[glyph]; }
    }
    for (let glyph in glyphs) {
        glyphs.renameProperty(glyph, counter);
        counter++;
    }
    callback.call(this, Object.keys(glyphs).length);
};


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
        font.tagGlyphs(tags);
        onFontLoaded(font);
    });
});


enableHighDPICanvas('glyph-bg');
enableHighDPICanvas('glyph');
prepareGlyphList();


function findByProp(o, prop, val, retprop) {
    if(o==null) return false;
    if( o[prop] === val ){
        return (retprop) ? o[retprop] : o;
    }
    var result, p;
    for (p in o) {
        if( o.hasOwnProperty(p) && typeof o[p] === 'object' ) {
            result = findByProp(o[p], prop, val);
            if(result){
                return (retprop) ? result[retprop] : result;
            }
        }
    }
    return (retprop) ? result[retprop] : result;
}


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
    var glyph = window.font.glyphs.get(glyphIndex),
        html = '<dl>';
    html += '<dt>name</dt><dd>'+glyph.name+'</dd>';

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
    var glyphBgCanvas = document.getElementById('glyph-bg'),
        w = glyphBgCanvas.width / pixelRatio,
        h = glyphBgCanvas.height / pixelRatio,
        glyphW = w - glyphMargin*2,
        glyphH = h - glyphMargin*2,
        head = window.font.tables.head,
        maxHeight = head.yMax - head.yMin,
        ctx = glyphBgCanvas.getContext('2d');

    glyphScale = Math.min(glyphW/(head.xMax - head.xMin), glyphH/maxHeight);
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
    hline('yMax', window.font.tables.head.yMax);
    hline('yMin', window.font.tables.head.yMin);
    hline('Ascender', window.font.tables.hhea.ascender);
    hline('Descender', window.font.tables.hhea.descender);
    hline('Typo Ascender', window.font.tables.os2.sTypoAscender);
    hline('Typo Descender', window.font.tables.os2.sTypoDescender);
}


function onFontLoaded(font) {
    window.font = font;

    var w = cellWidth - cellMarginLeftRight * 2,
        h = cellHeight - cellMarginTop - cellMarginBottom,
        head = font.tables.head,
        maxHeight = head.yMax - head.yMin;

    fontScale = Math.min(w/(head.xMax - head.xMin), h/maxHeight);
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
