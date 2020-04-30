'use babel';
/**
 * model to suppress a null DisplayMarker
 */
export default class DisplayMarkerNull {
  constructor() {
      this.lastSuggestions = null;
      this.lastSuggestionActions = null;
  }

  getBufferRange() {
      return {};
  }
}
