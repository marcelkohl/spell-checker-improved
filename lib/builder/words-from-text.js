'use babel';
/**
 * builder that deals with a text to bring valid words from it
 */
export default class WordsFromText {
    /**
     * @param {string} text
     */
    constructor(text) {
        this.text = text || '';
    }

    /**
     * @return {string[]}
     */
    getWords() {
        return this.text.match(/\w[\w']*(?:-\w+)*'[a-zA-Z]|[A-Z]*[a-z]{2,}|[A-Z]{2,}/g) || [];
    }

    /**
     * @return {string[]}
     */
    getUniqueWords() {
        return [...new Set(this.getWords())];
    }
}
