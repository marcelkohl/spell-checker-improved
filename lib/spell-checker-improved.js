'use babel';

import SpellCheckerView from './spell-checker-view';
import SpellcheckerManager from './spellchecker-manager';
import MenuHandlers from './model/menu-handlers';

export default {
    knownWordsFileName: '.spellchecker.json',
    spellcheckerManager: null,
    settingsChangeTimeout: null,
    menuHandlers: new MenuHandlers(),
    projectKnownWords: [],
    lastClickedWord: '',

    activate(state) {
        console.log('activate spell-checker', state);

        this.setEnvironmentEvents();
        this.loadSpellCheckManager(this.getSettings());
        this.enableObservers();
        this.enableConfigObservers();
    },

    setEnvironmentEvents() {
        let self = this;
        let getFilePath = (projectPaths)=>(projectPaths[0] || '') + '/' + self.knownWordsFileName;

        atom.project.onDidChangePaths((projectPaths)=>{
            self.projectKnownWords = self.getProjectKnownWords(getFilePath(projectPaths));
        });

        atom.commands.add('atom-workspace', {
            'spell-checker-improved-add-word:addWord': (element) => {
                self.addWord(element, getFilePath(atom.project.getPaths()));
            },
        });
    },

    getSettings() {
        return atom.config.get('spell-checker-improved');
    },

    enableObservers() {
        console.log("enable observers");
        let self = this;

        atom.workspace.observeTextEditors((editor) => {
            console.log('observeTextEditors', editor);
            let spellCheckerView = new SpellCheckerView(editor, self.menuHandlers);
            let buffer = editor.getBuffer();
            let checkSpelling = ()=> {
                let t0 = performance.now();

                let missSpelled = self.checkMisspelling(buffer.getText());

                let t1 = performance.now();
                //console.log('misspelled', missSpelled);

                spellCheckerView.setMarkers(missSpelled);

                let t2 = performance.now();
                console.log("sp-chk " + (t1 - t0).toFixed(2) + "ms /  mrk "+(t2 - t1).toFixed(2)+ "ms / all " + (t2 - t0).toFixed(2)+"ms");
            }

            spellCheckerView.onPopulateSuggestions = (word) => {
                return self.spellcheckerManager.getSuggestions(word);
            };

            spellCheckerView.onUpdateClickedWord = (clickedWord) => {
                self.lastClickedWord = clickedWord;
            }

            let stopChangingSubscription = editor.onDidStopChanging(() => {
                checkSpelling();
            });

            editor.onDidDestroy(() => {
                console.log("stop changing disposed");
                spellCheckerView.destroy();
                stopChangingSubscription.dispose();
            });

            checkSpelling();
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

    // load project known words
    getProjectKnownWords(filePath) {
        let fs = require("fs");

        if (fs.existsSync(filePath)) {
            let data = fs.readFileSync(filePath);
            let parsedData = JSON.parse(data);

            return parsedData.knownWords || [];
        }

        return [];
    },

    _askIfShouldAddKnownWord(wordToAdd, onConfirmAddWord) {
        let notification = atom.notifications.addInfo("Confirm add the word?", {
            buttons: [
                {
                    className: "btn-details",
                    onDidClick: ()=>{
                        onConfirmAddWord(wordToAdd);
                        notification.dismiss();
                    },
                    text: "Yes"
                },
                {
                    className: "btn-details",
                    onDidClick: ()=>notification.dismiss(),
                    text: "No"
                },
            ],
            detail: wordToAdd,
            dismissable: true
        });
    },

    addWord(event, filePath) {
        let self = this;

        if (!this.lastClickedWord) {
            return;
        }

        this._askIfShouldAddKnownWord(
            this.lastClickedWord,
            (wordToAdd)=>{
                let fs = require("fs");

                self.projectKnownWords.push(wordToAdd)
                console.log(self.projectKnownWords);

                fs.writeFile(filePath, JSON.stringify({knownWords: self.projectKnownWords}), function (err) {
                    if (err) {
                        console.error(err);
                    }
                });
            }
        );
    },

    deactivate() {
        console.log("deactivate spell-checker");
    },

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
        wordsInText = this.removeKnownWordsFromWords(wordsInText, this.projectKnownWords);

        return wordsInText.filter(word => this.spellcheckerManager.isMisspelled(word));
    },

    removeKnownWordsFromWords(sourceWords, knownWords) {
        let sourceStr = sourceWords.join(' ');
        sourceStr = sourceStr.replace(new RegExp(knownWords.join('|'), 'gi'), '');

        return sourceStr.split(' ');
    },

    showHide(e) {
        console.log('showHide spell-checker');
    }
};
