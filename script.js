importClass(Packages.plugins.big.steerablej.core.ParameterSet);
importClass(Packages.icy.gui.dialog.MessageDialog);
importClass(Packages.icy.sequence.Sequence);
importClass(Packages.plugins.fab.spotDetector.detector.UDWTWavelet);
importClass(Packages.icy.roi.ROI2DRectangle);
importClass(java.awt.geom.Point2D);
importClass(Packages.plugins.kernel.roi.roi3d.ROI3DStackRectangle);
importClass(java.awt.geom.Point2D);
importClass(java.io.FileWriter);
importClass(Packages.java.io.File);
importClass(Packages.icy.file.Loader);
importClass(Packages.icy.sequence.SequenceDataIterator);
importClass(Packages.icy.type.DataIteratorUtil);
importClass(Packages.icy.roi.ROIUtil);
importClass(Packages.icy.file.Saver);

// PARAMETER START
inputFolder = "/home/baecker/in";
outputFolder = "/home/baecker/out";
scale = 2;
sensitivity = 50;
// PARAMETER END

inputDir = new File(inputFolder);
outputDir = new File(outputFolder);

sep = File.separator;

files = inputDir.listFiles();

fileName = outputDir.getPath() + sep;

for (k = 0; k < files.length; k++) {
	file = files[k];
	// Image to process.
	sequence = Loader.loadSequence(file);
	
	// creates a detector
	detector = new UDWTWavelet();

	sequence.removeAllROI() // remove all existing ROI in sequence

	// enable scale 2 with a coefficient of 100. (scale 1 is disabled here as the parameter is 0)
	var scaleParameters = [];
	for (i = 0; i < scale - 1; i++) {
		scaleParameters[i] = 0;
	}
	scaleParameters[scale - 1] = sensitivity;

	// performs the detection
	detector.detect(sequence, false, false, scaleParameters);

	detectionResult = detector.getDetectionResult();

	// get the number of detection
	detectionSize = detectionResult.size();

	boxSize = scale;


	// Display on source sequence

	for (i = 0; i < detectionSize; i++) { // cycle over all the detections.
		spot = detectionResult.get(i); // get the spot
		massCenter = spot.getMassCenter();
		x = massCenter.x;
		y = massCenter.y;
		z = massCenter.z;


		// display where the detection has been found.
		// create a ROI
		roi2d = new ROI2DRectangle(
		new Point2D.Double(x - boxSize, y - boxSize), new Point2D.Double(x + boxSize + 1, y + boxSize + 1), false); // false: say to the system that the ROI is not in creation mode.
		roi = new ROI3DStackRectangle(roi2d.getRectangle(), z - boxSize, z + boxSize); // false: say to the system that the ROI is not in creation mode.
		sequence.addROI(roi); // add the ROI to the sequence
	}

	// clear the image
	dataIterator = new SequenceDataIterator(sequence);
	DataIteratorUtil.set(dataIterator, 0);

	// retrieve ROIs
	rois = sequence.getROIs();

	// for each ROI
	for (i = 0; i < rois.size(); i++) {
		roi = rois.get(i);
		// get data iterator over the ROI region
		dataIterator = new SequenceDataIterator(sequence, roi, true);
		// set current ROI index value + 1 as label
		DataIteratorUtil.set(dataIterator, i + 1);
	}

	// we changed the image (data iterator do not notify sequence about it)
	sequence.dataChanged();

	outputFile = new File(fileName + sequence.getName() + ".tif");

	// Save the resulting sequence to the file
	Saver.save(sequence, outputFile, false);

	sequence.close();
}