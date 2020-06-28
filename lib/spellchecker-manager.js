'use babel';
/**
 * The spell checker manager is responsible for providing the interface to the main spell checker class
 */
export default class SpellcheckerManager {
    constructor(packageSettings) {
        this.packageSettings = packageSettings;
        this.dictionary = null;
        this.spellcheckers = [];

        this._loadDictionary(
            this.packageSettings.locale || navigator.language,
            this.packageSettings.dictionariesPath ? [this.packageSettings.dictionariesPath] : this._getSuggestedPathsForDictionary(process.platform)
        );
    }

    /**
     * @param  {string} locale locale to get from the dictionary path (ex.: pt_BR, en_US, etc)
     * @param  {string[]} suggestedDictionaryPaths
     */
    _loadDictionary(locale, suggestedDictionaryPaths) {
        try {
            this.spellcheckers.push(require('spellchecker'));
            let spellcheckerIndex = this.spellcheckers.length - 1;

            suggestedDictionaryPaths.forEach((path) => {
                if (this.spellcheckers[spellcheckerIndex].setDictionary(locale, path)) {
                    throw(path);
                }
            });

            atom.notifications.addError('Could not find spell checker locale \'' + locale);
        } catch (path) {
            console.log("Dictionary loaded from ", path);
        }
    }

    isMisspelled(textToCheck) {
        console.log('textToCheck', textToCheck);
        return new Promise((resolve)=>{
            let wordsText = textToCheck;

            this.spellcheckers.forEach((spellchecker)=>{
                wordsText = spellchecker.checkSpelling(wordsText).map((pos)=>{ return wordsText.substring(pos.start, pos.end)});
                console.log(spellchecker, wordsText);
            });

          /*this.spellcheckers[0].checkSpellingAsync(textToCheck)
            .then((misspPos)=>{
                resolve(
                    misspPos.map((pos)=>{ return textToCheck.substring(pos.start, pos.end)})
                )
            });*/
        });
    }

    /**
    * @param  {string} word
    * @return {string[]}
    */
    getSuggestions(word) {
        return this.spellcheckers[0].getCorrectionsForMisspelling(word);
    }

    /**
     * @param  {string} environment name of the environment to get suggestion paths
     * @return {string[]}
     */
    _getSuggestedPathsForDictionary(environment) {
        let dictionary = require("./dictionary/" + environment + ".json");

        return dictionary.suggestedPaths || [];
    }
}
