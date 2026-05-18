/* ================================================================
 * Blockly for FRC — application controller
 * Developed by FRC 2789 (Texplosion)
 * ================================================================ */

(function () {
    'use strict';

    /* Java syntax highlighting via highlight.js. The library is loaded
     * from a CDN in index.html. We call hljs.highlight() directly rather
     * than using highlightElement() because we manage innerHTML ourselves
     * and want to avoid hljs's "already highlighted" guard. */
    function highlightJava(src) {
        if (typeof hljs !== 'undefined' && hljs.getLanguage && hljs.getLanguage('java')) {
            try {
                return hljs.highlight(src, {language: 'java', ignoreIllegals: true}).value;
            } catch (e) {
                console.warn('hljs highlight failed', e);
            }
        }
        /* Fallback: escape and return plain text if hljs is unavailable. */
        return src
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    BlocklyFRC.register({highlightJava});
})();