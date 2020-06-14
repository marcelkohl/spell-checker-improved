'use babel';

import EmptyDisposable from './model/empty-disposable';

module.exports = class StatusBarNotification{
    constructor(packagePath) {
        this._onClickCallback = ()=>true;
        this.packagePath = packagePath;
        this.elementId = "spell-checker-improved-status-bar-icon";
        this.element = document.createElement('div');
        this.element.setAttribute("id", this.elementId);
        this.element.classList.add('inline-block');
        this.element.onclick = ()=>this._onClickCallback();
        this.disposable = new EmptyDisposable();
        this._setElementContent(this.element);
    }

    _setElementContent(element) {
        this.element.innerHTML =
            '<span>'+
                '<img src="' + this.packagePath + '/lib/assets/grammar.svg">'+
                '<span class="notification working hidden">'+
                    '<img src="' + this.packagePath + '/lib/assets/working.svg">'+
                '</span>'+
                '<span class="notification all-fine hidden">'+
                    '<img src="' + this.packagePath + '/lib/assets/all-fine.svg">'+
                '</span>'+
                '<span class="notification misspelling hidden">'+
                    '<img src="' + this.packagePath + '/lib/assets/misspelling.svg">'+
                '</span>'+
            '</span>';
    }

    hideAllNotifications(resolve) {
        Array.from(
            this.element.querySelectorAll('.notification:not(.hidden)')
        ).forEach(
            (element)=>element.classList.add('hidden')
        );
    }

    _showNotification(notificationClass) {
        this.element.querySelectorAll('.notification' + notificationClass)[0].classList.remove('hidden');
    }

    working() {
        this.hideAllNotifications();
        this._showNotification('.working');
    }

    allFine() {
        this.hideAllNotifications();
        this._showNotification('.all-fine');
    }

    misspelling() {
        this.hideAllNotifications();
        this._showNotification('.misspelling');
    }

    getElement() {
        return this.element;
    }

    _removeElement() {
        this.element.classList.add("hidden");
    }

    setMessage(message) {
        this.disposable.dispose();
        this.disposable = atom.tooltips.add(this.element, {title: message});
    }

    destroy() {
        this._removeElement();
    }

    set onClick(onClickCallback) {
        console.log(onClickCallback);
        this._onClickCallback = onClickCallback;
    }
};
