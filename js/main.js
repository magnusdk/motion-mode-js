const mModeLineWidth = 5;
const mModeMarkerHeight = 3;


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

function addVideoCanvasEventListeners(videoCanvas, state, onLineChange) {
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
        if (handle) onLineChange(state);
    }

    videoCanvas.addEventListener('mousedown', e => {
        setActiveHandle(e.offsetX, e.offsetY);
        updateHandlePos(e.offsetX, e.offsetY);
    });

    videoCanvas.addEventListener('mousemove', e => {
        updateHandlePos(e.offsetX, e.offsetY);
    });

    videoCanvas.addEventListener('mouseup', e => {
        updateHandlePos(e.offsetX, e.offsetY);
        handle = null;
    });
}


function setupVideoCanvas(videoCanvasElement, state, spritesheet, onLineChange) {
    let ctx = videoCanvasElement.getContext("2d");

    videoCanvasElement.width = spritesheet.width;
    videoCanvasElement.height = spritesheet.height;

    addVideoCanvasEventListeners(videoCanvasElement, state, onLineChange);

    function nextFrame() {
        if (!state.freezeVideoFrames)
            state.frame = (state.frame + 1) % spritesheet.numImages;
    }
    startLoop(nextFrame, 50);

    function updateCanvas() {
        ctx.putImageData(
            spritesheet.imageData,
            0,
            -spritesheet.height * state.frame,
            0,
            0,
            spritesheet.width,
            spritesheet.fullHeight);
        drawLine(ctx, state);
    }
    return updateCanvas
}


function addMModeCanvasEventListeners(mModeCanvas, state) {
    mModeCanvas.addEventListener('mousemove', e => {
        const hoveredFrame = Math.floor(e.offsetX / mModeLineWidth)
        state.frame = hoveredFrame;
    });

    mModeCanvas.addEventListener('mouseenter', e => {
        state.freezeVideoFrames = true;
    });

    mModeCanvas.addEventListener('mouseout', e => {
        state.freezeVideoFrames = false;
    });
}

function setupMModeCanvas(mModeCanvas, state, spritesheet) {
    const ctx = mModeCanvas.getContext("2d");
    addMModeCanvasEventListeners(mModeCanvas, state);

    return (state) => {
        pixelsArr = []
        for (let i = 0; i < spritesheet.numImages; i++) {
            const pixels = getPixelsOnLine(
                spritesheet.imageData.data,
                spritesheet.width,
                spritesheet.fullHeight,
                state.startX,
                state.startY + i * spritesheet.height,
                state.endX,
                state.endY + i * spritesheet.height)
            pixelsArr.push(pixels)
        }

        const numPixels = pixelsArr[0].length / 4
        mModeCanvas.width = spritesheet.numImages * mModeLineWidth
        mModeCanvas.height = numPixels + mModeMarkerHeight

        const imageData = ctx.createImageData(spritesheet.numImages * mModeLineWidth, numPixels + mModeMarkerHeight)
        const markerOffset = mModeMarkerHeight * spritesheet.numImages * mModeLineWidth * 4;

        for (let i = 0; i < spritesheet.numImages; i++) {
            let pixels = pixelsArr[i]
            for (let h = 0; h < numPixels; h++) {
                for (let w = 0; w < mModeLineWidth; w++) {
                    for (let rgb = 0; rgb < 4; rgb++) {
                        let rowOffset = h * mModeLineWidth * spritesheet.numImages * 4
                        let colOffset = w * 4 + i * mModeLineWidth * 4
                        imageData.data[markerOffset + rowOffset + colOffset + rgb] = pixels[h * 4 + rgb]
                    }
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }
}


function updateMModeFrameIndicator(mModeCanvasElement, frame, numFrames) {
    const ctx = mModeCanvasElement.getContext("2d");
    ctx.fillStyle = 'rgba(0, 0, 0, 1)'
    ctx.fillRect(0, 0, mModeLineWidth * numFrames, 3);
    ctx.fillStyle = 'rgba(255, 0, 0, 1)'
    ctx.fillRect(mModeLineWidth * frame, 0, mModeLineWidth, 3);
}


async function start(videoCanvasElement, mModeCanvasElement, images, initialState, { onLineChange }) {

    // Create a hidden canvas that will work as a sprite sheet.
    // Animating the video is basically just scrolling through this image.
    const spriteSheetElement = document.createElement('canvas');
    const spriteSheet = await setupSpritesheet(spriteSheetElement, 400, 400, images)


    // Setup state map
    const { startX, startY, endX, endY } = initialState
    const state = {
        startX: startX || 200,
        startY: startY || 200,
        endX: endX || 250,
        endY: endY || 250,
        frame: 0
    }


    // Setup internal callback
    const updateMMode = setupMModeCanvas(mModeCanvasElement, state, spriteSheet)
    const _onLineChange = (state) => {
        state.mModeNeedsUpdate = true;
        onLineChange(state); // External callback
    }
    const updateVideoCanvas = setupVideoCanvas(videoCanvasElement, state, spriteSheet, _onLineChange)

    function updateAnimation() {
        updateVideoCanvas();
        if (state.mModeNeedsUpdate) {
            updateMMode(state);
            state.mModeNeedsUpdate = false;
        }
        updateMModeFrameIndicator(mModeCanvasElement, state.frame, spriteSheet.numImages);
    }


    // Initialize callbacks and start animation
    _onLineChange(state)
    startLoop(updateAnimation)
}
