'use babel';

module.exports = class StatusBarNotification{
    constructor() {
        this.element = document.createElement('div');
        this.element.setAttribute("id", "spell-checker-improved-status-bar-icon");
        this.element.classList.add('inline-block');
        this._setElementContent(this.element);
    }

    _setElementContent(element) {
        this.element.innerHTML =
            '<span>'+
                '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/grammar.svg">'+
                '<span class="notification working hidden">'+
                    '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/working.svg">'+
                '</span>'+
                '<span class="notification all-fine hidden">'+
                    '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/all-fine.svg">'+
                '</span>'+
                '<span class="notification misspelling hidden">'+
                    '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/misspelling.svg">'+
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
        atom.tooltips.add(this.element, {title: message});
    }

    destroy() {
        this._removeElement();
    }
};
