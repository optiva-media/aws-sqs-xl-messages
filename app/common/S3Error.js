'use strict';

(function(module) {
    /**
     * A custom error class in order to return an error caused due to S3's action
     */
    class S3Error extends Error {
        /**
         * Constructor of S3Error class
         * @constructor
         * @param {ERROR} error
         */
        constructor(error) {
            super();
            this.error = error;
        }

        /**
         * Returns the error code
         * @return {ERROR} HTTP error code
         */
        getError() {
            return this.error;
        }

        /**
         * Returns Error String format
         * @return {String} Error String format
         */
        toString() {
            return this.error.toString();
        }
    }

    module.exports = S3Error;
})(module);
