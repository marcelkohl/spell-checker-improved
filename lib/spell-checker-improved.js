'use babel';

import SpellCheckerView from './spell-checker-view';
import SpellcheckerManager from './spellchecker-manager';
import MenuHandlers from './model/menu-handlers';
import StatusBarNotification from './status-bar-notification';
import WordsFromTextHelper from './helper/words-from-text';
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
    clickStatusBarEvents: [],
    addToKnownWordsEvents: [],
    disposables: new CompositeDisposable(),
    wordsFromTextHelper: new WordsFromTextHelper(),

    activate(state) {
        this.statusBarNotification = new StatusBarNotification(this._getPackagePath());
        this.projectKnownWords = this._getKnownWordsInPaths(atom.project.getPaths());

        this._checkOtherSpellChecker();
        this._setEnvironmentEvents();
        this._loadSpellCheckManager(this.getSettings());
        this._enableObservers();
        this._enableConfigObservers();
    },

    _getPackagePath() {
        return (atom.packages.getPackageDirPaths() || "") + "/spell-checker-improved";
    },

    getSubscribedPlugins(subscribedPlugin) {
        let infoForThePlugin = {};
        let pluginInstance = subscribedPlugin(infoForThePlugin);

        this.subscribedPlugins.push({
            instance: pluginInstance,
            isPassive: (pluginInstance.onMisspellMarked && (typeof pluginInstance.onMisspellMarked === 'function'))
        });
    },

    _setEnvironmentEvents() {
        let self = this;

        this.statusBarNotification.onClick = ()=>{
            self.clickStatusBarEvents[atom.workspace.getActiveTextEditor().id]();
        }

        this.disposables.add(
            atom.project.onDidChangePaths((projectPaths)=>{
                self.projectKnownWords = self._getKnownWordsInPaths(projectPaths);
            })
        );

        this.disposables.add(
            atom.commands.add('atom-workspace', {
                'spell-checker-improved-add-word:addWord': (element) => {
                    try {
                        let actualFileProjectPath = atom.project.relativizePath(atom.workspace.getActivePaneItem().buffer.file.path);

                        self.addWord(actualFileProjectPath[0]);
                    } catch (error) {
                        atom.notifications.addError("Could not add word to the project. Make sure that the actual file has a valid name and the project folder is writable.");
                    }
                },
            })
        );
    },

    getSettings() {
        return atom.config.get('spell-checker-improved');
    },

    _checkOtherSpellChecker() {
        let packageSettings = this.getSettings();

        if (packageSettings.checkOtherSpellChecker && atom.packages.getLoadedPackage('spell-check')) {
            let notification = atom.notifications.addWarning(
                "spell-checker-improved settings",
                {
                    buttons: [
                        {
                            className: "btn-details",
                            onDidClick: ()=>{
                                atom.packages.getLoadedPackage('spell-check').disable();
                                notification.dismiss();
                            },
                            text: "Yes"
                        },
                        {
                            className: "btn-details",
                            onDidClick: ()=>notification.dismiss(),
                            text: "No"
                        },
                        {
                            className: "btn-details",
                            onDidClick: ()=>{
                                atom.config.set('spell-checker-improved.checkOtherSpellChecker', false);
                                notification.dismiss();
                            },
                            text: "Don't ask again"
                        },
                    ],
                    detail: "It is recommended to disable the default atom spell-checker. Disable it now?",
                    dismissable: true
                }
            );
        }
    },

    _enableObservers() {
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
                self._onClickStatusBar(editor.id, ()=>self._findNextMisspelledWord(editor, lastMisspelledWords));

                self._onWordAddToKnownWords(editor.id, (addedWord)=>{
                    lastMisspelledWords = lastMisspelledWords.filter((misspelledWord)=>misspelledWord!==addedWord);
                    spellCheckerView.setMarkers(lastMisspelledWords);
                    self.updateStatusBar(lastMisspelledWords);
                });

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
                    let pluginSuggestions = self._suggestionOnPlugins(word);
                    let spellcheckManagerSuggestions = self.spellcheckerManager.getSuggestions(word);

                    return spellcheckManagerSuggestions.concat(pluginSuggestions);
                };

                spellCheckerView.onUpdateClickedWord = (clickedWord) => {
                    self.lastClickedWord = clickedWord;
                };

                spellCheckerView.onMisspellMarked = (markedWords, timersAt) => {
                    self._notifyMisspelledToPlugins(markedWords, timersAt);
                }

                let stopChangingSubscription = editor.onDidStopChanging(() => {
                    self._checkSpelling(buffer.getText()).then(updateMisspelled);
                });

                self.disposables.add(stopChangingSubscription);

                editor.onDidDestroy(() => {
                    spellCheckerView.destroy();
                    stopChangingSubscription.dispose();
                    delete self.editorFocusEvents[editor.Id];
                    delete self.clickStatusBarEvents[editor.Id];
                });

                self._checkSpelling(buffer.getText()).then(updateMisspelled);
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
            let pluginScope = plugin.instance.getScopes();
            return pluginScope.length === 0 || pluginScope.indexOf(fileScopeName) >= 0;
        });
    },

    _findNextMisspelledWord(editor, lastMisspelledWords) {
        let selectedRange = editor.getSelectedBufferRange();
        let lastRow = editor.getLastBufferRow();
        let nextMisspelledRange = {start:{row:-1, column:-1}, end:{row:-1, column:-1}};
        let lineText = '';

        for (var row = selectedRange.start.row; row < lastRow; row++) {
            lineText = editor.lineTextForBufferRow(row);
            let uniqueWordsInRow = this.wordsFromTextHelper.getUniqueWords(lineText);

            for (var wordRowIndex = 0; wordRowIndex < uniqueWordsInRow.length; wordRowIndex++) {
                if (lastMisspelledWords.indexOf(uniqueWordsInRow[wordRowIndex]) > -1) {
                    let startColumn = lineText.indexOf(uniqueWordsInRow[wordRowIndex]);

                    if (row > selectedRange.start.row || (row == selectedRange.start.row && startColumn > selectedRange.start.column)) {
                        nextMisspelledRange.start.row = row;
                        nextMisspelledRange.start.column = startColumn;
                        nextMisspelledRange.end.row = row;
                        nextMisspelledRange.end.column = nextMisspelledRange.start.column + uniqueWordsInRow[wordRowIndex].length;

                        break;
                    }
                }
            }

            if (nextMisspelledRange.start.row > -1) {
                break;
            }
        }

        editor.setCursorBufferPosition(nextMisspelledRange.start);
        editor.setSelectedBufferRange(nextMisspelledRange);
    },

    _suggestionOnPlugins(misspelledWord) {
        return this.getPluginsOnScope().reduce((suggestions, plugin)=>{
        	return suggestions.concat(plugin.instance.onGetSuggestions(misspelledWord));
        }, []);
    },

    _notifyMisspelledToPlugins(misspelledWords, timersAt) {
        let passivePlugins = this.subscribedPlugins.filter((plugin)=>plugin.isPassive);

        passivePlugins.forEach((plugin) => {
            plugin.instance.onMisspellMarked(misspelledWords, timersAt);
        });
    },

    spellCheckOnPlugins(misspelledWords) {
        let stillMisspelledWords = misspelledWords;
        let pluginsScope = this.getPluginsOnScope() || [];

        pluginsScope.forEach((plugin) => {
            stillMisspelledWords = stillMisspelledWords.filter((word) => {
                return !plugin.instance.onCheckWord(word);
            });
        });

        return stillMisspelledWords;
    },

    onEditorFocus(editorId, callback) {
        this.editorFocusEvents[editorId] = callback;
    },

    _onClickStatusBar(editorId, callback) {
        this.clickStatusBarEvents[editorId] = callback;
    },

    _onWordAddToKnownWords(editorId, callback) {
        this.addToKnownWordsEvents[editorId] = callback;
    },

    _checkSpelling(bufferText) {
        return new Promise((resolve)=>{
            this.statusBarNotification.working();

            this.checkMisspelling(bufferText).then(
                (e)=>{
                    resolve(e);
                }
            );
        })
    },

    _loadSpellCheckManager(settings) {
        this.spellcheckerManager = new SpellcheckerManager(settings);
    },

    _enableConfigObservers() {
        this.disposables.add(
            atom.config.onDidChange('spell-checker-improved', (settings)=>{
                clearTimeout(this.settingsChangeTimeout);

                this.settingsChangeTimeout = setTimeout(()=>{
                    this._loadSpellCheckManager(this.getSettings());
                }, 3000);
            })
        );
    },

    _getKnownWordsInPaths(paths) {
        let fs = require("fs");
        let knownWords = [];

        paths.forEach((path)=>{
            filePath = path + "/" + this.knownWordsFileName;

            if (fs.existsSync(filePath)) {
                let data = fs.readFileSync(filePath);
                let parsedData = JSON.parse(data);

                knownWords = knownWords.concat(parsedData.knownWords || []);
            }
        });

        return knownWords;
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

    addWord(projectPath) {
        let self = this;
        let filePath = projectPath + "/" + this.knownWordsFileName;

        if (!this.lastClickedWord) {
            return;
        }

        this._askIfShouldAddKnownWord(
            this.lastClickedWord,
            (wordToAdd)=>{
                let fs = require("fs");
                let knownWords = self._getKnownWordsInPaths([projectPath]);

                knownWords.push(wordToAdd);
                self.projectKnownWords.push(wordToAdd);

                fs.writeFile(filePath, JSON.stringify({knownWords: knownWords}), function (err) {
                    if (err) {
                        console.error(err);
                    } else {
                        atom.workspace.getTextEditors().forEach((editor)=>{
                            self.addToKnownWordsEvents[editor.id](wordToAdd);
                        })
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

            this.removeKnownWordsFromText(this.wordsFromTextHelper.getUniqueWords(text).join(' '), this.projectKnownWords)
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
