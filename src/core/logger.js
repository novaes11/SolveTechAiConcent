// class to handle logging with different levels and colors
const pc = require('picocolors');

class Logger {
    constructor(className) {
        this.className = className;
    }

    #log(level, messages) {
        const dateTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const logMessage = `[${dateTime}] [${level}] [${this.className}] ${messages}`;
        let color = (text) => text;

        switch (level) {
            case 'DEBUG':
                color = pc.cyan;
                break;

            case 'INFO':
                color = pc.green;
                break;

            case 'WARNING':
                color = pc.yellow;
                break;

            case 'ERROR':
                color = pc.red;
                break;
        }

        console.log(color(logMessage));
    }

    debug(message) {
        this.#log('DEBUG', message);
    }

    info(message) {
        this.#log('INFO', message);
    }

    warning(message) {
        this.#log('WARNING', message);
    }

    error(message) {
        this.#log('ERROR', message);
    }
}

module.exports = Logger;
