'use babel';

import { Emitter } from 'atom';
export default class SpellCheckerView {
  constructor(editor) {
    this.editor = editor;
    this.markerLayer;
    this.element = document.createElement('div');
    this.element.classList.add('spell-checker-improved');
    this.message = document.createElement('div');
    this.message.classList.add('message');
    this.message.textContent = '';
    this.message.innerHTML += '<span style="color: #F88303;" >_____________ <span><span style="color: #F88303;" class="icon icon-pencil"></span>';
    this.element.appendChild(this.message);
    this.markerClass = 'spell-checker-misspelled';
    this.callbackPopulateSuggestions = null;
    this.lastSuggestions = null;
    this.lastSuggestionActions = null;
  }

  setMarkers(misspelledWords) {
    let editor = this.editor;

    this.removeMarkers();

    if (misspelledWords && misspelledWords.length) {
      if (!this.markerLayer) {
          this.markerLayer = editor.addMarkerLayer();
      }

      let markerLayer = this.markerLayer;
      let eofBufferPosition = editor.getEofBufferPosition();
      let match1 = misspelledWords.filter((w)=>w[0]==w[0].toUpperCase());
      let match1Str = match1.join('|') + '(?!=*[a-z])';
      let match2 = misspelledWords.filter(w => !match1.includes(w));
      let match2Str = '(?<=[_ -]|\\b)(' + match2.join('|') + ')(?!=*[a-z])';
      //console.log(match1Str);
      let regExp = new RegExp(match2Str+'|'+match1Str, 'g');

      editor.scanInBufferRange(regExp, [[0, 0], eofBufferPosition], function (result) {
        //console.log('scanInBufferRange', result);
        markerLayer.markBufferRange(result.range);
      });

      editor.decorateMarkerLayer(markerLayer, {
        type: 'highlight',
        class: this.markerClass,
      });

//      console.log('markerLayer', markerLayer);

    }
  }

  removeMarkers() {
    if (this.markerLayer) {
      this.markerLayer.destroy();
      delete this.markerLayer;
    }
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  set onPopulateSuggestions(callbackPopulateSuggestions) {
      this.callbackPopulateSuggestions = callbackPopulateSuggestions;

      //TODO: remove event listner if this method is  called again
      atom.views.getView(this.editor).addEventListener(
          'contextmenu',
          (mouseEvent) => this._populateSuggestions(mouseEvent)
      );
  }

  _populateSuggestions(mouseEvent) {
      if (this.markerLayer) {
          let currentScreenPosition = atom.views.getView(this.editor).component.screenPositionForMouseEvent(mouseEvent);
          let currentBufferPosition = this.editor.bufferPositionForScreenPosition(currentScreenPosition);
          let marker = this._getMarkerInBufferPosition(currentBufferPosition);
          console.log(marker);
          let markerRange = marker.getBufferRange();
          let misspelledWord = this.editor.getBuffer().getTextInRange(markerRange);
          let suggestions = this.callbackPopulateSuggestions(misspelledWord) || [];

          this._addSuggestionsToContextMenu(suggestions, markerRange);
      }
  }

  _getMarkerInBufferPosition(currentBufferPosition) {
      //TODO: must return always a DisplayMarker
      return this.markerLayer.findMarkers({containsBufferPosition: currentBufferPosition})[0];
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

      //TODO: try to dispose on contextmenu close, it looses the track if you work in more than 1 file
      console.log('lastSuggestions', this.lastSuggestions, this.lastSuggestionActions);
      if (this.lastSuggestions) {
          this.lastSuggestions.dispose();
          this.lastSuggestionActions.dispose();
      }

      this.lastSuggestionActions = atom.commands.add('atom-workspace', suggestionActionItems);
      this.lastSuggestions = atom.contextMenu.add({"atom-text-editor": [
          {
            "label": "Spell Checker",
            "submenu": suggestionsMenu
          }
      ]});
  }

  _replaceForSuggestion(wordToReplace, misspelledWordRange) {
      this.editor.getBuffer().setTextInRange(misspelledWordRange, wordToReplace);
      //console.log('_replaceForSuggestion', wordToReplace, misspelledWordRange);
  }
}
