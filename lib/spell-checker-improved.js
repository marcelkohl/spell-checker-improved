'use babel';

import SpellCheckerView from './spell-checker-view';
import SpellcheckerManager from './spellchecker-manager';

export default {
    spellcheckerManager: null,
    settingsChangeTimeout: null,

    activate(state) {
        console.log('activate spell-checker', state);

        this.loadSpellCheckManager(this.getSettings());
        this.enableObservers();
        this.enableConfigObservers();
    },

    getSettings() {
        return atom.config.get('spell-checker');
    },

    enableObservers() {
        console.log("enable observers");
        let self = this;

        atom.workspace.observeTextEditors((editor) => {
            console.log('observeTextEditors', editor);
            let spellCheckerView = new SpellCheckerView(editor);

            spellCheckerView.onPopulateSuggestions = (word) => {
                return self.spellcheckerManager.getSuggestions(word);
            };

//            console.log('registered onDidStopChanging', editor);
            let buffer = editor.getBuffer();

            let stopChangingSubscription = editor.onDidStopChanging(() => {
//                console.log("stop changing");

                let missSpelled = self.checkMisspelling(buffer.getText());
                //console.log('misspelled', missSpelled);
                spellCheckerView.setMarkers(missSpelled);
            });

            editor.onDidDestroy(() => {
//                console.log("stop changing disposed", edimissSpelledtor.id);
                stopChangingSubscription.dispose();
            });

            atom.commands.add('atom-workspace', {
              //'spell-checker:toggle': () => this.toggle(),
              'spell-checker-improved-add-word:addWord': (e, f) => {this.addWord(e, f);},
              //'core:save': () => this.triggerSpellcheck(),
            });


            let t0 = performance.now();
            let missSpelled = self.checkMisspelling(buffer.getText());
            let t1 = performance.now();
            console.log('misspeled', missSpelled);
            spellCheckerView.setMarkers(missSpelled);
            let t2 = performance.now();

            console.log("spell checking " + (t1 - t0) + " milliseconds.");
            console.log("set markers " + (t2 - t1) + " milliseconds.");
            console.log("all process " + (t2 - t0) + " milliseconds.")
        });
    },

    loadSpellCheckManager(settings) {
        this.spellcheckerManager = new SpellcheckerManager(settings);
    },

    enableConfigObservers() {
        atom.config.onDidChange('spell-checker-improved', (settings)=>{
            clearTimeout(this.settingsChangeTimeout);

            this.settingsChangeTimeout = setTimeout(()=>{
                this.loadSpellCheckManager(this.getSettings());
            }, 3000);
        });
    },

    // load known word list on unix systems
    loadKnownWords () {
    },

    addWord(e, f) {
        console.log('addWord spell-checker 1', this);
        console.log('addWord spell-checker 2', e, f);
        console.log('addWord spell-checker 3', atom.workspace.getActiveTextEditor().getCursorBufferPosition());
    },

    // save word to the known word list
    saveWord (word) {
        console.log('saveWord spell-checker')
    },

    deactivate() {
        console.log("deactivate spell-checker");
    },

    // serialize() {
    //     console.log('serialize spell-checker');
    // },

    toggle() {
        console.log("toggle was triggered!!");
    },

    checkMisspelling(text) {
//        console.log('triggerSpellcheck spell-checker', text);

        if (!text.length) {
            return;
        }

        // (?=\S*['])([a-zA-Z']+)      words with apostrophe
        // ([A-Z]*[a-z]+){2,}|([A-Z]+){2,}     minimum 2char except camel case
        // (([A-Z]*([a-z]+){2,})|([A-Z]+){2,})   minimum 2char with camel case but no apostrophes
        // (([A-Z]*([a-z']+){2,})|([A-Z']+){2,})  minimum 2char with camel case apostrophes but conflicting with words between quotes
        // (([A-Z]*([a-z']){1,}([a-z]))|([A-Z']){1,}([A-Z])) minimum 2char with camel case apostrophes but conflicting with words starting in quotes
        // (([A-Z]*([a-z]){1,}([a-z]))|([A-Z]){1,}([A-Z]))
        // (\w[\w']*(?:-\w+)*'[a-zA-Z]) only words with apostrophe
        // ((\w[\w']*(?:-\w+)*'[a-zA-Z])|([A-Z]*([a-z]){2,})|([A-Z]){2,})   working but without improvements
//        return text.match(/((\w[\w']*(?:-\w+)*'[a-zA-Z])|([A-Z]*([a-z]){2,})|([A-Z]){2,})/g)
        let wordsInText = text.match(/\w[\w']*(?:-\w+)*'[a-zA-Z]|[A-Z]*[a-z]{2,}|[A-Z]{2,}/g) || [];
        return wordsInText.filter(word => this.spellcheckerManager.isMisspelled(word));
    },

    showHide(e) {
        console.log('showHide spell-checker');
    }
};
