'use babel';

import SpellCheckerView from './spell-checker-view';
import SpellcheckerManager from './spellchecker-manager';
import MenuHandlers from './model/menu-handlers';
import StatusBarNotification from './status-bar-notification';
import {CompositeDisposable} from 'atom';

export default {
    knownWordsFileName: '.spellchecker.json',
    spellcheckerManager: null,
    settingsChangeTimeout: null,
    menuHandlers: new MenuHandlers(),
    projectKnownWords: [],
    lastClickedWord: '',
    scrollEventChecker: null,
    subscribedPlugins: [],
    statusBarNotification: null,
    editorFocusEvents: [],
    disposables: new CompositeDisposable(),

    activate(state) {
        this.statusBarNotification = new StatusBarNotification();
        this.setEnvironmentEvents();
        this.loadSpellCheckManager(this.getSettings());
        this.enableObservers();
        this.enableConfigObservers();
    },

    getSubscribedPlugins(subscribedPlugin) {
        this.subscribedPlugins.push(subscribedPlugin({}))
    },

    setEnvironmentEvents() {
        let self = this;
        let getFilePath = (projectPaths)=>(projectPaths[0] || '') + '/' + self.knownWordsFileName;

        this.disposables.add(
            atom.project.onDidChangePaths((projectPaths)=>{
                self.projectKnownWords = self.getProjectKnownWords(getFilePath(projectPaths));
            })
        );

        this.disposables.add(
            atom.commands.add('atom-workspace', {
                'spell-checker-improved-add-word:addWord': (element) => {
                    self.addWord(element, getFilePath(atom.project.getPaths()));
                },
            })
        );
    },

    getSettings() {
        return atom.config.get('spell-checker-improved');
    },

    enableObservers() {
        let self = this;

        atom.workspace.onDidChangeActiveTextEditor(
            (editor)=>{
                if (!editor) {
                    return;
                }
                let onFocusEditorCallback = self.editorFocusEvents[editor.id] || ()=>true;
                onFocusEditorCallback();
            }
        );

        self.disposables.add(
            atom.workspace.observeTextEditors((editor) => {
                let spellCheckerView = new SpellCheckerView(editor, self.menuHandlers);
                let buffer = editor.getBuffer();
                let lastMisspelledWords = [];

                this.disposables.add(spellCheckerView);

                let updateMisspelled = (wordsToMark)=>{
                    wordsToMark = self.spellCheckOnPlugins(wordsToMark);
                    lastMisspelledWords = wordsToMark;

                    spellCheckerView.setMarkers(wordsToMark);
                    self.updateStatusBar(lastMisspelledWords);
                };

                self.onEditorFocus(editor.id, ()=>self.updateStatusBar(lastMisspelledWords));

                this.disposables.add(
                    editor.element.onDidChangeScrollTop(
                        ()=>{
                            clearTimeout(self.scrollEventChecker);

                            self.scrollEventChecker = setTimeout(()=>{
                                spellCheckerView.setMarkers(lastMisspelledWords);
                            }, 300);
                        }
                    )
                );

                spellCheckerView.onPopulateSuggestions = (word) => {
                    let pluginSuggestions = self.suggestionOnPlugins(word);
                    let spellcheckManagerSuggestions = self.spellcheckerManager.getSuggestions(word);

                    return spellcheckManagerSuggestions.concat(pluginSuggestions);
                };

                spellCheckerView.onUpdateClickedWord = (clickedWord) => {
                    self.lastClickedWord = clickedWord;
                };

                let stopChangingSubscription = editor.onDidStopChanging(() => {
                    self.pCheckSpelling(buffer.getText()).then(updateMisspelled);
                });

                self.disposables.add(stopChangingSubscription);

                editor.onDidDestroy(() => {
                    spellCheckerView.destroy();
                    stopChangingSubscription.dispose();
                });

                self.pCheckSpelling(buffer.getText()).then(updateMisspelled);
            })
        );
    },

    getPluginsOnScope() {
        let activeTextEditor = atom.workspace.getActiveTextEditor();

        if (!activeTextEditor) {
            return;
        }

        let filePath = activeTextEditor.getPath();
        let fileScopeName = atom.grammars.selectGrammar(filePath).scopeName;

        return this.subscribedPlugins.filter((plugin)=>{
            let pluginScope = plugin.getScopes();
            return pluginScope.length === 0 || pluginScope.indexOf(fileScopeName) >= 0;
        });
    },

    suggestionOnPlugins(misspelledWord) {
        return this.getPluginsOnScope().reduce((suggestions, plugin)=>{
        	return suggestions.concat(plugin.onGetSuggestions(misspelledWord));
        }, []);
    },

    spellCheckOnPlugins(misspelledWords) {
        let stillMisspelledWords = misspelledWords;
        let pluginsScope = this.getPluginsOnScope() || [];

        pluginsScope.forEach((plugin) => {
            stillMisspelledWords = stillMisspelledWords.filter((word) => {
                return !plugin.onCheckWord(word);
            });
        });

        return stillMisspelledWords;
    },

    onEditorFocus(editorId, callback) {
        this.editorFocusEvents[editorId] = callback;
    },

    pCheckSpelling(bufferText) {
        return new Promise((resolve)=>{
            let t1 = performance.now();
            this.statusBarNotification.working();

            this.checkMisspelling(bufferText).then(
                (e)=>{
                    resolve(e);
                    let t3 = performance.now();
                    console.log('spellcheck-all:', (t3-t1).toFixed(2));
                }
            );

            let t2 = performance.now();
            console.log('spellcheck:', (t2-t1).toFixed(2));
        })
    },

    loadSpellCheckManager(settings) {
        this.spellcheckerManager = new SpellcheckerManager(settings);
    },

    enableConfigObservers() {
        this.disposables.add(
            atom.config.onDidChange('spell-checker-improved', (settings)=>{
                clearTimeout(this.settingsChangeTimeout);

                this.settingsChangeTimeout = setTimeout(()=>{
                    this.loadSpellCheckManager(this.getSettings());
                }, 3000);
            })
        );
    },

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
            textToCheck = textToCheck.replace(new RegExp(knownWords.join('|'), 'gi'), '');

            resolve(textToCheck);
        })
    },

    updateStatusBar(lastMisspelledWords){
        if (lastMisspelledWords.length > 0) {
            this.statusBarNotification.misspelling();
        } else {
            this.statusBarNotification.allFine();
        }

        this.statusBarNotification.setMessage('Misspellings: '+lastMisspelledWords.length);
    },

    consumeStatusBar(statusBar) {
        statusBar.addLeftTile({item: this.statusBarNotification.getElement(), priority: 100});
    },

    deactivate() {
        this.disposables.dispose();
        this.statusBarNotification.destroy();
    },
};
