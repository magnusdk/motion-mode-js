function imageType(images) {
    i0 = images[0];
    if (i0.tagName == "IMG") {
        return 'img';
    } else if (i0.getPixelData) {
        return 'cornerstone';
    }
}

/**
 * Draw the images on top of eachother in the spritesheet.
 * 
 * @param {*} ctx The spritesheet 2d context.
 * @param {*} width The width of the spritesheet.
 * @param {*} height The height of a single sprite in the spritesheet. The fullHeight is height*images.length.
 * @param {*} images An array of objects containing three keys: columns (width), rows (height), getPixelData(function that returns a Uint8ClampedArray representing pixel rgba values)
 */
function setupSpritesheetFromDicom(ctx, width, height, images) {
    const imgWidth = images[0].columns;
    const imgHeight = images[0].rows;

    const hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.width = imgWidth;
    hiddenCanvas.height = imgHeight;

    const ctxHidden = hiddenCanvas.getContext("2d");
    const imageData = ctxHidden.createImageData(imgWidth, imgHeight);

    images.map((frame, i) => {
        const pixelData = frame.getPixelData();
        imageData.data.set(pixelData);
        ctxHidden.putImageData(imageData, 0, 0);
        ctx.drawImage(hiddenCanvas, 0, i * height, width, height);
    });
}


function setupSpritesheetFromImg(ctx, width, height, images) {
    // Await every image being drawn onto the canvas context
    return Promise.all(images.map((image, i) => {
        return new Promise((resolve) => {
            image.onload = () => {
                ctx.drawImage(image, 0, i * height, width, height)
                resolve()
            }
        })
    }));
}


async function setupSpritesheet(spriteSheetElement, width, height, images) {
    const ctx = spriteSheetElement.getContext("2d");
    const numImages = images.length
    const fullHeight = height * numImages;
    spriteSheetElement.width = width
    spriteSheetElement.height = fullHeight

    switch (imageType(images)) {
        case 'img':
            await setupSpritesheetFromImg(ctx, width, height, images);
            break;
        case 'cornerstone':
            setupSpritesheetFromDicom(ctx, width, height, images);
            break
    }

    // Setup the returned spritesheet object
    const imageData = ctx.getImageData(0, 0, spriteSheetElement.width, spriteSheetElement.height);
    const spriteSheet = {
        imageData: imageData,
        numImages: numImages,
        width: width,
        height: height,
        fullHeight: fullHeight
    };

    return spriteSheet
}