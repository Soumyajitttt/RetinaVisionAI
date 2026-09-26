function panel = composeLabeledPanels(images, labels)
% Horizontally concatenates same-size RGB images (0-1 double or uint8),
% stamping a dark caption bar + white label text in the top-left corner of
% each one (matching the "Early (Edges): activation_10_relu" style
% captions used across the Multi-Layer CAM / Cross-Method / Activations
% views). Returns a single uint8 RGB image - callers handle imwrite
% themselves, same as generateGradCAM.m does.
%
% images : 1xN cell array of HxWx3 images, all the same size
% labels : 1xN cell array of strings, one per image

    n = numel(images);
    imgs8 = cell(1, n);
    for i = 1:n
        im = images{i};
        if ~isa(im, 'uint8')
            im = im2uint8(im);
        end
        fontSize = max(12, round(size(im, 1) * 0.035));
        imgs8{i} = insertText(im, [6 6], labels{i}, ...
            'BoxColor', 'black', 'BoxOpacity', 0.55, ...
            'TextColor', 'white', 'FontSize', fontSize);
    end
    panel = cat(2, imgs8{:});
end