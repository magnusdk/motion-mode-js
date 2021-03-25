function loadImage(base64Data) {
    const image = new Image()
    p = new Promise((resolve, _) => {
        image.onload = resolve(image)
    })
    image.src = base64Data
    return p
}

function loadImages(base64Images) {
    return Promise.all(base64Images.map(loadImage));
}

function drawLine(ctx, { startX, startY, endX, endY }) {
    c1 = 'rgba(255, 255, 255, 0.5)'
    c2 = 'rgba(255, 0, 0, 0.5)'
    w1 = 3
    w2 = 1

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineCap = "round"
    ctx.lineWidth = w1;
    ctx.strokeStyle = c1;
    ctx.stroke();
    ctx.lineWidth = w2;
    ctx.strokeStyle = c2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(startX, startY, 10, 0, Math.PI * 2)
    ctx.lineWidth = w1;
    ctx.strokeStyle = c1;
    ctx.stroke();
    ctx.lineWidth = w2;
    ctx.strokeStyle = c2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(endX, endY, 10, 0, Math.PI * 2)
    ctx.lineWidth = w1;
    ctx.strokeStyle = c1;
    ctx.stroke();
    ctx.lineWidth = w2;
    ctx.strokeStyle = c2;
    ctx.stroke();
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2))
}

function addSeqCanvasEventListeners(seqCanvas, state) {
    let handle = null

    function setActiveHandle(x, y) {
        let { startX, startY, endX, endY } = state;
        distToFrom = distance(startX, startY, x, y);
        distToTo = distance(endX, endY, x, y);
        closestHandle = distToFrom < distToTo ? 'from' : 'to';
        closestHandleDist = closestHandle == 'from' ? distToFrom : distToTo;
        if (closestHandleDist < 40)
            handle = closestHandle;
    }

    function updateHandlePos(x, y) {
        switch (handle) {
            case null:
                break;
            case 'from':
                state.startX = x;
                state.startY = y;
                break;
            case 'to':
                state.endX = x;
                state.endY = y;
                break;
        }
    }

    seqCanvas.addEventListener('mousedown', e => {
        setActiveHandle(e.offsetX, e.offsetY);
        updateHandlePos(e.offsetX, e.offsetY);
    });

    seqCanvas.addEventListener('mousemove', e => {
        updateHandlePos(e.offsetX, e.offsetY);
    });

    seqCanvas.addEventListener('mouseup', e => {
        updateHandlePos(e.offsetX, e.offsetY);
        handle = null;
    });
}



// https://stackoverflow.com/questions/48277514/canvas-get-pixels-on-a-line
function getPixelsOnLine(imageData, startX, startY, endX, endY) {
    const data = imageData.data;
    let pixelCols = [];
    let getPixel = (x, y) => {
        if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
            return [0, 0, 0, 0];
        }
        let ind = (x + y * imageData.width) * 4;
        return [data[ind++], data[ind++], data[ind++], data[ind++]];
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





function setupSeqCanvas(state, numImages, tiledSeqImageData) {
    let seqCanvas = document.getElementById("seqCanvas");
    let ctx = seqCanvas.getContext("2d");

    seqCanvas.width = 400
    seqCanvas.height = 400

    addSeqCanvasEventListeners(seqCanvas, state);

    let frameIdx = 0
    function nextFrame() {
        frameIdx = (frameIdx + 1) % numImages;
        window.setTimeout(nextFrame, 50);
    }
    window.setTimeout(nextFrame, 50);

    return () => {
        ctx.putImageData(tiledSeqImageData, 0, -400 * frameIdx, 0, 0, 400, numImages * 400);
        drawLine(ctx, state)
    }
}

async function setupTiledSeqCanvas(images) {
    let canvas = document.getElementById("tiledSeqCanvas");
    let ctx = canvas.getContext("2d");

    canvas.width = 400
    canvas.height = 400 * images.length

    const _ = await Promise.all(images.map((image, i) => {
        return new Promise((resolve) => {
            image.onload = () => {
                ctx.drawImage(image, 0, 0 + i * 400, 400, 400)
                resolve()
            }
        })
    }))
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

function setupMModeCanvas(state, numImages, tiledSeqImageData) {
    let mModeCanvas = document.getElementById("mModeCanvas");
    let mModeCtx = mModeCanvas.getContext("2d");

    let prevState = { startX: null, startY: null, endX: null, endY: null }
    let hasChanged = () => {
        isSame = true
        for (key in state) {
            isSameForKey = prevState[key] === state[key]
            isSame = isSame && isSameForKey
            if (!isSameForKey) {
                prevState[key] = state[key]
            }
        }

        return !isSame
    }

    return () => {
        if (hasChanged()) {
            pixelsArr = []
            for (let i = 0; i < numImages; i++) {
                let pixels = getPixelsOnLine(
                    tiledSeqImageData,
                    state.startX,
                    state.startY + i * 400,
                    state.endX,
                    state.endY + i * 400)
                pixelsArr.push(pixels)
            }

            let numPixels = pixelsArr[0].length / 4
            let mModeWidth = 15
            mModeCanvas.width = numImages * mModeWidth
            mModeCanvas.height = numPixels
            const imageData = mModeCtx.createImageData(numImages * mModeWidth, numPixels)

            for (let i = 0; i < numImages; i++) {
                let pixels = pixelsArr[i]
                for (let h = 0; h < numPixels; h++) {
                    for (let w = 0; w < mModeWidth; w++) {
                        for (let rgb = 0; rgb < 4; rgb++) {
                            rowOffset = h * mModeWidth * numImages * 4
                            colOffset = w * 4 + i * mModeWidth * 4
                            imageData.data[rowOffset + colOffset + rgb] = pixels[h * 4 + rgb]
                        }
                    }
                }
            }
            mModeCtx.putImageData(imageData, 0, 0);
        }
    }
}


let state = {
    startX: 153, startY: 199,
    endX: 295, endY: 218
}

// getImages have made globally available in js/images.js.
loadImages(getImages())
    .then((images) => {
        console.log("all loaded")
        info = document.getElementById("info")
        setupTiledSeqCanvas(images)
            .then((tiledSeqImageData) => {
                seqAnim = setupSeqCanvas(state, images.length, tiledSeqImageData)
                mModeAnim = setupMModeCanvas(state, images.length, tiledSeqImageData)

                function animation() {
                    info.innerHTML = `
            Start = (${state['startX']}, ${state['startY']}).
            End = (${state['endX']}, ${state['endY']}).
            Length = ${Math.floor(distance(state['startX'], state['startY'], state['endX'], state['endY']))}
            `
                    seqAnim()
                    mModeAnim()
                    window.requestAnimationFrame(animation)
                }
                window.requestAnimationFrame(animation)
            })
    });
