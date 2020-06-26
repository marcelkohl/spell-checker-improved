'use babel';
/**
 * helper that deals with a text to bring valid words from it
 */
export default class WordsFromText {
    /**
     * @param  {sting} text text to be scanned for the words
     * @return {string[]}
     */
    getWords(text) {
        return text.match(/\w[\w']*(?:-\w+)*'[a-zA-Z]|[A-Z]*[a-z]{2,}|[A-Z]{2,}/g) || [];
    }

    /**
     * @param  {sting} text text to be scanned for the words
     * @return {string[]}
     */
    getUniqueWords(text) {
        return [...new Set(this.getWords(text))];
    }
}
