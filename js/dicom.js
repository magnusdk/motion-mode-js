async function loadDicomImages(file) {
    const arrayBuffer = await file.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);

    const dataSet = dicomParser.parseDicom(byteArray);
    const numFrames = dataSet.intString("x00280008");

    const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);

    const loadedImagePromises = []
    for (let i = 0; i < numFrames; i++) {
        // This is incredibly slow, but I've already spent way too much time on this.
        // (and this works, sooo...)
        const imageIdFrame = imageId + "?frame=" + i;
        loadedImagePromises.push(cornerstone.loadImage(imageIdFrame));
    }
    return Promise.all(loadedImagePromises);
}
