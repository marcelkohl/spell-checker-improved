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
            this.packageSettings.locale.split(',') || [navigator.language],
            this.packageSettings.dictionariesPath ? [this.packageSettings.dictionariesPath] : this._getSuggestedPathsForDictionary(process.platform)
        );
    }

    /**
     * @param  {string} locale locale to get from the dictionary path (ex.: pt_BR, en_US, etc)
     * @param  {string[]} suggestedDictionaryPaths
     */
    _loadDictionary(locales, suggestedDictionaryPaths) {
        let spellcheckerIndex = 0;

        locales.forEach((locale) => {
            console.log('locale', locale);
            this.spellcheckers.push(require('spellchecker'));
            spellcheckerIndex = this.spellcheckers.length - 1;

            try {
                suggestedDictionaryPaths.forEach((path) => {
                    console.log('path', path);
                    if (this.spellcheckers[spellcheckerIndex].setDictionary(locale.trim(), path)) {
                        throw(path);
                    }
                });
            } catch (path) {
                console.log("Dictionary loaded from ", path);
            }
        });

        console.log('spellcheckers', this.spellcheckers);

        if (this.spellcheckers.length == 0) {
            atom.notifications.addError('Could not find spell checker locale(s) ' + locales.join(','));
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
