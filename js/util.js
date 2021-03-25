function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2))
}


// https://stackoverflow.com/questions/48277514/canvas-get-pixels-on-a-line
function getPixelsOnLine(imageData, width, height, startX, startY, endX, endY) {
    let pixelCols = [];
    let getPixel = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) {
            return [0, 0, 0, 0];
        }
        let ind = (x + y * width) * 4;
        return [imageData[ind++], imageData[ind++], imageData[ind++], imageData[ind++]];
    }

    var x = Math.floor(startX);
    var y = Math.floor(startY);
    const xx = Math.floor(endX);
    const yy = Math.floor(endY);
    const dx = Math.abs(xx - x);
    const sx = x < xx ? 1 : -1;
    const dy = -Math.abs(yy - y);
    const sy = y < yy ? 1 : -1;
    var err = dx + dy;
    var e2;
    var end = false;
    while (!end) {
        pixelCols = pixelCols.concat(getPixel(x, y));
        if ((x === xx && y === yy)) {
            end = true;
        } else {
            e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                x += sx;
            }
            if (e2 <= dx) {
                err += dx;
                y += sy;
            }
        }
    }
    return pixelCols;
}


function startLoop(updateFn, loopFn = window.requestAnimationFrame) {
    if (typeof loopFn === 'number') {
        const timeout = loopFn;
        loopFn = (callback) => {
            window.setTimeout(callback, timeout);
        };
    }

    function callback() {
        updateFn()
        loopFn(callback)
    }
    loopFn(callback)
}