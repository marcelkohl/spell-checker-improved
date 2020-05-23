'use babel';
/**
 * The spell checker manager is responsible for providing the interface to the main spell checker class
 */
const spellchecker = require('spellchecker');

export default class SpellcheckerManager {
    constructor(packageSettings) {
        this.packageSettings = packageSettings;
        this.dictionary = null;

        this.loadDictionary(
            this.packageSettings.locale || navigator.language,
            this.packageSettings.dictionariesPath
        );
    }

    loadDictionary (locale, path) {
        if (!spellchecker.setDictionary(locale, path)) {
            atom.notifications.addError(
                'Could not find spell checker locale \'' + locale + '\' at path \'' + path + '\''
            );
        }
  }

  isMisspelled(textToCheck) {
      return new Promise((resolve)=>{
          //let wordsStr = wordsToCheck.join(' ');

          spellchecker.checkSpellingAsync(textToCheck)
            .then((misspPos)=>{
                resolve(
                    misspPos.map((pos)=>{ return textToCheck.substring(pos.start, pos.end)})
                )
            });
      });
  }

  getSuggestions(word) {
      return spellchecker.getCorrectionsForMisspelling(word);
  }
}
