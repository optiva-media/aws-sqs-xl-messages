'use strict';

(function(module) {
    const stream = require('stream'),
        util = require('util'),
        Readable = stream.Read ||
        require('readable-stream').Readable;

    /**
     * [DummyReadStream description]
     * @param {Object} options
     * @param {string} dummyData
     */
    function DummyReadStream(options, dummyData) {
        Readable.call(this, options); // init super

        this.dummyData = dummyData;
        this._readCalls = 0;

        var me = this;

        this.on('end', function() {
            // This is in case the stream is used to simulate a stream that emits close (e.g. a FileStream)
            me.emit('close');
        });

        this.emit('open');
    }

    util.inherits(DummyReadStream, Readable);

    DummyReadStream.prototype._read = function(n) {
        if(this._readCalls == 0) {
            this.push(this.dummyData);
            this._readCalls += 1;
        } else {
            this.push(null);
        }
    };

    DummyReadStream.prototype.pipe = function(stream) {
        stream.emit('pipe');
        this.emit('end');
        return stream;
    };

    module.exports = {
        DummyReadStream: DummyReadStream
    };
})(module);
