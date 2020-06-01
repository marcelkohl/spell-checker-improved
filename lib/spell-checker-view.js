'use babel';

import { Emitter } from 'atom';
import DisplayMarkerNull from './model/display-marker-null';

export default class SpellCheckerView {
    constructor(editor, menuHandlers) {
        this.editor = editor;
        this.markerLayer;
        this.markerClass = 'spell-checker-misspelled';
        this.callbackPopulateSuggestions = null;
        this.callbackUpdateClickedWord = (clickedWord)=>null;
        this.callbackOnMisspellMarked = (markedWords, timersAt)=>null
        this.menuHandlers = menuHandlers;

        this.setContextMenuEvent();
    }

    setContextMenuEvent() {
        atom.views.getView(this.editor).addEventListener(
            'contextmenu',
            (mouseEvent) => this._populateSuggestions(mouseEvent)
        );
    }

    setMarkers(misspelledWords) {
        let editor = this.editor;
        let markedWords = [];
        let timersAt = {
            started: performance.now(),
            regexConstructed:0,
            misspellingMatched: 0,
            markersDecorated: 0
        };

        this.removeMarkers();

        if (misspelledWords && misspelledWords.length) {
            if (!this.markerLayer) {
                this.markerLayer = editor.addMarkerLayer();
            }

            let markerLayer = this.markerLayer;
            let match1 = misspelledWords.filter((w)=>w[0]==w[0].toUpperCase());
            let match1Str = match1.join('|') + '(?!=*[a-z])';
            let match2 = misspelledWords.filter(w => !match1.includes(w));
            let match2Str = '(?<=[_ -]|\\b)(' + match2.join('|') + ')(?!=*[a-z])';
            let regExp = new RegExp(match2Str+'|'+match1Str, 'g');

            timersAt.regexConstructed = performance.now();

            let firstLine = editor.bufferRowForScreenRow(editor.getFirstVisibleScreenRow());
            let lastLine = editor.bufferRowForScreenRow(editor.getLastVisibleScreenRow());

            //TODO: scan range excluding folded ranges :\
            //TODO: Object.keys(temp1.displayLayer.foldsMarkerLayer.markersById).forEach((foldId)=>console.log(temp1.displayLayer.foldsMarkerLayer.markersById[foldId].getRange()))

            editor.scanInBufferRange(regExp, [[firstLine, 0], [lastLine, 9999]],function (result) {
                markerLayer.markBufferRange(result.range);

                markedWords.push({
                    word: result.buffer.getTextInRange(result.range),
                    range: result.range
                });
            });

            timersAt.misspellingMatched = performance.now();

            editor.decorateMarkerLayer(markerLayer, {
                type: 'highlight',
                class: this.markerClass,
            });

            timersAt.markersDecorated = performance.now();
        }

        this.callbackOnMisspellMarked(markedWords, timersAt);
    }

    removeMarkers() {
        if (this.markerLayer) {
            this.markerLayer.destroy();
            delete this.markerLayer;
        }
    }

    destroy() {
        this.removeMarkers();
        atom.views.getView(this.editor).removeEventListener('contextmenu', null);
    }

    dispose() {
        this.destroy();
    }

    set onPopulateSuggestions(callbackPopulateSuggestions) {
      this.callbackPopulateSuggestions = callbackPopulateSuggestions;
    }

    set onUpdateClickedWord(callbackUpdateClickedWord) {
      this.callbackUpdateClickedWord = callbackUpdateClickedWord;
    }

    set onMisspellMarked(callbackOnMisspellMarked) {
        this.callbackOnMisspellMarked = callbackOnMisspellMarked;
    }

    _populateSuggestions(mouseEvent) {
        if (this.markerLayer) {
            let currentScreenPosition = atom.views.getView(this.editor).component.screenPositionForMouseEvent(mouseEvent);
            let currentBufferPosition = this.editor.bufferPositionForScreenPosition(currentScreenPosition);
            let marker = this._getMarkerInBufferPosition(currentBufferPosition);
            let markerRange = marker.getBufferRange();
            let misspelledWord = this.editor.getBuffer().getTextInRange(markerRange);
            let suggestions = this.callbackPopulateSuggestions(misspelledWord) || [];

            this._disposeLastSuggestions();
            this._addSuggestionsToContextMenu(suggestions, markerRange);
            this.callbackUpdateClickedWord(misspelledWord);
        }
    }

    _getMarkerInBufferPosition(currentBufferPosition) {
        return this.markerLayer.findMarkers({containsBufferPosition: currentBufferPosition})[0] || new DisplayMarkerNull();
    }

    _disposeLastSuggestions() {
        if (this.menuHandlers.lastSuggestions) {
          this.menuHandlers.lastSuggestions.dispose();
          this.menuHandlers.lastSuggestionActions.dispose();
        }
    }

    _addSuggestionsToContextMenu(suggestions, misspelledWordRange = null) {
        let suggestionsMenu = [];
        let suggestionActionItems = {};

        suggestions.forEach((suggestion) => {
            //TODO: improve how the callback to replace suggestion is done
            let suggestionAction = 'spell-checker-view:setSuggestion' + suggestion.replace(/[^a-z0-9]/gmi, "-");

            suggestionActionItems[suggestionAction] = (e, f) => {
              this._replaceForSuggestion(suggestion, misspelledWordRange);
            };

            suggestionsMenu.push({
                "label": suggestion,
                "command": suggestionAction
            });
        });

        this.menuHandlers.lastSuggestionActions = atom.commands.add('atom-workspace', suggestionActionItems);
        this.menuHandlers.lastSuggestions = atom.contextMenu.add({"atom-text-editor": [
          {
            "label": "Spell Checker",
            "submenu": suggestionsMenu
          }
        ]});
    }

    _replaceForSuggestion(wordToReplace, misspelledWordRange) {
        this.editor.getBuffer().setTextInRange(misspelledWordRange, wordToReplace);
    }
}
