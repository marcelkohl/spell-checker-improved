'use babel';
/**
 * The spell checker manager is responsible for providing the interface to the main spell checker class
 * @type {[type]}
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
        console.log('dictionary loaded');
        if (!spellchecker.setDictionary(locale, path)) {
            atom.notifications.addError(
                'Could not find spell checker locale \'' + locale + '\' at path \'' + path + '\''
            );
        }
  }

  isMisspelled(wordToCheck) {
      return spellchecker.isMisspelled(wordToCheck);
  }

  getSuggestions(word) {
      return spellchecker.getCorrectionsForMisspelling(word);
  }
}
