function runPipelineForWeb(imagePath, outputDir)
% Called from the web backend via: matlab -batch "runPipelineForWeb('img.jpg','outdir')"
% Writes result.json (+ enhanced.png, gradcam.png, multilayer.png,
% crossmethod.png, activations.png) into outputDir.

    img = imread(imagePath);
    [status, score, imgOut] = assessQuality(img);

    result.status = status;
    result.score = score;

    if strcmp(status, 'reject')
        fid = fopen(fullfile(outputDir, 'result.json'), 'w');
        fprintf(fid, '%s', jsonencode(result));
        fclose(fid);
        return;
    end

    imgOut = im2uint8(imgOut);   % normalize to a consistent 0-255 range regardless of pass/enhanced branch
    imwrite(imgOut, fullfile(outputDir, 'enhanced.png'));

    % --- Segmentation (Module 2) ---
    [discCenter, discMask] = findOpticDisc(imgOut);
    vesselMask = segmentVessels(imgOut);
    exMask = detectExudates(imgOut, discMask);
    [maMask, hemMask] = detectDarkLesions(imgOut, discMask, vesselMask);

    result.maCount = numel(regionprops(maMask, 'Area'));
    result.hemCount = numel(regionprops(hemMask, 'Area'));
    result.exudateCount = numel(regionprops(exMask, 'Area'));

    % --- Classification (Module 3) ---
    % Wrapped in try/catch: a missing/misplaced models/drNet.mat (or any
    % other classification failure) used to crash MATLAB entirely, which
    % surfaced to the clinician as a raw MATLAB stack trace on the
    % Screening & Analysis page. Now it's caught, written into result.json
    % as a clean status/errorMessage pair, and returned - the web backend
    % (analysisController.js) shows this as a proper "analysis failed"
    % state instead. Segmentation counts from Module 2 above are already
    % computed and are kept either way.
    try
        load('models/drNet.mat', 'drNet');
        imgResized = imresize(imgOut, [224 224]);
        [predictedLabel, scores] = classify(drNet, imgResized);
        result.grade = double(string(predictedLabel));
        result.confidence = max(scores);
        camMap = generateGradCAM(drNet, imgResized, predictedLabel, fullfile(outputDir, 'gradcam.png'), imgOut);

        % --- Lesion Overlap ---
        % What fraction of the segmented lesion area (MA + hemorrhage +
        % exudate masks from Module 2, already computed above) falls
        % inside the network's own high-attention region of its Grad-CAM
        % map. High agreement means the model is actually "looking at"
        % the lesions it's grading on, not just pattern-matching on
        % something else in the image. camMap is already full-resolution
        % and FOV-masked (see generateGradCAM.m), so it lines up pixel-
        % for-pixel with the lesion masks with no extra resizing needed.
        % Left unset (rather than 0) when no lesions were segmented at
        % all - "0% overlap" would misleadingly read as a disagreement
        % rather than "nothing to overlap with".
        lesionMask = maMask | hemMask | exMask;
        lesionArea = nnz(lesionMask);
        if lesionArea > 0
            attentionMask = camMap > 0.5;
            result.lesionOverlap = nnz(lesionMask & attentionMask) / lesionArea;
        end
    catch err
        result.status = 'error';
        result.errorMessage = err.message;
        fid = fopen(fullfile(outputDir, 'result.json'), 'w');
        fprintf(fid, '%s', jsonencode(result));
        fclose(fid);
        return;
    end

    % --- Explainability (Module 4) ---
    % Each of these writes its own file into outputDir - a fresh one per
    % upload, same as gradcam.png above. If any of them errors (e.g. an
    % older MATLAB without occlusionSensitivity/imageLIME support), it's
    % caught and logged so the pipeline still finishes and still returns
    % a valid result.json; the web backend only attaches whichever image
    % files actually exist in outputDir, so a missing one just means that
    % one tab won't show up in the UI instead of the whole analysis
    % failing.
    try
        generateMultiLayerCAM(drNet, imgResized, predictedLabel, ...
            fullfile(outputDir, 'multilayer.png'), imgOut);
    catch err
        warning('generateMultiLayerCAM failed: %s\n%s', ...
            err.message, getReport(err, 'extended', 'hyperlinks', 'off'));
    end

    try
        generateCrossMethodCAM(drNet, imgResized, predictedLabel, ...
            fullfile(outputDir, 'crossmethod.png'), imgOut);
    catch err
        warning('generateCrossMethodCAM failed: %s\n%s', ...
            err.message, getReport(err, 'extended', 'hyperlinks', 'off'));
    end

    try
        generateActivationsPanel(drNet, imgResized, ...
            fullfile(outputDir, 'activations.png'), imgOut);
    catch err
        warning('generateActivationsPanel failed: %s\n%s', ...
            err.message, getReport(err, 'extended', 'hyperlinks', 'off'));
    end

    fid = fopen(fullfile(outputDir, 'result.json'), 'w');
    fprintf(fid, '%s', jsonencode(result));
    fclose(fid);
end