'use babel';
/**
 * model to handle the instances for the suggestions and actions to suggestions so it can be shared
 * between checker instances to be manipulated/disposed.
 */
export default class MenuHandlers {
  constructor() {
      this.lastSuggestions = null;
      this.lastSuggestionActions = null;
  }
}
