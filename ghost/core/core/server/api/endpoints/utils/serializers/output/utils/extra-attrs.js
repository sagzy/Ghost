const readingMinutes = require('@tryghost/helpers').utils.readingMinutes;

/**
 *
 * @param {Object} model - Post model
 * @param {Object} attrs - Post attributes
 * @param {(string|null)} attrs.html
 * @param {(string|null)} attrs.feature_image
 * @returns {number} - Reading time in minutes
 */
const calculateReadingTime = (model, attrs) => {
    const html = attrs.html || model.get('html');
    const additionalImages = attrs.feature_image ? 1 : 0;

    return readingMinutes(html, additionalImages);
};

module.exports.forPost = (frame, model, attrs) => {
    const _ = require('lodash');
    // This function is split up in 3 conditions for 3 different purposes:
    // 1. Gets excerpt from post's plaintext. If custom_excerpt exists, it overrides the excerpt but the key remains excerpt.
    if (Object.prototype.hasOwnProperty.call(frame.options, 'columns') || _.includes(frame.options.columns, 'excerpt') || _.includes(frame.options.columns, 'excerpt') && frame.options.formats && frame.options.formats.includes('plaintext')) {
        if (_.includes(frame.options.columns, 'excerpt')) {
            if (!attrs.custom_excerpt || attrs.custom_excerpt === null) {
                let plaintext = model.get('plaintext');
                if (plaintext) {
                    attrs.excerpt = plaintext.substring(0, 500);
                } else {
                    attrs.excerpt = null;
                }
                if (!frame.options.columns.includes('custom_excerpt')) {
                    delete attrs.custom_excerpt;
                }
            } else {
                attrs.excerpt = attrs.custom_excerpt;
                if (!_.includes(frame.options.columns, 'custom_excerpt')) {
                    delete attrs.custom_excerpt;
                }
            }
        }
    }
    // 2. Displays plaintext if requested by user as a field. Also works if used as format.
    if (_.includes(frame.options.columns, 'plaintext') || frame.options.formats && frame.options.formats.includes('plaintext')) {
        let plaintext = model.get('plaintext');
        if (plaintext){
            attrs.plaintext = plaintext;
        } else {
            delete attrs.plaintext;
        }
    }

    // 3. Displays excerpt if no columns was requested - specifically needed for the Admin Posts API.

    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns')) {
        let plaintext = model.get('plaintext');
        let customExcerpt = model.get('custom_excerpt');

        if (customExcerpt !== null){
            attrs.excerpt = customExcerpt;
        } else {
            if (plaintext) {
                attrs.excerpt = plaintext.substring(0, 500);
            } else {
                attrs.excerpt = null;
            }
        }
    }

    // `reading_time` attribute
    //
    // If no column was requested, include `reading_time`
    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns')) {
        attrs.reading_time = calculateReadingTime(model, attrs);
    }

    // `reading_time` attribute
    //
    // If `reading_time` was requested:
    // - include `reading_time`
    // - delete `html` unless it was explicitly requested
    if (frame.options.columns?.includes('reading_time')) {
        attrs.reading_time = calculateReadingTime(model, attrs);

        const htmlInColumns = frame.options.columns && frame.options.columns.includes('html');
        const htmlInFormats = frame.options.formats && frame.options.formats.includes('html');

        if (!htmlInColumns && !htmlInFormats) {
            delete attrs.html;
        }
    }
};
