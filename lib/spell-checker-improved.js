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

            let pCheckSpelling = (bufferText)=>new Promise((resolve)=>{
                let t1 = performance.now();
                self.checkMisspelling(bufferText).then((e)=>{
                    resolve(e);
                    let t3 = performance.now();
                    console.log('spellcheck-all:', (t3-t1).toFixed(2));
                });
                let t2 = performance.now();
                console.log('spellcheck:', (t2-t1).toFixed(2));
            });

            spellCheckerView.onPopulateSuggestions = (word) => {
                return self.spellcheckerManager.getSuggestions(word);
            };

            spellCheckerView.onUpdateClickedWord = (clickedWord) => {
                self.lastClickedWord = clickedWord;
            }

            let stopChangingSubscription = editor.onDidStopChanging(() => {
                pCheckSpelling(buffer.getText())
                    .then((wordsToMark)=>{
                        spellCheckerView.setMarkers(wordsToMark);
                    })
            });

            editor.onDidDestroy(() => {
                console.log("stop changing disposed");
                spellCheckerView.destroy();
                stopChangingSubscription.dispose();
            });

            pCheckSpelling(buffer.getText())
                .then((wordsToMark)=>{
                    spellCheckerView.setMarkers(wordsToMark);
                });
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

    checkMisspelling(text) {
        return new Promise((resolve)=>{
            if (!text.length) {
                resolve([]);
            }

            let wordsInText = text.match(/\w[\w']*(?:-\w+)*'[a-zA-Z]|[A-Z]*[a-z]{2,}|[A-Z]{2,}/g) || [];
            let uniqueWordsInText = [...new Set(wordsInText)];

            this.removeKnownWordsFromText(uniqueWordsInText.join(' '), this.projectKnownWords)
                .then(
                    (textWithoutKnownWords)=>this.spellcheckerManager.isMisspelled(textWithoutKnownWords)
                        .then((misspelledWords)=>resolve(misspelledWords))
                );
        });
    },

    removeKnownWordsFromText(textToCheck, knownWords) {
        return new Promise((resolve)=>{
            textToCheck.replace(new RegExp(knownWords.join('|'), 'gi'), '');

            resolve(textToCheck);
        })
    },

    showHide(e) {
        console.log('showHide spell-checker');
    }
};
